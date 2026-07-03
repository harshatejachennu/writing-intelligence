-- Writing Intelligence System — core schema (Phase 0)
-- Run in the Supabase SQL editor or via `supabase db push`.

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists vector;     -- pgvector

-- ─── Enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type execution_mode as enum ('manual', 'api');
exception when duplicate_object then null; end $$;

do $$ begin
  create type access_status as enum
    ('public_domain','copyrighted','excerpt_only','user_owned','licensed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type imitation_risk as enum ('low','med','high');
exception when duplicate_object then null; end $$;

-- ─── Projects & documents ────────────────────────────────────────────────────
create table if not exists projects (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid,
  name              text not null,
  description       text,
  default_genre     text,
  created_at        timestamptz not null default now()
);

create table if not exists documents (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid,
  project_id          uuid references projects(id) on delete cascade,
  title               text,
  kind                text not null default 'draft',   -- draft | source | output
  body                text not null default '',
  current_revision_id uuid,
  created_at          timestamptz not null default now()
);

create table if not exists passages (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid,
  document_id    uuid references documents(id) on delete cascade,
  source_text_id uuid,
  text           text not null,
  char_start     int,
  char_end       int,
  created_at     timestamptz not null default now()
);

-- ─── Corpus (Corpus Builder) with copyright guard ────────────────────────────
create table if not exists source_texts (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid,
  title                  text not null,
  author                 text,
  genre                  text,
  era                    text,
  source_type            text,
  access                 access_status not null default 'excerpt_only',
  why_useful             text,
  techniques_demonstrated text[] default '{}',
  recommended_passage    text,
  citation_url           text,
  imitation_risk         imitation_risk not null default 'med',
  stored_excerpt         text,
  notes                  text,
  created_at             timestamptz not null default now(),
  -- Legal guard: only allow long stored excerpts for texts we may store in full.
  constraint excerpt_length_guard check (
    stored_excerpt is null
    or access in ('public_domain','user_owned','licensed')
    or array_length(regexp_split_to_array(trim(stored_excerpt), '\s+'), 1) <= 90
  )
);

-- ─── Analyses (Passage Analyzer output) ──────────────────────────────────────
create table if not exists analyses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid,
  passage_id    uuid references passages(id) on delete set null,
  passage_text  text not null,
  genre         text,
  analysis_json jsonb not null,
  mode          execution_mode not null default 'manual',
  manual_model  text,
  created_at    timestamptz not null default now()
);

-- ─── Techniques & cards (Phase 2; RAG index) ─────────────────────────────────
create table if not exists techniques (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  plain_name text not null,
  function   text,
  category   text,
  created_at timestamptz not null default now()
);

create table if not exists technique_cards (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid,
  technique_id  uuid references techniques(id) on delete cascade,
  card_json     jsonb not null,
  embedding     vector(1536),
  source_refs   uuid[] default '{}',
  genre_fit     text[] default '{}',
  reader_effects text[] default '{}',
  failure_modes text[] default '{}',
  created_at    timestamptz not null default now()
);
create index if not exists technique_cards_embedding_idx
  on technique_cards using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ─── Goal profiles / strategy / generation / critique / revisions ────────────
create table if not exists goal_profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid,
  project_id   uuid references projects(id) on delete cascade,
  profile_json jsonb not null,
  embedding    vector(1536),
  created_at   timestamptz not null default now()
);

create table if not exists strategy_plans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid,
  goal_profile_id uuid references goal_profiles(id) on delete cascade,
  plan_json       jsonb not null,
  created_at      timestamptz not null default now()
);

create table if not exists generation_runs (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid,
  goal_profile_id    uuid references goal_profiles(id) on delete set null,
  strategy_plan_id   uuid references strategy_plans(id) on delete set null,
  retrieved_card_ids uuid[] default '{}',
  output_document_id uuid references documents(id) on delete set null,
  techniques_used_json jsonb,
  mode               execution_mode not null default 'manual',
  manual_model       text,
  status             text not null default 'complete',
  created_at         timestamptz not null default now()
);

create table if not exists critiques (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid,
  target_document_id       uuid references documents(id) on delete cascade,
  scores_json              jsonb not null,
  issues_json              jsonb,
  goal_met                 boolean,
  next_revision_instruction text,
  created_at               timestamptz not null default now()
);

create table if not exists revisions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid,
  document_id        uuid references documents(id) on delete cascade,
  parent_revision_id uuid references revisions(id) on delete set null,
  body               text not null,
  change_summary     text,
  critique_id        uuid references critiques(id) on delete set null,
  created_at         timestamptz not null default now()
);

create table if not exists comparisons (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid,
  left_ref     jsonb not null,
  right_ref    jsonb not null,
  verdict_json jsonb,
  created_at   timestamptz not null default now()
);

create table if not exists voice_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid,
  project_id        uuid references projects(id) on delete cascade,
  dimensions_json   jsonb not null,
  sample_document_ids uuid[] default '{}',
  created_at        timestamptz not null default now()
);

create table if not exists evaluation_rubrics (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid,
  name            text not null,
  dimensions_json jsonb not null,
  created_at      timestamptz not null default now()
);

create table if not exists saved_outputs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid,
  generation_run_id uuid references generation_runs(id) on delete cascade,
  tags              text[] default '{}',
  can_seed_corpus   boolean not null default false,
  created_at        timestamptz not null default now()
);

-- ─── Audit log for every agent step (both modes) ─────────────────────────────
create table if not exists pipeline_runs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid,
  agent_id          text not null,
  mode              execution_mode not null,
  steps_json        jsonb not null,
  manual_model      text,
  raw_model         text,
  prompt_tokens     int,
  completion_tokens int,
  latency_ms        int,
  created_at        timestamptz not null default now()
);
