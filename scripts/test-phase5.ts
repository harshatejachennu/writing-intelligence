/**
 * Phase 5 verification — Corpus Builder.
 *  Part A (no keys): curator prompt + schema + app-side excerpt guard math.
 *  Part B (Supabase): guarded persistence — long copyrighted excerpt blocked
 *  with a friendly error BEFORE the DB; public-domain long excerpt allowed.
 *
 *   Run: npm run test:phase5
 */

import { loadEnvLocal, makeChecker } from "./helpers";

loadEnvLocal();
const { check, done } = makeChecker();

const base = {
  title: "Gettysburg Address",
  author: "Abraham Lincoln",
  genre: "speech",
  era: "1863",
  source_type: "speech",
  access: "public_domain" as const,
  why_useful: "Compression, moral escalation, and rhetorical precision in 272 words.",
  techniques_demonstrated: ["compression", "triadic_structure", "moral_escalation"],
  recommended_passage: "The full address — especially the final sentence's build.",
  citation_url: "https://en.wikipedia.org/wiki/Gettysburg_Address",
  imitation_risk: "med" as const,
  stored_excerpt: null,
  notes: null,
};

const longText = Array(120).fill("word").join(" ");

async function main() {
  const { buildAgentPrompt, ingestAgentResponse } = await import("@/lib/models/execute");
  const { validateExcerptGuard, wordCount, EXCERPT_WORD_CAP } = await import("@/lib/schemas/source-text");

  // ── Part A ──────────────────────────────────────────────────────────────────
  const built = buildAgentPrompt("curator", {
    description: "The Secret History opening — consequence before context",
  });
  check("curator: prompt builds (manual)", built.mode === "manual");
  check("curator: legal rules in system prompt", built.copyText.includes("Never reproduce more than"));
  check("curator: valid entry passes", ingestAgentResponse("curator", JSON.stringify(base)).validation.ok);
  check(
    "curator: bad access enum rejected",
    !ingestAgentResponse("curator", JSON.stringify({ ...base, access: "fair_use" })).validation.ok,
  );

  check("guard: wordCount", wordCount("one two  three") === 3);
  check(
    "guard: long copyrighted excerpt blocked",
    validateExcerptGuard({ ...base, access: "copyrighted", stored_excerpt: longText }) !== null,
  );
  check(
    "guard: long public-domain excerpt allowed",
    validateExcerptGuard({ ...base, stored_excerpt: longText }) === null,
  );
  check(
    "guard: short copyrighted excerpt allowed",
    validateExcerptGuard({ ...base, access: "copyrighted", stored_excerpt: "The snow in the mountains was melting." }) === null,
  );
  check("guard: cap is what the prompt promises", EXCERPT_WORD_CAP === 90);

  // ── Part B ──────────────────────────────────────────────────────────────────
  const { getDb } = await import("@/lib/db/client");
  const db = getDb();
  if (!db) {
    console.log("\n(Supabase not configured — skipping persistence checks.)");
    done("Phase 5");
    return;
  }

  const { persistAgentOutput } = await import("@/lib/pipeline/persist");
  const { listSourceTexts } = await import("@/lib/pipeline/corpus");

  const ok = await persistAgentOutput({
    agentId: "curator",
    input: { description: "test lead" },
    output: { ...base, title: "[phase5-verification] Gettysburg Address" },
    mode: "manual",
    manualModel: "phase5-verification",
  });
  check("persist: public-domain source saved", ok.savedId !== null);

  let guardMessage = "";
  try {
    await persistAgentOutput({
      agentId: "curator",
      input: { description: "test lead 2" },
      output: { ...base, title: "[phase5-verification] Gone Girl", access: "copyrighted", stored_excerpt: longText },
      mode: "manual",
      manualModel: "phase5-verification",
    });
  } catch (e) {
    guardMessage = (e as Error).message;
  }
  check("persist: long copyrighted excerpt rejected with friendly error", guardMessage.includes("allows at most 90"));

  const listed = await listSourceTexts();
  check("list: saved source visible", listed.some((s) => s.id === ok.savedId));

  await db.from("source_texts").delete().eq("id", ok.savedId!);
  await db.from("pipeline_runs").delete().eq("manual_model", "phase5-verification");
  console.log("\nCleaned up verification rows.");

  done("Phase 5");
}

main().catch((e) => {
  console.error("Verification crashed:", e);
  process.exit(1);
});
