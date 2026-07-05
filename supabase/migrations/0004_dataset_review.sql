-- Phase 9 Prep: dataset collection tooling.
-- Extends saved_outputs into reviewable dataset examples and links generation
-- runs to their route receipt so exports carry full provenance.
-- Idempotent; safe to re-run. All additions are nullable / defaulted, so
-- existing "★ Save as example" rows keep working (they are simply un-reviewed
-- and therefore excluded from export until approved).

-- Quality review fields (task 2).
alter table saved_outputs add column if not exists overall_quality int;   -- 1..10
alter table saved_outputs add column if not exists usefulness      int;   -- 1..10
alter table saved_outputs add column if not exists originality     int;   -- 1..10
alter table saved_outputs add column if not exists schema_valid    boolean;
alter table saved_outputs add column if not exists human_approved  boolean not null default false;
alter table saved_outputs add column if not exists notes           text;
alter table saved_outputs add column if not exists reject_reason   text;
alter table saved_outputs add column if not exists reviewed_at     timestamptz;

-- Denormalized filter snapshots taken at promotion time (task 5). Keeping them
-- on the row makes the Dataset page filters simple and each row self-describing.
alter table saved_outputs add column if not exists agent_id     text default 'generator';
alter table saved_outputs add column if not exists genre        text;
alter table saved_outputs add column if not exists task_type    text;
alter table saved_outputs add column if not exists manual_model text;

-- Link a generation run to the pipeline_runs row that produced it, so exports
-- can attach the route receipt (requested/effective mode, provider, fallback).
alter table generation_runs add column if not exists pipeline_run_id uuid;

create index if not exists saved_outputs_approved_idx on saved_outputs (human_approved);
