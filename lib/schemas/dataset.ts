import { z } from "zod";

/**
 * Quality review captured when promoting a generation run to the dataset
 * (Phase 9 Prep). This is the explicit human signal that gates export — only
 * human_approved examples are ever exported. Not training yet; this is
 * collection + review for future evaluation/fine-tuning.
 */
export const DatasetReviewSchema = z.object({
  overall_quality: z.number().int().min(1).max(10),
  usefulness: z.number().int().min(1).max(10),
  originality: z.number().int().min(1).max(10),
  schema_valid: z.boolean(),
  human_approved: z.boolean(),
  notes: z.string().max(4000).optional().default(""),
  reject_reason: z.string().max(2000).optional(),
});

export type DatasetReview = z.infer<typeof DatasetReviewSchema>;

/** Filters for the Dataset page / export (task 5). */
export interface DatasetFilters {
  agent_id?: string;
  genre?: string;
  manual_model?: string;
  task_type?: string;
  min_quality?: number;
  from_date?: string; // ISO date (inclusive)
  to_date?: string; // ISO date (inclusive)
  approved_only?: boolean;
}

export const EXPORT_FORMATS = ["jsonl", "json", "csv"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
