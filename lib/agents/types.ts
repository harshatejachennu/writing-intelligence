import type { ZodType } from "zod";
import type { RouteKey } from "@/lib/models/routes";

/**
 * An Agent is a pure definition: how to build its prompt, the Zod schema its
 * output must satisfy, and a human/LLM-facing schema hint (JSON skeleton) shown
 * in Manual Mode. The SAME definition drives both Manual and API execution.
 */
export interface AgentDef<Input, Output> {
  id: string;
  /** Which MODEL_ROUTES entry governs model + mode. */
  route: RouteKey;
  /** One-line description for UI. */
  description: string;
  /** Build the system + user prompt from typed input. */
  buildPrompt(input: Input): { system: string; user: string };
  /** Zod schema used to validate output in BOTH modes. */
  schema: ZodType<Output>;
  /** Readable JSON skeleton embedded in the prompt + fix-it prompt. */
  schemaHint: string;
}

/** Shared prompt footer enforcing the JSON contract (backend-agnostic). */
export function jsonContract(schemaHint: string): string {
  return [
    "",
    "OUTPUT FORMAT:",
    "Return ONLY a single valid JSON object matching this shape. No prose before",
    "or after it. No markdown code fences.",
    "",
    schemaHint,
  ].join("\n");
}
