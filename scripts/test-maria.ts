/**
 * Maria salt-essay calibration verification.
 *  - Analyzer prompt bans absolute praise unless rubric-evidence-justified,
 *    and demands weaknesses with the same evidence standard.
 *  - Extractor prompt demands 3 core / 3 secondary / 2 failure-mode cards,
 *    multi-genre usefulness, and the calibration fields.
 *  - ExtractionSchema enforces: exactly 8 cards, 3/3/2 roles, required
 *    specificity_level / transfer_difficulty / best_for_tasks (≥2), and
 *    genre_fit ≥2.
 *  - Backward compat: legacy stored cards (no calibration fields) still parse.
 *  - Persistence (Supabase): roles + calibration fields survive save + search.
 *
 *   Run: npm run test:maria
 */

import { loadEnvLocal, makeChecker } from "./helpers";
import { mariaPassage, mariaAnalysis, mariaExtraction, mariaSlugs } from "./fixtures/maria";

loadEnvLocal();
const { check, done } = makeChecker();

async function main() {
  const { buildAgentPrompt, ingestAgentResponse } = await import("@/lib/models/execute");
  const {
    TechniqueCardSchema,
    ExtractionCardSchema,
    cardSummaryText,
  } = await import("@/lib/schemas/technique-card");
  const { AnalysisSchema } = await import("@/lib/schemas/analyzer");

  // ── Analyzer calibration ────────────────────────────────────────────────────
  const aBuilt = buildAgentPrompt("analyzer", { passageText: mariaPassage, genre: "personal_essay" });
  check("analyzer: calibrated-language rule in prompt", aBuilt.copyText.includes("CALIBRATED LANGUAGE"));
  check("analyzer: 'perfectly executes' named as banned", aBuilt.copyText.includes("perfectly executes"));
  check("analyzer: rubric-evidence exception stated", aBuilt.copyText.includes("9-10 on a rubric"));
  check("analyzer: weaknesses demanded with evidence", aBuilt.copyText.includes("miscalibrated analysis"));

  const fixtureAnalysis = AnalysisSchema.safeParse(mariaAnalysis);
  check("analyzer: Maria fixture analysis validates", fixtureAnalysis.success);
  const analysisText = JSON.stringify(mariaAnalysis).toLowerCase();
  check(
    "analyzer: fixture itself contains no absolute praise",
    !/perfectly|masterful|flawless|brilliant/.test(analysisText),
  );
  check(
    "analyzer: fixture notes weaknesses/near-misses",
    analysisText.includes("over-neatness") && analysisText.includes("more conventional"),
  );

  // ── Extractor prompt calibration ────────────────────────────────────────────
  const eBuilt = buildAgentPrompt("extractor", { analysis: mariaAnalysis, genre: "personal_essay" });
  check("extractor: 3 core demanded", eBuilt.copyText.includes("3 card_role=core"));
  check("extractor: 3 secondary demanded", eBuilt.copyText.includes("3 card_role=secondary"));
  check("extractor: 2 failure_mode demanded", eBuilt.copyText.includes("2 card_role=failure_mode"));
  check("extractor: multi-genre rule present", eBuilt.copyText.includes("useful across MULTIPLE genres"));
  check("extractor: college-essay-only cards banned", eBuilt.copyText.includes("only makes sense for college essays"));
  check("extractor: specificity levels explained", eBuilt.copyText.includes("specificity_level"));
  check("extractor: transfer difficulty explained", eBuilt.copyText.includes("transfer_difficulty"));
  check("extractor: best_for_tasks demanded", eBuilt.copyText.includes("best_for_tasks"));

  // ── Extraction schema: 3/3/2 + calibration fields ───────────────────────────
  const ok = ingestAgentResponse("extractor", JSON.stringify(mariaExtraction));
  check("schema: full Maria 3/3/2 extraction passes", ok.validation.ok);

  const roleSwapped = {
    cards: mariaExtraction.cards.map((c, i) =>
      i === 0 ? { ...c, card_role: "secondary" as const } : c,
    ),
  };
  check(
    "schema: wrong role mix (2/4/2) rejected",
    !ingestAgentResponse("extractor", JSON.stringify(roleSwapped)).validation.ok,
  );
  check(
    "schema: 7 cards rejected (must be exactly 8)",
    !ingestAgentResponse("extractor", JSON.stringify({ cards: mariaExtraction.cards.slice(0, 7) })).validation.ok,
  );

  const dropField = (field: string) => ({
    cards: mariaExtraction.cards.map((c, i) => {
      if (i !== 0) return c;
      const clone: Record<string, unknown> = { ...c };
      delete clone[field];
      return clone;
    }),
  });
  check("schema: missing specificity_level rejected", !ingestAgentResponse("extractor", JSON.stringify(dropField("specificity_level"))).validation.ok);
  check("schema: missing transfer_difficulty rejected", !ingestAgentResponse("extractor", JSON.stringify(dropField("transfer_difficulty"))).validation.ok);
  check("schema: missing best_for_tasks rejected", !ingestAgentResponse("extractor", JSON.stringify(dropField("best_for_tasks"))).validation.ok);

  const mutate = (patch: Record<string, unknown>) => ({
    cards: mariaExtraction.cards.map((c, i) => (i === 0 ? { ...c, ...patch } : c)),
  });
  check("schema: bad specificity enum rejected", !ingestAgentResponse("extractor", JSON.stringify(mutate({ specificity_level: "very_subtle" }))).validation.ok);
  check("schema: bad difficulty enum rejected", !ingestAgentResponse("extractor", JSON.stringify(mutate({ transfer_difficulty: "extreme" }))).validation.ok);
  check("schema: single best_for_tasks rejected (min 2)", !ingestAgentResponse("extractor", JSON.stringify(mutate({ best_for_tasks: ["only one task"] }))).validation.ok);
  check("schema: single-genre card rejected (min 2)", !ingestAgentResponse("extractor", JSON.stringify(mutate({ genre_fit: ["college_essay"] }))).validation.ok);

  // Fixture quality: every card is multi-genre and reaches beyond essays.
  const essayOnly = mariaExtraction.cards.filter(
    (c) => !c.genre_fit.some((g) => !g.includes("essay")),
  );
  check("fixture: every card fits a non-essay genre", essayOnly.length === 0);
  check(
    "fixture: failure-mode cards carry avoidance instructions",
    mariaExtraction.cards
      .filter((c) => c.card_role === "failure_mode")
      .every((c) => c.when_to_use.toLowerCase().includes("never")),
  );

  // ── Backward compatibility ──────────────────────────────────────────────────
  const legacyCard = {
    technique_name: "legacy_card_without_new_fields",
    plain_name: "A card saved before the calibration pass",
    function: "does something",
    reader_effect: ["curiosity"],
    genre_fit: ["speech"],
    when_to_use: "sometimes",
    when_not_to_use: "other times",
    transfer_rule: "a rule",
    bad_use_warning: "a warning",
    genre_adaptations: [],
    revision_instruction: "do the thing",
    evaluation_criteria: ["it worked"],
  };
  check("compat: legacy stored card still parses (base schema)", TechniqueCardSchema.safeParse(legacyCard).success);
  check("compat: legacy card rejected for NEW extractions (strict schema)", !ExtractionCardSchema.safeParse(legacyCard).success);
  check(
    "compat: summary text works without best_for_tasks",
    cardSummaryText(legacyCard).includes("speech"),
  );
  check(
    "summary: best_for_tasks included when present",
    cardSummaryText(mariaExtraction.cards[1]).includes("impact statements"),
  );

  // ── Persistence (Supabase) ──────────────────────────────────────────────────
  const { getDb } = await import("@/lib/db/client");
  const db = getDb();
  if (!db) {
    console.log("\n(Supabase not configured — skipping persistence checks.)");
    done("Maria calibration");
    return;
  }

  const { persistAgentOutput } = await import("@/lib/pipeline/persist");
  const { searchTechniqueCards } = await import("@/lib/retrieval/search");

  const saved = await persistAgentOutput({
    agentId: "extractor",
    input: { analysis: mariaAnalysis, genre: "personal_essay" },
    output: mariaExtraction,
    mode: "manual",
    manualModel: "maria-verification",
  });
  check("persist: 8 cards saved", saved.cardIds?.length === 8);

  const { data: roleRows } = await db
    .from("technique_cards")
    .select("card_json")
    .in("id", saved.cardIds ?? []);
  const roles = (roleRows ?? []).map((r) => r.card_json?.card_role);
  check(
    "persist: roles survive in card_json (3/3/2)",
    roles.filter((r) => r === "core").length === 3 &&
      roles.filter((r) => r === "secondary").length === 3 &&
      roles.filter((r) => r === "failure_mode").length === 2,
  );
  check(
    "persist: calibration fields survive",
    (roleRows ?? []).every(
      (r) => r.card_json?.specificity_level && r.card_json?.transfer_difficulty && (r.card_json?.best_for_tasks?.length ?? 0) >= 2,
    ),
  );

  // Task-shaped query hits via best_for_tasks in the summary text.
  const hit = await searchTechniqueCards({ q: "postmortem introductions", limit: 20 });
  check("search: task-shaped query finds card via best_for_tasks", hit.hits.some((h) => saved.cardIds?.includes(h.id)));

  await db.from("technique_cards").delete().in("id", saved.cardIds ?? []);
  await db.from("techniques").delete().in("slug", mariaSlugs);
  await db.from("pipeline_runs").delete().eq("manual_model", "maria-verification");
  console.log("\nCleaned up verification rows.");

  done("Maria calibration");
}

main().catch((e) => {
  console.error("Verification crashed:", e);
  process.exit(1);
});
