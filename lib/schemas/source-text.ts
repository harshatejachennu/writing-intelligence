import { z } from "zod";

/**
 * Curated corpus entry. The legal core of Corpus Builder: we store metadata,
 * technique summaries, and WHERE to look — not long copyrighted text.
 */

export const ACCESS_STATUS = [
  "public_domain",
  "copyrighted",
  "excerpt_only",
  "user_owned",
  "licensed",
] as const;

export const IMITATION_RISK = ["low", "med", "high"] as const;

/** Word cap for stored excerpts of non-free texts (mirrors the DB constraint). */
export const EXCERPT_WORD_CAP = 90;

export const SourceTextSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  genre: z.string().min(1),
  era: z.string().min(1),
  source_type: z.string().min(1), // novel | speech | essay | textbook | ...
  access: z.enum(ACCESS_STATUS),
  why_useful: z.string().min(1),
  techniques_demonstrated: z.array(z.string().min(1)).min(1),
  /** A DESCRIPTION of which passage to study — never the passage itself. */
  recommended_passage: z.string().min(1),
  citation_url: z.string().nullable(),
  imitation_risk: z.enum(IMITATION_RISK),
  /** Optional short excerpt; app + DB enforce the word cap for non-free texts. */
  stored_excerpt: z.string().nullable(),
  notes: z.string().nullable(),
});

export type SourceText = z.infer<typeof SourceTextSchema>;

export const SOURCE_TEXT_SCHEMA_HINT = `{
  "title": "string",
  "author": "string",
  "genre": "string",
  "era": "e.g. '1863', '1930s', 'contemporary'",
  "source_type": "novel | speech | essay | lecture | textbook | memoir | ...",
  "access": "public_domain | copyrighted | excerpt_only | user_owned | licensed",
  "why_useful": "what this text teaches about writing",
  "techniques_demonstrated": ["technique names"],
  "recommended_passage": "WHERE to look (e.g. 'the opening two paragraphs'), never the text itself",
  "citation_url": "url or null",
  "imitation_risk": "low | med | high",
  "stored_excerpt": "short excerpt (under ${EXCERPT_WORD_CAP} words unless public domain/user-owned/licensed) or null",
  "notes": "string or null"
}`;

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** App-side mirror of the DB excerpt_length_guard, with a friendly message. */
export function validateExcerptGuard(st: SourceText): string | null {
  if (!st.stored_excerpt) return null;
  const free = ["public_domain", "user_owned", "licensed"].includes(st.access);
  if (free) return null;
  const words = wordCount(st.stored_excerpt);
  if (words > EXCERPT_WORD_CAP) {
    return `stored_excerpt is ${words} words but access="${st.access}" allows at most ${EXCERPT_WORD_CAP}. Shorten the excerpt or describe the passage in recommended_passage instead.`;
  }
  return null;
}
