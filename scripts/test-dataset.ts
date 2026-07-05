/**
 * Phase 9 Prep verification — dataset collection + export.
 *  Part A (no DB): review schema validation; JSONL/JSON/CSV format validity;
 *  CSV escaping.
 *  Part B (Supabase): builds a realistic MANUAL-mode generation run with goal
 *  profile, strategy plan, retrieved card (linked to one copyrighted + one
 *  public-domain source), output document, critique, revision, and a manual
 *  route receipt; promotes an approved + a rejected example; then asserts:
 *   - approved example is assembled with full provenance (task 7)
 *   - rejected example is excluded from export (task 3/10)
 *   - copyrighted source body is redacted, public-domain body kept (task 8/10)
 *   - JSONL is line-valid (task 10)
 *   - manual-mode metadata preserved: mode=manual, manual_model, receipt (task 10/11)
 *  Cleans up all rows it creates.
 *
 *   Run: npm run test:dataset
 */

import { loadEnvLocal, makeChecker } from "./helpers";

loadEnvLocal();
const { check, done } = makeChecker();

const MANUAL_MODEL = "claude-opus-manual";
const TAG = "dataset-verification";

async function main() {
  const { DatasetReviewSchema } = await import("@/lib/schemas/dataset");
  const { toJSONL, toJSON, toCSV, serializeDataset } = await import("@/lib/export/dataset-format");

  // ── Part A: review schema ───────────────────────────────────────────────────
  const goodReview = {
    overall_quality: 9, usefulness: 8, originality: 7,
    schema_valid: true, human_approved: true, notes: "great example",
  };
  check("review: valid review passes", DatasetReviewSchema.safeParse(goodReview).success);
  check("review: score 0 rejected", !DatasetReviewSchema.safeParse({ ...goodReview, overall_quality: 0 }).success);
  check("review: score 11 rejected", !DatasetReviewSchema.safeParse({ ...goodReview, usefulness: 11 }).success);
  check("review: non-integer rejected", !DatasetReviewSchema.safeParse({ ...goodReview, originality: 7.5 }).success);
  check("review: missing human_approved rejected", !DatasetReviewSchema.safeParse({ ...goodReview, human_approved: undefined }).success);
  check("review: notes optional (defaults empty)", DatasetReviewSchema.safeParse({ ...goodReview, notes: undefined }).success);

  // ── Part A: format builders (with a synthetic assembled example) ────────────
  const ex = {
    saved_output_id: "so-1", promoted_at: "2026-07-05T00:00:00Z",
    agent_id: "generator", genre: "speech", task_type: "generate_text",
    manual_model: MANUAL_MODEL,
    goal_profile: { genre: "speech" }, strategy_plan: { structure: [] },
    retrieved_cards: [{ technique_name: "t" }],
    final_output: "Line one.\nLine two, with a comma and \"quotes\".",
    critique_scores: { scores: { clarity: { score: 8 } } },
    revision_history: [{ body: "rev", change_summary: "x", created_at: "2026-07-05T00:00:00Z" }],
    route_receipt: { requested_mode: "manual", effective_mode: "manual", attempted_provider: null, attempted_model: null, final_provider: null, final_model: null, fallback_reason: null, schema_valid: true, latency_ms: null },
    quality_review: { overall_quality: 9, usefulness: 8, originality: 7, schema_valid: true, human_approved: true, notes: 'has a comma, and "quotes"', reject_reason: null },
    sources: [],
  };

  const jsonl = toJSONL([ex, ex]);
  const lines = jsonl.trimEnd().split("\n");
  check("jsonl: one line per example", lines.length === 2);
  check("jsonl: every line parses as JSON independently", lines.every((l) => { try { JSON.parse(l); return true; } catch { return false; } }));
  check("jsonl: multi-line output stays on one line (newlines escaped)", lines[0].includes("\\n") && !lines[0].includes("\nLine two"));
  check("jsonl: empty set yields empty string", toJSONL([]) === "");

  check("json: parses as an array", Array.isArray(JSON.parse(toJSON([ex]))));

  const csv = toCSV([ex]);
  const csvLines = csv.trimEnd().split("\n");
  check("csv: header + one row", csvLines.length === 2);
  check("csv: header has key columns", csvLines[0].includes("overall_quality") && csvLines[0].includes("manual_model"));
  check("csv: quotes/commas escaped in a quoted cell", csv.includes('"has a comma, and ""quotes"""'));
  check("csv: escaping keeps the row on one physical line", csvLines.length === 2);

  check("serialize: jsonl content type", serializeDataset([ex], "jsonl").contentType === "application/x-ndjson");
  check("serialize: csv extension", serializeDataset([ex], "csv").extension === "csv");

  // ── Part B: persistence + assembly ──────────────────────────────────────────
  const { getDb } = await import("@/lib/db/client");
  const db = getDb();
  if (!db) {
    console.log("\n(Supabase not configured — skipping persistence checks.)");
    done("dataset");
    return;
  }

  const { promoteToDataset, assembleApprovedExamples, listDataset } = await import("@/lib/pipeline/dataset");

  // Sources: one copyrighted (body must be redacted), one public-domain (kept).
  const { data: copySrc } = await db.from("source_texts")
    .insert({ title: "[ds] Gone Girl", author: "Flynn", access: "copyrighted", stored_excerpt: "The morning of." })
    .select("id").single();
  const { data: pdSrc } = await db.from("source_texts")
    .insert({ title: "[ds] Gettysburg", author: "Lincoln", access: "public_domain", stored_excerpt: "Four score and seven years ago." })
    .select("id").single();

  // A technique + card whose source_refs point at both sources.
  const { data: tech } = await db.from("techniques")
    .insert({ slug: "ds_test_technique", plain_name: "ds", function: "f" })
    .select("id").single();
  const { data: card } = await db.from("technique_cards")
    .insert({ technique_id: tech!.id, card_json: { technique_name: "ds_test_technique", plain_name: "ds" }, source_refs: [copySrc!.id, pdSrc!.id] })
    .select("id").single();

  // Goal profile + strategy plan + output document + generation run (MANUAL).
  const { data: gp } = await db.from("goal_profiles")
    .insert({ profile_json: { task: "generate_text", genre: "speech", audience: "team" } })
    .select("id").single();
  const { data: sp } = await db.from("strategy_plans")
    .insert({ goal_profile_id: gp!.id, plan_json: { structure: [{ section: "open", purpose: "hook" }] } })
    .select("id").single();
  const { data: outDoc } = await db.from("documents")
    .insert({ kind: "output", body: "The final speech text.\nWith two lines." })
    .select("id").single();

  // Manual-mode route receipt on pipeline_runs.
  const { logPipelineStep } = await import("@/lib/pipeline/log");
  const receiptId = await logPipelineStep({
    agentId: "generator", mode: "manual",
    input: { x: 1 }, output: { y: 2 }, manualModel: MANUAL_MODEL,
    receipt: { requestedMode: "manual", effectiveMode: "manual", attemptedProvider: null, attemptedModel: null, finalProvider: null, finalModel: null, fallbackReason: null },
    schemaValid: true,
  });

  const { data: run } = await db.from("generation_runs")
    .insert({
      goal_profile_id: gp!.id, strategy_plan_id: sp!.id,
      retrieved_card_ids: [card!.id], output_document_id: outDoc!.id,
      pipeline_run_id: receiptId, techniques_used_json: {},
      mode: "manual", manual_model: MANUAL_MODEL, status: "complete",
    })
    .select("id").single();

  // Critique + revision on the output document.
  const { data: crit } = await db.from("critiques")
    .insert({ target_document_id: outDoc!.id, scores_json: { scores: { clarity: { score: 8 } } }, goal_met: true })
    .select("id").single();
  await db.from("revisions").insert({ document_id: outDoc!.id, body: "revised speech", change_summary: "tightened", critique_id: crit!.id });

  // Promote: one approved, one rejected (rejected must be excluded from export).
  const approved = await promoteToDataset({
    generationRunId: run!.id,
    review: { overall_quality: 9, usefulness: 8, originality: 7, schema_valid: true, human_approved: true, notes: "keeper" },
    tags: [TAG],
  });
  check("promote: approved example saved", approved.id !== null);

  const { data: run2 } = await db.from("generation_runs")
    .insert({ output_document_id: outDoc!.id, techniques_used_json: {}, mode: "manual", manual_model: MANUAL_MODEL, status: "complete" })
    .select("id").single();
  const rejected = await promoteToDataset({
    generationRunId: run2!.id,
    review: { overall_quality: 3, usefulness: 2, originality: 4, schema_valid: false, human_approved: false, notes: "weak", reject_reason: "generic opening" },
    tags: [TAG],
  });
  check("promote: rejected example saved (stored, not exported)", rejected.id !== null);

  // Snapshot filters populated from the goal profile.
  const listed = await listDataset({});
  const approvedRow = listed.find((r) => r.id === approved.id);
  check("promote: genre snapshot from goal profile", approvedRow?.genre === "speech");
  check("promote: task_type snapshot from goal profile", approvedRow?.task_type === "generate_text");
  check("promote: manual_model snapshot", approvedRow?.manual_model === MANUAL_MODEL);

  // ── Export (approved-only) ──────────────────────────────────────────────────
  const examples = await assembleApprovedExamples({});
  const mine = examples.filter((e) => e.saved_output_id === approved.id || e.saved_output_id === rejected.id);
  check("export: approved example present", mine.some((e) => e.saved_output_id === approved.id));
  check("export: REJECTED example excluded", !mine.some((e) => e.saved_output_id === rejected.id));

  const e = mine.find((x) => x.saved_output_id === approved.id)!;
  check("assemble: goal_profile included", (e.goal_profile as { genre?: string })?.genre === "speech");
  check("assemble: strategy_plan included", Array.isArray((e.strategy_plan as { structure?: unknown[] })?.structure));
  check("assemble: retrieved_cards included", e.retrieved_cards.length === 1);
  check("assemble: final_output included", !!e.final_output?.includes("final speech"));
  check("assemble: critique_scores included", !!e.critique_scores);
  check("assemble: revision_history included", e.revision_history.length === 1);
  check("assemble: quality_review included", e.quality_review.overall_quality === 9);

  // Manual-mode metadata preserved.
  check("manual: manual_model preserved on example", e.manual_model === MANUAL_MODEL);
  check("manual: route receipt effective_mode = manual", e.route_receipt?.effective_mode === "manual");
  check("manual: route receipt requested_mode = manual", e.route_receipt?.requested_mode === "manual");
  check("manual: no final provider (nothing called an API)", e.route_receipt?.final_provider === null);

  // Copyright: copyrighted body redacted, public-domain kept.
  const copyrighted = e.sources.find((s) => s.access === "copyrighted");
  const publicDomain = e.sources.find((s) => s.access === "public_domain");
  check("copyright: copyrighted body EXCLUDED", copyrighted?.stored_excerpt === null && copyrighted?.excerpt_redacted === true);
  check("copyright: public-domain body kept", publicDomain?.stored_excerpt === "Four score and seven years ago.");
  const serialized = toJSONL(examples);
  check("copyright: copyrighted body absent from serialized export", !serialized.includes("The morning of."));
  check("copyright: public-domain body present in serialized export", serialized.includes("Four score and seven years ago."));

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  await db.from("saved_outputs").delete().in("id", [approved.id!, rejected.id!]);
  await db.from("revisions").delete().eq("document_id", outDoc!.id);
  await db.from("critiques").delete().eq("id", crit!.id);
  await db.from("generation_runs").delete().in("id", [run!.id, run2!.id]);
  await db.from("documents").delete().eq("id", outDoc!.id);
  await db.from("strategy_plans").delete().eq("id", sp!.id);
  await db.from("goal_profiles").delete().eq("id", gp!.id);
  await db.from("technique_cards").delete().eq("id", card!.id);
  await db.from("techniques").delete().eq("id", tech!.id);
  await db.from("source_texts").delete().in("id", [copySrc!.id, pdSrc!.id]);
  if (receiptId) await db.from("pipeline_runs").delete().eq("id", receiptId);
  console.log("\nCleaned up verification rows.");

  done("dataset");
}

main().catch((e) => {
  console.error("Verification crashed:", e);
  process.exit(1);
});
