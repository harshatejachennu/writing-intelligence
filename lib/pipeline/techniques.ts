import { getDb } from "@/lib/db/client";
import { cardSummaryText, type Extraction, type TechniqueCard } from "@/lib/schemas/technique-card";
import { embedText } from "@/lib/retrieval/embed";

/**
 * Persist extracted technique cards.
 *  - `techniques` is the canonical registry: upserted by slug, so extracting
 *    consequence_before_context twice yields ONE technique with two card
 *    versions (the plan's duplicate-card guard).
 *  - `technique_cards` rows carry the full card JSON, denormalized search text,
 *    array filters, and an embedding when a key is available (else null — the
 *    text-search fallback covers them).
 */
export async function saveExtraction(args: {
  extraction: Extraction;
  analysisId?: string;
}): Promise<{ cardIds: string[]; techniqueSlugs: string[] }> {
  const db = getDb();
  if (!db) return { cardIds: [], techniqueSlugs: [] };

  const cardIds: string[] = [];
  const techniqueSlugs: string[] = [];

  for (const card of args.extraction.cards) {
    // 1. Upsert the canonical technique by slug.
    const { data: technique, error: tErr } = await db
      .from("techniques")
      .upsert(
        {
          slug: card.technique_name,
          plain_name: card.plain_name,
          function: card.function,
        },
        { onConflict: "slug" },
      )
      .select("id, slug")
      .single();

    if (tErr) {
      console.error(`[techniques] upsert failed for ${card.technique_name}:`, tErr.message);
      continue;
    }
    techniqueSlugs.push(technique.slug as string);

    // 2. Insert the card version (embedding optional).
    const summary = cardSummaryText(card);
    const embedding = await embedText(summary).catch(() => null);

    const { data: saved, error: cErr } = await db
      .from("technique_cards")
      .insert({
        technique_id: technique.id,
        card_json: card,
        plain_name: card.plain_name,
        summary,
        embedding,
        genre_fit: card.genre_fit,
        reader_effects: card.reader_effect,
        source_refs: args.analysisId ? [args.analysisId] : [],
      })
      .select("id")
      .single();

    if (cErr) {
      console.error(`[technique_cards] insert failed for ${card.technique_name}:`, cErr.message);
      continue;
    }
    cardIds.push(saved.id as string);
  }

  return { cardIds, techniqueSlugs };
}

/** List/read helpers for the Library UI. */
export interface CardRow {
  id: string;
  card_json: TechniqueCard;
  plain_name: string | null;
  genre_fit: string[] | null;
  reader_effects: string[] | null;
  created_at: string;
}
