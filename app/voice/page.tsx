"use client";

import { useEffect, useState } from "react";
import { AgentRunner } from "@/components/agent-runner";
import type { VoiceProfile } from "@/lib/schemas/voice-profile";

interface SavedProfile {
  id: string;
  name: string;
  created_at: string;
  profile: VoiceProfile;
}

export default function VoicePage() {
  const [samples, setSamples] = useState<string[]>([""]);
  const [result, setResult] = useState<VoiceProfile | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedProfile[]>([]);

  useEffect(() => {
    fetch("/api/voice")
      .then((r) => r.json())
      .then((j) => setSaved(j.profiles ?? []))
      .catch(() => {});
  }, [savedId]);

  const validSamples = samples.map((s) => s.trim()).filter((s) => s.length >= 100);

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Voice Profile</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Paste 1–3 samples of your writing. The system infers your voice so generated
          drafts sound like you — not like an AI polish.
        </p>
      </div>

      {!result && (
        <div className="space-y-3">
          {samples.map((s, i) => (
            <textarea
              key={i}
              value={s}
              onChange={(e) =>
                setSamples((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
              }
              placeholder={`Writing sample ${i + 1} (150+ words works best)…`}
              className="h-32 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          ))}
          {samples.length < 3 && (
            <button
              onClick={() => setSamples((p) => [...p, ""])}
              className="text-sm text-slate-500 hover:underline"
            >
              + add another sample
            </button>
          )}
          {validSamples.length > 0 && (
            <AgentRunner
              agentId="voice"
              input={{ samples: validSamples }}
              buttonLabel="Infer voice profile"
              onDone={(data, meta) => {
                setResult(data as VoiceProfile);
                setSavedId(meta.savedId);
              }}
            />
          )}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">&ldquo;{result.name}&rdquo;</h2>
            <span className="text-xs text-slate-500">
              {savedId ? "saved — selectable on the Generate page" : "not saved (no DB)"}
            </span>
          </div>
          <VoiceProfileView profile={result} />
          <button
            onClick={() => {
              setResult(null);
              setSavedId(null);
              setSamples([""]);
            }}
            className="text-sm text-slate-500 hover:underline"
          >
            Infer another →
          </button>
        </div>
      )}

      {saved.length > 0 && !result && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Saved profiles
          </h2>
          <ul className="space-y-2">
            {saved.map((p) => (
              <li key={p.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 text-xs text-slate-500">
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

function VoiceProfileView({ profile }: { profile: VoiceProfile }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-x-6 gap-y-2 rounded-lg border border-slate-200 p-4 md:grid-cols-2 dark:border-slate-800">
        {Object.entries(profile.dimensions).map(([k, v]) => (
          <div key={k} title={v.note}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">{k.replaceAll("_", " ")}</span>
              <span className="font-mono text-xs">{v.score}</span>
            </div>
            <div className="mt-0.5 h-1.5 rounded bg-slate-100 dark:bg-slate-900">
              <div className="h-1.5 rounded bg-violet-500" style={{ width: `${v.score * 10}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 text-sm md:grid-cols-2">
        <Card label="Sentence length" value={profile.sentence_length} />
        <Card label="Vocabulary" value={profile.vocabulary_level} />
        <Card label="Reflection style" value={profile.reflection_style} />
        <Card label="Natural rhythm" value={profile.natural_rhythm} />
        <Card label="Preferred transitions" value={profile.preferred_transitions.join(" · ")} />
        <Card label="Signature moves" value={profile.signature_moves.join(" · ")} />
      </div>
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
          Would sound fake
        </h3>
        <ul className="mt-1 list-disc pl-4 text-amber-900 dark:text-amber-200">
          {profile.what_would_sound_fake.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <p className="mt-0.5 text-slate-700 dark:text-slate-300">{value}</p>
    </div>
  );
}
