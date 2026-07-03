import { NextResponse } from "next/server";
import { listVoiceProfiles } from "@/lib/pipeline/voice";

export const dynamic = "force-dynamic";

/** GET /api/voice — saved voice profiles (id, name, created_at). */
export async function GET() {
  const rows = await listVoiceProfiles();
  return NextResponse.json({
    profiles: rows.map((r) => ({
      id: r.id,
      name: r.dimensions_json.name,
      created_at: r.created_at,
      profile: r.dimensions_json,
    })),
  });
}
