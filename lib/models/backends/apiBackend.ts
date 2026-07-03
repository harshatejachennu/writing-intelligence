import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import type { ZodType } from "zod";
import type { ModelRoute, Provider } from "@/lib/models/routes";

/** Resolve a provider-agnostic model handle for the Vercel AI SDK. */
function resolveModel(provider: Provider, model: string) {
  switch (provider) {
    case "anthropic":
      return anthropic(model);
    case "openai":
      return openai(model);
    case "google":
      return google(model);
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
 */
export async function runApi<T>(args: {
  route: ModelRoute;
  schema: ZodType<T>;
  system: string;
  user: string;
}): Promise<ApiRunResult<T>> {
  const model = resolveModel(args.route.provider, args.route.model);
  const { object, usage } = await generateObject({
    model,
    schema: args.schema,
    system: args.system,
    prompt: args.user,
  });
  return {
    data: object,
    usage: usage
      ? { promptTokens: usage.promptTokens, completionTokens: usage.completionTokens }
      : undefined,
    rawModel: `${args.route.provider}:${args.route.model}`,
  };
}
