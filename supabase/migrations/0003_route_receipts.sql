-- Infra: route receipts on pipeline_runs — full accounting of how each step
-- was routed: what was requested, what actually ran, and why they differ.
-- Idempotent; safe to re-run.

alter table pipeline_runs add column if not exists requested_mode text;      -- 'manual' | 'api' | 'auto'
alter table pipeline_runs add column if not exists attempted_provider text;  -- provider we tried first (api mode)
alter table pipeline_runs add column if not exists attempted_model text;
alter table pipeline_runs add column if not exists final_provider text;      -- provider that produced the output (null = manual)
alter table pipeline_runs add column if not exists final_model text;
alter table pipeline_runs add column if not exists fallback_reason text;     -- timeout | rate_limited | invalid_json | auth_error | provider_error | no_api_key
alter table pipeline_runs add column if not exists schema_valid boolean;     -- did the output pass Zod validation
