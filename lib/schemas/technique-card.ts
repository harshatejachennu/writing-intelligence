import { z } from "zod";

/**
 * Technique card — the durable, reusable asset of the whole system.
 * Extracted from analyses; stored in the library; retrieved for generation.
 */

export const GenreAdaptation = z.object({
  genre: z.string().min(1),
  guidance: z.string().min(1),
});

export const TechniqueCardSchema = z.object({
  technique_name: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, "must be snake_case (e.g. consequence_before_context)"),
  plain_name: z.string().min(1),
  function: z.string().min(1),
  reader_effect: z.array(z.string().min(1)).min(1),
  genre_fit: z.array(z.string().min(1)).min(1),
  when_to_use: z.string().min(1),
  when_not_to_use: z.string().min(1),
  transfer_rule: z.string().min(1),
  bad_use_warning: z.string().min(1),
  genre_adaptations: z.array(GenreAdaptation),
  revision_instruction: z.string().min(1),
  evaluation_criteria: z.array(z.string().min(1)).min(1),
});

export type TechniqueCard = z.infer<typeof TechniqueCardSchema>;

/** Extractor output: 1–6 cards (quality over quantity). */
export const ExtractionSchema = z.object({
  cards: z.array(TechniqueCardSchema).min(1).max(6),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

export const EXTRACTION_SCHEMA_HINT = `{
  "cards": [
    {
      "technique_name": "snake_case_id (e.g. consequence_before_context)",
      "plain_name": "Show the result before explaining the background",
      "function": "what this technique DOES mechanically",
      "reader_effect": ["curiosity", "tension"],
      "genre_fit": ["fiction_opening", "personal_essay", "speech"],
      "when_to_use": "string",
      "when_not_to_use": "string",
      "transfer_rule": "how to apply it to NEW writing, one clear rule",
      "bad_use_warning": "how this technique fails when misapplied",
      "genre_adaptations": [{ "genre": "technical_writing", "guidance": "string" }],
      "revision_instruction": "an imperative instruction a reviser could follow",
      "evaluation_criteria": ["how to check the technique worked"]
    }
  ]
}`;

/** The text we embed + search over (plan §4: name + function + effects + genres + when_to_use). */
export function cardSummaryText(card: TechniqueCard): string {
  return [
    card.plain_name,
    card.function,
    card.reader_effect.join(", "),
    card.genre_fit.join(", "),
    card.when_to_use,
  ].join(" | ");
}
