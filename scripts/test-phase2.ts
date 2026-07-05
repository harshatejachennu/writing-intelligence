/**
 * Phase 2 verification — Technique Extractor + Library.
 *  Part A (no DB, no keys): extractor prompt build + schema validation paths.
 *  Part B (needs Supabase env): persistence — technique upsert dedup by slug,
 *  card insert with summary, text-fallback search, genre filter. Cleans up.
 *  Uses the Maria salt-essay fixture (3 core / 3 secondary / 2 failure-mode).
 *
 *   Run: npm run test:phase2
 */

import { loadEnvLocal, makeChecker } from "./helpers";
import { mariaAnalysis, mariaExtraction, mariaSlugs } from "./fixtures/maria";

loadEnvLocal();
const { check, done } = makeChecker();

async function main() {
  const { buildAgentPrompt, ingestAgentResponse } = await import("@/lib/models/execute");

  // ── Part A: prompt + schema (no DB) ─────────────────────────────────────────
  const input = { analysis: mariaAnalysis, genre: "personal_essay" };

  const built = buildAgentPrompt("extractor", input);
  check("build: extractor prompt renders (manual, no key)", built.mode === "manual");
  check("build: prompt embeds the analysis", built.copyText.includes("macro_structure"));

  const clean = ingestAgentResponse("extractor", JSON.stringify(mariaExtraction));
  check("schema: valid 3/3/2 extraction passes", clean.validation.ok);

  const dirty = ingestAgentResponse(
    "extractor",
    "Here you go!\n```json\n" + JSON.stringify(mariaExtraction) + "\n```",
  );
  check("schema: dirty paste passes", dirty.validation.ok);

  const badName = ingestAgentResponse(
    "extractor",
    JSON.stringify({
      cards: mariaExtraction.cards.map((c, i) =>
        i === 0 ? { ...c, technique_name: "Maria Salt Opening!" } : c,
      ),
    }),
  );
  check("schema: non-snake_case name rejected", !badName.validation.ok);

  const empty = ingestAgentResponse("extractor", JSON.stringify({ cards: [] }));
  check("schema: empty cards rejected", !empty.validation.ok);

  // ── Part B: persistence + search (needs Supabase) ───────────────────────────
  const { getDb } = await import("@/lib/db/client");
  const db = getDb();
  if (!db) {
    console.log("\n(Supabase not configured — skipping persistence checks.)");
    done("Phase 2");
    return;
  }

  const { persistAgentOutput } = await import("@/lib/pipeline/persist");
  const { searchTechniqueCards } = await import("@/lib/retrieval/search");

  const first = await persistAgentOutput({
    agentId: "extractor",
    input,
    output: mariaExtraction,
    mode: "manual",
    manualModel: "phase2-verification",
  });
  check("persist: all 8 cards saved", (first.cardIds?.length ?? 0) === 8);
  check("persist: technique slugs recorded", first.techniqueSlugs?.length === 8 && first.techniqueSlugs.includes(mariaSlugs[0]));

  // Extract the SAME techniques again — must upsert, not duplicate.
  const second = await persistAgentOutput({
    agentId: "extractor",
    input,
    output: mariaExtraction,
    mode: "manual",
    manualModel: "phase2-verification", // tag so cleanup catches this row too
  });
  const { data: techRows } = await db
    .from("techniques")
    .select("id")
    .in("slug", mariaSlugs);
  check("dedup: 8 canonical techniques after two extractions", techRows?.length === 8);

  const { data: cardRows } = await db
    .from("technique_cards")
    .select("id, summary, plain_name")
    .in("id", [...(first.cardIds ?? []), ...(second.cardIds ?? [])]);
  check("persist: two card versions per technique (16 rows)", cardRows?.length === 16);
  check(
    "persist: summary text populated (includes best_for_tasks)",
    !!cardRows?.some((r) => r.summary?.includes("impact statements")),
  );

  // Search: text fallback should find a card from a plain-English query.
  const found = await searchTechniqueCards({ q: "exact number emotion vague", limit: 20 });
  check("search: text fallback finds the precise-count card", found.hits.some((h) => first.cardIds?.includes(h.id)));
  check("search: method is text (no embedding key)", found.method === "text");

  const genreHit = await searchTechniqueCards({ q: "number emotion", genre: "speech", limit: 20 });
  check("search: genre filter keeps matching card", genreHit.hits.some((h) => first.cardIds?.includes(h.id)));
  const genreMiss = await searchTechniqueCards({ q: "number emotion", genre: "spreadsheet", limit: 20 });
  check("search: genre filter excludes non-matching", !genreMiss.hits.some((h) => first.cardIds?.includes(h.id)));

  // Cleanup.
  const allCardIds = [...(first.cardIds ?? []), ...(second.cardIds ?? [])];
  await db.from("technique_cards").delete().in("id", allCardIds);
  await db.from("techniques").delete().in("slug", mariaSlugs);
  await db.from("pipeline_runs").delete().eq("manual_model", "phase2-verification");
  console.log("\nCleaned up verification rows.");

  done("Phase 2");
}

main().catch((e) => {
  console.error("Verification crashed:", e);
  process.exit(1);
});
