/**
 * MODEL_ROUTES — one entry per agent. Each route declares a preferred provider +
 * model AND an execution mode. Mode is resolved at runtime through the global
 * EXECUTION_PREFERENCE plus optional per-request overrides; with no API keys
 * everything runs in Manual Mode. The whole system works with zero keys.
 */

export type Provider = "anthropic" | "openai" | "google" | "openrouter";
export type ExecutionMode = "manual" | "api";

/**
 * Global execution preference (env EXECUTION_PREFERENCE, default "smart"):
 *  - manual_only               → every step Manual, always.
 *  - api_only                  → every step API; failures ERROR (no fallback).
 *  - smart                     → quality-critical steps Manual, simple
 *                                structured steps API (when a key exists).
 *  - api_first_manual_fallback → API when keyed, Manual otherwise/on failure.
 *  - manual_first_api_optional → Manual by default; API available as a
 *                                per-step opt-in when a key exists.
 */
export const EXECUTION_PREFERENCES = [
  "manual_only",
  "api_only",
  "smart",
  "api_first_manual_fallback",
  "manual_first_api_optional",
] as const;
export type ExecutionPreference = (typeof EXECUTION_PREFERENCES)[number];

export function getExecutionPreference(): ExecutionPreference {
  const raw = (process.env.EXECUTION_PREFERENCE ?? "").trim() as ExecutionPreference;
  return EXECUTION_PREFERENCES.includes(raw) ? raw : "smart";
}

export interface ModelRoute {
  provider: Provider;
  /** Provider-native model id, used only in API mode. */
  model: string;
  /** Preferred mode. Downgraded to "manual" when the provider key is absent. */
  mode: ExecutionMode;
  /**
   * Smart-mode tier: "quality" steps default to Manual (deep reasoning /
   * creative work you want your best chat model on); "structured" steps
   * default to API (simpler JSON-shaping work).
   */
  smartTier: "quality" | "structured";
}

/**
 * Routing philosophy (see plan §5): route by JOB, not one runtime model.
 *  - Analytical agents (analyzer/critic/planner) -> strong reasoning (Opus).
 *  - Creative generation -> writing-strong (Fable 5).
 *  - Cheap classification (intent/safety) -> Haiku.
 */
export const MODEL_ROUTES = {
  analyzer: { provider: "anthropic", model: "claude-opus-4-8", mode: "api", smartTier: "quality" },
  extractor: { provider: "anthropic", model: "claude-opus-4-8", mode: "api", smartTier: "structured" },
  intent: { provider: "anthropic", model: "claude-haiku-4-5-20251001", mode: "api", smartTier: "structured" },
  goalProfile: { provider: "anthropic", model: "claude-sonnet-5", mode: "api", smartTier: "structured" },
  planner: { provider: "anthropic", model: "claude-opus-4-8", mode: "api", smartTier: "quality" },
  generator: { provider: "anthropic", model: "claude-fable-5", mode: "api", smartTier: "quality" },
  critic: { provider: "anthropic", model: "claude-opus-4-8", mode: "api", smartTier: "quality" },
  reviser: { provider: "anthropic", model: "claude-fable-5", mode: "api", smartTier: "quality" },
  safety: { provider: "anthropic", model: "claude-haiku-4-5-20251001", mode: "api", smartTier: "structured" },
  curator: { provider: "anthropic", model: "claude-sonnet-5", mode: "api", smartTier: "structured" },
  voice: { provider: "anthropic", model: "claude-sonnet-5", mode: "api", smartTier: "structured" },
  compare: { provider: "anthropic", model: "claude-opus-4-8", mode: "api", smartTier: "structured" },
  inspiration: { provider: "anthropic", model: "claude-fable-5", mode: "api", smartTier: "quality" },
} satisfies Record<string, ModelRoute>;

export type RouteKey = keyof typeof MODEL_ROUTES;

const KEY_ENV: Record<Provider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

/** Provider priority when the route's preferred provider has no key. */
const PROVIDER_FALLBACK_ORDER: Provider[] = ["anthropic", "openrouter", "openai", "google"];

/** Default model when a route is served by OpenRouter without an explicit id.
 * "openrouter/auto" lets OpenRouter pick; "openrouter/free" style ids and any
 * other OpenRouter model id are passed through verbatim. */
export function openrouterDefaultModel(): string {
  return process.env.OPENROUTER_DEFAULT_MODEL?.trim() || "openrouter/auto";
}

/** Is an API key configured for this provider? (server-side only) */
export function hasApiKey(provider: Provider): boolean {
  const v = process.env[KEY_ENV[provider]];
  return typeof v === "string" && v.trim().length > 0;
}

export function anyApiKey(): boolean {
  return PROVIDER_FALLBACK_ORDER.some(hasApiKey);
}

/**
 * Per-route env overrides — the "swap a model with no code change" contract.
 * MODEL_ROUTES_JSON is a JSON object of partial routes keyed by RouteKey, e.g.
 *   MODEL_ROUTES_JSON={"generator":{"provider":"openrouter","model":"openrouter/auto"}}
 * Unknown keys are ignored; invalid JSON is ignored with a console warning.
 */
function envOverrides(): Partial<Record<RouteKey, Partial<ModelRoute>>> {
  const raw = process.env.MODEL_ROUTES_JSON;
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    console.warn("[routes] MODEL_ROUTES_JSON is not valid JSON — ignoring");
    return {};
  }
}

/** The effective route for an agent: static default merged with env override. */
export function getRoute(key: RouteKey): ModelRoute {
  const override = envOverrides()[key];
  return override ? { ...MODEL_ROUTES[key], ...override } : MODEL_ROUTES[key];
}

/**
 * Which provider/model would actually serve an API call for this route:
 * the route's preferred provider when keyed; otherwise the first keyed
 * provider in fallback order (OpenRouter serves with its default model).
 * Returns null when no provider has a key.
 */
export function apiTarget(key: RouteKey): { provider: Provider; model: string } | null {
  const route = getRoute(key);
  if (hasApiKey(route.provider)) return { provider: route.provider, model: route.model };
  for (const p of PROVIDER_FALLBACK_ORDER) {
    if (hasApiKey(p)) {
      return { provider: p, model: p === "openrouter" ? openrouterDefaultModel() : route.model };
    }
  }
  return null;
}

/** Full resolution receipt for one step. */
export interface ExecutionResolution {
  requestedMode: ExecutionMode | "auto";
  effectiveMode: ExecutionMode;
  preference: ExecutionPreference;
  /** Why the effective mode is what it is (esp. when it differs from request). */
  reason: string;
  /** The provider/model an API call would use (null in manual mode / no keys). */
  target: { provider: Provider; model: string } | null;
}

/**
 * Resolve the effective execution mode for a route.
 *  - An explicit per-step override wins (API still requires a key).
 *  - Otherwise the global preference decides (see EXECUTION_PREFERENCES).
 *  - api_only NEVER silently downgrades: with no key it still resolves "api"
 *    so the failure surfaces as an error instead of a hidden fallback.
 */
export function resolveExecution(
  key: RouteKey,
  override?: ExecutionMode | "auto" | null,
): ExecutionResolution {
  const preference = getExecutionPreference();
  const target = apiTarget(key);
  const requestedMode = override && override !== "auto" ? override : ("auto" as const);

  // Explicit per-step override.
  if (override === "manual") {
    return { requestedMode, effectiveMode: "manual", preference, reason: "step_override_manual", target: null };
  }
  if (override === "api") {
    if (target) return { requestedMode, effectiveMode: "api", preference, reason: "step_override_api", target };
    return { requestedMode, effectiveMode: "manual", preference, reason: "override_api_but_no_key", target: null };
  }

  // Global preference.
  switch (preference) {
    case "manual_only":
      return { requestedMode, effectiveMode: "manual", preference, reason: "preference_manual_only", target: null };
    case "api_only":
      // Never downgrade; surfaces an error at execution time if no key.
      return {
        requestedMode,
        effectiveMode: "api",
        preference,
        reason: target ? "preference_api_only" : "api_only_but_no_key",
        target,
      };
    case "smart": {
      const tier = getRoute(key).smartTier;
      if (tier === "quality") {
        return { requestedMode, effectiveMode: "manual", preference, reason: "smart_quality_step", target: null };
      }
      if (target) {
        return { requestedMode, effectiveMode: "api", preference, reason: "smart_structured_step", target };
      }
      return { requestedMode, effectiveMode: "manual", preference, reason: "smart_structured_no_key", target: null };
    }
    case "api_first_manual_fallback":
      if (target) return { requestedMode, effectiveMode: "api", preference, reason: "api_first_keyed", target };
      return { requestedMode, effectiveMode: "manual", preference, reason: "api_first_no_key", target: null };
    case "manual_first_api_optional":
      return { requestedMode, effectiveMode: "manual", preference, reason: "manual_first_default", target: null };
  }
}

/**
 * Legacy single-answer mode resolution (no override) — kept for existing
 * callers; delegates to resolveExecution.
 */
export function resolveMode(key: RouteKey): ExecutionMode {
  return resolveExecution(key).effectiveMode;
}
