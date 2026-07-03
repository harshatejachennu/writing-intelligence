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
  "RULES:",
  "- Extract only techniques that genuinely TRANSFER. A technique tied to this",
  "  passage's specific subject matter is not a technique; it is a description.",
  "- Prefer 1-4 sharp cards over many shallow ones. Never exceed 6.",
  "- technique_name must be snake_case and generic (consequence_before_context,",
  "  not bunny_death_opening).",
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
