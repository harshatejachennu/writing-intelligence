"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgentRunner } from "./agent-runner";

/** "Curate a lead" flow: description (+ optional excerpt) → curator agent → saved row. */
export function CurateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [userOwned, setUserOwned] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
        >
          Curate a source
        </button>
        {savedMsg && <span className="text-sm text-emerald-700 dark:text-emerald-400">{savedMsg}</span>}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <h2 className="text-sm font-medium">Curate a source</h2>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe the lead: title, author, why it's interesting… e.g. 'The Secret History by Donna Tartt — the opening line about the snow and Bunny. Consequence before context.'"
        className="h-24 w-full rounded border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
      />
      <textarea
        value={excerpt}
        onChange={(e) => setExcerpt(e.target.value)}
        placeholder="Optional: paste a SHORT excerpt (kept under the legal word cap unless public domain / your own writing)"
        className="h-20 w-full rounded border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
      />
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <input type="checkbox" checked={userOwned} onChange={(e) => setUserOwned(e.target.checked)} />
        This excerpt is my own writing (user-owned)
      </label>
      {description.trim().length >= 10 && (
        <AgentRunner
          agentId="curator"
          input={{
            description,
            pastedExcerpt: excerpt || undefined,
            userOwned: userOwned || undefined,
          }}
          buttonLabel="Curate & save"
          onDone={(_data, meta) => {
            setSavedMsg(meta.savedId ? "Source saved to the corpus." : "Curated (not saved — no DB).");
            setOpen(false);
            setDescription("");
            setExcerpt("");
            setUserOwned(false);
            router.refresh();
          }}
        />
      )}
      <button onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:underline">
        Cancel
      </button>
    </div>
  );
}
