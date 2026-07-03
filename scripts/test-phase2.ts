/**
 * Phase 2 verification — Technique Extractor + Library.
 *  Part A (no DB, no keys): extractor prompt build + schema validation paths.
 *  Part B (needs Supabase env): persistence — technique upsert dedup by slug,
 *  card insert with summary, text-fallback search, genre filter. Cleans up.
 *
 *   Run: npm run test:phase2
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[2] && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  console.log(`${cond ? "✅" : "❌"} ${name}${!cond && detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
}

const sampleCard = {
  technique_name: "qa_test_consequence_before_context",
  plain_name: "Show the result before explaining the background",
  function: "Creates curiosity by revealing an important outcome before explaining how it happened",
  reader_effect: ["curiosity", "tension", "narrative pull"],
  genre_fit: ["fiction_opening", "personal_essay", "speech"],
  when_to_use: "When the outcome is more interesting than the setup",
  when_not_to_use: "Urgent instructions or documentation requiring immediate clarity",
  transfer_rule: "Begin with a meaningful result, moment, or consequence, then explain the background",
  bad_use_warning: "Forcing suspense where the subject does not need it",
  genre_adaptations: [
    { genre: "technical_writing", guidance: "Usually avoid unless opening with a failure case" },
    { genre: "speech", guidance: "Start with a vivid consequence before presenting the argument" },
  ],
  revision_instruction: "Move the outcome sentence to the first line; delay the explanation",
  evaluation_criteria: ["Reader wants to know 'how did this happen?' after the first sentence"],
};

async function main() {
  const { buildAgentPrompt, ingestAgentResponse } = await import("@/lib/models/execute");

  // ── Part A: prompt + schema (no DB) ─────────────────────────────────────────
  const analysisStub = { macro_structure: "test", transferable_techniques: [] };
  const input = { analysis: analysisStub, genre: "fiction_opening" };

  const built = buildAgentPrompt("extractor", input);
  check("build: extractor prompt renders (manual, no key)", built.mode === "manual");
  check("build: prompt embeds the analysis", built.copyText.includes("macro_structure"));

  const clean = ingestAgentResponse("extractor", JSON.stringify({ cards: [sampleCard] }));
  check("schema: valid extraction passes", clean.validation.ok);

  const dirty = ingestAgentResponse(
    "extractor",
    "Here you go!\n```json\n" + JSON.stringify({ cards: [sampleCard] }) + "\n```",
  );
  check("schema: dirty paste passes", dirty.validation.ok);

  const badName = ingestAgentResponse(
    "extractor",
    JSON.stringify({ cards: [{ ...sampleCard, technique_name: "Bunny Death Opening!" }] }),
  );
  check("schema: non-snake_case name rejected", !badName.validation.ok);

  const empty = ingestAgentResponse("extractor", JSON.stringify({ cards: [] }));
  check("schema: empty cards rejected", !empty.validation.ok);

  // ── Part B: persistence + search (needs Supabase) ───────────────────────────
  const { getDb } = await import("@/lib/db/client");
  const db = getDb();
  if (!db) {
    console.log("\n(Supabase not configured — skipping persistence checks.)");
    done();
    return;
  }

  const { persistAgentOutput } = await import("@/lib/pipeline/persist");
  const { searchTechniqueCards } = await import("@/lib/retrieval/search");

  const extraction = { cards: [sampleCard] };
  const first = await persistAgentOutput({
    agentId: "extractor",
    input,
    output: extraction,
    mode: "manual",
    manualModel: "phase2-verification",
  });
  check("persist: card saved", (first.cardIds?.length ?? 0) === 1);
  check("persist: technique slug recorded", first.techniqueSlugs?.[0] === "qa_test_consequence_before_context");

  // Extract the SAME technique again — must upsert, not duplicate.
  const second = await persistAgentOutput({
    agentId: "extractor",
    input,
    output: extraction,
    mode: "manual",
    manualModel: "phase2-verification", // tag so cleanup catches this row too
  });
  const { data: techRows } = await db
    .from("techniques")
    .select("id")
    .eq("slug", "qa_test_consequence_before_context");
  check("dedup: one canonical technique after two extractions", techRows?.length === 1);

  const { data: cardRows } = await db
    .from("technique_cards")
    .select("id, summary, plain_name")
    .in("id", [...(first.cardIds ?? []), ...(second.cardIds ?? [])]);
  check("persist: two card versions exist", cardRows?.length === 2);
  check(
    "persist: summary text populated",
    !!cardRows?.[0]?.summary?.includes("curiosity"),
  );

  // Search: text fallback should find the card from a plain-English query.
  const found = await searchTechniqueCards({ q: "curiosity outcome background", limit: 10 });
  check("search: text fallback finds the card", found.hits.some((h) => first.cardIds?.includes(h.id)));
  check("search: method is text (no embedding key)", found.method === "text");

  const genreHit = await searchTechniqueCards({ q: "curiosity", genre: "speech", limit: 10 });
  check("search: genre filter keeps matching card", genreHit.hits.some((h) => first.cardIds?.includes(h.id)));
  const genreMiss = await searchTechniqueCards({ q: "curiosity", genre: "spreadsheet", limit: 10 });
  check("search: genre filter excludes non-matching", !genreMiss.hits.some((h) => first.cardIds?.includes(h.id)));

  // Cleanup.
  const allCardIds = [...(first.cardIds ?? []), ...(second.cardIds ?? [])];
  await db.from("technique_cards").delete().in("id", allCardIds);
  await db.from("techniques").delete().eq("slug", "qa_test_consequence_before_context");
  await db.from("pipeline_runs").delete().eq("manual_model", "phase2-verification");
  console.log("\nCleaned up verification rows.");

  done();
}

function done() {
  console.log(failures === 0 ? "All Phase 2 checks passed." : `${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Verification crashed:", e);
  process.exit(1);
});
