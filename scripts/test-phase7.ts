/**
 * Phase 7 verification — model-agnostic hardening.
 *  - MODEL_ROUTES_JSON env override changes provider/model/mode with no code change
 *  - invalid override JSON is ignored safely
 *  - resolveMode respects overridden provider's key presence
 *  - API failure falls back to Manual Mode (bad key → manual prompt + apiError)
 *  - latency_ms is recorded on pipeline_runs (Supabase part)
 *
 *   Run: npm run test:phase7
 */

import { loadEnvLocal, makeChecker } from "./helpers";

loadEnvLocal();
const { check, done } = makeChecker();

async function main() {
  const { getRoute, resolveMode, MODEL_ROUTES } = await import("@/lib/models/routes");

  // ── Route overrides ─────────────────────────────────────────────────────────
  check("routes: default generator route", getRoute("generator").model === MODEL_ROUTES.generator.model);

  process.env.MODEL_ROUTES_JSON = JSON.stringify({
    generator: { provider: "openai", model: "gpt-4o" },
  });
  const overridden = getRoute("generator");
  check("override: provider swapped via env", overridden.provider === "openai");
  check("override: model swapped via env", overridden.model === "gpt-4o");
  check("override: mode preserved from default", overridden.mode === "api");
  check("override: other routes untouched", getRoute("critic").provider === "anthropic");

  // resolveMode: openai has no key in this env → manual despite api intent.
  const hadOpenAI = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  check("resolve: overridden route with no key → manual", resolveMode("generator") === "manual");
  process.env.OPENAI_API_KEY = "sk-test-not-real";
  check("resolve: overridden route with key → api", resolveMode("generator") === "api");
  if (hadOpenAI) process.env.OPENAI_API_KEY = hadOpenAI;
  else delete process.env.OPENAI_API_KEY;

  process.env.MODEL_ROUTES_JSON = "{not json";
  check("override: invalid JSON ignored", getRoute("generator").provider === "anthropic");
  delete process.env.MODEL_ROUTES_JSON;

  // ── API failure → manual fallback ──────────────────────────────────────────
  const { executeAgent } = await import("@/lib/models/execute");
  process.env.ANTHROPIC_API_KEY = "sk-ant-invalid-key-for-fallback-test";
  const exec = await executeAgent("critic", { text: "Draft text for fallback test." });
  check("fallback: bad key degrades to manual", exec.mode === "manual");
  check("fallback: apiError reported", typeof exec.apiError === "string" && exec.apiError.length > 0);
  check("fallback: manual prompt still usable", !!exec.prompt?.copyText.includes("Draft text for fallback test"));
  delete process.env.ANTHROPIC_API_KEY;

  // ── Latency telemetry (Supabase) ────────────────────────────────────────────
  const { getDb } = await import("@/lib/db/client");
  const db = getDb();
  if (!db) {
    console.log("\n(Supabase not configured — skipping latency persistence check.)");
    done("Phase 7");
    return;
  }

  const { logPipelineStep } = await import("@/lib/pipeline/log");
  const runId = await logPipelineStep({
    agentId: "critic",
    mode: "api",
    input: { test: true },
    output: { test: true },
    rawModel: "phase7-verification",
    usage: { promptTokens: 100, completionTokens: 50 },
    latencyMs: 1234,
  });
  const { data: row } = await db
    .from("pipeline_runs")
    .select("latency_ms, prompt_tokens, completion_tokens")
    .eq("id", runId!)
    .single();
  check("telemetry: latency_ms recorded", row?.latency_ms === 1234);
  check("telemetry: tokens recorded", row?.prompt_tokens === 100 && row?.completion_tokens === 50);

  await db.from("pipeline_runs").delete().eq("id", runId!);
  console.log("\nCleaned up verification rows.");

  done("Phase 7");
}

main().catch((e) => {
  console.error("Verification crashed:", e);
  process.exit(1);
});
