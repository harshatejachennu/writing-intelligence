import { listDataset } from "@/lib/pipeline/dataset";
import { isDbConfigured } from "@/lib/db/client";
import { DatasetExportBar } from "@/components/dataset-export-bar";
import type { DatasetFilters } from "@/lib/schemas/dataset";

export const dynamic = "force-dynamic";

export default async function DatasetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filters: DatasetFilters = {
    agent_id: sp.agent_id || undefined,
    genre: sp.genre || undefined,
    manual_model: sp.manual_model || undefined,
    task_type: sp.task_type || undefined,
    min_quality: sp.min_quality ? Number(sp.min_quality) : undefined,
    from_date: sp.from_date || undefined,
    to_date: sp.to_date || undefined,
  };
  const configured = isDbConfigured();
  const rows = configured ? await listDataset(filters) : [];
  const approvedCount = rows.filter((r) => r.human_approved).length;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dataset</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Reviewed generation runs collected for future evaluation / fine-tuning.
        </p>
      </div>

      <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        ⚠ This is a <strong>dataset export for future evaluation / fine-tuning — no model is
        being trained yet</strong>. Only human-approved examples are exported, and copyrighted
        source bodies are excluded unless user-owned, public-domain, or licensed.
      </div>

      {!configured && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Supabase is not configured — no dataset to show. See the README&rsquo;s Database setup.
        </div>
      )}

      {/* Filters */}
      <form className="flex flex-wrap items-end gap-2" action="/dataset" method="get">
        <Field name="agent_id" label="agent" defaultValue={sp.agent_id} placeholder="generator" />
        <Field name="genre" label="genre" defaultValue={sp.genre} placeholder="speech" />
        <Field name="task_type" label="task type" defaultValue={sp.task_type} placeholder="generate_text" />
        <Field name="manual_model" label="manual_model" defaultValue={sp.manual_model} placeholder="claude-opus" />
        <label className="text-xs text-slate-500">
          min quality
          <input
            type="number"
            name="min_quality"
            min={1}
            max={10}
            defaultValue={sp.min_quality}
            className="mt-1 block w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <label className="text-xs text-slate-500">
          from
          <input type="date" name="from_date" defaultValue={sp.from_date} className="mt-1 block rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <label className="text-xs text-slate-500">
          to
          <input type="date" name="to_date" defaultValue={sp.to_date} className="mt-1 block rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <button type="submit" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900">
          Filter
        </button>
        <a href="/dataset" className="text-xs text-slate-500 hover:underline">clear</a>
      </form>

      <DatasetExportBar filters={filters} approvedCount={approvedCount} totalCount={rows.length} />

      {configured && rows.length === 0 && (
        <p className="text-sm text-slate-500">
          No examples match. Generate a draft and use <strong>★ Promote to dataset</strong>.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-1 pr-3">Status</th>
              <th className="py-1 pr-3">Genre</th>
              <th className="py-1 pr-3">Task</th>
              <th className="py-1 pr-3">manual_model</th>
              <th className="py-1 pr-3">Quality</th>
              <th className="py-1 pr-3">Use</th>
              <th className="py-1 pr-3">Orig</th>
              <th className="py-1 pr-3">Schema</th>
              <th className="py-1 pr-3">Date</th>
              <th className="py-1">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-900">
                <td className="py-1.5 pr-3">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      r.human_approved
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                    title={r.human_approved ? "exportable" : r.reject_reason ?? "rejected"}
                  >
                    {r.human_approved ? "approved" : "rejected"}
                  </span>
                </td>
                <td className="py-1.5 pr-3">{r.genre ?? "—"}</td>
                <td className="py-1.5 pr-3">{r.task_type ?? "—"}</td>
                <td className="py-1.5 pr-3 font-mono text-xs">{r.manual_model ?? "—"}</td>
                <td className="py-1.5 pr-3">{r.overall_quality ?? "—"}</td>
                <td className="py-1.5 pr-3">{r.usefulness ?? "—"}</td>
                <td className="py-1.5 pr-3">{r.originality ?? "—"}</td>
                <td className="py-1.5 pr-3">{r.schema_valid === null ? "—" : r.schema_valid ? "✓" : "✗"}</td>
                <td className="py-1.5 pr-3 text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="py-1.5 max-w-xs truncate text-xs text-slate-500" title={r.notes ?? ""}>
                  {r.notes || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Field({ name, label, defaultValue, placeholder }: { name: string; label: string; defaultValue?: string; placeholder?: string }) {
  return (
    <label className="text-xs text-slate-500">
      {label}
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 block w-32 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
  );
}
