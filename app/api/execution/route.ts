import { NextResponse } from "next/server";
import {
  getExecutionPreference,
  hasApiKey,
  anyApiKey,
  type Provider,
} from "@/lib/models/routes";

export const dynamic = "force-dynamic";

const PROVIDERS: Provider[] = ["anthropic", "openrouter", "openai", "google"];

/**
 * GET /api/execution — global execution preference + key availability
 * (booleans only; never the keys themselves). Drives the workflow mode bar
 * and per-step override controls.
 */
export async function GET() {
  return NextResponse.json({
    preference: getExecutionPreference(),
    anyKey: anyApiKey(),
    keys: Object.fromEntries(PROVIDERS.map((p) => [p, hasApiKey(p)])),
  });
}
