"use client";

import { useEffect, useState } from "react";

/** Per-run mode choice: "auto" defers to the global EXECUTION_PREFERENCE. */
export type ModeChoice = "auto" | "manual" | "api";

export interface ExecutionStatus {
  preference: string;
  anyKey: boolean;
  keys: Record<string, boolean>;
}

export function useExecutionStatus(): ExecutionStatus | null {
  const [status, setStatus] = useState<ExecutionStatus | null>(null);
  useEffect(() => {
    fetch("/api/execution")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);
  return status;
}

/**
 * Workflow-level mode selector — sits at the top of every agent-driven page.
 * "Auto" defers to the global preference (shown as a chip); Manual/API force
 * the whole workflow. Per-step overrides in each AgentRunner can still deviate.
 */
export function WorkflowModeBar({
  value,
  onChange,
}: {
  value: ModeChoice;
  onChange: (m: ModeChoice) => void;
}) {
  const status = useExecutionStatus();
  const apiDisabled = status !== null && !status.anyKey;

  const choices: Array<{ id: ModeChoice; label: string }> = [
    { id: "auto", label: status ? `Auto (${status.preference})` : "Auto" },
    { id: "manual", label: "Manual" },
    { id: "api", label: "API" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Execution
      </span>
      <div className="flex overflow-hidden rounded-md border border-slate-300 dark:border-slate-700">
        {choices.map((c) => (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            disabled={c.id === "api" && apiDisabled}
            title={c.id === "api" && apiDisabled ? "No API key configured — add one in .env.local" : undefined}
            className={`px-3 py-1 text-xs ${
              value === c.id
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {status && !status.anyKey && (
        <span className="text-xs text-slate-500">
          zero-key mode — everything runs Manual
        </span>
      )}
    </div>
  );
}

/** Compact per-step override, rendered inside AgentRunner next to its button. */
export function StepModeSelect({
  value,
  onChange,
  disabled,
  apiAvailable,
}: {
  value: ModeChoice;
  onChange: (m: ModeChoice) => void;
  disabled?: boolean;
  apiAvailable: boolean;
}) {
  return (
    <label className="flex items-center gap-1 text-xs text-slate-500">
      step mode
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ModeChoice)}
        disabled={disabled}
        className="rounded border border-slate-300 bg-white px-1.5 py-1 text-xs disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
      >
        <option value="auto">auto</option>
        <option value="manual">manual</option>
        <option value="api" disabled={!apiAvailable}>
          api{apiAvailable ? "" : " (no key)"}
        </option>
      </select>
    </label>
  );
}
