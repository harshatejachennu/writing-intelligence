import {
  MODEL_ROUTES,
  getRoute,
  resolveExecution,
  getExecutionPreference,
  openrouterDefaultModel,
  hasApiKey,
  type RouteKey,
  type Provider,
} from "@/lib/models/routes";
import { isDbConfigured } from "@/lib/db/client";
import { canEmbed } from "@/lib/retrieval/embed";

export const dynamic = "force-dynamic";

const PROVIDERS: Provider[] = ["anthropic", "openrouter", "openai", "google"];

const PREFERENCE_BEHAVIOR: Record<string, string> = {
  manual_only: "Every step runs Manual. API is never called.",
  api_only: "Every step runs API. Failures ERROR — no Manual fallback.",
  smart: "Quality steps (analyzer, planner, generator, critic, reviser, inspiration) run Manual; structured steps run API when a key exists.",
  api_first_manual_fallback: "API when a key exists; Manual otherwise. API failures (timeout, rate limit, invalid JSON) fall back to Manual.",
  manual_first_api_optional: "Manual by default; API available as a per-step opt-in when a key exists.",
};

export default async function SettingsPage() {
  const routeKeys = Object.keys(MODEL_ROUTES) as RouteKey[];

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Effective model routing and environment status. Everything is configured via
          env vars — no keys are ever stored in the database.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <h2 className="text-sm font-medium">Environment</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {PROVIDERS.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <Dot ok={hasApiKey(p)} />
              <span className="font-mono text-xs">{p}</span>
              <span className="text-slate-500">
                {hasApiKey(p) ? "key configured — API mode available" : "no key — Manual Mode"}
                {p === "openrouter" && hasApiKey(p) && (
                  <> · default model <code>{openrouterDefaultModel()}</code></>
                )}
              </span>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <Dot ok={isDbConfigured()} />
            <span className="font-mono text-xs">supabase</span>
            <span className="text-slate-500">
              {isDbConfigured() ? "connected — runs are persisted" : "not configured — nothing saved"}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Dot ok={canEmbed()} />
            <span className="font-mono text-xs">embeddings</span>
            <span className="text-slate-500">
              {canEmbed() ? "semantic search enabled" : "text-search fallback (add OPENAI_API_KEY)"}
            </span>
          </li>
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <h2 className="text-sm font-medium">Execution preference</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-xs text-white dark:bg-slate-100 dark:text-slate-900">
            {getExecutionPreference()}
          </span>
          <span className="text-slate-600 dark:text-slate-400">
            {PREFERENCE_BEHAVIOR[getExecutionPreference()]}
          </span>
        </div>
        <div className="mt-3 rounded bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-400">
          Set via <code>EXECUTION_PREFERENCE</code> (manual_only · api_only · smart ·
          api_first_manual_fallback · manual_first_api_optional). Every workflow page has a
          mode bar, and each step has its own auto/manual/api override.
          <br />
          <strong>Fallback behavior:</strong> API failures (provider error, rate limit,
          timeout, invalid JSON) degrade to Manual Mode with the reason shown and recorded
          in the run&rsquo;s route receipt — except under <code>api_only</code>, which errors
          loudly instead.
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <h2 className="text-sm font-medium">Model routes (per agent)</h2>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-1 pr-4">Agent</th>
              <th className="py-1 pr-4">Provider</th>
              <th className="py-1 pr-4">Model</th>
              <th className="py-1 pr-4">Smart tier</th>
              <th className="py-1 pr-4">Effective mode</th>
              <th className="py-1">Overridden</th>
            </tr>
          </thead>
          <tbody>
            {routeKeys.map((k) => {
              const eff = getRoute(k);
              const base = MODEL_ROUTES[k];
              const overridden =
                eff.provider !== base.provider || eff.model !== base.model || eff.mode !== base.mode;
              const resolution = resolveExecution(k);
              return (
                <tr key={k} className="border-t border-slate-100 dark:border-slate-900">
                  <td className="py-1.5 pr-4 font-mono text-xs">{k}</td>
                  <td className="py-1.5 pr-4">{eff.provider}</td>
                  <td className="py-1.5 pr-4 font-mono text-xs">{eff.model}</td>
                  <td className="py-1.5 pr-4 text-xs text-slate-500">{eff.smartTier}</td>
                  <td className="py-1.5 pr-4">
                    <span
                      title={resolution.reason}
                      className={`rounded px-1.5 py-0.5 text-xs ${
                        resolution.effectiveMode === "api"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400"
                      }`}
                    >
                      {resolution.effectiveMode}
                    </span>
                    {resolution.target && resolution.target.provider !== eff.provider && (
                      <span className="ml-1 text-xs text-slate-400">
                        via {resolution.target.provider}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-xs text-slate-500">{overridden ? "env" : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-3 rounded bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-400">
          Override any route without code changes via <code>MODEL_ROUTES_JSON</code>, e.g.{" "}
          <code>
            {`MODEL_ROUTES_JSON='{"generator":{"provider":"openrouter","model":"openrouter/auto"}}'`}
          </code>
          . Partial overrides merge with the defaults above. OpenRouter model ids pass
          through verbatim (<code>openrouter/auto</code>, <code>openrouter/free</code>,{" "}
          <code>vendor/model:free</code>, …); routes falling through to OpenRouter without
          an explicit id use <code>OPENROUTER_DEFAULT_MODEL</code>.
        </div>
      </section>
    </main>
  );
}

function Dot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}
    />
  );
}
