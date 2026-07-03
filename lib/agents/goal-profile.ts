import {
  GoalProfileSchema,
  GOAL_PROFILE_SCHEMA_HINT,
  type GoalProfile,
} from "@/lib/schemas/goal-profile";
import { jsonContract, type AgentDef } from "./types";

export interface GoalProfileInput {
  request: string;
  genrePreset?: string;
}

const SYSTEM = [
  "You are a Goal Profile Builder inside a writing-intelligence system.",
  "You convert a raw writing request into a precise, structured goal profile —",
  "the contract every downstream step (strategy, retrieval, generation, critique)",
  "will be held to.",
  "",
  "RULES:",
  "- Infer what is implied but unstated: audience, real purpose, risks.",
  "- reader_effect must be concrete states ('feel personally responsible'),",
  "  never vague ('be engaged').",
  "- evaluation_criteria must be checkable against the finished text.",
  "- Set high_stakes=true for admissions, scholarship, legal, medical,",
  "  professional application, or grant writing — anywhere invented facts or an",
  "  inauthentic voice could harm the writer.",
  "- If the request implies personal experience, list what facts are needed in",
  "  required_facts rather than inventing any.",
  "- risk_factors: name the specific failure modes for THIS request",
  "  (e.g. 'sounding cheesy to teenagers', 'jargon before explanation').",
].join("\n");

export const goalProfileAgent: AgentDef<GoalProfileInput, GoalProfile> = {
  id: "goalProfile",
  route: "goalProfile",
  description: "Converts a raw writing request into a structured goal profile.",
  schema: GoalProfileSchema,
  schemaHint: GOAL_PROFILE_SCHEMA_HINT,
  buildPrompt(input) {
    const user = [
      input.genrePreset ? `Genre preset selected by the user: ${input.genrePreset}.` : "",
      "Writing request:",
      "<<<REQUEST",
      input.request.trim(),
      "REQUEST",
      jsonContract(GOAL_PROFILE_SCHEMA_HINT),
    ]
      .filter(Boolean)
      .join("\n");
    return { system: SYSTEM, user };
  },
};
