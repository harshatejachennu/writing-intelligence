/**
 * The execution core. One interface over both backends. Agents, API routes, and
 * the pipeline runner only ever call these functions — never a backend directly.
 */

import { getAgent } from "@/lib/agents/registry";
import {
  resolveExecution,
  type ExecutionMode,
  type ExecutionResolution,
  type RouteKey,
} from "./routes";
import { renderPrompt, ingestResponse, type RenderedPrompt } from "./backends/manualBackend";
import { runApi, classifyApiError } from "./backends/apiBackend";
import type { ValidationResult } from "./parse";

export interface BuiltPrompt {
  agentId: string;
  route: RouteKey;
  mode: ExecutionMode;
  resolution: ExecutionResolution;
  system: string;
  user: string;
  copyText: string;
  schemaHint: string;
}

/** Build the exact prompt for an agent + input, plus its resolved mode. */
export function buildAgentPrompt(
  agentId: string,
  input: unknown,
  modeOverride?: ExecutionMode | "auto" | null,
): BuiltPrompt {
  const agent = getAgent(agentId);
  const { system, user } = agent.buildPrompt(input);
  const rendered: RenderedPrompt = renderPrompt({ system, user });
  const resolution = resolveExecution(agent.route, modeOverride);
  return {
    agentId,
    route: agent.route,
    mode: resolution.effectiveMode,
    resolution,
    system,
    user,
    copyText: rendered.copyText,
    schemaHint: agent.schemaHint,
  };
}

/** Validate a pasted (Manual Mode) response against the agent's schema. */
export function ingestAgentResponse(agentId: string, pastedText: string) {
  const agent = getAgent(agentId);
  return ingestResponse({
    schema: agent.schema,
    schemaHint: agent.schemaHint,
    pastedText,
  });
}

/** Route receipt for one execution — persisted on pipeline_runs. */
export interface RouteReceipt {
  requestedMode: ExecutionMode | "auto";
  effectiveMode: ExecutionMode;
  attemptedProvider: string | null;
  attemptedModel: string | null;
  finalProvider: string | null;
  finalModel: string | null;
  fallbackReason: string | null;
}

export interface ExecuteResult<T> {
  mode: ExecutionMode;
  receipt: RouteReceipt;
  /** Only in API mode: validated data. In manual mode the caller ingests later. */
  data?: T;
  usage?: { promptTokens?: number; completionTokens?: number };
  rawModel?: string;
  /** Only in manual mode: the prompt to hand to the user. */
  prompt?: BuiltPrompt;
  /** Set when API mode failed and we fell back to manual. */
  apiError?: string;
}

/**
 * Run an agent end-to-end according to its resolved mode.
 *  - API mode: call the provider, validate via schema, return data. Failures
 *    (provider error / rate limit / timeout / invalid JSON) fall back to
 *    Manual Mode — EXCEPT under the api_only preference, which throws so the
 *    failure is loud instead of silently downgraded.
 *  - Manual mode: return the built prompt for the UI (no provider contacted).
 */
export async function executeAgent<T = unknown>(
  agentId: string,
  input: unknown,
  modeOverride?: ExecutionMode | "auto" | null,
): Promise<ExecuteResult<T>> {
  const built = buildAgentPrompt(agentId, input, modeOverride);
  const res = built.resolution;

  const baseReceipt: RouteReceipt = {
    requestedMode: res.requestedMode,
    effectiveMode: res.effectiveMode,
    attemptedProvider: res.target?.provider ?? null,
    attemptedModel: res.target?.model ?? null,
    finalProvider: null,
    finalModel: null,
    fallbackReason: null,
  };

  if (res.effectiveMode === "manual") {
    return {
      mode: "manual",
      prompt: built,
      receipt: {
        ...baseReceipt,
        attemptedProvider: null,
        attemptedModel: null,
        fallbackReason: res.reason === "override_api_but_no_key" ? "no_api_key" : null,
      },
    };
  }

  // API mode. api_only with no key is a hard error, never a silent downgrade.
  if (!res.target) {
    throw new Error(
      "Execution preference is api_only but no provider API key is configured " +
        "(set ANTHROPIC_API_KEY / OPENROUTER_API_KEY / OPENAI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY, " +
        "or change EXECUTION_PREFERENCE).",
    );
  }

  const agent = getAgent(agentId);
  try {
    const result = await runApi<T>({
      target: res.target,
      schema: agent.schema,
      system: built.system,
      user: built.user,
    });
    return {
      mode: "api",
      data: result.data,
      usage: result.usage,
      rawModel: result.rawModel,
      receipt: {
        ...baseReceipt,
        finalProvider: res.target.provider,
        finalModel: res.target.model,
      },
    };
  } catch (e) {
    const reason = classifyApiError(e);
    if (res.preference === "api_only") {
      // No fallback under api_only: surface the failure.
      throw new Error(`API call failed (${reason}) and EXECUTION_PREFERENCE=api_only forbids Manual fallback: ${(e as Error).message}`);
    }
    // Provider down / bad key / rate limit / timeout / invalid JSON → degrade
    // to Manual Mode instead of a dead end. The UI shows the copy box + error.
    return {
      mode: "manual",
      prompt: { ...built, mode: "manual" },
      apiError: (e as Error).message,
      receipt: { ...baseReceipt, effectiveMode: "manual", fallbackReason: reason },
    };
  }
}

export type { ValidationResult };
