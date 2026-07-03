import type { StrategyPlan } from "@/lib/schemas/strategy-plan";

/**
 * Strategy-plan preview — the approval gate before generation. The UX
 * embodiment of the system philosophy: strategy first, words second.
 */
export function StrategyPreview({ plan }: { plan: StrategyPlan }) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Structure</h3>
        <ol className="mt-1 space-y-1">
          {plan.structure.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="font-mono text-xs text-slate-400">{i + 1}.</span>
              <span>
                <span className="font-medium">{s.section}</span>
                <span className="text-slate-500"> — {s.purpose}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-3 text-sm md:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Opening</h3>
          <p className="text-slate-700 dark:text-slate-300">{plan.opening_strategy}</p>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ending</h3>
          <p className="text-slate-700 dark:text-slate-300">{plan.ending_strategy}</p>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Techniques to use
        </h3>
        <ul className="mt-1 space-y-1 text-sm">
          {plan.techniques_to_use.map((t, i) => (
            <li key={i}>
              <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                {t.technique}
              </span>{" "}
              <span className="text-slate-500">@ {t.where}</span> — {t.why}
            </li>
          ))}
        </ul>
      </div>

      {plan.techniques_to_avoid.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500">
            Avoid
          </h3>
          <ul className="mt-1 space-y-1 text-sm text-slate-600 dark:text-slate-400">
            {plan.techniques_to_avoid.map((t, i) => (
              <li key={i}>
                <span className="font-medium">{t.technique}</span> — {t.why}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.turns.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Turns</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {plan.turns.map((t, i) => (
              <li key={i}>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-900">
                  {t.type}
                </span>{" "}
                <span className="text-slate-500">{t.position}:</span> {t.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 text-sm md:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Explicit vs implied
          </h3>
          <p className="text-slate-700 dark:text-slate-300">{plan.explicit_vs_implied}</p>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Attention control
          </h3>
          <p className="text-slate-700 dark:text-slate-300">{plan.attention_control}</p>
        </div>
      </div>

      {plan.risks.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500">
            Risks
          </h3>
          <ul className="mt-1 list-disc pl-4 text-sm text-slate-600 dark:text-slate-400">
            {plan.risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
