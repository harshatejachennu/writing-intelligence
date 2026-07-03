/**
 * Optional embeddings. Manual-Mode-first philosophy: embeddings are an
 * enhancement, not a dependency. With no OpenAI key this returns null and
 * retrieval falls back to text search; cards saved without embeddings get them
 * later via backfill once a key exists.
 */

export const EMBEDDING_DIMENSIONS = 1536;

export function canEmbed(): boolean {
  const v = process.env.OPENAI_API_KEY;
  return typeof v === "string" && v.trim().length > 0;
}

export async function embedText(text: string): Promise<number[] | null> {
  if (!canEmbed()) return null;
  // Lazy import so the app never loads the provider without a key.
  const { embed } = await import("ai");
  const { openai } = await import("@ai-sdk/openai");
  const model = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
  const { embedding } = await embed({
    model: openai.embedding(model),
    value: text,
  });
  return embedding;
}
