"use client";

import { useState } from "react";
import { ManualModePanel } from "./manual-mode-panel";
import { TechniqueCardView } from "./technique-card";
import type { Analysis } from "@/lib/schemas/analyzer";
import type { Extraction } from "@/lib/schemas/technique-card";

interface Props {
  analysis: Analysis;
  passageText?: string;
  genre?: string;
  analysisId?: string | null;
}

type Built = { mode: "manual" | "api"; copyText: string };

/**
 * "Extract technique cards" flow — attachable to any analysis (fresh or saved).
 * Runs the extractor agent through the same dual-mode build/submit pipeline.
 */
export function ExtractCards({ analysis, passageText, genre, analysisId }: Props) {
  const [built, setBuilt] = useState<Built | null>(null);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input = {
    analysis,
    passageText,
    genre,
    analysisId: analysisId ?? undefined,
  };

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/prompt/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId: "extractor", input }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to build prompt");
      setBuilt(json);

      if (json.mode === "api") {
        const run = await fetch("/api/prompt/submit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ agentId: "extractor", input }),
        });
        const rj = await run.json();
        if (!run.ok || !rj.ok) throw new Error(rj.error ?? "API run failed");
        if (rj.mode === "api") {
          setExtraction(rj.data as Extraction);
          setSavedCount(rj.cardIds?.length ?? 0);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (extraction) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Extracted technique cards</h2>
          <span className="text-sm text-slate-500">
            {savedCount !== null && savedCount > 0
              ? `${savedCount} saved to the library`
              : "not saved (configure Supabase to persist)"}
            {" · "}
            <a href="/library" className="underline">
              open library →
            </a>
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {extraction.cards.map((c) => (
            <TechniqueCardView key={c.technique_name} card={c} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!built && (
        <button
          onClick={start}
          disabled={busy}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          {busy ? "Working…" : "Extract technique cards"}
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {built?.mode === "manual" && (
        <ManualModePanel
          agentId="extractor"
          input={input}
          copyText={built.copyText}
          onValidated={(data, meta) => {
            setExtraction(data as Extraction);
            setSavedCount(meta.cardIds?.length ?? 0);
          }}
        />
      )}
    </div>
  );
}
