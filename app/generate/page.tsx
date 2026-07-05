"use client";

import { useEffect, useState } from "react";
import { AgentRunner } from "@/components/agent-runner";
import { WorkflowModeBar, type ModeChoice } from "@/components/mode-control";
import { StrategyPreview } from "@/components/strategy-preview";
import { ExportButton } from "@/components/export-button";
import { draftToMarkdown } from "@/lib/export/markdown";
import { DatasetReviewForm } from "@/components/dataset-review-form";
import { profileQueryText, type GoalProfile } from "@/lib/schemas/goal-profile";
import type { StrategyPlan } from "@/lib/schemas/strategy-plan";
import type { Generation } from "@/lib/schemas/generation";
import type { CardSummary } from "@/lib/agents/planner";

type Step = "request" | "profile" | "plan" | "generate" | "done";

interface RetrievedCard {
  id: string;
  summary: CardSummary;
  selected: boolean;
}

const PRESETS = ["", "persuasive", "explanatory", "personal_narrative"];

export default function GeneratePage() {
  const [step, setStep] = useState<Step>("request");
  const [wfMode, setWfMode] = useState<ModeChoice>("auto");
  const [request, setRequest] = useState("");
  const [preset, setPreset] = useState("");

  const [profile, setProfile] = useState<GoalProfile | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [cards, setCards] = useState<RetrievedCard[]>([]);

  const [plan, setPlan] = useState<StrategyPlan | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [facts, setFacts] = useState("");

  const [generation, setGeneration] = useState<Generation | null>(null);
  const [runId, setRunId] = useState<string | null>(null);

  const [voices, setVoices] = useState<Array<{ id: string; name: string; profile: unknown }>>([]);
  const [voiceId, setVoiceId] = useState("");

  useEffect(() => {
    fetch("/api/voice")
      .then((r) => r.json())
      .then((j) => setVoices(j.profiles ?? []))
      .catch(() => {});
  }, []);

  const selectedCards = cards.filter((c) => c.selected).map((c) => c.summary);
  const selectedCardIds = cards.filter((c) => c.selected).map((c) => c.id);

  async function retrieveCards(p: GoalProfile) {
    try {
      const q = encodeURIComponent(profileQueryText(p));
      const res = await fetch(`/api/techniques?q=${q}&limit=8`);
      const json = await res.json();
      const hits = (json.hits ?? []) as Array<{ id: string; card_json: Record<string, unknown> }>;
      setCards(
        hits.map((h) => ({
          id: h.id,
          selected: true,
          summary: {
            technique_name: String(h.card_json.technique_name ?? ""),
            plain_name: String(h.card_json.plain_name ?? ""),
            transfer_rule: String(h.card_json.transfer_rule ?? ""),
            when_to_use: String(h.card_json.when_to_use ?? ""),
            when_not_to_use: String(h.card_json.when_not_to_use ?? ""),
          },
        })),
      );
    } catch {
      setCards([]);
    }
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Generate</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Request → goal profile → retrieved techniques → strategy plan (your approval gate)
          → strategy-driven draft.
        </p>
      </div>

      <WorkflowModeBar value={wfMode} onChange={setWfMode} />

      <Stepper current={step} />

      {/* ── Step 1: request ─────────────────────────────────────────────── */}
      {step === "request" && (
        <div className="space-y-3">
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="Describe what you need, who it's for, and what it should accomplish…  e.g. 'Write a short persuasive speech that makes high-school volunteers actually care, without sounding cheesy. About 2 minutes.'"
            className="h-36 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <div className="flex items-center gap-3">
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              {PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p === "" ? "no genre preset" : p}
                </option>
              ))}
            </select>
          </div>
          {request.trim().length >= 15 && (
            <AgentRunner
            modeOverride={wfMode}
              agentId="goalProfile"
              input={{ request, genrePreset: preset || undefined }}
              buttonLabel="Build goal profile"
              onDone={(data, meta) => {
                const p = data as GoalProfile;
                setProfile(p);
                setProfileId(meta.savedId);
                void retrieveCards(p);
                setStep("profile");
              }}
            />
          )}
        </div>
      )}

      {/* ── Step 2: profile review + retrieved cards ─────────────────────── */}
      {step === "profile" && profile && (
        <div className="space-y-4">
          <ProfileView profile={profile} />
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-sm font-medium">Retrieved technique cards</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              These will inform the strategy. Uncheck any you don&apos;t want.
            </p>
            {cards.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No cards in the library match — the planner will use general techniques.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {cards.map((c, i) => (
                  <li key={c.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={c.selected}
                      onChange={() =>
                        setCards((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, selected: !x.selected } : x)),
                        )
                      }
                      className="mt-1"
                    />
                    <span>
                      <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                        {c.summary.technique_name}
                      </span>{" "}
                      — {c.summary.plain_name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <AgentRunner
            modeOverride={wfMode}
            agentId="planner"
            input={{
              goalProfile: profile,
              retrievedCards: selectedCards,
              goalProfileId: profileId ?? undefined,
            }}
            buttonLabel="Plan the strategy"
            onDone={(data, meta) => {
              setPlan(data as StrategyPlan);
              setPlanId(meta.savedId);
              setStep("plan");
            }}
          />
        </div>
      )}

      {/* ── Step 3: strategy preview gate ─────────────────────────────────── */}
      {step === "plan" && plan && profile && (
        <div className="space-y-4">
          <div className="rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
            <strong>Approval gate.</strong> Review the strategy below. Nothing is written
            until you approve it. To change it, go back and adjust the request or cards.
          </div>
          <StrategyPreview plan={plan} />
          {profile.high_stakes && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <strong>High-stakes writing.</strong> The generator will use only facts you
              provide below; missing facts become [YOUR: …] placeholders. The output is a
              draft — verify and personalize before any real use.
            </div>
          )}
          <div>
            <label className="text-sm font-medium">
              Facts / material the draft may use{" "}
              <span className="font-normal text-slate-500">
                (the only facts the generator is allowed)
              </span>
            </label>
            <textarea
              value={facts}
              onChange={(e) => setFacts(e.target.value)}
              placeholder="Names, events, numbers, personal experiences, source material…"
              className="mt-1 h-28 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          {voices.length > 0 && (
            <div>
              <label className="text-sm font-medium">
                Write in a saved voice{" "}
                <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="mt-1 block rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">no voice profile</option>
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <AgentRunner
            modeOverride={wfMode}
            agentId="generator"
            input={{
              goalProfile: profile,
              strategyPlan: plan,
              cards: selectedCards,
              facts: facts || undefined,
              voiceProfile: voices.find((v) => v.id === voiceId)?.profile,
              goalProfileId: profileId ?? undefined,
              strategyPlanId: planId ?? undefined,
              retrievedCardIds: selectedCardIds,
            }}
            buttonLabel="Approve strategy & generate"
            onDone={(data, meta) => {
              setGeneration(data as Generation);
              setRunId(meta.savedId);
              setStep("done");
            }}
          />
        </div>
      )}

      {/* ── Step 4: output ────────────────────────────────────────────────── */}
      {step === "done" && generation && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Draft{" "}
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                DRAFT — not final
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <ExportButton
                filename="draft"
                markdown={draftToMarkdown({
                  text: generation.text,
                  techniquesUsed: generation.techniques_used,
                  weaknesses: generation.possible_weaknesses,
                  choicesExplained: generation.choices_explained,
                })}
              />
              {runId && <DatasetReviewForm generationRunId={runId} />}
              <span className="text-xs text-slate-500">
                {runId ? `run saved (${runId.slice(0, 8)}…)` : "not saved (no DB)"}
              </span>
            </div>
          </div>
          <div className="whitespace-pre-wrap rounded-lg border border-slate-200 p-5 text-[15px] leading-relaxed dark:border-slate-800">
            {generation.text}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Techniques used
              </h3>
              <ul className="mt-1 space-y-1 text-sm">
                {generation.techniques_used.map((t, i) => (
                  <li key={i}>
                    <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                      {t.technique}
                    </span>{" "}
                    <span className="text-slate-500">@ {t.where}</span> — {t.intended_effect}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500">
                Possible weaknesses
              </h3>
              <ul className="mt-1 list-disc pl-4 text-sm text-slate-600 dark:text-slate-400">
                {generation.possible_weaknesses.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Suggested next revision
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {generation.suggested_revision_path}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Why it&apos;s built this way
            </h3>
            <p className="mt-1 text-slate-600 dark:text-slate-400">{generation.choices_explained}</p>
          </div>

          <button
            onClick={() => {
              setStep("request");
              setRequest("");
              setProfile(null);
              setProfileId(null);
              setCards([]);
              setPlan(null);
              setPlanId(null);
              setFacts("");
              setGeneration(null);
              setRunId(null);
            }}
            className="text-sm text-slate-500 hover:underline"
          >
            Start another →
          </button>
        </div>
      )}
    </main>
  );
}

function Stepper({ current }: { current: Step }) {
  const steps: Array<{ id: Step; label: string }> = [
    { id: "request", label: "Request" },
    { id: "profile", label: "Goal profile" },
    { id: "plan", label: "Strategy (gate)" },
    { id: "done", label: "Draft" },
  ];
  const idx = steps.findIndex((s) => s.id === current || (current === "generate" && s.id === "plan"));
  return (
    <ol className="flex flex-wrap gap-2 text-xs">
      {steps.map((s, i) => (
        <li
          key={s.id}
          className={`rounded-full px-3 py-1 ${
            i <= idx
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
              : "bg-slate-100 text-slate-500 dark:bg-slate-900"
          }`}
        >
          {i + 1}. {s.label}
        </li>
      ))}
    </ol>
  );
}

function ProfileView({ profile }: { profile: GoalProfile }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <h3 className="text-sm font-medium">Goal profile</h3>
      <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-sm md:grid-cols-2">
        <Item label="Genre" value={profile.genre} />
        <Item label="Audience" value={profile.audience} />
        <Item label="Purpose" value={profile.purpose} />
        <Item label="Length" value={profile.length} />
        <Item label="Voice" value={profile.voice} />
        <Item
          label="Tone"
          value={Object.entries(profile.tone)
            .map(([k, v]) => `${k} ${v}`)
            .join(", ")}
        />
        <Item label="Reader effect" value={profile.reader_effect.join("; ")} />
        <Item label="Evaluation criteria" value={profile.evaluation_criteria.join("; ")} />
        {profile.risk_factors.length > 0 && (
          <Item label="Risks" value={profile.risk_factors.join("; ")} />
        )}
        {profile.high_stakes && <Item label="High stakes" value="YES — no invented facts" />}
      </dl>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-slate-700 dark:text-slate-300">{value}</dd>
    </div>
  );
}
