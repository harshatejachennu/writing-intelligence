/**
 * Phase 4 verification — Critic + Revision loop.
 *  Part A (no keys): critic/reviser prompts + schema validation (score bounds,
 *  mandatory issues/changes) + overallScore math.
 *  Part B (Supabase): critique creates a draft document; revision chains to it,
 *  links the critique, and advances current_revision_id. Cleans up.
 *
 *   Run: npm run test:phase4
 */

import { loadEnvLocal, makeChecker } from "./helpers";

loadEnvLocal();
const { check, done } = makeChecker();

const dim = (score: number) => ({ score, why: "reason", evidence: "quote from text" });

const critique = {
  scores: {
    clarity: dim(7), structure: dim(6), specificity: dim(5),
    reader_effect_match: dim(6), tone_fit: dim(7), voice_consistency: dim(8),
    genre_fit: dim(7), memorability: dim(4), compression: dim(6), flow: dim(7),
  },
  risk: dim(2),
  issues: [
    { issue: "generic opening", evidence: "In today's world", fix: "open with the specific scene" },
  ],
  goal_met: false,
  biggest_weakness: "the opening is generic",
  next_revision_instruction: "Replace the first sentence with the concrete scene from paragraph 2.",
};

const revision = {
  revised_text: "The gym smelled like floor wax and nerves. [rest unchanged]",
  change_summary: "Replaced the generic opening with the concrete scene.",
  changes: [
    { before: "In today's world, volunteering matters.", after: "The gym smelled like floor wax and nerves.", why: "concrete beats abstract" },
  ],
  what_was_not_changed: "Everything after the first sentence.",
};

async function main() {
  const { buildAgentPrompt, ingestAgentResponse } = await import("@/lib/models/execute");
  const { overallScore } = await import("@/lib/schemas/critique");

  // ── Part A ──────────────────────────────────────────────────────────────────
  const cBuilt = buildAgentPrompt("critic", { text: "Some draft text to critique." });
  check("critic: prompt builds (manual)", cBuilt.mode === "manual");
  check("critic: no-profile guidance present", cBuilt.copyText.includes("infer the text's intent"));
  check("critic: valid critique passes", ingestAgentResponse("critic", JSON.stringify(critique)).validation.ok);
  check(
    "critic: score 11 rejected",
    !ingestAgentResponse("critic", JSON.stringify({ ...critique, scores: { ...critique.scores, clarity: dim(11) } })).validation.ok,
  );
  check(
    "critic: empty issues rejected",
    !ingestAgentResponse("critic", JSON.stringify({ ...critique, issues: [] })).validation.ok,
  );
  check("critic: overallScore averages", overallScore(critique as never) === 6.3);

  const rBuilt = buildAgentPrompt("reviser", {
    text: "draft",
    biggestWeakness: critique.biggest_weakness,
    revisionInstruction: critique.next_revision_instruction,
  });
  check("reviser: prompt embeds instruction", rBuilt.copyText.includes("Replace the first sentence"));
  check("reviser: valid revision passes", ingestAgentResponse("reviser", JSON.stringify(revision)).validation.ok);
  check(
    "reviser: empty changes rejected",
    !ingestAgentResponse("reviser", JSON.stringify({ ...revision, changes: [] })).validation.ok,
  );

  // ── Part B ──────────────────────────────────────────────────────────────────
  const { getDb } = await import("@/lib/db/client");
  const db = getDb();
  if (!db) {
    console.log("\n(Supabase not configured — skipping persistence checks.)");
    done("Phase 4");
    return;
  }

  const { persistAgentOutput } = await import("@/lib/pipeline/persist");

  const draftText = "[phase4-verification] In today's world, volunteering matters.";
  const c1 = await persistAgentOutput({
    agentId: "critic",
    input: { text: draftText },
    output: critique,
    mode: "manual",
    manualModel: "phase4-verification",
  });
  check("persist: critique saved", c1.savedId !== null);
  check("persist: draft document auto-created", !!c1.documentId);

  const { data: critRow } = await db
    .from("critiques")
    .select("target_document_id, goal_met, next_revision_instruction, scores_json")
    .eq("id", c1.savedId!)
    .single();
  check("persist: critique → document link", critRow?.target_document_id === c1.documentId);
  check("persist: scores stored", critRow?.scores_json?.scores?.clarity?.score === 7);

  const r1 = await persistAgentOutput({
    agentId: "reviser",
    input: {
      text: draftText,
      biggestWeakness: critique.biggest_weakness,
      revisionInstruction: critique.next_revision_instruction,
      documentId: c1.documentId ?? undefined,
      critiqueId: c1.savedId ?? undefined,
    },
    output: revision,
    mode: "manual",
    manualModel: "phase4-verification",
  });
  check("persist: revision saved", r1.savedId !== null);

  const { data: revRow } = await db
    .from("revisions")
    .select("document_id, critique_id, body")
    .eq("id", r1.savedId!)
    .single();
  check("persist: revision → document + critique links", revRow?.document_id === c1.documentId && revRow?.critique_id === c1.savedId);

  const { data: docRow } = await db
    .from("documents")
    .select("current_revision_id")
    .eq("id", c1.documentId!)
    .single();
  check("persist: document head advanced to revision", docRow?.current_revision_id === r1.savedId);

  // Second revision chains to the first.
  const r2 = await persistAgentOutput({
    agentId: "reviser",
    input: {
      text: revision.revised_text,
      biggestWeakness: "still flat ending",
      revisionInstruction: "End on the concrete image.",
      documentId: c1.documentId ?? undefined,
      parentRevisionId: r1.savedId ?? undefined,
    },
    output: { ...revision, change_summary: "second pass" },
    mode: "manual",
    manualModel: "phase4-verification",
  });
  const { data: rev2Row } = await db
    .from("revisions")
    .select("parent_revision_id")
    .eq("id", r2.savedId!)
    .single();
  check("persist: revision chain (parent link)", rev2Row?.parent_revision_id === r1.savedId);

  // Cleanup (order matters: revisions → critiques → documents).
  await db.from("revisions").delete().in("id", [r1.savedId!, r2.savedId!]);
  await db.from("critiques").delete().eq("id", c1.savedId!);
  await db.from("documents").delete().eq("id", c1.documentId!);
  await db.from("pipeline_runs").delete().eq("manual_model", "phase4-verification");
  console.log("\nCleaned up verification rows.");

  done("Phase 4");
}

main().catch((e) => {
  console.error("Verification crashed:", e);
  process.exit(1);
});
