import { z } from "zod";

/**
 * Strategy plan — the rhetorical plan chosen BEFORE any text is generated.
 * Shown to the user as a preview gate: approve the strategy, then generate.
 */

export const PlanSection = z.object({
  section: z.string().min(1),
  purpose: z.string().min(1),
});

export const PlannedTechnique = z.object({
  technique: z.string().min(1),
  where: z.string().min(1),
  why: z.string().min(1),
});

export const AvoidedTechnique = z.object({
  technique: z.string().min(1),
  why: z.string().min(1),
});

export const PlannedTurn = z.object({
  position: z.string().min(1), // e.g. "after the opening scene"
  type: z.string().min(1), // emotional | logical | explanatory
  description: z.string().min(1),
});

export const StrategyPlanSchema = z.object({
  structure: z.array(PlanSection).min(2),
  opening_strategy: z.string().min(1),
  ending_strategy: z.string().min(1),
  techniques_to_use: z.array(PlannedTechnique).min(1),
  techniques_to_avoid: z.array(AvoidedTechnique),
  turns: z.array(PlannedTurn),
  explicit_vs_implied: z.string().min(1),
  attention_control: z.string().min(1),
  risks: z.array(z.string()),
});

export type StrategyPlan = z.infer<typeof StrategyPlanSchema>;

export const STRATEGY_PLAN_SCHEMA_HINT = `{
  "structure": [{ "section": "name of the section", "purpose": "what it does for the reader" }],
  "opening_strategy": "what kind of opening and why",
  "ending_strategy": "what kind of ending and why",
  "techniques_to_use": [{ "technique": "technique name", "where": "which section", "why": "reason" }],
  "techniques_to_avoid": [{ "technique": "technique name", "why": "why it would backfire here" }],
  "turns": [{ "position": "where in the piece", "type": "emotional|logical|explanatory", "description": "the shift" }],
  "explicit_vs_implied": "what to state outright vs. let the reader infer",
  "attention_control": "how the reader's attention is held section to section",
  "risks": ["what could go wrong with this strategy"]
}`;
