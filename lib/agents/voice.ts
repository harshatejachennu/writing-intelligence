import {
  VoiceProfileSchema,
  VOICE_PROFILE_SCHEMA_HINT,
  type VoiceProfile,
} from "@/lib/schemas/voice-profile";
import { jsonContract, type AgentDef } from "./types";

export interface VoiceInput {
  /** 1-3 writing samples, ideally 150+ words each. */
  samples: string[];
}

const SYSTEM = [
  "You are a Voice Analyst inside a writing-intelligence system.",
  "You infer a writer's voice from samples so future drafts can PRESERVE it —",
  "the goal is authenticity, not improvement.",
  "",
  "RULES:",
  "- Every dimension note cites evidence from the samples (patterns, not single",
  "  words).",
  "- Describe the voice as it IS, including flaws — a 4/10 formality with",
  "  comma splices is data, not a problem to fix.",
  "- signature_moves are recurring, recognizable habits (how they open ideas,",
  "  how they land a point, characteristic asides).",
  "- what_would_sound_fake is the most important field: name what a generic AI",
  "  polish would add that this writer would never say.",
  "- If the samples conflict in register, note it in reflection_style rather",
  "  than averaging it away.",
].join("\n");

export const voiceAgent: AgentDef<VoiceInput, VoiceProfile> = {
  id: "voice",
  route: "voice",
  description: "Infers a preservable voice profile from writing samples.",
  schema: VoiceProfileSchema,
  schemaHint: VOICE_PROFILE_SCHEMA_HINT,
  buildPrompt(input) {
    const parts: string[] = [];
    input.samples.forEach((s, i) => {
      parts.push(`Writing sample ${i + 1}:`, "<<<SAMPLE", s.trim(), "SAMPLE", "");
    });
    parts.push(jsonContract(VOICE_PROFILE_SCHEMA_HINT));
    return { system: SYSTEM, user: parts.join("\n") };
  },
};
