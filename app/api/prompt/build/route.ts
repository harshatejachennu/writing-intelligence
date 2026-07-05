import { NextResponse } from "next/server";
import { buildAgentPrompt } from "@/lib/models/execute";

/**
 * POST /api/prompt/build  { agentId, input, modeOverride? }
 * Returns the exact prompt (copy block + schema hint) and the resolved mode.
 * modeOverride ("manual" | "api" | "auto") is the per-step user choice; the
 * response's resolution explains how preference/override/keys produced the
 * effective mode. In Manual Mode the client shows the copy box; in API mode it
 * can call submit immediately to run the provider.
 */
export async function POST(req: Request) {
  try {
    const { agentId, input, modeOverride } = await req.json();
    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }
    const built = buildAgentPrompt(agentId, input, modeOverride);
    return NextResponse.json({
      agentId: built.agentId,
      route: built.route,
      mode: built.mode,
      copyText: built.copyText,
      schemaHint: built.schemaHint,
      resolution: built.resolution,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
