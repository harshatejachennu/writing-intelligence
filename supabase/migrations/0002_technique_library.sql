-- Phase 2: Technique Library — searchable card columns + vector match RPC.
-- Idempotent; safe to re-run.

-- Denormalized text columns so cards are searchable WITHOUT embeddings
-- (Manual-Mode-first: embeddings are optional, filled only when a key exists).
alter table technique_cards add column if not exists plain_name text;
alter table technique_cards add column if not exists summary text;

-- Simple text-search index for the no-embedding fallback path.
create index if not exists technique_cards_summary_trgm
  on technique_cards using gin (to_tsvector('english', coalesce(summary, '')));

-- Vector similarity search (used only when embeddings exist).
create or replace function match_technique_cards(
  query_embedding vector(1536),
  match_count int default 8
)
returns table (
  id uuid,
  technique_id uuid,
  card_json jsonb,
  plain_name text,
  summary text,
  genre_fit text[],
  reader_effects text[],
  similarity float
)
language sql stable as $$
  select
    tc.id, tc.technique_id, tc.card_json, tc.plain_name, tc.summary,
    tc.genre_fit, tc.reader_effects,
    1 - (tc.embedding <=> query_embedding) as similarity
  from technique_cards tc
  where tc.embedding is not null
  order by tc.embedding <=> query_embedding
  limit match_count;
$$;
