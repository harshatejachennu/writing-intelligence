import { NextResponse } from "next/server";
import { DatasetReviewSchema } from "@/lib/schemas/dataset";
import { promoteToDataset } from "@/lib/pipeline/dataset";

export const dynamic = "force-dynamic";

/**
 * POST /api/dataset/promote { generationRunId, review, tags? }
 * Promotes a generation run to the dataset with a quality review. Only
 * human_approved examples are later exported — but rejected ones are still
 * stored (with reject_reason) so the review history is complete.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.generationRunId || typeof body.generationRunId !== "string") {
      return NextResponse.json({ ok: false, error: "generationRunId required" }, { status: 400 });
    }
    const parsed = DatasetReviewSchema.safeParse(body.review);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "invalid review", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
        { status: 422 },
      );
    }
    const result = await promoteToDataset({
      generationRunId: body.generationRunId,
      review: parsed.data,
      tags: Array.isArray(body.tags) ? body.tags : [],
    });
    if (!result.id) {
      return NextResponse.json({ ok: false, error: result.error ?? "promotion failed" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, savedOutputId: result.id, approved: parsed.data.human_approved });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
