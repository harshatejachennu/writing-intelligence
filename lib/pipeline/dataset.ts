import { getDb } from "@/lib/db/client";
import type { DatasetReview, DatasetFilters } from "@/lib/schemas/dataset";

/**
 * Dataset collection (Phase 9 Prep). Promote a generation run to a reviewed
 * example, list examples with filters, and assemble a full, provenance-rich,
 * copyright-safe export payload. NO training happens here — this is collection
 * + review for future evaluation/fine-tuning.
 */

const SAFE_ACCESS = ["public_domain", "user_owned", "licensed"];

/** Promote a generation run to the dataset with a quality review. Snapshots
 * genre/task_type/manual_model/agent_id for cheap filtering. */
export async function promoteToDataset(args: {
  generationRunId: string;
  review: DatasetReview;
  tags?: string[];
}): Promise<{ id: string | null; error?: string }> {
  const db = getDb();
  if (!db) return { id: null, error: "database not configured" };

  // Pull filter snapshots from the run + its goal profile.
  const { data: run, error: runErr } = await db
    .from("generation_runs")
    .select("id, manual_model, goal_profile_id")
    .eq("id", args.generationRunId)
    .single();
  if (runErr || !run) return { id: null, error: "generation run not found" };

  let genre: string | null = null;
  let taskType: string | null = null;
  if (run.goal_profile_id) {
    const { data: gp } = await db
      .from("goal_profiles")
      .select("profile_json")
      .eq("id", run.goal_profile_id)
      .single();
    genre = gp?.profile_json?.genre ?? null;
    taskType = gp?.profile_json?.task ?? null;
  }

  const { data, error } = await db
    .from("saved_outputs")
    .insert({
      generation_run_id: args.generationRunId,
      tags: args.tags ?? [],
      agent_id: "generator",
      genre,
      task_type: taskType,
      manual_model: run.manual_model,
      overall_quality: args.review.overall_quality,
      usefulness: args.review.usefulness,
      originality: args.review.originality,
      schema_valid: args.review.schema_valid,
      human_approved: args.review.human_approved,
      notes: args.review.notes ?? "",
      reject_reason: args.review.reject_reason ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) return { id: null, error: error.message };
  return { id: data.id as string };
}

export interface DatasetRow {
  id: string;
  generation_run_id: string;
  agent_id: string | null;
  genre: string | null;
  task_type: string | null;
  manual_model: string | null;
  overall_quality: number | null;
  usefulness: number | null;
  originality: number | null;
  schema_valid: boolean | null;
  human_approved: boolean;
  notes: string | null;
  reject_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
}

/** List promoted examples with filters (task 5). */
export async function listDataset(filters: DatasetFilters = {}): Promise<DatasetRow[]> {
  const db = getDb();
  if (!db) return [];
  let q = db
    .from("saved_outputs")
    .select(
      "id, generation_run_id, agent_id, genre, task_type, manual_model, overall_quality, usefulness, originality, schema_valid, human_approved, notes, reject_reason, reviewed_at, created_at",
    )
    .order("created_at", { ascending: false });

  if (filters.agent_id) q = q.eq("agent_id", filters.agent_id);
  if (filters.genre) q = q.eq("genre", filters.genre);
  if (filters.manual_model) q = q.eq("manual_model", filters.manual_model);
  if (filters.task_type) q = q.eq("task_type", filters.task_type);
  if (typeof filters.min_quality === "number") q = q.gte("overall_quality", filters.min_quality);
  if (filters.from_date) q = q.gte("created_at", filters.from_date);
  if (filters.to_date) q = q.lte("created_at", filters.to_date + "T23:59:59.999Z");
  if (filters.approved_only) q = q.eq("human_approved", true);

  const { data, error } = await q;
  if (error) {
    console.error("[saved_outputs] list failed:", error.message);
    return [];
  }
  return (data ?? []) as DatasetRow[];
}

/** A source_texts row reduced to copyright-safe fields (body redacted unless
 * user-owned / public-domain / licensed). */
function redactSource(row: {
  id: string;
  title: string;
  author: string | null;
  access: string;
  stored_excerpt: string | null;
}) {
  const safe = SAFE_ACCESS.includes(row.access);
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    access: row.access,
    stored_excerpt: safe ? row.stored_excerpt : null,
    excerpt_redacted: !safe && !!row.stored_excerpt,
  };
}

export interface AssembledExample {
  saved_output_id: string;
  promoted_at: string;
  agent_id: string | null;
  genre: string | null;
  task_type: string | null;
  manual_model: string | null;
  goal_profile: unknown | null;
  strategy_plan: unknown | null;
  retrieved_cards: unknown[];
  final_output: string | null;
  critique_scores: unknown | null;
  revision_history: Array<{ body: string; change_summary: string | null; created_at: string }>;
  route_receipt: {
    requested_mode: string | null;
    effective_mode: string | null;
    attempted_provider: string | null;
    attempted_model: string | null;
    final_provider: string | null;
    final_model: string | null;
    fallback_reason: string | null;
    schema_valid: boolean | null;
    latency_ms: number | null;
  } | null;
  quality_review: {
    overall_quality: number | null;
    usefulness: number | null;
    originality: number | null;
    schema_valid: boolean | null;
    human_approved: boolean;
    notes: string | null;
    reject_reason: string | null;
  };
  sources: ReturnType<typeof redactSource>[];
}

/** Assemble the full export payload for one saved output (task 7 + 8). */
export async function assembleExample(row: DatasetRow): Promise<AssembledExample | null> {
  const db = getDb();
  if (!db) return null;

  const { data: run } = await db
    .from("generation_runs")
    .select("goal_profile_id, strategy_plan_id, retrieved_card_ids, output_document_id, pipeline_run_id, manual_model")
    .eq("id", row.generation_run_id)
    .single();

  let goalProfile: unknown = null;
  let strategyPlan: unknown = null;
  let finalOutput: string | null = null;
  let critiqueScores: unknown = null;
  let retrievedCards: unknown[] = [];
  let revisionHistory: AssembledExample["revision_history"] = [];
  let routeReceipt: AssembledExample["route_receipt"] = null;
  const sources: ReturnType<typeof redactSource>[] = [];

  if (run) {
    if (run.goal_profile_id) {
      const { data } = await db.from("goal_profiles").select("profile_json").eq("id", run.goal_profile_id).single();
      goalProfile = data?.profile_json ?? null;
    }
    if (run.strategy_plan_id) {
      const { data } = await db.from("strategy_plans").select("plan_json").eq("id", run.strategy_plan_id).single();
      strategyPlan = data?.plan_json ?? null;
    }
    if (run.output_document_id) {
      const { data: doc } = await db.from("documents").select("body").eq("id", run.output_document_id).single();
      finalOutput = doc?.body ?? null;

      const { data: crit } = await db
        .from("critiques")
        .select("scores_json")
        .eq("target_document_id", run.output_document_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      critiqueScores = crit?.scores_json ?? null;

      const { data: revs } = await db
        .from("revisions")
        .select("body, change_summary, created_at")
        .eq("document_id", run.output_document_id)
        .order("created_at", { ascending: true });
      revisionHistory = (revs ?? []) as typeof revisionHistory;
    }

    const cardIds = (run.retrieved_card_ids ?? []) as string[];
    if (cardIds.length) {
      const { data: cards } = await db
        .from("technique_cards")
        .select("id, card_json, source_refs")
        .in("id", cardIds);
      retrievedCards = (cards ?? []).map((c) => c.card_json);

      // Copyright guard: resolve any source refs against source_texts and
      // redact non-free bodies (task 8).
      const refIds = [...new Set((cards ?? []).flatMap((c) => (c.source_refs ?? []) as string[]))];
      if (refIds.length) {
        const { data: srcs } = await db
          .from("source_texts")
          .select("id, title, author, access, stored_excerpt")
          .in("id", refIds);
        for (const s of srcs ?? []) sources.push(redactSource(s));
      }
    }

    if (run.pipeline_run_id) {
      const { data: pr } = await db
        .from("pipeline_runs")
        .select("mode, requested_mode, attempted_provider, attempted_model, final_provider, final_model, fallback_reason, schema_valid, latency_ms")
        .eq("id", run.pipeline_run_id)
        .single();
      if (pr) {
        routeReceipt = {
          requested_mode: pr.requested_mode ?? null,
          effective_mode: pr.mode ?? null,
          attempted_provider: pr.attempted_provider ?? null,
          attempted_model: pr.attempted_model ?? null,
          final_provider: pr.final_provider ?? null,
          final_model: pr.final_model ?? null,
          fallback_reason: pr.fallback_reason ?? null,
          schema_valid: pr.schema_valid ?? null,
          latency_ms: pr.latency_ms ?? null,
        };
      }
    }
  }

  return {
    saved_output_id: row.id,
    promoted_at: row.created_at,
    agent_id: row.agent_id,
    genre: row.genre,
    task_type: row.task_type,
    manual_model: row.manual_model ?? run?.manual_model ?? null,
    goal_profile: goalProfile,
    strategy_plan: strategyPlan,
    retrieved_cards: retrievedCards,
    final_output: finalOutput,
    critique_scores: critiqueScores,
    revision_history: revisionHistory,
    route_receipt: routeReceipt,
    quality_review: {
      overall_quality: row.overall_quality,
      usefulness: row.usefulness,
      originality: row.originality,
      schema_valid: row.schema_valid,
      human_approved: row.human_approved,
      notes: row.notes,
      reject_reason: row.reject_reason,
    },
    sources,
  };
}

/** Assemble all APPROVED examples matching the filters (export set). Export is
 * ALWAYS approved-only, regardless of the approved_only filter flag (task 3). */
export async function assembleApprovedExamples(filters: DatasetFilters = {}): Promise<AssembledExample[]> {
  const rows = await listDataset({ ...filters, approved_only: true });
  const out: AssembledExample[] = [];
  for (const row of rows) {
    const ex = await assembleExample(row);
    if (ex) out.push(ex);
  }
  return out;
}
