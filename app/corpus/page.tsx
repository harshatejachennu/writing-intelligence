import { listSourceTexts } from "@/lib/pipeline/corpus";
import { isDbConfigured } from "@/lib/db/client";
import { CurateForm } from "@/components/curate-form";

export const dynamic = "force-dynamic";

const ACCESS_COLORS: Record<string, string> = {
  public_domain: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  user_owned: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  licensed: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  copyrighted: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  excerpt_only: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export default async function CorpusPage() {
  const configured = isDbConfigured();
  const sources = configured ? await listSourceTexts() : [];

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Corpus Library</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Curated source texts: why each one matters and where to study it. Metadata and
          technique summaries — never long copyrighted text.
        </p>
      </div>

      {!configured && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Supabase is not configured — see the README&rsquo;s Database setup section.
        </div>
      )}

      <CurateForm />

      {configured && sources.length === 0 && (
        <p className="text-sm text-slate-500">
          No sources yet. Curate your first lead above — e.g. &ldquo;Gettysburg Address,
          Lincoln, 1863 — compression and moral escalation&rdquo;.
        </p>
      )}

      <ul className="space-y-3">
        {sources.map((s) => (
          <li key={s.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{s.title}</span>
              <span className="text-sm text-slate-500">— {s.author}</span>
              <span className={`rounded px-1.5 py-0.5 text-xs ${ACCESS_COLORS[s.access] ?? ""}`}>
                {s.access}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-xs ${
                  s.imitation_risk === "high"
                    ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400"
                }`}
              >
                imitation risk: {s.imitation_risk}
              </span>
              <span className="text-xs text-slate-400">
                {s.genre} · {s.era} · {s.source_type}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{s.why_useful}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {s.techniques_demonstrated.map((t) => (
                <span
                  key={t}
                  className="rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-800 dark:bg-violet-950 dark:text-violet-300"
                >
                  {t}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wide">Study:</span>{" "}
              {s.recommended_passage}
              {s.citation_url && (
                <>
                  {" · "}
                  <a href={s.citation_url} className="underline" target="_blank" rel="noreferrer">
                    source
                  </a>
                </>
              )}
            </p>
            {s.stored_excerpt && (
              <blockquote className="mt-2 border-l-2 border-slate-300 pl-3 text-sm italic text-slate-600 dark:border-slate-700 dark:text-slate-400">
                {s.stored_excerpt}
              </blockquote>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
