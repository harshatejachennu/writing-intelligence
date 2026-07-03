import {
  ComparisonSchema,
  COMPARISON_SCHEMA_HINT,
  type Comparison,
} from "@/lib/schemas/comparison";
import type { GoalProfile } from "@/lib/schemas/goal-profile";
import { jsonContract, type AgentDef } from "./types";

export interface CompareInput {
  leftText: string;
  rightText: string;
  leftLabel?: string; // e.g. "before revision"
  rightLabel?: string; // e.g. "after revision"
  goalProfile?: GoalProfile;
  genre?: string;
}

const SYSTEM = [
  "You are a Comparison Judge inside a writing-intelligence system.",
  "You compare two versions of a text (LEFT and RIGHT) and deliver an",
  "evidence-based verdict — never vibes, never a diplomatic tie unless the",
  "texts genuinely balance.",
  "",
  "RULES:",
  "- Every dimension verdict cites evidence from the texts.",
  "- what_improved / what_got_worse are judged as LEFT → RIGHT (RIGHT is the",
  "  newer version when labels suggest an order).",
  "- If a goal profile is provided, reader_effect_winner is judged strictly",
  "  against its reader_effect; otherwise infer the shared intent.",
  "- A revision that polished away voice or specificity LOST something — say",
  "  so in what_got_worse even if the overall winner is RIGHT.",
  "- recommended_direction is practical: what should the final version keep",
  "  from each side.",
].join("\n");

export const compareAgent: AgentDef<CompareInput, Comparison> = {
  id: "compare",
  route: "compare",
  description: "Judges two versions of a text with an evidence-based verdict.",
  schema: ComparisonSchema,
  schemaHint: COMPARISON_SCHEMA_HINT,
  buildPrompt(input) {
    const parts = [
      input.genre ? `Genre context: ${input.genre}.` : "",
      input.goalProfile
        ? ["Goal profile to judge against:", "<<<PROFILE", JSON.stringify(input.goalProfile, null, 2), "PROFILE", ""].join("\n")
        : "",
      `LEFT${input.leftLabel ? ` (${input.leftLabel})` : ""}:`,
      "<<<LEFT",
      input.leftText.trim(),
      "LEFT",
      "",
      `RIGHT${input.rightLabel ? ` (${input.rightLabel})` : ""}:`,
      "<<<RIGHT",
      input.rightText.trim(),
      "RIGHT",
      jsonContract(COMPARISON_SCHEMA_HINT),
    ];
    return { system: SYSTEM, user: parts.filter(Boolean).join("\n") };
  },
};
