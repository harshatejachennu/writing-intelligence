import {
  SourceTextSchema,
  SOURCE_TEXT_SCHEMA_HINT,
  EXCERPT_WORD_CAP,
  type SourceText,
} from "@/lib/schemas/source-text";
import { jsonContract, type AgentDef } from "./types";

export interface CuratorInput {
  /** Whatever the user knows: a title, author, URL, notes, or a pasted excerpt. */
  description: string;
  pastedExcerpt?: string;
  /** True when the user attests the pasted text is their own writing. */
  userOwned?: boolean;
}

const SYSTEM = [
  "You are a Corpus Curator inside a writing-intelligence system.",
  "You turn a lead (title/author/notes/excerpt) into a structured corpus entry",
  "that records WHY a text is rhetorically valuable and WHERE to study it.",
  "",
  "LEGAL RULES (non-negotiable):",
  `- Never reproduce more than ${EXCERPT_WORD_CAP} words of a copyrighted text.`,
  "  recommended_passage DESCRIBES the location ('the opening paragraph', 'the",
  "  final speech in ch. 12'); it never quotes it.",
  "- access: public_domain only when you are confident (pre-1930 US publication",
  "  or government works); otherwise copyrighted or excerpt_only. user_owned",
  "  only when the user attests the text is theirs.",
  "- stored_excerpt: include ONLY if the user pasted text (use their paste,",
  "  shortened to the cap for non-free works) or the work is public domain.",
  "  Otherwise null.",
  "- imitation_risk reflects how recognizable/distinctive the style is: famous",
  "  distinctive voices (e.g. Gone Girl's Amy) = high; standard expository",
  "  prose = low.",
  "- why_useful + techniques_demonstrated must be about transferable craft,",
  "  not plot summary.",
].join("\n");

export const curatorAgent: AgentDef<CuratorInput, SourceText> = {
  id: "curator",
  route: "curator",
  description: "Turns a lead into a structured, legally-safe corpus entry.",
  schema: SourceTextSchema,
  schemaHint: SOURCE_TEXT_SCHEMA_HINT,
  buildPrompt(input) {
    const parts = [
      "Lead to curate:",
      "<<<LEAD",
      input.description.trim(),
      "LEAD",
    ];
    if (input.pastedExcerpt?.trim()) {
      parts.push(
        "",
        input.userOwned
          ? "User-pasted excerpt (user attests this is their own writing → access=user_owned):"
          : "User-pasted excerpt (ownership unverified — apply the word cap):",
        "<<<EXCERPT",
        input.pastedExcerpt.trim(),
        "EXCERPT",
      );
    }
    parts.push(jsonContract(SOURCE_TEXT_SCHEMA_HINT));
    return { system: SYSTEM, user: parts.join("\n") };
  },
};
