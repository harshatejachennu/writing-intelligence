import { NextResponse } from "next/server";
import { searchTechniqueCards } from "@/lib/retrieval/search";

export const dynamic = "force-dynamic";

/**
 * GET /api/techniques?q=&genre=&effect=&limit=
 * Ranked technique cards: vector search when embeddings exist, text fallback
 * otherwise. This same function backs the Library UI and (in Phase 3) the
 * Technique Retriever agent.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const { hits, method } = await searchTechniqueCards({
    q: url.searchParams.get("q") ?? undefined,
    genre: url.searchParams.get("genre") ?? undefined,
    effect: url.searchParams.get("effect") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 12),
  });
  return NextResponse.json({ method, hits });
}
