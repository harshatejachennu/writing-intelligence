"use client";

import type { DatasetFilters } from "@/lib/schemas/dataset";

/**
 * Export controls — build a download URL for /api/dataset/export carrying the
 * current filters. Export is always approved-only; the count of approved rows
 * in view is shown so the user knows what will come out.
 */
export function DatasetExportBar({
  filters,
  approvedCount,
  totalCount,
}: {
  filters: DatasetFilters;
  approvedCount: number;
  totalCount: number;
}) {
  function url(format: "jsonl" | "json" | "csv") {
    const p = new URLSearchParams();
    p.set("format", format);
    if (filters.agent_id) p.set("agent_id", filters.agent_id);
    if (filters.genre) p.set("genre", filters.genre);
    if (filters.manual_model) p.set("manual_model", filters.manual_model);
    if (filters.task_type) p.set("task_type", filters.task_type);
    if (typeof filters.min_quality === "number") p.set("min_quality", String(filters.min_quality));
    if (filters.from_date) p.set("from_date", filters.from_date);
    if (filters.to_date) p.set("to_date", filters.to_date);
    return `/api/dataset/export?${p.toString()}`;
  }

  const disabled = approvedCount === 0;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
      <span className="text-xs text-slate-500">
        {approvedCount} approved of {totalCount} shown — export is approved-only:
      </span>
      {(["jsonl", "json", "csv"] as const).map((fmt) => (
        <a
          key={fmt}
          href={disabled ? undefined : url(fmt)}
          aria-disabled={disabled}
          className={`rounded border px-2.5 py-1 text-xs ${
            disabled
              ? "pointer-events-none border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700"
              : "border-slate-300 text-slate-700 hover:border-slate-500 dark:border-slate-700 dark:text-slate-300"
          }`}
        >
          Export {fmt.toUpperCase()}
        </a>
      ))}
      <span className="text-xs text-slate-400">
        JSONL = fine-tuning shape · JSON = analysis · CSV = summary
      </span>
    </div>
  );
}
