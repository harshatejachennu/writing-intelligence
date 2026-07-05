# Writing Intelligence

A writing-intelligence workbench that treats good writing as a set of transferable
functions. It decomposes text into structured, evidence-cited analysis and reusable
technique cards, then (in later phases) plans → generates → critiques → revises.

Full plan: `~/.claude/plans/i-want-you-to-melodic-biscuit.md`.

## Status

**Phase 1 — Passage Analyzer.** Paste a passage → get a structured, evidence-cited
breakdown of how it works (macro structure, paragraph/sentence functions, rhetorical
devices, texture, reader effect, transferable techniques, imitation warnings).

**Phase 2 — Technique Library.** From any analysis (fresh or saved in History), click
**Extract technique cards** to run the Technique Extractor agent (dual-mode, like the
analyzer). Cards are saved to the library: canonical techniques are deduped by
snake_case slug, each extraction adds a card version. Browse and search at **/library**
or via `GET /api/techniques?q=&genre=&effect=`. Search uses pgvector semantic search
when embeddings exist, and falls back to text search when they don't — so the library
works with zero API keys. Add `OPENAI_API_KEY` to enable embeddings
(`EMBEDDING_MODEL`, default `text-embedding-3-small`).

**Phase 3 — Generation Engine.** The **/generate** wizard runs the full pipeline:
request → goal profile (Goal Profile Builder) → technique retrieval → strategy plan
(Strategy Planner) → **approval gate** → strategy-driven draft (Generator) with
techniques-used accounting, weaknesses, and a suggested revision path. High-stakes
profiles force facts-only generation with `[YOUR: …]` placeholders.

**Phase 4 — Critic + Revision loop.** **/critique**: paste any draft → rubric scorecard
(10 dimensions + risk, every score with evidence) → revise ONLY the biggest weakness →
before/after diff → re-critique. The loop brakes automatically: goal met, 3 rounds, or
score plateau.

**Phase 5 — Corpus Builder.** **/corpus**: describe a lead ("Gettysburg Address —
compression, moral escalation") → Curator agent produces a structured, legally-safe
entry (access status, imitation risk, where-to-study). Excerpts of non-free works are
capped at 90 words — enforced in the app with a friendly error AND by a DB constraint.

**Phase 6 — Voice Profiles.** **/voice**: paste 1–3 writing samples → inferred voice
profile (9 scored dimensions + signature moves + "what would sound fake"). Saved
profiles are selectable on the Generate page; the generator writes inside the voice
instead of over-polishing it.

**Phase 7 — Model-agnostic hardening.** **/settings** shows effective per-agent routes,
key/DB/embedding status. Swap any route without code changes via
`MODEL_ROUTES_JSON='{"generator":{"provider":"openai","model":"gpt-4o"}}'`. API
failures degrade gracefully to Manual Mode (with the error shown); latency and token
usage are recorded on every pipeline run.

**Phase 9 Prep — dataset collection (no training).** On a generated draft, **★ Promote
to dataset** opens a quality review (overall/usefulness/originality 1–10, schema_valid,
human_approved, notes, optional reject_reason) before promotion. The **/dataset** page
lists promoted examples with filters (agent, genre, task type, manual_model, min
quality, date range) and exports **approved-only** examples as **JSONL** (fine-tuning
shape), **JSON** (analysis), or **CSV** (summary) via `GET /api/dataset/export`. Each
exported example carries full provenance: goal_profile, strategy_plan, retrieved_cards,
final_output, critique_scores, revision history, manual_model, and the route receipt —
so Manual-Mode metadata is preserved. Copyrighted source bodies are redacted unless
user-owned / public-domain / licensed. A persistent banner states this is collection
for **future** evaluation/fine-tuning — nothing is trained. Rejected examples are stored
(with reason) but never exported. Verification: `npm run test:dataset` (40 checks).

**Calibration — Maria salt-essay pass.** The Analyzer bans absolute praise
("perfectly executes", "masterfully", …) unless the same field cites rubric-level
evidence, and must note weaknesses with the same evidence standard. The Technique
Extractor now returns exactly **3 core + 3 secondary + 2 failure-mode** cards, each
required to be useful across ≥2 genres (college-essay-only cards are rejected), with
new fields: `card_role`, `specificity_level` (obvious/subtle/advanced),
`transfer_difficulty` (low/medium/high), and `best_for_tasks` (feeds retrieval, so
task-shaped queries like "postmortem introductions" hit). Cards saved before this
pass still parse — the new fields are optional on stored cards, required for new
extractions. Fixture + 35-check suite: `npm run test:maria`.

**Infra — OpenRouter + execution mode control.** `openrouter` is a first-class provider
(`OPENROUTER_API_KEY`; OpenAI-compatible endpoint; model ids pass through verbatim —
`openrouter/auto`, `openrouter/free`, `vendor/model:free`, …; `OPENROUTER_DEFAULT_MODEL`
serves routes that fall through to OpenRouter). A global `EXECUTION_PREFERENCE`
(`manual_only` · `api_only` · `smart` · `api_first_manual_fallback` ·
`manual_first_api_optional`, default **smart**) decides how steps run: smart sends
quality steps (analyzer, planner, generator, critic, reviser, inspiration) to Manual and
structured steps to API when keyed. Every workflow page has an execution mode bar
(Auto/Manual/API) and every agent step has its own auto/manual/api override. API
failures (provider error, rate limit, timeout via `API_TIMEOUT_MS`, invalid JSON) fall
back to Manual with the classified reason shown — except under `api_only`, which errors
loudly. Every run writes a **route receipt** to `pipeline_runs`: requested vs effective
mode, attempted vs final provider/model, fallback reason, schema validity, latency.
Zero-key Manual operation is unchanged.

**Phase 8 — Advanced UI.** **/compare**: two versions side by side → evidence-based
verdict (what improved / got worse, per-dimension winners, recommended direction),
saved to `comparisons`. **/inspiration**: Masterpiece Inspiration Mode — a synthetic
north-star piece + technique breakdown + transfer blueprint + copy/don't-copy lists,
watermarked `is_synthetic_not_for_submission: true` at the schema level (a `false`
fails validation) and never persisted to documents. History detail pages now render
**char-range annotations**: sentence functions and rhetorical devices from the
analysis are located in the passage and highlighted with hover popovers (unlocatable
quotes are listed, not dropped). Drafts and analyses export to **Markdown**; good
generation runs can be promoted with **★ Save as example** (`saved_outputs` — the
future fine-tuning dataset).

## Dual execution modes

Every agent runs through **one interface** with two interchangeable backends:

- **Manual Mode (default, no API key):** the app renders the exact prompt; you paste
  it into Claude/ChatGPT/Gemini, then paste the reply back. It is validated against
  the same Zod schema an API call would use and saved identically. Dirty pastes
  (markdown fences, preamble) are handled; invalid responses show field-level errors
  plus a one-click **fix-it prompt**.
- **API Mode (optional):** add a provider key and the routed agent runs automatically
  via the Vercel AI SDK (`generateObject`). Set per-agent in `lib/models/routes.ts`.

A route only runs in API mode if it asked for it **and** its provider key is present;
otherwise it falls back to Manual. The app boots and runs Phase 1 with **no** model key.

## Run

```bash
npm install
cp .env.example .env.local     # optional: fill Supabase + any model keys
npm run dev                    # http://localhost:3000/analyze
```

- `npm run test:core` — Phase 0 verification (dual-mode round-trip, no keys needed).
- `npm run typecheck` — TypeScript check.
- `npm run build` — production build.

## Database setup (Supabase)

Persistence no-ops until Supabase env is set (the app still works; nothing is saved and
`/history` shows a warning). Once configured, every analysis saves a `passages` row, an
`analyses` row (with `mode` + `manual_model`), and a `pipeline_runs` audit row that
includes the exact manual prompt shown.

### Option A — Hosted Supabase (recommended)

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. In the dashboard, open **SQL Editor → New query** and run each file in
   [`supabase/migrations/`](supabase/migrations/) **in order** (`0001_init.sql`, then
   `0002_technique_library.sql`, …). They enable `pgvector`, create all core tables,
   and install the copyright excerpt-length guard. All migrations are idempotent —
   re-running them is safe.
3. Collect your credentials:
   - **Settings → API**: `Project URL`, `anon` key, `service_role` key.
   - **Settings → Database**: connection string (URI).
4. Create `.env.local` in the project root:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key>        # server-side only, never expose
   DATABASE_URL=postgres://postgres:<password>@db.<ref>.supabase.co:5432/postgres
   ```

5. Verify persistence end-to-end:

   ```bash
   npm run test:db            # insert + read back + clean up (12 checks)
   npm run test:db -- --keep  # same, but keeps the row so you can see it at /history
   ```

6. Restart the dev server. Analyses now appear at **/history**.

Auth is intentionally not wired yet (solo tool). The server uses the service-role key
directly; `user_id` columns exist so auth/RLS can be added later without a refactor.

### Option B — Local stack (Docker, no Supabase account)

A Supabase-compatible stack (Postgres 15 + pgvector, PostgREST, nginx gateway serving
`/rest/v1`) that the app talks to with the same `supabase-js` code path:

```bash
./scripts/local-supabase.sh up     # starts containers, applies the migration,
                                   # prints the exact .env.local values to copy
npm run test:db                    # verify persistence
./scripts/local-supabase.sh down   # teardown
```

## Layout

```
app/                     Next.js App Router (pages + /api routes)
  analyze/               Analyze page (Manual-Mode panel + function map + extract)
  generate/              Full pipeline wizard with strategy approval gate
  critique/              Rubric critique + one-weakness revision loop
  compare/               Side-by-side draft comparison with verdict
  inspiration/           Masterpiece Inspiration (synthetic, watermarked)
  library/               Technique Library (browse + search cards)
  corpus/                Corpus Library (curate sources, legal guards)
  voice/                 Voice profile inference + saved profiles
  history/               Saved analyses list + detail view (requires Supabase)
  dataset/               Promoted examples + filters + approved-only export
  settings/              Effective model routes + env status
  api/prompt/build       Render the exact agent prompt + resolved mode
  api/prompt/submit      Validate a pasted response (manual) or run the provider (api)
  api/techniques         Card search (vector when possible, text fallback)
  api/voice              Saved voice profiles
  api/saved-outputs      Promote a generation run to a saved example
lib/
  models/                routes (MODEL_ROUTES + mode resolution), execute, parse
  models/backends/       manualBackend (render/ingest), apiBackend (AI SDK)
  agents/                one def per agent (analyzer, extractor, goalProfile,
                         planner, generator, critic, reviser, curator, voice)
  schemas/               Zod schemas (shared by both modes)
  pipeline/              per-agent persistence + audit log
  retrieval/             optional embeddings + card search (vector/text fallback)
  db/                    Supabase client (graceful no-op when unconfigured)
components/              manual-mode-panel, agent-runner, function-map,
                         technique-card, strategy-preview, scorecard, …
supabase/migrations/     SQL schema (idempotent; includes copyright excerpt guard)
scripts/test-*.ts        Per-phase verification suites (npm run test:all)
scripts/local-supabase.sh Local Supabase-compatible docker stack (up/down)
```
