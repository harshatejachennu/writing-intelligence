"use client";

import type { Analysis } from "@/lib/schemas/analyzer";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Prose({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="text-sm">
      <span className="font-medium text-slate-700 dark:text-slate-300">{label}: </span>
      <span className="text-slate-600 dark:text-slate-400">{value}</span>
    </div>
  );
}

/** Renders the structured analysis as a scannable function map. */
export function FunctionMap({ analysis }: { analysis: Analysis }) {
  return (
    <div className="space-y-4">
      <Section title="Macro structure">
        <p className="text-sm text-slate-600 dark:text-slate-400">{analysis.macro_structure}</p>
      </Section>

      <Section title="Paragraph functions">
        <ol className="space-y-2">
          {analysis.paragraph_functions.map((p, i) => (
            <li key={i} className="border-l-2 border-fn-argument pl-3 text-sm">
              <div className="font-medium">
                ¶{p.index}: {p.function}
              </div>
              <div className="text-slate-500 italic">“{p.evidence}”</div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Sentence functions">
        <ul className="space-y-1 text-sm">
          {analysis.sentence_functions.map((s, i) => (
            <li key={i}>
              <span className="text-slate-500 italic">“{s.quote}”</span> — {s.function}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Rhetorical devices">
        <ul className="space-y-1 text-sm">
          {analysis.rhetorical_devices.map((d, i) => (
            <li key={i}>
              <span className="font-medium">{d.device}</span> — “{d.example}” → {d.effect}
            </li>
          ))}
        </ul>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Texture">
          <div className="space-y-1">
            <Prose label="Syntax" value={analysis.syntax_patterns} />
            <Prose label="Pacing" value={analysis.pacing} />
            <Prose label="Transitions" value={analysis.transitions} />
            <Prose label="Voice" value={analysis.voice} />
            <Prose label="Tone" value={analysis.tone} />
            <Prose label="Diction" value={analysis.diction} />
            <Prose label="Imagery" value={analysis.imagery} />
            <Prose label="Symbolism" value={analysis.symbolism} />
          </div>
        </Section>
        <Section title="Effect">
          <div className="space-y-1">
            <Prose label="Reader effect" value={analysis.reader_effect} />
            <Prose label="Genre expectations" value={analysis.genre_expectations} />
            <Prose label="Clarity" value={analysis.clarity} />
            <Prose label="Compression" value={analysis.compression} />
            <Prose label="Tension" value={analysis.tension} />
            <Prose label="Persuasiveness" value={analysis.persuasiveness} />
            <Prose label="Memorability" value={analysis.memorability} />
          </div>
        </Section>
      </div>

      <Section title="Emotional progression">
        <ol className="flex flex-wrap gap-2 text-sm">
          {analysis.emotional_progression.map((e, i) => (
            <li key={i} className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-900">
              <span className="font-medium">{e.stage}</span> → {e.reader_feels}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Transferable techniques">
        <ul className="space-y-2 text-sm">
          {analysis.transferable_techniques.map((t, i) => (
            <li key={i} className="rounded border border-fn-evidence/40 bg-emerald-50/50 p-2 dark:bg-emerald-950/20">
              <div className="font-mono text-xs text-emerald-700 dark:text-emerald-400">{t.name}</div>
              <div className="font-medium">{t.plain_name}</div>
              <div className="text-slate-600 dark:text-slate-400">{t.transfer_rule}</div>
            </li>
          ))}
        </ul>
      </Section>

      {analysis.imitation_warnings.length > 0 && (
        <Section title="Imitation warnings">
          <ul className="list-disc space-y-1 pl-4 text-sm text-amber-700 dark:text-amber-400">
            {analysis.imitation_warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
