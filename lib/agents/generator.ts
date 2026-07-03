import {
  GenerationSchema,
  GENERATION_SCHEMA_HINT,
  type Generation,
} from "@/lib/schemas/generation";
import type { GoalProfile } from "@/lib/schemas/goal-profile";
import type { StrategyPlan } from "@/lib/schemas/strategy-plan";
import { jsonContract, type AgentDef } from "./types";
import type { CardSummary } from "./planner";

export interface GeneratorInput {
  goalProfile: GoalProfile;
  strategyPlan: StrategyPlan;
  cards: CardSummary[];
  /** User-provided facts/material the draft may use. */
  facts?: string;
  /** Optional voice profile description to preserve (Phase 6). */
  voiceProfile?: unknown;
  /** DB linkage only — not sent to the model. */
  goalProfileId?: string;
  strategyPlanId?: string;
  retrievedCardIds?: string[];
}

const SYSTEM = [
  "You are a Generator inside a writing-intelligence system.",
  "You write a full draft that EXECUTES an approved strategy plan against a goal",
  "profile. You do not freelance: the plan is the blueprint.",
  "",
  "RULES:",
  "- Follow the plan's structure, opening/ending strategy, technique placement,",
  "  and turns. If a planned technique genuinely cannot work, note it in",
  "  possible_weaknesses instead of silently deviating.",
  "- Respect length, constraints, tone dials, and forbidden_content exactly.",
  "- HIGH STAKES RULE: if the goal profile has high_stakes=true, use ONLY facts",
  "  provided by the user (required_facts / facts material). Where a needed fact",
  "  is missing, write [YOUR: description] as a placeholder instead of inventing.",
  "- If a voice profile is provided, write inside it — do not over-polish a",
  "  human voice into generic fluency.",
  "- techniques_used must be honest: list only techniques actually present in",
  "  the text, with where and intended effect.",
  "- is_draft is always true.",
].join("\n");

export const generatorAgent: AgentDef<GeneratorInput, Generation> = {
  id: "generator",
  route: "generator",
  description: "Writes a strategy-driven draft with its own accounting.",
  schema: GenerationSchema,
  schemaHint: GENERATION_SCHEMA_HINT,
  buildPrompt(input) {
    const parts = [
      "Goal profile:",
      "<<<PROFILE",
      JSON.stringify(input.goalProfile, null, 2),
      "PROFILE",
      "",
      "Approved strategy plan:",
      "<<<PLAN",
      JSON.stringify(input.strategyPlan, null, 2),
      "PLAN",
      "",
      "Technique cards to draw on:",
      "<<<CARDS",
      JSON.stringify(input.cards, null, 2),
      "CARDS",
    ];
    if (input.facts?.trim()) {
      parts.push("", "User-provided facts/material (the ONLY permitted facts):", "<<<FACTS", input.facts.trim(), "FACTS");
    }
    if (input.voiceProfile) {
      parts.push("", "Voice profile to preserve:", "<<<VOICE", JSON.stringify(input.voiceProfile, null, 2), "VOICE");
    }
    parts.push(jsonContract(GENERATION_SCHEMA_HINT));
    return { system: SYSTEM, user: parts.join("\n") };
  },
};
