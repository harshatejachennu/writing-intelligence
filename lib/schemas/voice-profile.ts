import { z } from "zod";

/**
 * Voice profile — a user's writing voice inferred from samples (plan §14).
 * Scalar dimensions are 0-10 with an evidence note; stylistic dimensions are
 * short descriptions the generator can write inside.
 */

export const VoiceDimension = z.object({
  score: z.number().min(0).max(10),
  note: z.string().min(1),
});

export const VoiceProfileSchema = z.object({
  name: z.string().min(1),
  dimensions: z.object({
    directness: VoiceDimension,
    formality: VoiceDimension,
    humor: VoiceDimension,
    emotional_openness: VoiceDimension,
    confidence: VoiceDimension,
    warmth: VoiceDimension,
    technical_density: VoiceDimension,
    imagery_use: VoiceDimension,
    example_use: VoiceDimension,
  }),
  sentence_length: z.string().min(1), // e.g. "short, with occasional long builds"
  vocabulary_level: z.string().min(1),
  reflection_style: z.string().min(1),
  preferred_transitions: z.array(z.string().min(1)).min(1),
  natural_rhythm: z.string().min(1),
  signature_moves: z.array(z.string().min(1)).min(1),
  what_would_sound_fake: z.array(z.string().min(1)).min(1),
});

export type VoiceProfile = z.infer<typeof VoiceProfileSchema>;

const dim = `{ "score": 6, "note": "evidence from the samples" }`;

export const VOICE_PROFILE_SCHEMA_HINT = `{
  "name": "short label for this voice (e.g. 'reflective, dry-humored engineer')",
  "dimensions": {
    "directness": ${dim}, "formality": ${dim}, "humor": ${dim},
    "emotional_openness": ${dim}, "confidence": ${dim}, "warmth": ${dim},
    "technical_density": ${dim}, "imagery_use": ${dim}, "example_use": ${dim}
  },
  "sentence_length": "pattern description",
  "vocabulary_level": "description",
  "reflection_style": "how the writer thinks on the page",
  "preferred_transitions": ["actual transition patterns from the samples"],
  "natural_rhythm": "description of cadence",
  "signature_moves": ["recurring characteristic moves"],
  "what_would_sound_fake": ["things that would betray this voice (e.g. 'corporate buzzwords', 'dramatic one-word sentences')"]
}`;
