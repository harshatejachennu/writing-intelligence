import { z } from "zod";

/**
 * Technique card — the durable, reusable asset of the whole system.
 * Extracted from analyses; stored in the library; retrieved for generation.
 *
 * Backward compatibility: cards saved before the Maria-essay calibration pass
 * lack card_role / specificity_level / transfer_difficulty / best_for_tasks,
 * so those are OPTIONAL on the base schema (stored cards keep parsing).
 * NEW extractions are validated against ExtractionCardSchema, where they are
 * required — see ExtractionSchema below.
 */

export const CARD_ROLES = ["core", "secondary", "failure_mode"] as const;
export const SPECIFICITY_LEVELS = ["obvious", "subtle", "advanced"] as const;
export const TRANSFER_DIFFICULTIES = ["low", "medium", "high"] as const;

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
  // ── Calibration fields (optional here for stored-card compat) ──────────────
  /** core = load-bearing; secondary = supporting; failure_mode = risk/anti-pattern. */
  card_role: z.enum(CARD_ROLES).optional(),
  /** How visible the technique is to an untrained reader. */
  specificity_level: z.enum(SPECIFICITY_LEVELS).optional(),
  /** How hard it is to apply well in new writing. */
  transfer_difficulty: z.enum(TRANSFER_DIFFICULTIES).optional(),
  /** Concrete task types this card helps with (across genres). */
  best_for_tasks: z.array(z.string().min(1)).optional(),
});

export type TechniqueCard = z.infer<typeof TechniqueCardSchema>;

/**
 * Strict card contract for NEW extractions: calibration fields required, and
 * genre_fit must span at least two genres — a card that only fits one genre
 * is a description of the source, not a transferable technique.
 */
export const ExtractionCardSchema = TechniqueCardSchema.extend({
  card_role: z.enum(CARD_ROLES),
  specificity_level: z.enum(SPECIFICITY_LEVELS),
  transfer_difficulty: z.enum(TRANSFER_DIFFICULTIES),
  best_for_tasks: z.array(z.string().min(1)).min(2),
  genre_fit: z.array(z.string().min(1)).min(2),
});

export type ExtractionCard = z.infer<typeof ExtractionCardSchema>;

/**
 * Extractor output: exactly 3 core + 3 secondary + 2 failure-mode cards.
 * Core = the techniques that make the passage work; secondary = present and
 * useful but supporting; failure_mode = risks/anti-patterns the passage courts
 * (or that imitating it would court), documented as avoidable techniques.
 */
export const ExtractionSchema = z
  .object({
    cards: z.array(ExtractionCardSchema).length(8),
  })
  .superRefine((val, ctx) => {
    const count = (role: string) => val.cards.filter((c) => c.card_role === role).length;
    if (count("core") !== 3 || count("secondary") !== 3 || count("failure_mode") !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cards"],
        message: `cards must contain exactly 3 core, 3 secondary, and 2 failure_mode techniques (got ${count("core")}/${count("secondary")}/${count("failure_mode")})`,
      });
    }
  });

export type Extraction = z.infer<typeof ExtractionSchema>;

export const EXTRACTION_SCHEMA_HINT = `{
  "cards": [
    // EXACTLY 8 cards: 3 with card_role "core", 3 "secondary", 2 "failure_mode"
    {
      "technique_name": "snake_case_id (e.g. consequence_before_context)",
      "plain_name": "Show the result before explaining the background",
      "function": "what this technique DOES mechanically",
      "reader_effect": ["curiosity", "tension"],
      "genre_fit": ["fiction_opening", "personal_essay", "speech"],  // at least 2 genres
      "when_to_use": "string",
      "when_not_to_use": "string",
      "transfer_rule": "how to apply it to NEW writing, one clear rule",
      "bad_use_warning": "how this technique fails when misapplied",
      "genre_adaptations": [{ "genre": "technical_writing", "guidance": "string" }],
      "revision_instruction": "an imperative instruction a reviser could follow",
      "evaluation_criteria": ["how to check the technique worked"],
      "card_role": "core | secondary | failure_mode",
      "specificity_level": "obvious | subtle | advanced",
      "transfer_difficulty": "low | medium | high",
      "best_for_tasks": ["at least 2 concrete task types, e.g. 'opening a talk', 'incident postmortems'"]
    }
  ]
}`;

/** The text we embed + search over (plan §4: name + function + effects + genres
 * + when_to_use, plus best_for_tasks when present so task-shaped queries hit). */
export function cardSummaryText(card: TechniqueCard): string {
  return [
    card.plain_name,
    card.function,
    card.reader_effect.join(", "),
    card.genre_fit.join(", "),
    card.when_to_use,
    card.best_for_tasks?.join(", ") ?? "",
  ]
    .filter(Boolean)
    .join(" | ");
}
