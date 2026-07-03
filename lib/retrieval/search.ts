import { getDb } from "@/lib/db/client";
import { embedText } from "./embed";

/**
 * Technique card retrieval. Vector search when embeddings are available
 * (query AND cards), otherwise a Postgres text-search fallback over the
 * denormalized `summary` column — so the library is useful with zero API keys.
 */

export interface CardHit {
  id: string;
  technique_id: string | null;
  card_json: unknown;
  plain_name: string | null;
  summary: string | null;
  genre_fit: string[] | null;
  reader_effects: string[] | null;
  similarity?: number;
  created_at?: string;
}

export interface SearchOptions {
  q?: string;
  genre?: string;
  effect?: string;
  limit?: number;
}

export async function searchTechniqueCards(opts: SearchOptions): Promise<{
  hits: CardHit[];
  method: "vector" | "text" | "recent";
}> {
  const db = getDb();
  if (!db) return { hits: [], method: "recent" };
  const limit = opts.limit ?? 12;
  const q = opts.q?.trim();

  // ── Vector path: only if we can embed the query ────────────────────────────
  if (q) {
    const queryEmbedding = await embedText(q).catch(() => null);
    if (queryEmbedding) {
      const { data, error } = await db.rpc("match_technique_cards", {
        query_embedding: queryEmbedding,
        match_count: limit,
      });
      if (!error && data && data.length > 0) {
        return { hits: filterHits(data as CardHit[], opts), method: "vector" };
      }
      // fall through to text search (e.g. no cards have embeddings yet)
    }
  }

  // ── Text fallback / browse ─────────────────────────────────────────────────
  let query = db
    .from("technique_cards")
    .select("id, technique_id, card_json, plain_name, summary, genre_fit, reader_effects, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (q) {
    // Match any query word against the summary text.
    const words = q.split(/\s+/).filter((w) => w.length > 2);
    if (words.length > 0) {
      query = query.or(words.map((w) => `summary.ilike.%${w}%`).join(","));
    }
  }
  if (opts.genre) query = query.contains("genre_fit", [opts.genre]);
  if (opts.effect) query = query.contains("reader_effects", [opts.effect]);

  const { data, error } = await query;
  if (error) {
    console.error("[search] text search failed:", error.message);
    return { hits: [], method: q ? "text" : "recent" };
  }
  return { hits: (data ?? []) as CardHit[], method: q ? "text" : "recent" };
}

function filterHits(hits: CardHit[], opts: SearchOptions): CardHit[] {
  return hits.filter(
    (h) =>
      (!opts.genre || h.genre_fit?.includes(opts.genre)) &&
      (!opts.effect || h.reader_effects?.includes(opts.effect)),
  );
}
