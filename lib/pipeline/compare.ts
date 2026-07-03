import { getDb } from "@/lib/db/client";
import type { Comparison } from "@/lib/schemas/comparison";

/** Persist a comparison verdict. Refs hold the compared texts + labels. */
export async function saveComparison(args: {
  leftText: string;
  rightText: string;
  leftLabel?: string;
  rightLabel?: string;
  verdict: Comparison;
}): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const { data, error } = await db
    .from("comparisons")
    .insert({
      left_ref: { text: args.leftText, label: args.leftLabel ?? null },
      right_ref: { text: args.rightText, label: args.rightLabel ?? null },
      verdict_json: args.verdict,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[comparisons] insert failed:", error.message);
    return null;
  }
  return data.id as string;
}

/**
 * Promote a generation run to a saved example (plan §16: the future
 * fine-tuning dataset — only runs the user explicitly marks as good).
 */
export async function saveOutputExample(args: {
  generationRunId: string;
  tags?: string[];
  canSeedCorpus?: boolean;
}): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const { data, error } = await db
    .from("saved_outputs")
    .insert({
      generation_run_id: args.generationRunId,
      tags: args.tags ?? [],
      can_seed_corpus: args.canSeedCorpus ?? false,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[saved_outputs] insert failed:", error.message);
    return null;
  }
  return data.id as string;
}
