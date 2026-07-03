"use client";

import { useState } from "react";
import { AgentRunner } from "@/components/agent-runner";
import { Scorecard } from "@/components/scorecard";
import { overallScore, type Critique } from "@/lib/schemas/critique";
import type { Revision } from "@/lib/schemas/revision";

/** One completed critique→revision round. */
interface Round {
  critique: Critique;
  critiqueId: string | null;
  revision: Revision | null;
  revisionId: string | null;
  textBefore: string;
}

const MAX_ROUNDS = 3;

export default function CritiquePage() {
  const [text, setText] = useState("");
  const [genre, setGenre] = useState("");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [phase, setPhase] = useState<"input" | "critiqued" | "revised">("input");

  const current = rounds[rounds.length - 1] ?? null;
  const prevOverall = rounds.length >= 2 ? overallScore(rounds[rounds.length - 2].critique) : null;
  const currOverall = current ? overallScore(current.critique) : null;
  const plateaued =
    prevOverall !== null && currOverall !== null && currOverall <= prevOverall;

  function reset() {
    setText("");
    setGenre("");
    setDocumentId(null);
    setRounds([]);
    setPhase("input");
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Critique &amp; Revise</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Rubric critique with evidence → fix the single biggest weakness → compare →
          repeat until the score plateaus.
        </p>
      </div>

      {/* ── Input ───────────────────────────────────────────────────────── */}
      {phase === "input" && (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the draft to critique…"
            className="h-56 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <input
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="genre (optional, e.g. personal_essay)"
            className="w-64 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          {text.trim().length >= 50 && (
            <AgentRunner
              agentId="critic"
              input={{ text, genre: genre || undefined, documentId: documentId ?? undefined }}
              buttonLabel="Critique this draft"
              onDone={(data, meta) => {
                setDocumentId(meta.documentId ?? null);
                setRounds((r) => [
                  ...r,
                  {
                    critique: data as Critique,
                    critiqueId: meta.savedId,
                    revision: null,
                    revisionId: null,
                    textBefore: text,
                  },
                ]);
                setPhase("critiqued");
              }}
            />
          )}
        </div>
      )}

      {/* ── Rounds history ──────────────────────────────────────────────── */}
      {rounds.map((round, i) => {
        const isLast = i === rounds.length - 1;
        return (
          <section key={i} className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Round {i + 1}
              {i > 0 && (
                <ScoreDelta
                  prev={overallScore(rounds[i - 1].critique)}
                  curr={overallScore(round.critique)}
                />
              )}
            </h2>
            <Scorecard critique={round.critique} />

            {round.revision && (
              <div className="grid gap-4 md:grid-cols-2">
                <TextPane label="Before" body={round.textBefore} dim />
                <TextPane label="After" body={round.revision.revised_text} />
                <div className="rounded-lg border border-slate-200 p-4 text-sm md:col-span-2 dark:border-slate-800">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    What changed
                  </h3>
                  <p className="mt-1 text-slate-600 dark:text-slate-400">
                    {round.revision.change_summary}
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {round.revision.changes.map((c, j) => (
                      <li key={j} className="text-xs">
                        <span className="text-red-600 line-through dark:text-red-400">{c.before}</span>{" "}
                        → <span className="text-emerald-700 dark:text-emerald-400">{c.after}</span>
                        <span className="text-slate-500"> ({c.why})</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-slate-500">
                    Left alone: {round.revision.what_was_not_changed}
                  </p>
                </div>
              </div>
            )}

            {/* Actions for the latest round */}
            {isLast && phase === "critiqued" && !round.revision && (
              <div className="space-y-3">
                {round.critique.goal_met ? (
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    The critic says the goal is met — revising further risks over-polishing.
                  </p>
                ) : rounds.length >= MAX_ROUNDS ? (
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-500">
                    {MAX_ROUNDS} rounds reached — stopping here to avoid over-polishing.
                  </p>
                ) : plateaued ? (
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-500">
                    Score plateaued ({prevOverall} → {currOverall}) — further revision is
                    unlikely to help. Stop here.
                  </p>
                ) : null}
                {!round.critique.goal_met && rounds.length < MAX_ROUNDS && !plateaued && (
                  <AgentRunner
                    agentId="reviser"
                    input={{
                      text,
                      biggestWeakness: round.critique.biggest_weakness,
                      revisionInstruction: round.critique.next_revision_instruction,
                      genre: genre || undefined,
                      documentId: documentId ?? undefined,
                      critiqueId: round.critiqueId ?? undefined,
                      parentRevisionId: rounds[i - 1]?.revisionId ?? undefined,
                    }}
                    buttonLabel="Revise the biggest weakness"
                    onDone={(data, meta) => {
                      const rev = data as Revision;
                      setRounds((r) =>
                        r.map((x, j) =>
                          j === i ? { ...x, revision: rev, revisionId: meta.savedId } : x,
                        ),
                      );
                      setText(rev.revised_text);
                      setPhase("revised");
                    }}
                  />
                )}
              </div>
            )}

            {isLast && phase === "revised" && round.revision && rounds.length < MAX_ROUNDS && (
              <AgentRunner
                agentId="critic"
                input={{ text, genre: genre || undefined, documentId: documentId ?? undefined }}
                buttonLabel="Re-critique the revision"
                onDone={(data, meta) => {
                  setRounds((r) => [
                    ...r,
                    {
                      critique: data as Critique,
                      critiqueId: meta.savedId,
                      revision: null,
                      revisionId: null,
                      textBefore: text,
                    },
                  ]);
                  setPhase("critiqued");
                }}
              />
            )}
          </section>
        );
      })}

      {rounds.length > 0 && (
        <button onClick={reset} className="text-sm text-slate-500 hover:underline">
          Start over with new text →
        </button>
      )}
    </main>
  );
}

function ScoreDelta({ prev, curr }: { prev: number; curr: number }) {
  const diff = Math.round((curr - prev) * 10) / 10;
  return (
    <span
      className={`ml-2 rounded px-1.5 py-0.5 text-xs font-medium ${
        diff > 0
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
      }`}
    >
      {diff > 0 ? `+${diff}` : diff} vs round before
    </span>
  );
}

function TextPane({ label, body, dim }: { label: string; body: string; dim?: boolean }) {
  return (
    <div className={`rounded-lg border border-slate-200 p-4 dark:border-slate-800 ${dim ? "opacity-70" : ""}`}>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{body}</p>
    </div>
  );
}
