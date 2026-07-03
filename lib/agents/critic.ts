import { CritiqueSchema, CRITIQUE_SCHEMA_HINT, type Critique } from "@/lib/schemas/critique";
import type { GoalProfile } from "@/lib/schemas/goal-profile";
import { jsonContract, type AgentDef } from "./types";

export interface CriticInput {
  text: string;
  /** Judge against this profile when present; otherwise infer intent. */
  goalProfile?: GoalProfile;
  genre?: string;
  /** DB linkage — not sent to the model. */
  documentId?: string;
}

const SYSTEM = [
  "You are a Critic inside a writing-intelligence system.",
  "You evaluate text against an explicit rubric with EVIDENCE — quotes and",
  "concrete references, never vibes. You are calibrated: 5 is competent,",
  "8 is genuinely strong, 10 is rare. Do not cluster everything at 7-8.",
  "",
  "RULES:",
  "- Every score needs why + evidence from the text itself.",
  "- If a goal profile is provided, reader_effect_match and goal_met are judged",
  "  strictly against its reader_effect and evaluation_criteria.",
  "- issues must be specific and fixable — name the sentence, name the fix.",
  "- biggest_weakness is the ONE change with the highest value; the",
  "  next_revision_instruction targets it alone. Do not ask for a rewrite of",
  "  everything.",
  "- risk covers cliche, overwriting, invented-fact, and authenticity dangers;",
  "  flag high risk (>=7) for high-stakes text with invented specifics.",
  "- If the text is already strong, say so: goal_met=true and a",
  "  next_revision_instruction that warns against over-polishing.",
].join("\n");

export const criticAgent: AgentDef<CriticInput, Critique> = {
  id: "critic",
  route: "critic",
  description: "Scores text against the rubric with evidence and one next fix.",
  schema: CritiqueSchema,
  schemaHint: CRITIQUE_SCHEMA_HINT,
  buildPrompt(input) {
    const parts = [
      input.genre ? `Genre context: ${input.genre}.` : "",
      input.goalProfile
        ? ["Goal profile to judge against:", "<<<PROFILE", JSON.stringify(input.goalProfile, null, 2), "PROFILE", ""].join("\n")
        : "No goal profile provided — infer the text's intent, audience, and genre, then judge it on its own terms.",
      "Text to critique:",
      "<<<TEXT",
      input.text.trim(),
      "TEXT",
      jsonContract(CRITIQUE_SCHEMA_HINT),
    ];
    return { system: SYSTEM, user: parts.filter(Boolean).join("\n") };
  },
};
