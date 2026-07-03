import { z } from "zod";

/**
 * Revision agent output — revises ONLY the flagged weakness, and accounts for
 * exactly what changed so before/after comparison is possible.
 */

export const RevisionSchema = z.object({
  revised_text: z.string().min(1),
  change_summary: z.string().min(1),
  changes: z
    .array(
      z.object({
        before: z.string().min(1),
        after: z.string().min(1),
        why: z.string().min(1),
      }),
    )
    .min(1),
  what_was_not_changed: z.string().min(1),
});

export type Revision = z.infer<typeof RevisionSchema>;

export const REVISION_SCHEMA_HINT = `{
  "revised_text": "the full revised text",
  "change_summary": "one-paragraph summary of what changed and why",
  "changes": [{ "before": "original phrase/passage", "after": "revised phrase/passage", "why": "string" }],
  "what_was_not_changed": "what was deliberately left alone (to avoid over-polishing)"
}`;
