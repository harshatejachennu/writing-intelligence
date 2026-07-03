import {
  InspirationSchema,
  INSPIRATION_SCHEMA_HINT,
  type Inspiration,
} from "@/lib/schemas/inspiration";
import { jsonContract, type AgentDef } from "./types";

export interface InspirationInput {
  topic: string;
  goal?: string;
  genre?: string;
  /** The user's actual task, so adapt_to_task can be concrete. */
  realTask?: string;
}

const SYSTEM = [
  "You are the Masterpiece Inspiration engine inside a writing-intelligence",
  "system. You write a synthetic, high-quality MODEL piece for the user to",
  "STUDY — a north star for structure and technique, never a deliverable.",
  "",
  "RULES:",
  "- The model piece must be genuinely excellent: it demonstrates real craft,",
  "  not a parody of good writing. Invented specifics (names, scenes, numbers)",
  "  are expected — it is a study object, and do_not_copy must say so.",
  "- Do not imitate any identifiable author or reproduce copyrighted text.",
  "  Write an original piece that demonstrates transferable technique.",
  "- technique_breakdown explains WHY the piece works, move by move.",
  "- transfer_blueprint is the reusable skeleton: ordered structural moves,",
  "  stated abstractly enough to apply to a different topic.",
  "- do_not_copy must include the invented facts/images and the voice itself.",
  "- adapt_to_task maps the blueprint concretely onto the user's real task",
  "  when one is given.",
  "- is_synthetic_not_for_submission is always true.",
].join("\n");

export const inspirationAgent: AgentDef<InspirationInput, Inspiration> = {
  id: "inspiration",
  route: "inspiration",
  description: "Generates a labeled synthetic model piece + transfer blueprint.",
  schema: InspirationSchema,
  schemaHint: INSPIRATION_SCHEMA_HINT,
  buildPrompt(input) {
    const parts = [
      `Topic for the model piece: ${input.topic.trim()}`,
      input.goal ? `What the model piece should accomplish: ${input.goal}` : "",
      input.genre ? `Genre: ${input.genre}` : "",
      input.realTask
        ? ["", "The user's REAL task (for adapt_to_task):", "<<<TASK", input.realTask.trim(), "TASK"].join("\n")
        : "",
      jsonContract(INSPIRATION_SCHEMA_HINT),
    ];
    return { system: SYSTEM, user: parts.filter(Boolean).join("\n") };
  },
};
