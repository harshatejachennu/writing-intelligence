/**
 * Phase 3 verification — Generation Engine.
 *  Part A (no keys): prompt builds + schema validation for goalProfile/planner/generator.
 *  Part B (Supabase): persistence chain goal_profiles → strategy_plans →
 *  generation_runs + output document, with linkage intact. Cleans up.
 *
 *   Run: npm run test:phase3
 */

import { loadEnvLocal, makeChecker } from "./helpers";

loadEnvLocal();
const { check, done } = makeChecker();

const profile = {
  task: "generate_text",
  genre: "speech",
  audience: "high school volunteers",
  purpose: "motivate them to sign up and take responsibility",
  reader_effect: ["feel personally responsible", "understand what to do"],
  tone: { direct: 8, warm: 6, formal: 4, emotional: 5, dramatic: 3 },
  voice: "direct peer, not an authority figure",
  length: "2 minutes spoken",
  constraints: ["avoid cliches", "use simple language"],
  required_facts: [],
  forbidden_content: ["guilt-tripping"],
  risk_factors: ["sounding cheesy to teenagers"],
  evaluation_criteria: ["a listener can name the single action to take"],
  desired_techniques: ["concrete example", "call to action"],
  techniques_to_avoid: ["melodrama"],
  high_stakes: false,
};

const plan = {
  structure: [
    { section: "concrete opening scene", purpose: "ground the stakes in one real moment" },
    { section: "contrast apathy vs impact", purpose: "make the choice feel personal" },
    { section: "direct call to action", purpose: "name the single next step" },
  ],
  opening_strategy: "one specific scene, no throat-clearing",
  ending_strategy: "clean single-sentence ask",
  techniques_to_use: [
    { technique: "concrete_example", where: "opening", why: "specificity beats abstraction for teens" },
  ],
  techniques_to_avoid: [{ technique: "melodrama", why: "reads as cheesy to this audience" }],
  turns: [{ position: "after the opening scene", type: "logical", description: "from scene to choice" }],
  explicit_vs_implied: "state the ask explicitly; imply the emotional weight",
  attention_control: "short sentences at turns; one idea per section",
  risks: ["opening scene could feel staged"],
};

const generation = {
  text: "Last Tuesday, a kid named Marcus waited forty minutes for a tutor who never showed. [draft continues]",
  techniques_used: [
    { technique: "concrete_example", where: "opening", intended_effect: "ground the stakes" },
  ],
  choices_explained: "Opens on one specific scene per the plan; ask stated once, plainly.",
  possible_weaknesses: ["the scene may need a real detail from the speaker"],
  suggested_revision_path: "replace Marcus with a real student example from the user",
  is_draft: true,
};

async function main() {
  const { buildAgentPrompt, ingestAgentResponse } = await import("@/lib/models/execute");

  // ── Part A: prompts + schemas ───────────────────────────────────────────────
  const gpBuilt = buildAgentPrompt("goalProfile", {
    request: "Write a short persuasive speech for teen volunteers that isn't cheesy",
  });
  check("goalProfile: prompt builds (manual)", gpBuilt.mode === "manual");
  check("goalProfile: valid profile passes", ingestAgentResponse("goalProfile", JSON.stringify(profile)).validation.ok);
  check(
    "goalProfile: tone out of range rejected",
    !ingestAgentResponse("goalProfile", JSON.stringify({ ...profile, tone: { direct: 14 } })).validation.ok,
  );

  const plBuilt = buildAgentPrompt("planner", { goalProfile: profile, retrievedCards: [] });
  check("planner: prompt embeds profile", plBuilt.copyText.includes("high school volunteers"));
  check("planner: valid plan passes", ingestAgentResponse("planner", JSON.stringify(plan)).validation.ok);
  check(
    "planner: single-section structure rejected",
    !ingestAgentResponse("planner", JSON.stringify({ ...plan, structure: [plan.structure[0]] })).validation.ok,
  );

  const genBuilt = buildAgentPrompt("generator", {
    goalProfile: profile,
    strategyPlan: plan,
    cards: [],
    facts: "Marcus, 14, waited 40 minutes",
  });
  check("generator: prompt embeds plan + facts", genBuilt.copyText.includes("concrete opening scene") && genBuilt.copyText.includes("Marcus"));
  check("generator: valid generation passes", ingestAgentResponse("generator", JSON.stringify(generation)).validation.ok);
  check(
    "generator: missing weaknesses rejected",
    !ingestAgentResponse("generator", JSON.stringify({ ...generation, possible_weaknesses: [] })).validation.ok,
  );

  // ── Part B: persistence chain ───────────────────────────────────────────────
  const { getDb } = await import("@/lib/db/client");
  const db = getDb();
  if (!db) {
    console.log("\n(Supabase not configured — skipping persistence checks.)");
    done("Phase 3");
    return;
  }

  const { persistAgentOutput } = await import("@/lib/pipeline/persist");

  const p1 = await persistAgentOutput({
    agentId: "goalProfile",
    input: { request: "test" },
    output: profile,
    mode: "manual",
    manualModel: "phase3-verification",
  });
  check("persist: goal profile saved", p1.savedId !== null);

  const p2 = await persistAgentOutput({
    agentId: "planner",
    input: { goalProfile: profile, retrievedCards: [], goalProfileId: p1.savedId ?? undefined },
    output: plan,
    mode: "manual",
    manualModel: "phase3-verification",
  });
  check("persist: strategy plan saved", p2.savedId !== null);

  const { data: planRow } = await db
    .from("strategy_plans")
    .select("goal_profile_id")
    .eq("id", p2.savedId!)
    .single();
  check("linkage: plan → goal profile", planRow?.goal_profile_id === p1.savedId);

  const p3 = await persistAgentOutput({
    agentId: "generator",
    input: {
      goalProfile: profile,
      strategyPlan: plan,
      cards: [],
      goalProfileId: p1.savedId ?? undefined,
      strategyPlanId: p2.savedId ?? undefined,
      retrievedCardIds: [],
    },
    output: generation,
    mode: "manual",
    manualModel: "phase3-verification",
  });
  check("persist: generation run saved", p3.savedId !== null);

  const { data: runRow } = await db
    .from("generation_runs")
    .select("goal_profile_id, strategy_plan_id, output_document_id, techniques_used_json, mode, manual_model")
    .eq("id", p3.savedId!)
    .single();
  check("linkage: run → profile + plan", runRow?.goal_profile_id === p1.savedId && runRow?.strategy_plan_id === p2.savedId);
  check("persist: run mode + manual_model", runRow?.mode === "manual" && runRow?.manual_model === "phase3-verification");
  check(
    "persist: techniques_used stored",
    runRow?.techniques_used_json?.techniques_used?.[0]?.technique === "concrete_example",
  );

  const { data: docRow } = await db
    .from("documents")
    .select("kind, body")
    .eq("id", runRow!.output_document_id)
    .single();
  check("persist: output document body", docRow?.kind === "output" && !!docRow?.body?.includes("Marcus"));

  // Cleanup.
  await db.from("generation_runs").delete().eq("id", p3.savedId!);
  await db.from("documents").delete().eq("id", runRow!.output_document_id);
  await db.from("strategy_plans").delete().eq("id", p2.savedId!);
  await db.from("goal_profiles").delete().eq("id", p1.savedId!);
  await db.from("pipeline_runs").delete().eq("manual_model", "phase3-verification");
  console.log("\nCleaned up verification rows.");

  done("Phase 3");
}

main().catch((e) => {
  console.error("Verification crashed:", e);
  process.exit(1);
});
