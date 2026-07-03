import { z } from "zod";

/**
 * Critic output — rubric scores with evidence, concrete issues, and the single
 * next revision instruction (the revision loop revises ONE thing at a time).
 */

export const DimensionScore = z.object({
  score: z.number().min(1).max(10),
  why: z.string().min(1),
  evidence: z.string().min(1),
});

/** The rubric dimensions from the plan (§15). */
export const RUBRIC_DIMENSIONS = [
  "clarity",
  "structure",
  "specificity",
  "reader_effect_match",
  "tone_fit",
  "voice_consistency",
  "genre_fit",
  "memorability",
  "compression",
  "flow",
] as const;

export const CritiqueSchema = z.object({
  scores: z.object({
    clarity: DimensionScore,
    structure: DimensionScore,
    specificity: DimensionScore,
    reader_effect_match: DimensionScore,
    tone_fit: DimensionScore,
    voice_consistency: DimensionScore,
    genre_fit: DimensionScore,
    memorability: DimensionScore,
    compression: DimensionScore,
    flow: DimensionScore,
  }),
  /** 1 = safe, 10 = serious risk (cliche/overwriting/ethical/factual). */
  risk: DimensionScore,
  issues: z
    .array(
      z.object({
        issue: z.string().min(1),
        evidence: z.string().min(1),
        fix: z.string().min(1),
      }),
    )
    .min(1),
  goal_met: z.boolean(),
  biggest_weakness: z.string().min(1),
  next_revision_instruction: z.string().min(1),
});

export type Critique = z.infer<typeof CritiqueSchema>;

const dim = `{ "score": 7, "why": "string", "evidence": "quote or reference from the text" }`;

export const CRITIQUE_SCHEMA_HINT = `{
  "scores": {
    "clarity": ${dim}, "structure": ${dim}, "specificity": ${dim},
    "reader_effect_match": ${dim}, "tone_fit": ${dim}, "voice_consistency": ${dim},
    "genre_fit": ${dim}, "memorability": ${dim}, "compression": ${dim}, "flow": ${dim}
  },
  "risk": { "score": 2, "why": "cliche/overwriting/ethical/factual risk (1 safe - 10 serious)", "evidence": "string" },
  "issues": [{ "issue": "string", "evidence": "quote", "fix": "concrete action" }],
  "goal_met": false,
  "biggest_weakness": "the ONE most valuable thing to fix",
  "next_revision_instruction": "imperative instruction for the reviser, targeting only the biggest weakness"
}`;

/** Average of the ten rubric scores (risk excluded). */
export function overallScore(critique: Critique): number {
  const values = RUBRIC_DIMENSIONS.map((d) => critique.scores[d].score);
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}
