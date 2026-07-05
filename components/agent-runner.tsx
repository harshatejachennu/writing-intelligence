"use client";

import { useState } from "react";
import { ManualModePanel, type ValidatedMeta } from "./manual-mode-panel";
import { StepModeSelect, useExecutionStatus, type ModeChoice } from "./mode-control";

interface Props {
  agentId: string;
  input: unknown;
  buttonLabel: string;
  onDone: (data: unknown, meta: ValidatedMeta) => void;
  /** Workflow-level mode from the page's WorkflowModeBar ("auto" defers to preference). */
  modeOverride?: ModeChoice;
  /** Start immediately instead of showing the button. */
  autoStart?: boolean;
}

type Built = { mode: "manual" | "api"; copyText: string };

/**
 * Runs one agent step through the dual-mode pipeline:
 * button → build prompt → API run (if resolved api) or Manual-Mode paste panel.
 * The per-step selector can override the workflow-level mode; the effective
 * choice is sent as modeOverride so the server resolution + receipts record it.
 */
export function AgentRunner({ agentId, input, buttonLabel, onDone, modeOverride = "auto", autoStart }: Props) {
  const [built, setBuilt] = useState<Built | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [stepMode, setStepMode] = useState<ModeChoice>("auto");
  const status = useExecutionStatus();

  // Per-step override wins over the workflow-level choice.
  const effectiveChoice: ModeChoice = stepMode !== "auto" ? stepMode : modeOverride;

  async function start() {
    setBusy(true);
    setError(null);
    setStarted(true);
    try {
      const res = await fetch("/api/prompt/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId, input, modeOverride: effectiveChoice }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to build prompt");
      setBuilt(json);

      if (json.mode === "api") {
        const run = await fetch("/api/prompt/submit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ agentId, input, modeOverride: effectiveChoice }),
        });
        const rj = await run.json();
        if (!run.ok || !rj.ok) throw new Error(rj.error ?? "API run failed");
        if (rj.mode === "api") {
          onDone(rj.data, {
            savedId: rj.savedId ?? null,
            cardIds: rj.cardIds,
            techniqueSlugs: rj.techniqueSlugs,
            documentId: rj.documentId ?? null,
          });
        } else {
          // Provider call failed → degrade to Manual Mode with the error shown.
          setBuilt({ mode: "manual", copyText: rj.prompt?.copyText ?? json.copyText });
          setApiError(
            rj.fallbackReason
              ? `${rj.fallbackReason}: ${rj.apiError ?? ""}`
              : (rj.apiError ?? "API call failed — use Manual Mode below."),
          );
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Auto-start once if requested.
  if (autoStart && !started && !busy) void start();

  return (
    <div className="space-y-3">
      {!built && !autoStart && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={start}
            disabled={busy}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
          >
            {busy ? "Working…" : buttonLabel}
          </button>
          <StepModeSelect
            value={stepMode}
            onChange={setStepMode}
            disabled={busy}
            apiAvailable={status?.anyKey ?? false}
          />
        </div>
      )}
      {busy && built === null && autoStart && (
        <p className="text-sm text-slate-500">Building prompt…</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {apiError && (
        <p className="rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          API mode failed ({apiError}) — falling back to Manual Mode.
        </p>
      )}
      {built?.mode === "manual" && (
        <ManualModePanel
          agentId={agentId}
          input={input}
          copyText={built.copyText}
          modeOverride={effectiveChoice}
          onValidated={onDone}
        />
      )}
    </div>
  );
}
