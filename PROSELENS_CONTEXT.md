# ProseLens Context

ProseLens is my local Next.js writing-intelligence app.

It analyzes high-quality writing, breaks passages into functional parts, extracts reusable technique cards, and helps generate, critique, compare, and revise writing.

## Current status

- Phases 0-8 are complete.
- Manual Mode works and is my main mode for now because I care about output quality.
- OpenRouter/API infrastructure exists, but I am not relying on free models for important analysis yet.
- The app saves structured outputs, technique cards, route receipts, and manual model metadata.
- Phase 9 should not mean actual fine-tuning yet. It should mean collecting and reviewing high-quality examples for possible future dataset/evaluation use.

## Hermes role

Hermes should not build new ProseLens features unless I specifically ask.

Hermes should help me:
1. Research strong writing examples.
2. Prepare corpus candidates.
3. Organize metadata.
4. Batch examples for Manual Mode analysis.
5. Compare extracted technique cards after I run them through ProseLens.
6. Summarize recurring writing techniques across examples.

## Rules

- Prefer official admissions pages, public sources, or essays with admissions comments.
- Store source links, metadata, short excerpts, notes, and analysis summaries.
- Do not assume there is one perfect essay. Look for varied excellent essays with different mechanisms.

## Corpus candidate format

For each candidate, use:

- working_title
- source_name
- source_url
- school/program if relevant
- prompt if available
- author/public attribution if available
- essay_type
- main_theme
- why_it_is_worth_analyzing
- likely_techniques
- imitation_risks
- copyright_status_guess
- recommended_next_action