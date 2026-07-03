import { getDb } from "@/lib/db/client";
import { validateExcerptGuard, type SourceText } from "@/lib/schemas/source-text";

/**
 * Corpus persistence. The app-side excerpt guard runs BEFORE the insert so the
 * user gets a friendly message instead of a raw constraint violation (the DB
 * excerpt_length_guard remains the backstop).
 */
export async function saveSourceText(
  st: SourceText,
): Promise<{ id: string | null; guardError: string | null }> {
  const guardError = validateExcerptGuard(st);
  if (guardError) return { id: null, guardError };

  const db = getDb();
  if (!db) return { id: null, guardError: null };

  const { data, error } = await db
    .from("source_texts")
    .insert({
      title: st.title,
      author: st.author,
      genre: st.genre,
      era: st.era,
      source_type: st.source_type,
      access: st.access,
      why_useful: st.why_useful,
      techniques_demonstrated: st.techniques_demonstrated,
      recommended_passage: st.recommended_passage,
      citation_url: st.citation_url,
      imitation_risk: st.imitation_risk,
      stored_excerpt: st.stored_excerpt,
      notes: st.notes,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[source_texts] insert failed:", error.message);
    return { id: null, guardError: null };
  }
  return { id: data.id as string, guardError: null };
}

export interface SourceTextRow extends SourceText {
  id: string;
  created_at: string;
}

export async function listSourceTexts(limit = 100): Promise<SourceTextRow[]> {
  const db = getDb();
  if (!db) return [];
  const { data, error } = await db
    .from("source_texts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[source_texts] list failed:", error.message);
    return [];
  }
  return data as SourceTextRow[];
}
