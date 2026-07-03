/**
 * Supabase persistence verification.
 * Inserts a sample passage + analysis + pipeline_run through the SAME code path
 * the app uses (persistAgentOutput), then reads everything back and checks:
 *   - passages row created
 *   - analyses row created, linked to the passage, with mode + manual_model
 *   - pipeline_runs row created with the exact manual prompt (prompt_shown)
 * Cleans up after itself unless --keep is passed (use --keep to see the rows
 * in the History page).
 *
 *   Run: npm run test:db          (reads .env.local)
 *        npm run test:db -- --keep
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ── Load .env.local (tsx does not auto-load env files) ───────────────────────
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[2] && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = REQUIRED.filter((k) => !process.env[k]?.trim());
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  console.error("Fill .env.local (see README → Database setup) and re-run.");
  process.exit(1);
}

const keep = process.argv.includes("--keep");
let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  console.log(`${cond ? "✅" : "❌"} ${name}${!cond && detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
}

async function main() {
// Import AFTER env is loaded (getDb reads env lazily, but be explicit).
const { getDb } = await import("@/lib/db/client");
const { buildAgentPrompt } = await import("@/lib/models/execute");
const { persistAgentOutput } = await import("@/lib/pipeline/persist");

const db = getDb();
if (!db) {
  console.error("Supabase client failed to initialize.");
  process.exit(1);
}

// ── Sample data (clearly labeled so it's recognizable in History) ────────────
const input = {
  passageText:
    "[verification] The snow had begun in the gloaming, and Bunny had been dead for several weeks before we came to understand the gravity of our situation.",
  genre: "fiction_opening",
};
const sampleAnalysis = {
  macro_structure: "Consequence stated before any context.",
  paragraph_functions: [{ index: 0, function: "reveal outcome", evidence: "Bunny had been dead" }],
  sentence_functions: [{ quote: "the snow had begun", function: "tonal contrast" }],
  rhetorical_devices: [{ device: "juxtaposition", example: "snow vs. dead", effect: "unease" }],
  syntax_patterns: "long compound sentence",
  pacing: "slow, controlled",
  transitions: "temporal",
  voice: "calm retrospective",
  tone: "detached",
  diction: "plain",
  imagery: "seasonal",
  symbolism: "snow as cover",
  motifs: ["death", "weather"],
  emotional_progression: [{ stage: "opening", reader_feels: "curiosity" }],
  reader_effect: "narrative pull",
  genre_expectations: "literary thriller opening",
  clarity: "high",
  compression: "high",
  tension: "high",
  persuasiveness: "n/a",
  memorability: "high",
  transferable_techniques: [
    { name: "consequence_before_context", plain_name: "result first", transfer_rule: "open with the outcome" },
  ],
  imitation_warnings: ["Do not force suspense onto unrelated writing."],
};

// ── 1. Write through the real app path ───────────────────────────────────────
const built = buildAgentPrompt("analyzer", input);
const { savedId, passageId, pipelineRunId } = await persistAgentOutput({
  agentId: "analyzer",
  input,
  output: sampleAnalysis,
  mode: "manual",
  manualModel: "verification-script",
  promptShown: built.copyText,
});

check("insert: analyses row created", savedId !== null);
check("insert: passages row created", passageId !== null);
check("insert: pipeline_runs row created", pipelineRunId !== null);
if (!savedId || !passageId || !pipelineRunId) {
  console.error("\nInserts failed — check the migration ran and the service key is correct.");
  process.exit(1);
}

// ── 2. Read back and verify every field the task cares about ─────────────────
const { data: passage } = await db.from("passages").select("*").eq("id", passageId).single();
check("read: passage text matches", passage?.text === input.passageText);

const { data: analysis } = await db.from("analyses").select("*").eq("id", savedId).single();
check("read: analysis linked to passage", analysis?.passage_id === passageId);
check("read: analysis mode = manual", analysis?.mode === "manual");
check("read: analysis manual_model saved", analysis?.manual_model === "verification-script");
check(
  "read: analysis_json intact",
  analysis?.analysis_json?.macro_structure === sampleAnalysis.macro_structure,
);

const { data: run } = await db.from("pipeline_runs").select("*").eq("id", pipelineRunId).single();
check("read: pipeline_run agent_id", run?.agent_id === "analyzer");
check("read: pipeline_run mode = manual", run?.mode === "manual");
check("read: pipeline_run manual_model saved", run?.manual_model === "verification-script");
check(
  "read: pipeline_run stores the exact manual prompt",
  typeof run?.steps_json?.prompt_shown === "string" &&
    run.steps_json.prompt_shown.includes("Bunny had been dead"),
);

// ── 3. Cleanup (unless --keep) ────────────────────────────────────────────────
if (keep) {
  console.log(`\nKept rows (visible at /history): analysis ${savedId}`);
} else {
  await db.from("pipeline_runs").delete().eq("id", pipelineRunId);
  await db.from("analyses").delete().eq("id", savedId);
  await db.from("passages").delete().eq("id", passageId);
  console.log("\nCleaned up verification rows (pass --keep to retain them).");
}

console.log(failures === 0 ? "All persistence checks passed." : `${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Verification crashed:", e);
  process.exit(1);
});
