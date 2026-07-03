import { getDb } from "@/lib/db/client";
import type { ExecutionMode } from "@/lib/models/routes";
import type { GoalProfile } from "@/lib/schemas/goal-profile";
import type { StrategyPlan } from "@/lib/schemas/strategy-plan";
import type { Generation } from "@/lib/schemas/generation";
import { profileQueryText } from "@/lib/schemas/goal-profile";
import { embedText } from "@/lib/retrieval/embed";

/** Persist a goal profile (embedding optional — future "profiles like this"). */
export async function saveGoalProfile(profile: GoalProfile): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const embedding = await embedText(profileQueryText(profile)).catch(() => null);
  const { data, error } = await db
    .from("goal_profiles")
    .insert({ profile_json: profile, embedding })
    .select("id")
    .single();
  if (error) {
    console.error("[goal_profiles] insert failed:", error.message);
    return null;
  }
  return data.id as string;
}

export async function saveStrategyPlan(args: {
  plan: StrategyPlan;
  goalProfileId?: string;
}): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const { data, error } = await db
    .from("strategy_plans")
    .insert({ plan_json: args.plan, goal_profile_id: args.goalProfileId ?? null })
    .select("id")
    .single();
  if (error) {
    console.error("[strategy_plans] insert failed:", error.message);
    return null;
  }
  return data.id as string;
}

/** Persist a generation: output document + generation_runs row. */
export async function saveGeneration(args: {
  generation: Generation;
  mode: ExecutionMode;
  manualModel?: string;
  goalProfileId?: string;
  strategyPlanId?: string;
  retrievedCardIds?: string[];
}): Promise<{ runId: string | null; documentId: string | null }> {
  const db = getDb();
  if (!db) return { runId: null, documentId: null };

  const { data: doc, error: dErr } = await db
    .from("documents")
    .insert({ kind: "output", body: args.generation.text, title: null })
    .select("id")
    .single();
  if (dErr) {
    console.error("[documents] insert failed:", dErr.message);
    return { runId: null, documentId: null };
  }

  const { data: run, error: rErr } = await db
    .from("generation_runs")
    .insert({
      goal_profile_id: args.goalProfileId ?? null,
      strategy_plan_id: args.strategyPlanId ?? null,
      retrieved_card_ids: args.retrievedCardIds ?? [],
      output_document_id: doc.id,
      techniques_used_json: {
        techniques_used: args.generation.techniques_used,
        choices_explained: args.generation.choices_explained,
        possible_weaknesses: args.generation.possible_weaknesses,
        suggested_revision_path: args.generation.suggested_revision_path,
      },
      mode: args.mode,
      manual_model: args.manualModel ?? null,
      status: "complete",
    })
    .select("id")
    .single();
  if (rErr) {
    console.error("[generation_runs] insert failed:", rErr.message);
    return { runId: null, documentId: doc.id as string };
  }
  return { runId: run.id as string, documentId: doc.id as string };
}
