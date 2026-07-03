/**
 * Phase 6 verification — Voice Profiles.
 *  Part A (no keys): voice prompt + schema; generator embeds a voice profile.
 *  Part B (Supabase): voice profile persistence + listing.
 *
 *   Run: npm run test:phase6
 */

import { loadEnvLocal, makeChecker } from "./helpers";

loadEnvLocal();
const { check, done } = makeChecker();

const dim = (score: number) => ({ score, note: "pattern seen across samples" });

const voiceProfile = {
  name: "[phase6-verification] dry reflective engineer",
  dimensions: {
    directness: dim(8), formality: dim(4), humor: dim(6),
    emotional_openness: dim(3), confidence: dim(7), warmth: dim(5),
    technical_density: dim(7), imagery_use: dim(2), example_use: dim(8),
  },
  sentence_length: "short declaratives with occasional long wind-ups",
  vocabulary_level: "plain with precise technical terms",
  reflection_style: "thinks by comparing concrete cases",
  preferred_transitions: ["But here's the thing:", "Which is why"],
  natural_rhythm: "staccato, lands hard on the last clause",
  signature_moves: ["undercuts a big claim with a dry aside"],
  what_would_sound_fake: ["corporate buzzwords", "dramatic one-word sentences"],
};

async function main() {
  const { buildAgentPrompt, ingestAgentResponse } = await import("@/lib/models/execute");

  // ── Part A ──────────────────────────────────────────────────────────────────
  const built = buildAgentPrompt("voice", { samples: ["Sample one text.", "Sample two text."] });
  check("voice: prompt builds (manual)", built.mode === "manual");
  check("voice: both samples embedded", built.copyText.includes("Sample one") && built.copyText.includes("Sample two"));
  check("voice: valid profile passes", ingestAgentResponse("voice", JSON.stringify(voiceProfile)).validation.ok);
  check(
    "voice: score 12 rejected",
    !ingestAgentResponse("voice", JSON.stringify({
      ...voiceProfile,
      dimensions: { ...voiceProfile.dimensions, humor: dim(12) },
    })).validation.ok,
  );
  check(
    "voice: empty what_would_sound_fake rejected",
    !ingestAgentResponse("voice", JSON.stringify({ ...voiceProfile, what_would_sound_fake: [] })).validation.ok,
  );

  // Generator must embed the voice profile in its prompt.
  const genBuilt = buildAgentPrompt("generator", {
    goalProfile: {
      task: "generate_text", genre: "email", audience: "team", purpose: "update",
      reader_effect: ["understand status"], tone: { direct: 8 }, voice: "mine",
      length: "150 words", constraints: [], required_facts: [], forbidden_content: [],
      risk_factors: [], evaluation_criteria: ["status is clear"], desired_techniques: [],
      techniques_to_avoid: [], high_stakes: false,
    },
    strategyPlan: {
      structure: [{ section: "status", purpose: "inform" }, { section: "ask", purpose: "action" }],
      opening_strategy: "lead with status", ending_strategy: "single ask",
      techniques_to_use: [{ technique: "plain_summary", where: "opening", why: "clarity" }],
      techniques_to_avoid: [], turns: [], explicit_vs_implied: "all explicit",
      attention_control: "brevity", risks: [],
    },
    cards: [],
    voiceProfile,
  });
  check("generator: voice profile embedded in prompt", genBuilt.copyText.includes("dry reflective engineer"));
  check("generator: fake-tells passed through", genBuilt.copyText.includes("corporate buzzwords"));

  // ── Part B ──────────────────────────────────────────────────────────────────
  const { getDb } = await import("@/lib/db/client");
  const db = getDb();
  if (!db) {
    console.log("\n(Supabase not configured — skipping persistence checks.)");
    done("Phase 6");
    return;
  }

  const { persistAgentOutput } = await import("@/lib/pipeline/persist");
  const { listVoiceProfiles } = await import("@/lib/pipeline/voice");

  const saved = await persistAgentOutput({
    agentId: "voice",
    input: { samples: ["s1"] },
    output: voiceProfile,
    mode: "manual",
    manualModel: "phase6-verification",
  });
  check("persist: voice profile saved", saved.savedId !== null);

  const listed = await listVoiceProfiles();
  const mine = listed.find((v) => v.id === saved.savedId);
  check("list: profile visible with name", mine?.dimensions_json?.name === voiceProfile.name);
  check("list: dimensions intact", mine?.dimensions_json?.dimensions?.directness?.score === 8);

  await db.from("voice_profiles").delete().eq("id", saved.savedId!);
  await db.from("pipeline_runs").delete().eq("manual_model", "phase6-verification");
  console.log("\nCleaned up verification rows.");

  done("Phase 6");
}

main().catch((e) => {
  console.error("Verification crashed:", e);
  process.exit(1);
});
