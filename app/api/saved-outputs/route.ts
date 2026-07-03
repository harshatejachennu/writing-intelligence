import { NextResponse } from "next/server";
import { saveOutputExample } from "@/lib/pipeline/compare";

export const dynamic = "force-dynamic";

/**
 * POST /api/saved-outputs { generationRunId, tags?, canSeedCorpus? }
 * Promotes a generation run to a saved example — the explicit human quality
 * signal that builds the future fine-tuning dataset (plan §16).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.generationRunId || typeof body.generationRunId !== "string") {
      return NextResponse.json({ ok: false, error: "generationRunId required" }, { status: 400 });
    }
    const id = await saveOutputExample({
      generationRunId: body.generationRunId,
      tags: Array.isArray(body.tags) ? body.tags : [],
      canSeedCorpus: body.canSeedCorpus === true,
    });
    return NextResponse.json({ ok: id !== null, savedOutputId: id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
