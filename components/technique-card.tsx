import type { TechniqueCard as Card } from "@/lib/schemas/technique-card";

/** Renders one technique card — the library's core visual unit. */
export function TechniqueCardView({ card }: { card: Card }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
        {card.technique_name}
      </div>
      <h3 className="mt-0.5 font-semibold">{card.plain_name}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{card.function}</p>

      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {card.reader_effect.map((e) => (
          <span key={e} className="rounded bg-violet-100 px-1.5 py-0.5 text-violet-800 dark:bg-violet-950 dark:text-violet-300">
            {e}
          </span>
        ))}
        {card.genre_fit.map((g) => (
          <span key={g} className="rounded bg-sky-100 px-1.5 py-0.5 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
            {g}
          </span>
        ))}
      </div>

      <dl className="mt-3 space-y-2 text-sm">
        <Row label="Transfer rule" value={card.transfer_rule} />
        <Row label="When to use" value={card.when_to_use} />
        <Row label="When NOT to use" value={card.when_not_to_use} warn />
        <Row label="Bad use" value={card.bad_use_warning} warn />
        <Row label="Revision instruction" value={card.revision_instruction} />
      </dl>

      {card.genre_adaptations.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2 text-sm dark:border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Genre adaptations
          </div>
          <ul className="mt-1 space-y-1">
            {card.genre_adaptations.map((a, i) => (
              <li key={i}>
                <span className="font-medium">{a.genre}:</span>{" "}
                <span className="text-slate-600 dark:text-slate-400">{a.guidance}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {card.evaluation_criteria.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2 text-sm dark:border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Did it work?
          </div>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-600 dark:text-slate-400">
            {card.evaluation_criteria.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className={`text-xs font-semibold uppercase tracking-wide ${warn ? "text-amber-600 dark:text-amber-500" : "text-slate-500"}`}>
        {label}
      </dt>
      <dd className="text-slate-700 dark:text-slate-300">{value}</dd>
    </div>
  );
}
