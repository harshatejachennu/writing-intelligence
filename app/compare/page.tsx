"use client";

import { useState } from "react";
import { AgentRunner } from "@/components/agent-runner";
import type { Comparison } from "@/lib/schemas/comparison";

export default function ComparePage() {
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [leftLabel, setLeftLabel] = useState("before");
  const [rightLabel, setRightLabel] = useState("after");
  const [genre, setGenre] = useState("");
  const [verdict, setVerdict] = useState<Comparison | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const ready = leftText.trim().length >= 50 && rightText.trim().length >= 50;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Compare Drafts</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Two versions side by side → evidence-based verdict: what improved, what got
          worse, which better achieves the intended effect.
        </p>
      </div>

      {!verdict && (
        <div className="space-y-3">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <input
                value={leftLabel}
                onChange={(e) => setLeftLabel(e.target.value)}
                className="mb-1 w-40 rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                placeholder="left label"
              />
              <textarea
                value={leftText}
                onChange={(e) => setLeftText(e.target.value)}
                placeholder="Paste the LEFT version (e.g. before revision)…"
                className="h-56 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div>
              <input
                value={rightLabel}
                onChange={(e) => setRightLabel(e.target.value)}
                className="mb-1 w-40 rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                placeholder="right label"
              />
              <textarea
                value={rightText}
                onChange={(e) => setRightText(e.target.value)}
                placeholder="Paste the RIGHT version (e.g. after revision)…"
                className="h-56 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </div>
          <input
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="genre (optional)"
            className="w-64 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          {ready && (
            <AgentRunner
              agentId="compare"
              input={{ leftText, rightText, leftLabel, rightLabel, genre: genre || undefined }}
              buttonLabel="Compare"
              onDone={(data, meta) => {
                setVerdict(data as Comparison);
                setSavedId(meta.savedId);
              }}
            />
          )}
        </div>
      )}

      {verdict && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <WinnerBadge label="Overall" winner={verdict.overall_winner} left={leftLabel} right={rightLabel} />
            <WinnerBadge label="Reader effect" winner={verdict.reader_effect_winner} left={leftLabel} right={rightLabel} />
            <span className="text-xs text-slate-500">{savedId ? "verdict saved" : "not saved (no DB)"}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Pane title={leftLabel} body={leftText} winner={verdict.overall_winner === "left"} />
            <Pane title={rightLabel} body={rightText} winner={verdict.overall_winner === "right"} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ListCard title="What improved" items={verdict.what_improved} tone="good" />
            <ListCard title="What got worse" items={verdict.what_got_worse} tone="warn" />
          </div>

          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Dimension verdicts
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {verdict.dimension_verdicts.map((d, i) => (
                <li key={i}>
                  <span className="font-medium">{d.dimension}</span>{" "}
                  <span className={`rounded px-1.5 py-0.5 text-xs ${
                    d.winner === "tie"
                      ? "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  }`}>
                    {d.winner === "tie" ? "tie" : d.winner === "left" ? leftLabel : rightLabel}
                  </span>{" "}
                  <span className="text-slate-500">— {d.evidence}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-900 dark:bg-sky-950">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
              Recommended direction
            </h3>
            <p className="mt-1 text-sky-900 dark:text-sky-200">{verdict.recommended_direction}</p>
            <p className="mt-2 text-xs text-sky-800 dark:text-sky-300">{verdict.reasoning}</p>
          </div>

          <button
            onClick={() => { setVerdict(null); setSavedId(null); }}
            className="text-sm text-slate-500 hover:underline"
          >
            Compare something else →
          </button>
        </div>
      )}
    </main>
  );
}

function WinnerBadge({ label, winner, left, right }: { label: string; winner: "left" | "right" | "tie"; left: string; right: string }) {
  return (
    <span className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900">
      {label}: {winner === "tie" ? "tie" : winner === "left" ? left : right}
    </span>
  );
}

function Pane({ title, body, winner }: { title: string; body: string; winner: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${winner ? "border-emerald-400 dark:border-emerald-700" : "border-slate-200 dark:border-slate-800"}`}>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title} {winner && <span className="text-emerald-600 dark:text-emerald-400">★ winner</span>}
      </h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function ListCard({ title, items, tone }: { title: string; items: string[]; tone: "good" | "warn" }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <h3 className={`text-xs font-semibold uppercase tracking-wide ${tone === "good" ? "text-emerald-600 dark:text-emerald-500" : "text-amber-600 dark:text-amber-500"}`}>
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-slate-500">nothing</p>
      ) : (
        <ul className="mt-1 list-disc pl-4 text-sm text-slate-600 dark:text-slate-400">
          {items.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      )}
    </div>
  );
}
