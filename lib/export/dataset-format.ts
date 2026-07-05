import type { AssembledExample } from "@/lib/pipeline/dataset";

/**
 * Dataset serialization (Phase 9 Prep). Three formats:
 *  - JSONL: one JSON object per line — the shape future supervised fine-tuning
 *    / evaluation harnesses consume. Each line parses independently.
 *  - JSON: a pretty array for analysis/debugging.
 *  - CSV: a flat summary for eyeballing examples in a spreadsheet.
 * NOTE: this is dataset collection for FUTURE evaluation/fine-tuning — nothing
 * here trains a model.
 */

export function toJSONL(examples: AssembledExample[]): string {
  // One compact JSON object per line; JSON.stringify escapes embedded newlines,
  // so multi-line outputs stay on a single physical line.
  return examples.map((e) => JSON.stringify(e)).join("\n") + (examples.length ? "\n" : "");
}

export function toJSON(examples: AssembledExample[]): string {
  return JSON.stringify(examples, null, 2);
}

function csvCell(value: unknown): string {
  const s =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : JSON.stringify(value);
  // Quote if the cell contains comma, quote, or newline; escape quotes by doubling.
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const CSV_COLUMNS = [
  "saved_output_id",
  "promoted_at",
  "agent_id",
  "genre",
  "task_type",
  "manual_model",
  "overall_quality",
  "usefulness",
  "originality",
  "schema_valid",
  "human_approved",
  "output_chars",
  "has_critique",
  "revision_count",
  "effective_mode",
  "final_model",
  "notes",
] as const;

export function toCSV(examples: AssembledExample[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = examples.map((e) =>
    [
      e.saved_output_id,
      e.promoted_at,
      e.agent_id,
      e.genre,
      e.task_type,
      e.manual_model,
      e.quality_review.overall_quality,
      e.quality_review.usefulness,
      e.quality_review.originality,
      e.quality_review.schema_valid,
      e.quality_review.human_approved,
      e.final_output?.length ?? 0,
      e.critique_scores ? "yes" : "no",
      e.revision_history.length,
      e.route_receipt?.effective_mode ?? "",
      e.route_receipt?.final_model ?? "",
      e.quality_review.notes ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  return [header, ...rows].join("\n") + "\n";
}

export function serializeDataset(
  examples: AssembledExample[],
  format: "jsonl" | "json" | "csv",
): { body: string; contentType: string; extension: string } {
  switch (format) {
    case "jsonl":
      return { body: toJSONL(examples), contentType: "application/x-ndjson", extension: "jsonl" };
    case "csv":
      return { body: toCSV(examples), contentType: "text/csv", extension: "csv" };
    case "json":
    default:
      return { body: toJSON(examples), contentType: "application/json", extension: "json" };
  }
}
