import { NextResponse } from "next/server";
import { buildAgentPrompt } from "@/lib/models/execute";

/**
 * POST /api/prompt/build  { agentId, input }
 * Returns the exact prompt (copy block + schema hint) and the resolved mode.
 * In Manual Mode the client shows the copy box; in API mode it can call submit
 * immediately to run the provider.
 */
export async function POST(req: Request) {
  try {
    const { agentId, input } = await req.json();
    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }
    const built = buildAgentPrompt(agentId, input);
    return NextResponse.json({
      agentId: built.agentId,
      route: built.route,
      mode: built.mode,
      copyText: built.copyText,
      schemaHint: built.schemaHint,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
