/**
 * Execution-infrastructure verification — OpenRouter + mode control.
 *  - OpenRouter provider config (key detection, route override, default model,
 *    openrouter/auto + openrouter/free pass-through)
 *  - Preference matrix: all 5 EXECUTION_PREFERENCE values × key/no-key
 *  - Smart routing: quality steps → Manual, structured steps → API when keyed
 *  - Per-step overrides beat the global preference
 *  - API→Manual fallback on failure (bad OpenRouter key) with classified reason
 *  - api_only: no silent fallback — failures error loudly
 *  - Zero-key: everything Manual under every preference except api_only
 *  - Route receipts persisted on pipeline_runs (Supabase part)
 *
 *   Run: npm run test:exec
 */

import { loadEnvLocal, makeChecker } from "./helpers";

loadEnvLocal();
const { check, done } = makeChecker();

function clearKeys() {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
}

async function main() {
  const routes = await import("@/lib/models/routes");
  const {
    hasApiKey, anyApiKey, getRoute, apiTarget, resolveExecution,
    openrouterDefaultModel, EXECUTION_PREFERENCES, getExecutionPreference,
  } = routes;

  clearKeys();
  delete process.env.MODEL_ROUTES_JSON;
  delete process.env.EXECUTION_PREFERENCE;
  delete process.env.OPENROUTER_DEFAULT_MODEL;

  // ── 1. OpenRouter provider config ───────────────────────────────────────────
  check("openrouter: no key detected when unset", !hasApiKey("openrouter"));
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  check("openrouter: key detected via OPENROUTER_API_KEY", hasApiKey("openrouter"));
  check("openrouter: counts toward anyApiKey", anyApiKey());

  check("openrouter: default model is openrouter/auto", openrouterDefaultModel() === "openrouter/auto");
  process.env.OPENROUTER_DEFAULT_MODEL = "openrouter/free";
  check("openrouter: OPENROUTER_DEFAULT_MODEL honored (openrouter/free)", openrouterDefaultModel() === "openrouter/free");
  process.env.OPENROUTER_DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
  check("openrouter: arbitrary model ids pass through", openrouterDefaultModel() === "meta-llama/llama-3.3-70b-instruct:free");
  delete process.env.OPENROUTER_DEFAULT_MODEL;

  // Route override to openrouter with explicit model.
  process.env.MODEL_ROUTES_JSON = JSON.stringify({
    generator: { provider: "openrouter", model: "openrouter/auto" },
  });
  check("openrouter: route override applies", getRoute("generator").provider === "openrouter" && getRoute("generator").model === "openrouter/auto");
  delete process.env.MODEL_ROUTES_JSON;

  // apiTarget: preferred provider unkeyed (anthropic) → falls through to keyed openrouter with default model.
  const target = apiTarget("generator");
  check("openrouter: apiTarget falls through to keyed openrouter", target?.provider === "openrouter" && target?.model === "openrouter/auto");

  // ── 2. Preference matrix ────────────────────────────────────────────────────
  check("preference: default is smart", getExecutionPreference() === "smart");
  process.env.EXECUTION_PREFERENCE = "not_a_real_pref";
  check("preference: invalid value falls back to smart", getExecutionPreference() === "smart");

  // WITH a key (openrouter still set):
  const withKey: Record<string, string> = {};
  for (const pref of EXECUTION_PREFERENCES) {
    process.env.EXECUTION_PREFERENCE = pref;
    withKey[pref] = resolveExecution("extractor").effectiveMode; // structured tier
  }
  check("matrix(key): manual_only → manual", withKey.manual_only === "manual");
  check("matrix(key): api_only → api", withKey.api_only === "api");
  check("matrix(key): smart structured → api", withKey.smart === "api");
  check("matrix(key): api_first → api", withKey.api_first_manual_fallback === "api");
  check("matrix(key): manual_first → manual", withKey.manual_first_api_optional === "manual");

  // Smart: quality steps stay Manual even WITH a key.
  process.env.EXECUTION_PREFERENCE = "smart";
  const qualityModes = (["analyzer", "generator", "critic", "reviser", "planner", "inspiration"] as const)
    .map((k) => resolveExecution(k).effectiveMode);
  check("smart: ALL quality steps → manual despite key", qualityModes.every((m) => m === "manual"));
  const structuredModes = (["extractor", "goalProfile", "curator", "voice", "compare"] as const)
    .map((k) => resolveExecution(k).effectiveMode);
  check("smart: ALL structured steps → api with key", structuredModes.every((m) => m === "api"));

  // Per-step override beats preference (both directions).
  check("override: api beats smart-quality", resolveExecution("generator", "api").effectiveMode === "api");
  check("override: manual beats smart-structured", resolveExecution("extractor", "manual").effectiveMode === "manual");
  check("override: receipt reason recorded", resolveExecution("generator", "api").reason === "step_override_api");

  // ZERO keys:
  clearKeys();
  const zeroKey: Record<string, string> = {};
  for (const pref of EXECUTION_PREFERENCES) {
    process.env.EXECUTION_PREFERENCE = pref;
    zeroKey[pref] = resolveExecution("extractor").effectiveMode;
  }
  check(
    "matrix(zero-key): manual everywhere except api_only",
    zeroKey.manual_only === "manual" && zeroKey.smart === "manual" &&
      zeroKey.api_first_manual_fallback === "manual" && zeroKey.manual_first_api_optional === "manual",
  );
  check("matrix(zero-key): api_only still resolves api (errors at run time, no silent downgrade)", zeroKey.api_only === "api");
  process.env.EXECUTION_PREFERENCE = "smart";
  check("zero-key: api override degrades to manual with reason", resolveExecution("generator", "api").reason === "override_api_but_no_key");

  // ── 3. Error classification ─────────────────────────────────────────────────
  const { classifyApiError, apiTimeoutMs } = await import("@/lib/models/backends/apiBackend");
  check("classify: 429 → rate_limited", classifyApiError(new Error("Status 429: rate limit exceeded")) === "rate_limited");
  const t = new Error("The operation timed out"); t.name = "TimeoutError";
  check("classify: timeout", classifyApiError(t) === "timeout");
  check("classify: schema mismatch → invalid_json", classifyApiError(new Error("response did not match schema: No object generated")) === "invalid_json");
  check("classify: 401 → auth_error", classifyApiError(new Error("401 Unauthorized: invalid api key")) === "auth_error");
  check("classify: unknown → provider_error", classifyApiError(new Error("boom")) === "provider_error");
  process.env.API_TIMEOUT_MS = "12345";
  check("timeout: API_TIMEOUT_MS honored", apiTimeoutMs() === 12345);
  delete process.env.API_TIMEOUT_MS;
  check("timeout: default 90s", apiTimeoutMs() === 90000);

  // ── 4. Live fallback: bad OpenRouter key → Manual with receipt ──────────────
  const { executeAgent } = await import("@/lib/models/execute");
  process.env.OPENROUTER_API_KEY = "sk-or-invalid-for-fallback-test";
  process.env.EXECUTION_PREFERENCE = "api_first_manual_fallback";
  process.env.API_TIMEOUT_MS = "20000";
  const exec = await executeAgent("extractor", { analysis: { macro_structure: "x" }, genre: "test" });
  check("fallback: openrouter failure degrades to manual", exec.mode === "manual");
  check("fallback: apiError present", typeof exec.apiError === "string" && exec.apiError.length > 0);
  check("fallback: receipt attempted openrouter", exec.receipt.attemptedProvider === "openrouter");
  check("fallback: receipt has classified reason", ["auth_error", "provider_error", "rate_limited", "timeout", "invalid_json"].includes(exec.receipt.fallbackReason ?? ""));
  check("fallback: receipt final provider null (nothing produced)", exec.receipt.finalProvider === null);

  // ── 5. api_only: failure errors loudly, no fallback ─────────────────────────
  process.env.EXECUTION_PREFERENCE = "api_only";
  let apiOnlyError = "";
  try {
    await executeAgent("extractor", { analysis: { macro_structure: "x" } });
  } catch (e) {
    apiOnlyError = (e as Error).message;
  }
  check("api_only: failure throws instead of falling back", apiOnlyError.includes("api_only"));

  clearKeys();
  let noKeyError = "";
  try {
    await executeAgent("extractor", { analysis: { macro_structure: "x" } });
  } catch (e) {
    noKeyError = (e as Error).message;
  }
  check("api_only: zero keys errors with guidance", noKeyError.includes("no provider API key"));
  delete process.env.EXECUTION_PREFERENCE;
  delete process.env.API_TIMEOUT_MS;

  // ── 6. Receipts persisted (Supabase) ────────────────────────────────────────
  const { getDb } = await import("@/lib/db/client");
  const db = getDb();
  if (!db) {
    console.log("\n(Supabase not configured — skipping receipt persistence check.)");
    done("execution-infra");
    return;
  }
  const { logPipelineStep } = await import("@/lib/pipeline/log");
  const runId = await logPipelineStep({
    agentId: "extractor",
    mode: "manual",
    input: { t: 1 },
    output: { t: 1 },
    manualModel: "exec-verification",
    latencyMs: 777,
    schemaValid: true,
    receipt: {
      requestedMode: "api",
      effectiveMode: "manual",
      attemptedProvider: "openrouter",
      attemptedModel: "openrouter/auto",
      finalProvider: null,
      finalModel: null,
      fallbackReason: "rate_limited",
    },
  });
  const { data: row } = await db
    .from("pipeline_runs")
    .select("requested_mode, attempted_provider, attempted_model, final_provider, fallback_reason, schema_valid, latency_ms")
    .eq("id", runId!)
    .single();
  check("receipt: requested vs effective persisted", row?.requested_mode === "api");
  check("receipt: attempted provider/model persisted", row?.attempted_provider === "openrouter" && row?.attempted_model === "openrouter/auto");
  check("receipt: fallback reason persisted", row?.fallback_reason === "rate_limited");
  check("receipt: schema_valid + latency persisted", row?.schema_valid === true && row?.latency_ms === 777);

  await db.from("pipeline_runs").delete().eq("id", runId!);
  console.log("\nCleaned up verification rows.");
  done("execution-infra");
}

main().catch((e) => {
  console.error("Verification crashed:", e);
  process.exit(1);
});
