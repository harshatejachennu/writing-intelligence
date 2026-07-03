import { z } from "zod";

/**
 * Passage Analyzer output — the anti-vagueness contract. Nearly every structural
 * field must cite EVIDENCE (a quote or concrete reference) so the analysis can't
 * degrade into hand-wavy commentary like "it has a strong hook".
 */

export const ParagraphFunction = z.object({
  index: z.number().int().nonnegative(),
  function: z.string().min(1),
  evidence: z.string().min(1),
});

export const SentenceFunction = z.object({
  quote: z.string().min(1),
  function: z.string().min(1),
});

export const RhetoricalDevice = z.object({
  device: z.string().min(1),
  example: z.string().min(1),
  effect: z.string().min(1),
});

export const EmotionalStage = z.object({
  stage: z.string().min(1),
  reader_feels: z.string().min(1),
});

export const TransferableTechnique = z.object({
  name: z.string().min(1),
  plain_name: z.string().min(1),
  transfer_rule: z.string().min(1),
});

export const AnalysisSchema = z.object({
  macro_structure: z.string().min(1),
  paragraph_functions: z.array(ParagraphFunction),
  sentence_functions: z.array(SentenceFunction),
  rhetorical_devices: z.array(RhetoricalDevice),
  syntax_patterns: z.string().min(1),
  pacing: z.string().min(1),
  transitions: z.string().min(1),
  voice: z.string().min(1),
  tone: z.string().min(1),
  diction: z.string().min(1),
  imagery: z.string(),
  symbolism: z.string(),
  motifs: z.array(z.string()),
  emotional_progression: z.array(EmotionalStage),
  reader_effect: z.string().min(1),
  genre_expectations: z.string().min(1),
  clarity: z.string().min(1),
  compression: z.string().min(1),
  tension: z.string().min(1),
  persuasiveness: z.string().min(1),
  memorability: z.string().min(1),
  transferable_techniques: z.array(TransferableTechnique),
  imitation_warnings: z.array(z.string()),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

/** Readable skeleton shown to the model in Manual Mode. */
export const ANALYSIS_SCHEMA_HINT = `{
  "macro_structure": "string — the overall shape/arc of the passage",
  "paragraph_functions": [{ "index": 0, "function": "string", "evidence": "quote or reference" }],
  "sentence_functions": [{ "quote": "string", "function": "string" }],
  "rhetorical_devices": [{ "device": "string", "example": "quote", "effect": "string" }],
  "syntax_patterns": "string", "pacing": "string", "transitions": "string",
  "voice": "string", "tone": "string", "diction": "string",
  "imagery": "string", "symbolism": "string", "motifs": ["string"],
  "emotional_progression": [{ "stage": "string", "reader_feels": "string" }],
  "reader_effect": "string", "genre_expectations": "string",
  "clarity": "string", "compression": "string", "tension": "string",
  "persuasiveness": "string", "memorability": "string",
  "transferable_techniques": [{ "name": "snake_case_id", "plain_name": "string", "transfer_rule": "string" }],
  "imitation_warnings": ["string"]
}`;
