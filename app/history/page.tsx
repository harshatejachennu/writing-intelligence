import { listAnalyses } from "@/lib/pipeline/log";
import { isDbConfigured } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const configured = isDbConfigured();
  const analyses = configured ? await listAnalyses() : [];

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Saved analyses, newest first.
        </p>
      </div>

      {!configured && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Supabase is not configured, so nothing is being saved. Follow the
          &ldquo;Database&rdquo; section in the README, then restart the dev server.
        </div>
      )}

      {configured && analyses.length === 0 && (
        <p className="text-sm text-slate-500">
          No analyses saved yet. <a href="/analyze" className="underline">Analyze a passage</a> and
          it will appear here.
        </p>
      )}

      <ul className="space-y-3">
        {analyses.map((a) => (
          <li key={a.id}>
            <a
              href={`/history/${a.id}`}
              className="block rounded-lg border border-slate-200 p-4 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{new Date(a.created_at).toLocaleString()}</span>
                {a.genre && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-900">{a.genre}</span>
                )}
                <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-900">
                  mode: {a.mode}
                </span>
                {a.manual_model && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-900">
                    via {a.manual_model}
                  </span>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-700 dark:text-slate-300">
                {a.passage_text}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
