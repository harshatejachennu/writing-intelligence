import {
  StrategyPlanSchema,
  STRATEGY_PLAN_SCHEMA_HINT,
  type StrategyPlan,
} from "@/lib/schemas/strategy-plan";
import type { GoalProfile } from "@/lib/schemas/goal-profile";
import { jsonContract, type AgentDef } from "./types";

/** Compact card summary passed to the planner/generator prompts. */
export interface CardSummary {
  technique_name: string;
  plain_name: string;
  transfer_rule: string;
  when_to_use: string;
  when_not_to_use: string;
}

export interface PlannerInput {
  goalProfile: GoalProfile;
  retrievedCards: CardSummary[];
  /** DB linkage only — not sent to the model. */
  goalProfileId?: string;
}

const SYSTEM = [
  "You are a Rhetorical Strategy Planner inside a writing-intelligence system.",
  "You decide HOW a piece should work before a single sentence is written:",
  "structure, technique placement, turns, attention control, and what to avoid.",
  "",
  "RULES:",
  "- Plan against the goal profile's reader_effect and evaluation_criteria —",
  "  every structural choice must serve a named effect.",
  "- Prefer techniques from the retrieved cards when they fit; respect each",
  "  card's when_not_to_use. You may add well-known techniques the cards lack.",
  "- techniques_to_avoid is mandatory thinking: name what would backfire for",
  "  THIS audience and goal (respect the profile's techniques_to_avoid).",
  "- Honor the profile's constraints, length, and tone dials.",
  "- If high_stakes is true, the plan must not depend on facts the user did not",
  "  provide.",
].join("\n");

export const plannerAgent: AgentDef<PlannerInput, StrategyPlan> = {
  id: "planner",
  route: "planner",
  description: "Chooses the rhetorical strategy before any text is generated.",
  schema: StrategyPlanSchema,
  schemaHint: STRATEGY_PLAN_SCHEMA_HINT,
  buildPrompt(input) {
    const user = [
      "Goal profile:",
      "<<<PROFILE",
      JSON.stringify(input.goalProfile, null, 2),
      "PROFILE",
      "",
      "Retrieved technique cards (candidates, not requirements):",
      "<<<CARDS",
      JSON.stringify(input.retrievedCards, null, 2),
      "CARDS",
      jsonContract(STRATEGY_PLAN_SCHEMA_HINT),
    ].join("\n");
    return { system: SYSTEM, user };
  },
};
