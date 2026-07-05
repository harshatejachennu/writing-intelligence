"use client";

import { useState } from "react";
import { ManualModePanel } from "@/components/manual-mode-panel";
import { FunctionMap } from "@/components/function-map";
import { ExtractCards } from "@/components/extract-cards";
import { WorkflowModeBar, type ModeChoice } from "@/components/mode-control";
import type { Analysis } from "@/lib/schemas/analyzer";

type Built = { mode: "manual" | "api"; copyText: string; schemaHint: string };

const GENRES = ["", "persuasive", "explanatory", "personal_narrative", "speech", "fiction_opening"];

export default function AnalyzePage() {
  const [passage, setPassage] = useState("");
  const [genre, setGenre] = useState("");
  const [built, setBuilt] = useState<Built | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wfMode, setWfMode] = useState<ModeChoice>("auto");

  const input = { passageText: passage, genre: genre || undefined };

  async function start() {
    setBusy(true);
    setError(null);
    setAnalysis(null);
    setBuilt(null);
    try {
      const res = await fetch("/api/prompt/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId: "analyzer", input, modeOverride: wfMode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to build prompt");
      setBuilt(json);

      // API mode: run immediately.
      if (json.mode === "api") {
        const run = await fetch("/api/prompt/submit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ agentId: "analyzer", input, modeOverride: wfMode }),
        });
        const rj = await run.json();
        if (!run.ok || !rj.ok) throw new Error(rj.error ?? "API run failed");
        if (rj.mode === "api") {
          setAnalysis(rj.data as Analysis);
          setAnalysisId(rj.savedId ?? null);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analyze a passage</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Get a structured, evidence-cited breakdown of how a passage works.
        </p>
      </div>

      {!analysis && (
        <div className="space-y-3">
          <WorkflowModeBar value={wfMode} onChange={setWfMode} />
          <textarea
            value={passage}
            onChange={(e) => setPassage(e.target.value)}
            placeholder="Paste a passage (a paragraph or two works best)…"
            className="h-48 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <div className="flex items-center gap-3">
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g === "" ? "auto-detect genre" : g}
                </option>
              ))}
            </select>
            <button
              onClick={start}
              disabled={busy || passage.trim().length < 20}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
            >
              {busy ? "Working…" : "Analyze"}
            </button>
            {built && (
              <span className="text-xs text-slate-500">
                mode: <strong>{built.mode}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {built?.mode === "manual" && !analysis && (
        <ManualModePanel
          agentId="analyzer"
          input={input}
          copyText={built.copyText}
          modeOverride={wfMode}
          onValidated={(data, meta) => {
            setAnalysis(data as Analysis);
            setAnalysisId(meta.savedId);
          }}
        />
      )}

      {analysis && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Analysis</h2>
            <button
              onClick={() => {
                setAnalysis(null);
                setAnalysisId(null);
                setBuilt(null);
                setPassage("");
              }}
              className="text-sm text-slate-500 hover:underline"
            >
              Analyze another →
            </button>
          </div>
          <FunctionMap analysis={analysis} />
          <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
            <ExtractCards
              analysis={analysis}
              passageText={passage}
              genre={genre || undefined}
              analysisId={analysisId}
              modeOverride={wfMode}
            />
          </div>
        </div>
      )}
    </main>
  );
}
