import { z } from "zod";

/**
 * Masterpiece Inspiration Mode output — a synthetic "north-star" model piece
 * for STUDYING structure and technique, never for submission. The
 * is_synthetic_not_for_submission literal is the data-level watermark; the UI
 * renders it as a persistent banner.
 */

export const InspirationSchema = z.object({
  inspiration_model: z.string().min(1),
  technique_breakdown: z
    .array(
      z.object({
        technique: z.string().min(1),
        where: z.string().min(1),
        effect: z.string().min(1),
      }),
    )
    .min(2),
  transfer_blueprint: z.array(z.string().min(1)).min(2),
  copy_structurally: z.array(z.string().min(1)).min(1),
  do_not_copy: z.array(z.string().min(1)).min(1),
  risks: z.array(z.string().min(1)).min(1),
  adapt_to_task: z.string().min(1),
  is_synthetic_not_for_submission: z.literal(true),
});

export type Inspiration = z.infer<typeof InspirationSchema>;

export const INSPIRATION_SCHEMA_HINT = `{
  "inspiration_model": "the full synthetic model piece (fictional details are fine — it is a study object)",
  "technique_breakdown": [{ "technique": "name", "where": "which part", "effect": "what it does to the reader" }],
  "transfer_blueprint": ["ordered structural moves the user can reuse"],
  "copy_structurally": ["what is safe and useful to copy (structure, moves)"],
  "do_not_copy": ["what must NOT be copied (specific images, invented facts, voice)"],
  "risks": ["ways using this model could go wrong"],
  "adapt_to_task": "how to map the blueprint onto the user's real task",
  "is_synthetic_not_for_submission": true
}`;
