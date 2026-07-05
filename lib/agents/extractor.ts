import {
  ExtractionSchema,
  EXTRACTION_SCHEMA_HINT,
  type Extraction,
} from "@/lib/schemas/technique-card";
import { jsonContract, type AgentDef } from "./types";
import type { Analysis } from "@/lib/schemas/analyzer";

export interface ExtractorInput {
  /** The structured analysis to mine for techniques. */
  analysis: Analysis;
  /** Optional context that improves card quality. */
  passageText?: string;
  genre?: string;
  /** DB linkage — recorded as source_refs on saved cards, not sent to the model. */
  analysisId?: string;
}

const SYSTEM = [
  "You are a Technique Extractor inside a writing-intelligence system.",
  "You convert a structured passage analysis into reusable TECHNIQUE CARDS —",
  "transferable writing techniques that can be applied to completely different",
  "topics, genres, and writers.",
  "",
  "OUTPUT STRUCTURE (exactly 8 cards):",
  "- 3 card_role=core — the load-bearing techniques without which the passage",
  "  would not work.",
  "- 3 card_role=secondary — present and useful, but supporting.",
  "- 2 card_role=failure_mode — risks or anti-patterns the passage courts (or",
  "  that imitating it would court), written as techniques to recognize and",
  "  avoid: name the trap, when writers fall into it, and how to check for it.",
  "",
  "RULES:",
  "- Extract only techniques that genuinely TRANSFER. A technique tied to this",
  "  passage's specific subject matter is not a technique; it is a description.",
  "- EVERY card must be useful across MULTIPLE genres. genre_fit lists at least",
  "  two genres; if the source is a college essay, the card must still earn its",
  "  place in at least one non-essay genre (speeches, technical writing, fiction,",
  "  emails, reports...). A card that only makes sense for college essays is not",
  "  a card — generalize it or drop it for a better one.",
  "- technique_name must be snake_case and generic (consequence_before_context,",
  "  not maria_salt_opening).",
  "- specificity_level: obvious = a casual reader would notice it; subtle = only",
  "  visible on rereading; advanced = requires craft knowledge to even name.",
  "- transfer_difficulty: low = works almost anywhere with light editing;",
  "  medium = needs judgment about fit; high = easy to botch without skill.",
  "- best_for_tasks: at least two CONCRETE task types across genres",
  "  (e.g. 'opening a conference talk', 'incident postmortem intros').",
  "- when_not_to_use and bad_use_warning are mandatory thinking: state where the",
  "  technique backfires (e.g. forcing suspense onto urgent instructions).",
  "- genre_adaptations must include at least one genre OUTSIDE the source genre.",
  "- revision_instruction must be imperative and executable by an editor",
  "  (e.g. 'Move the outcome sentence to the first line; delay the explanation').",
  "- Do NOT quote more than a few words from the source passage anywhere.",
].join("\n");

export const extractorAgent: AgentDef<ExtractorInput, Extraction> = {
  id: "extractor",
  route: "extractor",
  description: "Turns a structured analysis into reusable technique cards.",
  schema: ExtractionSchema,
  schemaHint: EXTRACTION_SCHEMA_HINT,
  buildPrompt(input) {
    const parts = [
      input.genre ? `Source genre: ${input.genre}.` : "",
      "Structured analysis to mine:",
      "<<<ANALYSIS",
      JSON.stringify(input.analysis, null, 2),
      "ANALYSIS",
    ];
    if (input.passageText) {
      parts.push(
        "",
        "Original passage (context only — do not reproduce it):",
        "<<<PASSAGE",
        input.passageText.trim(),
        "PASSAGE",
      );
    }
    parts.push(jsonContract(EXTRACTION_SCHEMA_HINT));
    return { system: SYSTEM, user: parts.filter(Boolean).join("\n") };
  },
};
