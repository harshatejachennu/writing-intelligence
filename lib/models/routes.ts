/**
 * MODEL_ROUTES — one entry per agent. Each route declares a preferred provider +
 * model AND an execution mode. Mode is resolved at runtime: if a route prefers
 * `api` but no API key exists for its provider, it transparently falls back to
 * Manual Mode. The whole system therefore runs with zero API keys.
 */

export type Provider = "anthropic" | "openai" | "google";
export type ExecutionMode = "manual" | "api";

export interface ModelRoute {
  provider: Provider;
  /** Provider-native model id, used only in API mode. */
  model: string;
  /** Preferred mode. Downgraded to "manual" when the provider key is absent. */
  mode: ExecutionMode;
}

/**
 * Routing philosophy (see plan §5): route by JOB, not one runtime model.
 *  - Analytical agents (analyzer/critic/planner) -> strong reasoning (Opus).
 *  - Creative generation -> writing-strong (Fable 5).
 *  - Cheap classification (intent/safety) -> Haiku.
 * Every route defaults to `api` intent, but with no keys they all run manual.
 */
export const MODEL_ROUTES = {
  analyzer: { provider: "anthropic", model: "claude-opus-4-8", mode: "api" },
  extractor: { provider: "anthropic", model: "claude-opus-4-8", mode: "api" },
  intent: { provider: "anthropic", model: "claude-haiku-4-5-20251001", mode: "api" },
  goalProfile: { provider: "anthropic", model: "claude-sonnet-5", mode: "api" },
  planner: { provider: "anthropic", model: "claude-opus-4-8", mode: "api" },
  generator: { provider: "anthropic", model: "claude-fable-5", mode: "api" },
  critic: { provider: "anthropic", model: "claude-opus-4-8", mode: "api" },
  reviser: { provider: "anthropic", model: "claude-fable-5", mode: "api" },
  safety: { provider: "anthropic", model: "claude-haiku-4-5-20251001", mode: "api" },
  curator: { provider: "anthropic", model: "claude-sonnet-5", mode: "api" },
  voice: { provider: "anthropic", model: "claude-sonnet-5", mode: "api" },
  compare: { provider: "anthropic", model: "claude-opus-4-8", mode: "api" },
  inspiration: { provider: "anthropic", model: "claude-fable-5", mode: "api" },
} satisfies Record<string, ModelRoute>;

export type RouteKey = keyof typeof MODEL_ROUTES;

const KEY_ENV: Record<Provider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};

/** Is an API key configured for this provider? (server-side only) */
export function hasApiKey(provider: Provider): boolean {
  const v = process.env[KEY_ENV[provider]];
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Per-route env overrides — the "swap a model with no code change" contract.
 * MODEL_ROUTES_JSON is a JSON object of partial routes keyed by RouteKey, e.g.
 *   MODEL_ROUTES_JSON={"generator":{"provider":"openai","model":"gpt-4o"}}
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
 * Resolve the effective mode for a route given current env. A route can only be
 * "api" if it asked for it AND its provider key is present; otherwise "manual".
 */
export function resolveMode(key: RouteKey): ExecutionMode {
  const route = getRoute(key);
  if (route.mode === "api" && hasApiKey(route.provider)) return "api";
  return "manual";
}
