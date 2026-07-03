import {
  RUBRIC_DIMENSIONS,
  overallScore,
  type Critique,
} from "@/lib/schemas/critique";

/** Rubric scorecard: bars per dimension + risk + issues with evidence. */
export function Scorecard({ critique }: { critique: Critique }) {
  const overall = overallScore(critique);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-lg bg-slate-900 px-3 py-1.5 text-lg font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
          {overall.toFixed(1)}
        </span>
        <span
          className={`rounded px-2 py-1 text-sm font-medium ${
            critique.goal_met
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          }`}
        >
          {critique.goal_met ? "Goal met" : "Goal not yet met"}
        </span>
        <span
          className={`rounded px-2 py-1 text-sm ${
            critique.risk.score >= 7
              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400"
          }`}
          title={critique.risk.why}
        >
          risk {critique.risk.score}/10
        </span>
      </div>

      <div className="grid gap-x-6 gap-y-2 rounded-lg border border-slate-200 p-4 md:grid-cols-2 dark:border-slate-800">
        {RUBRIC_DIMENSIONS.map((d) => {
          const s = critique.scores[d];
          return (
            <div key={d} title={`${s.why}\n\nEvidence: ${s.evidence}`}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{d.replaceAll("_", " ")}</span>
                <span className="font-mono text-xs">{s.score}</span>
              </div>
              <div className="mt-0.5 h-1.5 rounded bg-slate-100 dark:bg-slate-900">
                <div
                  className={`h-1.5 rounded ${s.score >= 8 ? "bg-emerald-500" : s.score >= 5 ? "bg-sky-500" : "bg-amber-500"}`}
                  style={{ width: `${s.score * 10}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Issues</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {critique.issues.map((iss, i) => (
            <li key={i} className="border-l-2 border-amber-400 pl-3">
              <div className="font-medium">{iss.issue}</div>
              <div className="text-xs italic text-slate-500">&ldquo;{iss.evidence}&rdquo;</div>
              <div className="text-slate-600 dark:text-slate-400">Fix: {iss.fix}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-900 dark:bg-sky-950">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
          Biggest weakness → next revision
        </h3>
        <p className="mt-1 font-medium text-sky-900 dark:text-sky-200">{critique.biggest_weakness}</p>
        <p className="mt-1 text-sky-800 dark:text-sky-300">{critique.next_revision_instruction}</p>
      </div>
    </div>
  );
}
