"use client";

import { useState } from "react";

/**
 * Quality review form shown before promoting a run to the dataset (task 2).
 * Approve → the example becomes exportable; reject → it is stored with a reason
 * but excluded from every export.
 */
export function DatasetReviewForm({ generationRunId }: { generationRunId: string }) {
  const [open, setOpen] = useState(false);
  const [overall, setOverall] = useState(7);
  const [usefulness, setUsefulness] = useState(7);
  const [originality, setOriginality] = useState(7);
  const [schemaValid, setSchemaValid] = useState(true);
  const [approved, setApproved] = useState(true);
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit() {
    setStatus("saving");
    try {
      const res = await fetch("/api/dataset/promote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          generationRunId,
          review: {
            overall_quality: overall,
            usefulness,
            originality,
            schema_valid: schemaValid,
            human_approved: approved,
            notes,
            reject_reason: approved ? undefined : rejectReason || undefined,
          },
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setStatus("done");
        setMessage(approved ? "Promoted & approved — exportable." : "Stored as rejected — excluded from export.");
      } else {
        setStatus("error");
        setMessage((json.issues ?? [json.error]).join("; "));
      }
    } catch (e) {
      setStatus("error");
      setMessage((e as Error).message);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-emerald-400 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
      >
        ★ Promote to dataset
      </button>
    );
  }

  if (status === "done") {
    return (
      <span className="text-xs text-emerald-700 dark:text-emerald-400">
        {message} <a href="/dataset" className="underline">open dataset →</a>
      </span>
    );
  }

  return (
    <div className="mt-2 w-full space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Quality review</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:underline">
          cancel
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Slider label="Overall quality" value={overall} onChange={setOverall} />
        <Slider label="Usefulness" value={usefulness} onChange={setUsefulness} />
        <Slider label="Originality" value={originality} onChange={setOriginality} />
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={schemaValid} onChange={(e) => setSchemaValid(e.target.checked)} />
          schema valid
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
          <span className={approved ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-500"}>
            human approved {approved ? "(will export)" : "(rejected — excluded)"}
          </span>
        </label>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (what makes this a good/bad example)…"
        className="h-16 w-full rounded border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-950"
      />
      {!approved && (
        <input
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reject reason (optional)"
          className="w-full rounded border border-amber-300 bg-white px-2 py-1 text-xs dark:border-amber-900 dark:bg-slate-950"
        />
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={status === "saving"}
          className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : approved ? "Promote & approve" : "Store as rejected"}
        </button>
        {status === "error" && <span className="text-xs text-red-600">{message}</span>}
      </div>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="text-xs">
      <div className="mb-1 flex justify-between text-slate-500">
        <span>{label}</span>
        <span className="font-mono">{value}/10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}
