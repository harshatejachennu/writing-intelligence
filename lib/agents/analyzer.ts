import { AnalysisSchema, ANALYSIS_SCHEMA_HINT, type Analysis } from "@/lib/schemas/analyzer";
import { jsonContract, type AgentDef } from "./types";

export interface AnalyzerInput {
  passageText: string;
  genre?: string;
}

const SYSTEM = [
  "You are a Passage Analyzer inside a writing-intelligence system.",
  "You decompose high-quality writing into its FUNCTIONAL parts: what each move",
  "does to the reader and why it works — not vague praise.",
  "",
  "RULES:",
  "- Every structural claim MUST cite evidence: a short quote or concrete reference.",
  "  Never write generic commentary like 'strong hook' without showing the mechanism.",
  "- CALIBRATED LANGUAGE ONLY. Absolute praise ('perfectly executes', 'masterfully',",
  "  'flawless', 'brilliant') is banned unless the same field cites explicit evidence",
  "  that would justify a 9-10 on a rubric — and even then, prefer describing WHAT the",
  "  move accomplishes over grading it. Most competent writing is competent, not perfect;",
  "  say what works, what is ordinary, and what strains.",
  "- Note weaknesses and near-misses with the same evidence standard as strengths —",
  "  an analysis with zero reservations about a student essay is a miscalibrated analysis.",
  "- Name transferable techniques as reusable, snake_case ideas (e.g. consequence_before_context),",
  "  each with a plain-English name and a one-line transfer rule.",
  "- Flag imitation risks: where copying this passage's specifics would be plagiarism",
  "  or would force artificial drama onto unrelated writing.",
  "- Do NOT reproduce long spans of the passage; quote only the minimum needed as evidence.",
].join("\n");

export const analyzerAgent: AgentDef<AnalyzerInput, Analysis> = {
  id: "analyzer",
  route: "analyzer",
  description: "Decomposes a passage into structured, evidence-cited functional analysis.",
  schema: AnalysisSchema,
  schemaHint: ANALYSIS_SCHEMA_HINT,
  buildPrompt(input) {
    const genreLine = input.genre
      ? `Genre context: ${input.genre}.`
      : "Genre context: infer the genre from the text.";
    const user = [
      genreLine,
      "",
      "Analyze the following passage:",
      "<<<PASSAGE",
      input.passageText.trim(),
      "PASSAGE",
      jsonContract(ANALYSIS_SCHEMA_HINT),
    ].join("\n");
    return { system: SYSTEM, user };
  },
};
