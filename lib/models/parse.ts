/**
 * Robust parsing of model responses that arrive as free-form pasted text
 * (Manual Mode). Chat UIs wrap JSON in markdown fences, add preamble like
 * "Sure! Here's the JSON:", or append trailing notes. We strip all of that,
 * extract the outermost JSON object, and hand the result to Zod for validation.
 */

import { z, type ZodType } from "zod";

/** Remove ```json ... ``` fences and surrounding chatter, return the JSON slice. */
export function extractJson(raw: string): string | null {
  if (!raw) return null;
  let text = raw.trim();

  // Strip a leading/trailing fenced code block if present.
  const fence = text.match(/```(?:json|jsonc)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) text = fence[1].trim();

  // Find the outermost balanced { ... } (handles preamble/trailing prose and
  // ignores braces that appear inside strings).
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; stage: "extract" | "parse" | "schema"; errors: string[]; raw: string };

/** Extract -> JSON.parse -> Zod validate a pasted (or API) response. */
export function validateResponse<T>(schema: ZodType<T>, raw: string): ValidationResult<T> {
  const slice = extractJson(raw);
  if (slice === null) {
    return {
      ok: false,
      stage: "extract",
      errors: ["No JSON object found in the response."],
      raw,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(slice);
  } catch (e) {
    return {
      ok: false,
      stage: "parse",
      errors: [`Response is not valid JSON: ${(e as Error).message}`],
      raw,
    };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      stage: "schema",
      errors: flattenZodErrors(result.error),
      raw,
    };
  }
  return { ok: true, data: result.data };
}

/** Human-readable "path: message" lines from a ZodError. */
export function flattenZodErrors(err: z.ZodError): string[] {
  return err.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
}

/**
 * Build a "fix-it" prompt the user can paste back to the model to repair an
 * invalid response — includes the schema, the errors, and the bad output.
 */
export function buildFixItPrompt(args: {
  schemaHint: string;
  errors: string[];
  badOutput: string;
}): string {
  return [
    "Your previous response did not match the required JSON schema.",
    "",
    "Required schema (shape):",
    args.schemaHint,
    "",
    "Validation errors:",
    ...args.errors.map((e) => `- ${e}`),
    "",
    "Your previous output was:",
    args.badOutput.trim(),
    "",
    "Return ONLY corrected, valid JSON matching the schema. No prose, no markdown fences.",
  ].join("\n");
}
