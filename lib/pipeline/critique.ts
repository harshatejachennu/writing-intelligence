import { getDb } from "@/lib/db/client";
import type { Critique } from "@/lib/schemas/critique";
import type { Revision } from "@/lib/schemas/revision";

/**
 * Critique/revision persistence.
 * Critiquing pasted text creates a `documents` row (kind=draft) so every
 * critique has a stable target; revisions chain via parent_revision_id and
 * advance documents.current_revision_id — the append-only history the
 * iteration loop and comparison mode read.
 */

export async function saveCritique(args: {
  text: string;
  critique: Critique;
  documentId?: string;
}): Promise<{ critiqueId: string | null; documentId: string | null }> {
  const db = getDb();
  if (!db) return { critiqueId: null, documentId: null };

  let documentId = args.documentId ?? null;
  if (!documentId) {
    const { data: doc, error: dErr } = await db
      .from("documents")
      .insert({ kind: "draft", body: args.text })
      .select("id")
      .single();
    if (dErr) {
      console.error("[documents] insert failed:", dErr.message);
      return { critiqueId: null, documentId: null };
    }
    documentId = doc.id as string;
  }

  const { data, error } = await db
    .from("critiques")
    .insert({
      target_document_id: documentId,
      scores_json: { scores: args.critique.scores, risk: args.critique.risk },
      issues_json: {
        issues: args.critique.issues,
        biggest_weakness: args.critique.biggest_weakness,
      },
      goal_met: args.critique.goal_met,
      next_revision_instruction: args.critique.next_revision_instruction,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[critiques] insert failed:", error.message);
    return { critiqueId: null, documentId };
  }
  return { critiqueId: data.id as string, documentId };
}

export async function saveRevision(args: {
  revision: Revision;
  documentId?: string;
  critiqueId?: string;
  parentRevisionId?: string;
}): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  const { data, error } = await db
    .from("revisions")
    .insert({
      document_id: args.documentId ?? null,
      parent_revision_id: args.parentRevisionId ?? null,
      body: args.revision.revised_text,
      change_summary: args.revision.change_summary,
      critique_id: args.critiqueId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[revisions] insert failed:", error.message);
    return null;
  }

  if (args.documentId) {
    await db
      .from("documents")
      .update({ current_revision_id: data.id })
      .eq("id", args.documentId);
  }
  return data.id as string;
}
