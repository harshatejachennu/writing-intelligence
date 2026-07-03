import { z } from "zod";

/**
 * Comparison verdict — two texts judged against each other (and optionally a
 * goal profile). Answers the plan's questions: what improved, what got worse,
 * which version better achieves the intended reader effect, and where to go.
 */

export const ComparisonSchema = z.object({
  what_improved: z.array(z.string().min(1)),
  what_got_worse: z.array(z.string().min(1)),
  dimension_verdicts: z
    .array(
      z.object({
        dimension: z.string().min(1), // clarity | tension | voice | ...
        winner: z.enum(["left", "right", "tie"]),
        evidence: z.string().min(1),
      }),
    )
    .min(3),
  reader_effect_winner: z.enum(["left", "right", "tie"]),
  overall_winner: z.enum(["left", "right", "tie"]),
  reasoning: z.string().min(1),
  recommended_direction: z.string().min(1),
});

export type Comparison = z.infer<typeof ComparisonSchema>;

export const COMPARISON_SCHEMA_HINT = `{
  "what_improved": ["specific things RIGHT does better than LEFT"],
  "what_got_worse": ["specific things RIGHT does worse than LEFT"],
  "dimension_verdicts": [
    { "dimension": "clarity | tension | voice | structure | ...", "winner": "left|right|tie", "evidence": "quote or reference" }
  ],
  "reader_effect_winner": "left|right|tie",
  "overall_winner": "left|right|tie",
  "reasoning": "why, grounded in the texts",
  "recommended_direction": "what the final version should take from each"
}`;
