import { RevisionSchema, REVISION_SCHEMA_HINT, type Revision } from "@/lib/schemas/revision";
import { jsonContract, type AgentDef } from "./types";

export interface ReviserInput {
  text: string;
  biggestWeakness: string;
  revisionInstruction: string;
  genre?: string;
  /** DB linkage — not sent to the model. */
  documentId?: string;
  critiqueId?: string;
  parentRevisionId?: string;
}

const SYSTEM = [
  "You are a Revision Agent inside a writing-intelligence system.",
  "You fix ONE identified weakness. You are a scalpel, not a rewrite engine.",
  "",
  "RULES:",
  "- Execute the revision instruction. Change ONLY what it requires plus the",
  "  minimum surrounding text needed for the change to read naturally.",
  "- Preserve the author's voice, rhythm, and choices everywhere else. Do not",
  "  'improve' sentences you were not asked to touch — over-polishing destroys",
  "  authentic voice.",
  "- Never introduce new facts, names, numbers, or events.",
  "- changes[] must list every before→after pair honestly.",
  "- what_was_not_changed states what you deliberately left alone.",
].join("\n");

export const reviserAgent: AgentDef<ReviserInput, Revision> = {
  id: "reviser",
  route: "reviser",
  description: "Fixes only the flagged weakness; preserves everything else.",
  schema: RevisionSchema,
  schemaHint: REVISION_SCHEMA_HINT,
  buildPrompt(input) {
    const user = [
      input.genre ? `Genre context: ${input.genre}.` : "",
      `Biggest weakness identified by the critic: ${input.biggestWeakness}`,
      `Revision instruction: ${input.revisionInstruction}`,
      "",
      "Text to revise:",
      "<<<TEXT",
      input.text.trim(),
      "TEXT",
      jsonContract(REVISION_SCHEMA_HINT),
    ]
      .filter(Boolean)
      .join("\n");
    return { system: SYSTEM, user };
  },
};
