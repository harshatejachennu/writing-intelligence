/**
 * Phase 8 verification — Advanced UI backends.
 *  Part A (no keys): compare/inspiration prompts + schemas; synthetic watermark
 *  enforced; markdown export builders.
 *  Part B (Supabase): comparison persistence with refs; saved_outputs promotion
 *  linked to a generation run. Cleans up.
 *
 *   Run: npm run test:phase8
 */

import { loadEnvLocal, makeChecker } from "./helpers";

loadEnvLocal();
const { check, done } = makeChecker();

const verdict = {
  what_improved: ["the ask is now concrete"],
  what_got_worse: ["opening lost one specific detail"],
  dimension_verdicts: [
    { dimension: "clarity", winner: "right" as const, evidence: "single named action" },
    { dimension: "voice", winner: "left" as const, evidence: "drier, more personal aside" },
    { dimension: "structure", winner: "tie" as const, evidence: "same three-beat shape" },
  ],
  reader_effect_winner: "right" as const,
  overall_winner: "right" as const,
  reasoning: "RIGHT lands the ask; LEFT reads slightly more human.",
  recommended_direction: "Keep RIGHT's ending, restore LEFT's opening detail.",
};

const inspiration = {
  inspiration_model: "The last time I laced those cleats, I already knew. [synthetic model continues]",
  technique_breakdown: [
    { technique: "consequence_before_context", where: "opening", effect: "curiosity" },
    { technique: "object_as_anchor", where: "throughout", effect: "concreteness" },
  ],
  transfer_blueprint: ["Open on the physical object at the moment of decision", "Withhold the why for two beats"],
  copy_structurally: ["object-anchored opening", "two-beat withholding"],
  do_not_copy: ["the cleats and every invented detail", "the narrator's voice"],
  risks: ["borrowed emotion the writer never felt"],
  adapt_to_task: "Replace the cleats with a real object from the user's own story.",
  is_synthetic_not_for_submission: true as const,
};

async function main() {
  const { buildAgentPrompt, ingestAgentResponse } = await import("@/lib/models/execute");
  const { draftToMarkdown, analysisToMarkdown } = await import("@/lib/export/markdown");

  // ── Compare agent ───────────────────────────────────────────────────────────
  const cBuilt = buildAgentPrompt("compare", {
    leftText: "Left version text.",
    rightText: "Right version text.",
    leftLabel: "before",
    rightLabel: "after",
  });
  check("compare: prompt builds (manual)", cBuilt.mode === "manual");
  check("compare: both sides + labels embedded", cBuilt.copyText.includes("LEFT (before)") && cBuilt.copyText.includes("RIGHT (after)"));
  check("compare: valid verdict passes", ingestAgentResponse("compare", JSON.stringify(verdict)).validation.ok);
  check(
    "compare: bad winner enum rejected",
    !ingestAgentResponse("compare", JSON.stringify({ ...verdict, overall_winner: "both" })).validation.ok,
  );
  check(
    "compare: <3 dimensions rejected",
    !ingestAgentResponse("compare", JSON.stringify({ ...verdict, dimension_verdicts: verdict.dimension_verdicts.slice(0, 2) })).validation.ok,
  );

  // ── Inspiration agent ───────────────────────────────────────────────────────
  const iBuilt = buildAgentPrompt("inspiration", {
    topic: "quitting a sport",
    realTask: "my own essay about leaving swim team",
  });
  check("inspiration: prompt builds (manual)", iBuilt.mode === "manual");
  check("inspiration: real task embedded", iBuilt.copyText.includes("leaving swim team"));
  check("inspiration: no-imitation rule in prompt", iBuilt.copyText.includes("Do not imitate any identifiable author"));
  check("inspiration: valid output passes", ingestAgentResponse("inspiration", JSON.stringify(inspiration)).validation.ok);
  check(
    "inspiration: watermark=false REJECTED (literal true enforced)",
    !ingestAgentResponse("inspiration", JSON.stringify({ ...inspiration, is_synthetic_not_for_submission: false })).validation.ok,
  );

  // ── Markdown export builders ────────────────────────────────────────────────
  const md = draftToMarkdown({
    text: "Draft body.",
    techniquesUsed: [{ technique: "t", where: "opening", intended_effect: "pull" }],
    weaknesses: ["thin middle"],
    choicesExplained: "because",
  });
  check("export: draft md has draft label + sections", md.includes("> DRAFT") && md.includes("## Techniques used") && md.includes("## Possible weaknesses"));
  const amd = analysisToMarkdown({
    passage: "line one\nline two",
    analysis: { macro_structure: "x", transferable_techniques: [{ name: "n", plain_name: "p", transfer_rule: "r" }], imitation_warnings: ["w"] },
  });
  check("export: analysis md quotes passage + techniques", amd.includes("> line one\n> line two") && amd.includes("**n** (p)"));

  // ── Part B: persistence ─────────────────────────────────────────────────────
  const { getDb } = await import("@/lib/db/client");
  const db = getDb();
  if (!db) {
    console.log("\n(Supabase not configured — skipping persistence checks.)");
    done("Phase 8");
    return;
  }

  const { persistAgentOutput } = await import("@/lib/pipeline/persist");
  const { saveOutputExample } = await import("@/lib/pipeline/compare");

  const cSaved = await persistAgentOutput({
    agentId: "compare",
    input: { leftText: "[phase8] L", rightText: "[phase8] R", leftLabel: "before", rightLabel: "after" },
    output: verdict,
    mode: "manual",
    manualModel: "phase8-verification",
  });
  check("persist: comparison saved", cSaved.savedId !== null);
  const { data: compRow } = await db
    .from("comparisons")
    .select("left_ref, right_ref, verdict_json")
    .eq("id", cSaved.savedId!)
    .single();
  check("persist: refs + verdict intact", compRow?.left_ref?.label === "before" && compRow?.verdict_json?.overall_winner === "right");

  // inspiration must NOT create documents (audit row only)
  const docsBefore = (await db.from("documents").select("id")).data?.length ?? 0;
  await persistAgentOutput({
    agentId: "inspiration",
    input: { topic: "[phase8] test" },
    output: inspiration,
    mode: "manual",
    manualModel: "phase8-verification",
  });
  const docsAfter = (await db.from("documents").select("id")).data?.length ?? 0;
  check("persist: inspiration creates NO documents (synthetic stays out)", docsAfter === docsBefore);

  // saved_outputs: needs a real generation run to link
  const { data: doc } = await db.from("documents").insert({ kind: "output", body: "[phase8] draft" }).select("id").single();
  const { data: run } = await db
    .from("generation_runs")
    .insert({ output_document_id: doc!.id, techniques_used_json: {}, mode: "manual", status: "complete" })
    .select("id")
    .single();
  const exampleId = await saveOutputExample({ generationRunId: run!.id, tags: ["speech"], canSeedCorpus: false });
  check("persist: saved_outputs promotion", exampleId !== null);
  const { data: exRow } = await db.from("saved_outputs").select("generation_run_id, tags").eq("id", exampleId!).single();
  check("persist: example linked to run + tagged", exRow?.generation_run_id === run!.id && exRow?.tags?.[0] === "speech");

  // Cleanup.
  await db.from("saved_outputs").delete().eq("id", exampleId!);
  await db.from("generation_runs").delete().eq("id", run!.id);
  await db.from("documents").delete().eq("id", doc!.id);
  await db.from("comparisons").delete().eq("id", cSaved.savedId!);
  await db.from("pipeline_runs").delete().eq("manual_model", "phase8-verification");
  console.log("\nCleaned up verification rows.");

  done("Phase 8");
}

main().catch((e) => {
  console.error("Verification crashed:", e);
  process.exit(1);
});
