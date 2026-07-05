"use client";

import { useState } from "react";

export interface ValidatedMeta {
  savedId: string | null;
  cardIds?: string[];
  techniqueSlugs?: string[];
  documentId?: string | null;
}

interface Props {
  agentId: string;
  input: unknown;
  copyText: string;
  onValidated: (data: unknown, meta: ValidatedMeta) => void;
  /** Original mode choice, recorded in the route receipt as requested_mode. */
  modeOverride?: "auto" | "manual" | "api";
}

/**
 * The reusable Manual-Mode panel: left = the exact prompt to copy into any
 * chatbot; right = paste-back + Validate & Save. On validation failure it shows
 * field-level errors and a one-click "Copy fix-it prompt".
 */
export function ManualModePanel({ agentId, input, copyText, onValidated, modeOverride }: Props) {
  const [pasted, setPasted] = useState("");
  const [manualModel, setManualModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [fixItPrompt, setFixItPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState<"prompt" | "fixit" | null>(null);

  async function copy(text: string, which: "prompt" | "fixit") {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  async function validate() {
    setBusy(true);
    setErrors(null);
    setFixItPrompt(null);
    try {
      const res = await fetch("/api/prompt/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId, input, pastedText: pasted, manualModel, modeOverride }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        onValidated(json.data, {
          savedId: json.savedId ?? null,
          cardIds: json.cardIds,
          techniqueSlugs: json.techniqueSlugs,
          documentId: json.documentId ?? null,
        });
      } else {
        setErrors(json.errors ?? [json.error ?? "Validation failed."]);
        setFixItPrompt(json.fixItPrompt ?? null);
      }
    } catch (e) {
      setErrors([(e as Error).message]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Left: prompt to copy */}
      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">1. Copy this prompt</h3>
          <button
            onClick={() => copy(copyText, "prompt")}
            className="rounded bg-slate-900 px-2.5 py-1 text-xs text-white dark:bg-slate-100 dark:text-slate-900"
          >
            {copied === "prompt" ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="mb-2 text-xs text-slate-500">
          Paste into Claude, ChatGPT, or Gemini, then paste the reply on the right.
        </p>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded bg-slate-100 p-3 text-xs dark:bg-slate-900">
          {copyText}
        </pre>
      </div>

      {/* Right: paste back */}
      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <h3 className="mb-2 text-sm font-medium">2. Paste the model&apos;s reply</h3>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="Paste the JSON response here…"
          className="h-56 w-full rounded border border-slate-300 bg-white p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
        />
        <div className="mt-2 flex items-center gap-2">
          <input
            value={manualModel}
            onChange={(e) => setManualModel(e.target.value)}
            placeholder="model used (optional, e.g. claude-opus)"
            className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
          />
          <button
            onClick={validate}
            disabled={busy || !pasted.trim()}
            className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
          >
            {busy ? "Validating…" : "Validate & Save"}
          </button>
        </div>

        {errors && (
          <div className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <div className="font-medium">Response did not match the schema:</div>
            <ul className="mt-1 list-disc pl-4">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
            {fixItPrompt && (
              <button
                onClick={() => copy(fixItPrompt, "fixit")}
                className="mt-2 rounded bg-red-600 px-2.5 py-1 text-xs text-white"
              >
                {copied === "fixit" ? "Copied!" : "Copy fix-it prompt"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
