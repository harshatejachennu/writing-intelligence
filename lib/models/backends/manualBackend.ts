import type { ZodType } from "zod";
import { validateResponse, buildFixItPrompt, type ValidationResult } from "@/lib/models/parse";

/**
 * Manual-mode execution has two halves:
 *  1. render() — produce the exact prompt for the user to copy into any chatbot.
 *  2. ingest() — validate the pasted response against the same Zod schema and,
 *     on failure, produce a fix-it prompt to paste back for repair.
 * No provider is ever contacted here.
 */

export interface RenderedPrompt {
  system: string;
  user: string;
  /** Convenience: the full copy-paste block (system + user together). */
  copyText: string;
}

export function renderPrompt(args: { system: string; user: string }): RenderedPrompt {
  const copyText = `${args.system}\n\n${args.user}`;
  return { system: args.system, user: args.user, copyText };
}

export interface IngestResult<T> {
  validation: ValidationResult<T>;
  /** Present only when validation failed — paste this back to the model. */
  fixItPrompt?: string;
}

export function ingestResponse<T>(args: {
  schema: ZodType<T>;
  schemaHint: string;
  pastedText: string;
}): IngestResult<T> {
  const validation = validateResponse(args.schema, args.pastedText);
  if (validation.ok) return { validation };

  return {
    validation,
    fixItPrompt: buildFixItPrompt({
      schemaHint: args.schemaHint,
      errors: validation.errors,
      badOutput: args.pastedText,
    }),
  };
}
