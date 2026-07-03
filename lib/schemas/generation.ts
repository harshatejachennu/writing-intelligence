import { z } from "zod";

/**
 * Generator output — the draft plus its own accounting: which techniques were
 * used where, why, known weaknesses, and the suggested next revision.
 */

export const UsedTechnique = z.object({
  technique: z.string().min(1),
  where: z.string().min(1),
  intended_effect: z.string().min(1),
});

export const GenerationSchema = z.object({
  text: z.string().min(1),
  techniques_used: z.array(UsedTechnique).min(1),
  choices_explained: z.string().min(1),
  possible_weaknesses: z.array(z.string().min(1)).min(1),
  suggested_revision_path: z.string().min(1),
  /** Always true — output is a draft, never a finished submission. */
  is_draft: z.boolean(),
});

export type Generation = z.infer<typeof GenerationSchema>;

export const GENERATION_SCHEMA_HINT = `{
  "text": "the full generated draft",
  "techniques_used": [{ "technique": "name", "where": "which part", "intended_effect": "what it should do to the reader" }],
  "choices_explained": "why the draft is built the way it is",
  "possible_weaknesses": ["honest weaknesses of this draft"],
  "suggested_revision_path": "the single most valuable next revision",
  "is_draft": true
}`;
