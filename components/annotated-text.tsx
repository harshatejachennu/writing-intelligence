"use client";

import { useMemo, useState } from "react";

export interface Annotation {
  /** Exact or near-exact quote from the text to highlight. */
  quote: string;
  label: string; // e.g. the sentence function
  note?: string; // extra detail for the popover
  kind: "sentence" | "device";
}

interface Span {
  start: number;
  end: number;
  annotation: Annotation;
}

/**
 * Char-range annotation layer (plan §Phase 8 success criterion).
 * Maps annotation quotes onto the text via case-insensitive search, resolves
 * overlaps (first match wins), and renders highlighted spans with hover/click
 * popovers. Quotes that don't locate in the text are listed below instead of
 * being silently dropped.
 */
export function AnnotatedText({ text, annotations }: { text: string; annotations: Annotation[] }) {
  const [active, setActive] = useState<number | null>(null);

  const { spans, unlocated } = useMemo(() => {
    const found: Span[] = [];
    const missed: Annotation[] = [];
    const lower = text.toLowerCase();

    for (const ann of annotations) {
      const needle = ann.quote.trim().toLowerCase();
      if (needle.length < 3) {
        missed.push(ann);
        continue;
      }
      const idx = lower.indexOf(needle);
      if (idx === -1) {
        missed.push(ann);
        continue;
      }
      const start = idx;
      const end = idx + needle.length;
      // Skip spans overlapping an already-claimed range (first wins).
      if (found.some((s) => start < s.end && end > s.start)) {
        missed.push(ann);
        continue;
      }
      found.push({ start, end, annotation: ann });
    }
    found.sort((a, b) => a.start - b.start);
    return { spans: found, unlocated: missed };
  }, [text, annotations]);

  // Build segments: plain text interleaved with highlighted spans.
  const segments: Array<{ text: string; span?: Span; index?: number }> = [];
  let cursor = 0;
  spans.forEach((span, i) => {
    if (span.start > cursor) segments.push({ text: text.slice(cursor, span.start) });
    segments.push({ text: text.slice(span.start, span.end), span, index: i });
    cursor = span.end;
  });
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });

  return (
    <div>
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
        {segments.map((seg, i) =>
          seg.span ? (
            <mark
              key={i}
              onMouseEnter={() => setActive(seg.index!)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(active === seg.index ? null : seg.index!)}
              className={`relative cursor-pointer rounded px-0.5 ${
                seg.span.annotation.kind === "device"
                  ? "bg-violet-100 dark:bg-violet-950 dark:text-violet-200"
                  : "bg-sky-100 dark:bg-sky-950 dark:text-sky-200"
              } ${active === seg.index ? "ring-2 ring-slate-400" : ""}`}
            >
              {seg.text}
              {active === seg.index && (
                <span className="absolute left-0 top-full z-10 mt-1 block w-72 rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  <span className="font-semibold">{seg.span.annotation.label}</span>
                  {seg.span.annotation.note && (
                    <span className="mt-0.5 block text-slate-500">{seg.span.annotation.note}</span>
                  )}
                </span>
              )}
            </mark>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </p>

      <div className="mt-2 flex gap-3 text-xs text-slate-500">
        <span>
          <span className="inline-block h-2.5 w-2.5 rounded bg-sky-200 align-middle dark:bg-sky-900" />{" "}
          sentence function
        </span>
        <span>
          <span className="inline-block h-2.5 w-2.5 rounded bg-violet-200 align-middle dark:bg-violet-900" />{" "}
          rhetorical device
        </span>
        <span>{spans.length} of {annotations.length} located in text</span>
      </div>

      {unlocated.length > 0 && (
        <div className="mt-2 rounded border border-slate-200 p-2 text-xs text-slate-500 dark:border-slate-800">
          Not locatable as exact quotes:{" "}
          {unlocated.map((a) => a.label).join(" · ")}
        </div>
      )}
    </div>
  );
}
