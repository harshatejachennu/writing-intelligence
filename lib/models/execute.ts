/**
 * The execution core. One interface over both backends. Agents, API routes, and
 * the pipeline runner only ever call these functions — never a backend directly.
 */

import { getAgent } from "@/lib/agents/registry";
import { getRoute, resolveMode, type ExecutionMode, type RouteKey } from "./routes";
import { renderPrompt, ingestResponse, type RenderedPrompt } from "./backends/manualBackend";
import { runApi } from "./backends/apiBackend";
import type { ValidationResult } from "./parse";

export interface BuiltPrompt {
  agentId: string;
  route: RouteKey;
  mode: ExecutionMode;
  system: string;
  user: string;
  copyText: string;
  schemaHint: string;
}

/** Build the exact prompt for an agent + input, plus its resolved mode. */
export function buildAgentPrompt(agentId: string, input: unknown): BuiltPrompt {
  const agent = getAgent(agentId);
  const { system, user } = agent.buildPrompt(input);
  const rendered: RenderedPrompt = renderPrompt({ system, user });
  return {
    agentId,
    route: agent.route,
    mode: resolveMode(agent.route),
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

export interface ExecuteResult<T> {
  mode: ExecutionMode;
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
 *  - API mode: call the provider, validate via schema, return data.
 *  - Manual mode: return the built prompt for the UI (no provider contacted).
 */
export async function executeAgent<T = unknown>(
  agentId: string,
  input: unknown,
): Promise<ExecuteResult<T>> {
  const built = buildAgentPrompt(agentId, input);

  if (built.mode === "manual") {
    return { mode: "manual", prompt: built };
  }

  const agent = getAgent(agentId);
  const route = getRoute(agent.route);
  try {
    const result = await runApi<T>({
      route,
      schema: agent.schema,
      system: built.system,
      user: built.user,
    });
    return {
      mode: "api",
      data: result.data,
      usage: result.usage,
      rawModel: result.rawModel,
    };
  } catch (e) {
    // Provider down / bad key / model unavailable → degrade to Manual Mode
    // instead of a dead end. The UI shows the copy box plus the API error.
    return {
      mode: "manual",
      prompt: { ...built, mode: "manual" },
      apiError: (e as Error).message,
    };
  }
}

export type { ValidationResult };
