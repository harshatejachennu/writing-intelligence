"use client";

import { useState } from "react";
import { AgentRunner } from "@/components/agent-runner";
import { WorkflowModeBar, type ModeChoice } from "@/components/mode-control";
import { ExportButton } from "@/components/export-button";
import type { Inspiration } from "@/lib/schemas/inspiration";

export default function InspirationPage() {
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [genre, setGenre] = useState("");
  const [realTask, setRealTask] = useState("");
  const [result, setResult] = useState<Inspiration | null>(null);
  const [wfMode, setWfMode] = useState<ModeChoice>("auto");

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Masterpiece Inspiration</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          A synthetic north-star piece to STUDY — the system writes a model, explains why
          it works, and extracts the transferable blueprint for your real task.
        </p>
      </div>

      {!result && (
        <div className="space-y-3">
          <WorkflowModeBar value={wfMode} onChange={setWfMode} />
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic for the model piece (e.g. 'a personal essay about quitting a sport')"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="what it should accomplish (optional)"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            <input
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="genre (optional)"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <textarea
            value={realTask}
            onChange={(e) => setRealTask(e.target.value)}
            placeholder="Your REAL task (optional) — so the blueprint maps onto it concretely…"
            className="h-24 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          {topic.trim().length >= 10 && (
            <AgentRunner
              modeOverride={wfMode}
              agentId="inspiration"
              input={{
                topic,
                goal: goal || undefined,
                genre: genre || undefined,
                realTask: realTask || undefined,
              }}
              buttonLabel="Generate inspiration model"
              onDone={(data) => setResult(data as Inspiration)}
            />
          )}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-3 text-sm font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            ⚠ SYNTHETIC STUDY PIECE — not for submission or direct use. Details are
            invented. Study the structure; write your own piece.
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Inspiration model</h2>
            <ExportButton
              filename="inspiration-model"
              markdown={`# Inspiration model (SYNTHETIC — not for submission)\n\n${result.inspiration_model}\n\n## Transfer blueprint\n\n${result.transfer_blueprint.map((b, i) => `${i + 1}. ${b}`).join("\n")}\n\n## Do NOT copy\n\n${result.do_not_copy.map((d) => `- ${d}`).join("\n")}`}
            />
          </div>
          <div className="whitespace-pre-wrap rounded-lg border border-slate-200 p-5 text-[15px] leading-relaxed dark:border-slate-800">
            {result.inspiration_model}
          </div>

          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Why it works (technique breakdown)
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {result.technique_breakdown.map((t, i) => (
                <li key={i}>
                  <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400">{t.technique}</span>{" "}
                  <span className="text-slate-500">@ {t.where}</span> — {t.effect}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Transfer blueprint (the reusable skeleton)
            </h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              {result.transfer_blueprint.map((b, i) => <li key={i}>{b}</li>)}
            </ol>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-emerald-300 p-4 dark:border-emerald-900">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Safe to copy (structure)
              </h3>
              <ul className="mt-1 list-disc pl-4 text-sm text-slate-600 dark:text-slate-400">
                {result.copy_structurally.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border border-red-300 p-4 dark:border-red-900">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
                Do NOT copy
              </h3>
              <ul className="mt-1 list-disc pl-4 text-sm text-slate-600 dark:text-slate-400">
                {result.do_not_copy.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-900 dark:bg-sky-950">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
              Adapting it to your task
            </h3>
            <p className="mt-1 text-sky-900 dark:text-sky-200">{result.adapt_to_task}</p>
          </div>

          <div className="rounded-lg border border-amber-300 p-4 text-sm dark:border-amber-900">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-500">
              Risks
            </h3>
            <ul className="mt-1 list-disc pl-4 text-slate-600 dark:text-slate-400">
              {result.risks.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>

          <button onClick={() => setResult(null)} className="text-sm text-slate-500 hover:underline">
            Generate another →
          </button>
        </div>
      )}
    </main>
  );
}
