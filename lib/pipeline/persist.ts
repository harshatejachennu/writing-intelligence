import type { ExecutionMode } from "@/lib/models/routes";
import type { RouteReceipt } from "@/lib/models/execute";
import { saveAnalysis, logPipelineStep } from "./log";
import { saveExtraction } from "./techniques";
import { saveGoalProfile, saveStrategyPlan, saveGeneration } from "./generation";
import { saveCritique, saveRevision } from "./critique";
import { saveSourceText } from "./corpus";
import { saveVoiceProfile } from "./voice";
import { saveComparison } from "./compare";
import type { CompareInput } from "@/lib/agents/compare";
import type { Comparison } from "@/lib/schemas/comparison";
import type { SourceText } from "@/lib/schemas/source-text";
import type { VoiceProfile } from "@/lib/schemas/voice-profile";
import type { CriticInput } from "@/lib/agents/critic";
import type { ReviserInput } from "@/lib/agents/reviser";
import type { Critique } from "@/lib/schemas/critique";
import type { Revision } from "@/lib/schemas/revision";
import type { AnalyzerInput } from "@/lib/agents/analyzer";
import type { ExtractorInput } from "@/lib/agents/extractor";
import type { PlannerInput } from "@/lib/agents/planner";
import type { GeneratorInput } from "@/lib/agents/generator";
import type { Extraction } from "@/lib/schemas/technique-card";
import type { GoalProfile } from "@/lib/schemas/goal-profile";
import type { StrategyPlan } from "@/lib/schemas/strategy-plan";
import type { Generation } from "@/lib/schemas/generation";

/**
 * Per-agent persistence. Both Manual and API outputs land in the SAME rows, so
 * downstream history/fine-tuning data is identical regardless of mode. Phase 1
 * knows how to persist the analyzer; later agents register their own handlers.
 */
export async function persistAgentOutput(args: {
  agentId: string;
  input: unknown;
  output: unknown;
  mode: ExecutionMode;
  manualModel?: string;
  promptShown?: string;
  usage?: { promptTokens?: number; completionTokens?: number };
  rawModel?: string;
  latencyMs?: number;
  receipt?: RouteReceipt;
  schemaValid?: boolean;
}): Promise<{
  savedId: string | null;
  passageId: string | null;
  pipelineRunId: string | null;
  documentId?: string | null;
  cardIds?: string[];
  techniqueSlugs?: string[];
}> {
  let savedId: string | null = null;
  let passageId: string | null = null;
  let documentId: string | null | undefined;
  let cardIds: string[] | undefined;
  let techniqueSlugs: string[] | undefined;

  if (args.agentId === "analyzer") {
    const input = args.input as AnalyzerInput;
    const saved = await saveAnalysis({
      passageText: input.passageText,
      genre: input.genre,
      analysis: args.output,
      mode: args.mode,
      manualModel: args.manualModel,
    });
    savedId = saved.analysisId;
    passageId = saved.passageId;
  }

  if (args.agentId === "extractor") {
    const input = args.input as ExtractorInput;
    const saved = await saveExtraction({
      extraction: args.output as Extraction,
      analysisId: input.analysisId,
    });
    cardIds = saved.cardIds;
    techniqueSlugs = saved.techniqueSlugs;
    savedId = saved.cardIds[0] ?? null;
  }

  if (args.agentId === "goalProfile") {
    savedId = await saveGoalProfile(args.output as GoalProfile);
  }

  if (args.agentId === "planner") {
    const input = args.input as PlannerInput;
    savedId = await saveStrategyPlan({
      plan: args.output as StrategyPlan,
      goalProfileId: input.goalProfileId,
    });
  }

  if (args.agentId === "generator") {
    const input = args.input as GeneratorInput;
    const saved = await saveGeneration({
      generation: args.output as Generation,
      mode: args.mode,
      manualModel: args.manualModel,
      goalProfileId: input.goalProfileId,
      strategyPlanId: input.strategyPlanId,
      retrievedCardIds: input.retrievedCardIds,
    });
    savedId = saved.runId;
  }

  if (args.agentId === "critic") {
    const input = args.input as CriticInput;
    const saved = await saveCritique({
      text: input.text,
      critique: args.output as Critique,
      documentId: input.documentId,
    });
    savedId = saved.critiqueId;
    documentId = saved.documentId;
  }

  if (args.agentId === "voice") {
    savedId = await saveVoiceProfile(args.output as VoiceProfile);
  }

  if (args.agentId === "compare") {
    const input = args.input as CompareInput;
    savedId = await saveComparison({
      leftText: input.leftText,
      rightText: input.rightText,
      leftLabel: input.leftLabel,
      rightLabel: input.rightLabel,
      verdict: args.output as Comparison,
    });
  }

  // "inspiration" is intentionally NOT persisted to documents/runs — synthetic
  // study pieces stay out of the corpus and the fine-tuning data. The
  // pipeline_runs audit row below is its only trace.

  if (args.agentId === "curator") {
    const saved = await saveSourceText(args.output as SourceText);
    if (saved.guardError) throw new Error(saved.guardError);
    savedId = saved.id;
  }

  if (args.agentId === "reviser") {
    const input = args.input as ReviserInput;
    savedId = await saveRevision({
      revision: args.output as Revision,
      documentId: input.documentId,
      critiqueId: input.critiqueId,
      parentRevisionId: input.parentRevisionId,
    });
  }

  const pipelineRunId = await logPipelineStep({
    agentId: args.agentId,
    mode: args.mode,
    input: args.input,
    output: args.output,
    manualModel: args.manualModel,
    promptShown: args.promptShown,
    usage: args.usage,
    rawModel: args.rawModel,
    latencyMs: args.latencyMs,
    receipt: args.receipt,
    schemaValid: args.schemaValid,
  });

  return { savedId, passageId, pipelineRunId, documentId, cardIds, techniqueSlugs };
}
