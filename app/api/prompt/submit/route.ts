import { NextResponse } from "next/server";
import { buildAgentPrompt, executeAgent, ingestAgentResponse } from "@/lib/models/execute";
import { persistAgentOutput } from "@/lib/pipeline/persist";

/**
 * POST /api/prompt/submit
 *   Manual path: { agentId, input, pastedText, manualModel? }
 *     -> validate pasted response, persist on success, else return errors + fixItPrompt.
 *   API path:    { agentId, input }   (no pastedText)
 *     -> call the provider, validate via schema, persist, return data.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agentId, input, pastedText, manualModel } = body;
    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    // ── Manual path ──────────────────────────────────────────────────────────
    if (typeof pastedText === "string" && pastedText.trim().length > 0) {
      const built = buildAgentPrompt(agentId, input);
      const result = ingestAgentResponse(agentId, pastedText);

      if (!result.validation.ok) {
        return NextResponse.json(
          {
            ok: false,
            stage: result.validation.stage,
            errors: result.validation.errors,
            fixItPrompt: result.fixItPrompt,
          },
          { status: 422 },
        );
      }

      const persisted = await persistAgentOutput({
        agentId,
        input,
        output: result.validation.data,
        mode: "manual",
        manualModel,
        promptShown: built.copyText,
      });

      return NextResponse.json({
        ok: true,
        mode: "manual",
        data: result.validation.data,
        savedId: persisted.savedId,
        cardIds: persisted.cardIds,
        techniqueSlugs: persisted.techniqueSlugs,
        documentId: persisted.documentId,
      });
    }

    // ── API path ─────────────────────────────────────────────────────────────
    const startedAt = Date.now();
    const exec = await executeAgent(agentId, input);
    const latencyMs = Date.now() - startedAt;
    if (exec.mode === "manual") {
      // No key configured, or the provider call failed (apiError set) —
      // tell the client to use the manual copy box.
      return NextResponse.json({
        ok: true,
        mode: "manual",
        prompt: { copyText: exec.prompt!.copyText, schemaHint: exec.prompt!.schemaHint },
        apiError: exec.apiError,
      });
    }

    const persisted = await persistAgentOutput({
      agentId,
      input,
      output: exec.data,
      mode: "api",
      usage: exec.usage,
      rawModel: exec.rawModel,
      latencyMs,
    });

    return NextResponse.json({
      ok: true,
      mode: "api",
      data: exec.data,
      usage: exec.usage,
      savedId: persisted.savedId,
      cardIds: persisted.cardIds,
      techniqueSlugs: persisted.techniqueSlugs,
      documentId: persisted.documentId,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
