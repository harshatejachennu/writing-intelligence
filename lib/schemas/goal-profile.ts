import { z } from "zod";

/**
 * Goal profile — every writing request converted into structured intent.
 * This is the contract the planner, retriever, generator, and critic all share.
 */

export const GoalProfileSchema = z.object({
  task: z.string().min(1), // generate_text | transform | summarize | ...
  genre: z.string().min(1),
  audience: z.string().min(1),
  purpose: z.string().min(1),
  reader_effect: z.array(z.string().min(1)).min(1),
  /** Tone dial: dimension -> 0-10 (e.g. direct: 8, warm: 6). */
  tone: z.record(z.string(), z.number().min(0).max(10)),
  voice: z.string().min(1),
  length: z.string().min(1),
  constraints: z.array(z.string()),
  required_facts: z.array(z.string()),
  forbidden_content: z.array(z.string()),
  risk_factors: z.array(z.string()),
  evaluation_criteria: z.array(z.string().min(1)).min(1),
  desired_techniques: z.array(z.string()),
  techniques_to_avoid: z.array(z.string()),
  /** Admissions/scholarship/legal/medical/professional → no invented facts. */
  high_stakes: z.boolean(),
});

export type GoalProfile = z.infer<typeof GoalProfileSchema>;

export const GOAL_PROFILE_SCHEMA_HINT = `{
  "task": "generate_text",
  "genre": "speech | personal_essay | technical_explanation | ...",
  "audience": "who will read/hear this",
  "purpose": "what the text must accomplish",
  "reader_effect": ["what the reader should feel/understand/believe/do"],
  "tone": { "direct": 8, "warm": 6, "formal": 4, "emotional": 5, "dramatic": 3 },
  "voice": "description of the voice to write in",
  "length": "e.g. '2 minutes spoken' or '500 words'",
  "constraints": ["avoid cliches", "use simple language"],
  "required_facts": ["facts that MUST appear, from the user"],
  "forbidden_content": ["things that must NOT appear"],
  "risk_factors": ["what could make this fail (e.g. sounding cheesy)"],
  "evaluation_criteria": ["how to judge if the writing achieved the goal"],
  "desired_techniques": ["technique names/descriptions to use"],
  "techniques_to_avoid": ["techniques that would backfire"],
  "high_stakes": false
}`;

/** Query text used to retrieve technique cards for a profile. */
export function profileQueryText(profile: GoalProfile): string {
  return [
    profile.purpose,
    profile.genre,
    profile.reader_effect.join(", "),
    profile.desired_techniques.join(", "),
  ]
    .filter(Boolean)
    .join(" | ");
}
