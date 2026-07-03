import { searchTechniqueCards } from "@/lib/retrieval/search";
import { isDbConfigured } from "@/lib/db/client";
import { TechniqueCardView } from "@/components/technique-card";
import { TechniqueCardSchema } from "@/lib/schemas/technique-card";

export const dynamic = "force-dynamic";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; genre?: string; effect?: string }>;
}) {
  const { q, genre, effect } = await searchParams;
  const configured = isDbConfigured();
  const { hits, method } = configured
    ? await searchTechniqueCards({ q, genre, effect, limit: 24 })
    : { hits: [], method: "recent" as const };

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Technique Library</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Reusable technique cards extracted from analyzed passages.
        </p>
      </div>

      {!configured && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Supabase is not configured — the library is empty. See the README&rsquo;s
          Database setup section.
        </div>
      )}

      <form className="flex flex-wrap items-center gap-2" action="/library" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search techniques (e.g. 'make an opening pull the reader in')…"
          className="min-w-64 flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
        <input
          type="text"
          name="genre"
          defaultValue={genre ?? ""}
          placeholder="genre filter"
          className="w-36 rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
        >
          Search
        </button>
        {q && (
          <span className="text-xs text-slate-500">
            search method: <strong>{method}</strong>
            {method === "text" && " (add an OpenAI key to enable semantic search)"}
          </span>
        )}
      </form>

      {configured && hits.length === 0 && (
        <p className="text-sm text-slate-500">
          {q
            ? "No cards match. Try different words, or extract more techniques."
            : "No cards yet. Analyze a passage, then click “Extract technique cards”."}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {hits.map((h) => {
          const parsed = TechniqueCardSchema.safeParse(h.card_json);
          if (!parsed.success) return null;
          return (
            <div key={h.id}>
              {typeof h.similarity === "number" && (
                <div className="mb-1 text-right text-xs text-slate-400">
                  similarity {(h.similarity * 100).toFixed(0)}%
                </div>
              )}
              <TechniqueCardView card={parsed.data} />
            </div>
          );
        })}
      </div>
    </main>
  );
}
