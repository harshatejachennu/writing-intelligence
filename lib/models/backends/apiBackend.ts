import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import type { ZodType } from "zod";
import type { Provider } from "@/lib/models/routes";

/** Per-call timeout (ms) for API mode. Env-tunable; generous default. */
export function apiTimeoutMs(): number {
  const raw = Number(process.env.API_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 90_000;
}

/** Resolve a provider-agnostic model handle for the Vercel AI SDK. */
function resolveModel(provider: Provider, model: string) {
  switch (provider) {
    case "anthropic":
      return anthropic(model);
    case "openai":
      return openai(model);
    case "google":
      return google(model);
    case "openrouter": {
      // OpenRouter speaks the OpenAI protocol; model ids pass through verbatim
      // (e.g. "openrouter/auto", "openrouter/free", "meta-llama/llama-3.3-70b-instruct:free").
      const openrouter = createOpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
        headers: {
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "writing-intelligence",
        },
      });
      return openrouter(model);
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export interface ApiRunResult<T> {
  data: T;
  usage?: { promptTokens?: number; completionTokens?: number };
  rawModel: string;
}

/**
 * API-mode execution: structured output enforced by the provider via
 * generateObject(schema). This is the ONLY place that talks to a live provider.
 * Throws on provider errors, rate limits, timeouts, and schema-invalid output —
 * the caller decides whether to fall back to Manual Mode (executeAgent does,
 * unless the api_only preference forbids it).
 */
export async function runApi<T>(args: {
  target: { provider: Provider; model: string };
  schema: ZodType<T>;
  system: string;
  user: string;
}): Promise<ApiRunResult<T>> {
  const model = resolveModel(args.target.provider, args.target.model);
  const { object, usage } = await generateObject({
    model,
    schema: args.schema,
    system: args.system,
    prompt: args.user,
    abortSignal: AbortSignal.timeout(apiTimeoutMs()),
  });
  return {
    data: object,
    usage: usage
      ? { promptTokens: usage.promptTokens, completionTokens: usage.completionTokens }
      : undefined,
    rawModel: `${args.target.provider}:${args.target.model}`,
  };
}

/** Classify an API failure for the route receipt's fallback_reason. */
export function classifyApiError(e: unknown): string {
  const msg = (e as Error)?.message ?? String(e);
  const name = (e as Error)?.name ?? "";
  if (name === "TimeoutError" || name === "AbortError" || /timed? ?out|aborted/i.test(msg)) return "timeout";
  if (/429|rate.?limit|quota/i.test(msg)) return "rate_limited";
  if (/does not match|schema|validation|parse|invalid json|No object generated/i.test(msg)) return "invalid_json";
  if (/401|403|api.?key|authentication|unauthorized/i.test(msg)) return "auth_error";
  return "provider_error";
}
