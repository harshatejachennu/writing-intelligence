import { getDb } from "@/lib/db/client";
import type { ExecutionMode } from "@/lib/models/routes";

/**
 * Append a step to the pipeline audit log. Records mode + (for manual steps) the
 * exact prompt shown and the model the user says they used — so the future
 * fine-tuning dataset is clean regardless of how the output was produced.
 * No-ops when the DB is not configured.
 */
export interface PipelineStep {
  agentId: string;
  mode: ExecutionMode;
  input: unknown;
  output: unknown;
  manualModel?: string;
  promptShown?: string;
  usage?: { promptTokens?: number; completionTokens?: number };
  rawModel?: string;
  latencyMs?: number;
}

export async function logPipelineStep(step: PipelineStep): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  const { data, error } = await db
    .from("pipeline_runs")
    .insert({
      agent_id: step.agentId,
      mode: step.mode,
      steps_json: {
        input: step.input,
        output: step.output,
        prompt_shown: step.promptShown ?? null,
      },
      manual_model: step.manualModel ?? null,
      raw_model: step.rawModel ?? null,
      prompt_tokens: step.usage?.promptTokens ?? null,
      completion_tokens: step.usage?.completionTokens ?? null,
      latency_ms: step.latencyMs ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[pipeline] log insert failed:", error.message);
    return null;
  }
  return data.id as string;
}

/**
 * Persist an analysis: creates a `passages` row for the analyzed text, then an
 * `analyses` row linked to it. Returns both ids, or nulls if DB not configured.
 */
export async function saveAnalysis(args: {
  passageText: string;
  genre?: string;
  analysis: unknown;
  mode: ExecutionMode;
  manualModel?: string;
}): Promise<{ analysisId: string | null; passageId: string | null }> {
  const db = getDb();
  if (!db) return { analysisId: null, passageId: null };

  // 1. Save the passage itself.
  const { data: passage, error: passageErr } = await db
    .from("passages")
    .insert({ text: args.passageText })
    .select("id")
    .single();

  if (passageErr) {
    console.error("[passages] insert failed:", passageErr.message);
    return { analysisId: null, passageId: null };
  }
  const passageId = passage.id as string;

  // 2. Save the analysis linked to the passage.
  const { data: analysis, error: analysisErr } = await db
    .from("analyses")
    .insert({
      passage_id: passageId,
      passage_text: args.passageText,
      genre: args.genre ?? null,
      analysis_json: args.analysis,
      mode: args.mode,
      manual_model: args.manualModel ?? null,
    })
    .select("id")
    .single();

  if (analysisErr) {
    console.error("[analyses] insert failed:", analysisErr.message);
    return { analysisId: null, passageId };
  }
  return { analysisId: analysis.id as string, passageId };
}

/** List saved analyses, newest first (for the History view). */
export interface AnalysisListItem {
  id: string;
  genre: string | null;
  mode: string;
  manual_model: string | null;
  passage_text: string;
  created_at: string;
}

export async function listAnalyses(limit = 50): Promise<AnalysisListItem[]> {
  const db = getDb();
  if (!db) return [];

  const { data, error } = await db
    .from("analyses")
    .select("id, genre, mode, manual_model, passage_text, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[analyses] list failed:", error.message);
    return [];
  }
  return data as AnalysisListItem[];
}

/** Fetch one analysis with its full JSON (for the History detail view). */
export async function getAnalysis(id: string): Promise<
  | (AnalysisListItem & { analysis_json: unknown })
  | null
> {
  const db = getDb();
  if (!db) return null;

  const { data, error } = await db
    .from("analyses")
    .select("id, genre, mode, manual_model, passage_text, created_at, analysis_json")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[analyses] get failed:", error.message);
    return null;
  }
  return data as AnalysisListItem & { analysis_json: unknown };
}
