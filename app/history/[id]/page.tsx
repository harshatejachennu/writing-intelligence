import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/pipeline/log";
import { AnalysisSchema } from "@/lib/schemas/analyzer";
import { FunctionMap } from "@/components/function-map";
import { ExtractCards } from "@/components/extract-cards";
import { AnnotatedText } from "@/components/annotated-text";
import { ExportButton } from "@/components/export-button";
import { analysisToMarkdown } from "@/lib/export/markdown";

export const dynamic = "force-dynamic";

export default async function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getAnalysis(id);
  if (!row) notFound();

  // Re-validate stored JSON so the renderer gets a typed, guaranteed shape.
  const parsed = AnalysisSchema.safeParse(row.analysis_json);

  return (
    <main className="space-y-6">
      <div>
        <a href="/history" className="text-sm text-slate-500 hover:underline">
          ← History
        </a>
        <h1 className="mt-1 text-2xl font-semibold">Saved analysis</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
          <span>{new Date(row.created_at).toLocaleString()}</span>
          {row.genre && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-900">{row.genre}</span>
          )}
          <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-900">mode: {row.mode}</span>
          {row.manual_model && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-900">
              via {row.manual_model}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Passage {parsed.success && <span className="normal-case font-normal">(hover highlights for annotations)</span>}
          </h2>
          {parsed.success && (
            <ExportButton
              filename="passage-analysis"
              markdown={analysisToMarkdown({ passage: row.passage_text, analysis: parsed.data as unknown as Record<string, unknown> })}
            />
          )}
        </div>
        {parsed.success ? (
          <AnnotatedText
            text={row.passage_text}
            annotations={[
              ...parsed.data.sentence_functions.map((s) => ({
                quote: s.quote,
                label: s.function,
                kind: "sentence" as const,
              })),
              ...parsed.data.rhetorical_devices.map((d) => ({
                quote: d.example,
                label: d.device,
                note: d.effect,
                kind: "device" as const,
              })),
            ]}
          />
        ) : (
          <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">{row.passage_text}</p>
        )}
      </div>

      {parsed.success ? (
        <>
          <FunctionMap analysis={parsed.data} />
          <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
            <ExtractCards
              analysis={parsed.data}
              passageText={row.passage_text}
              genre={row.genre ?? undefined}
              analysisId={row.id}
            />
          </div>
        </>
      ) : (
        <pre className="overflow-auto rounded bg-slate-100 p-3 text-xs dark:bg-slate-900">
          {JSON.stringify(row.analysis_json, null, 2)}
        </pre>
      )}
    </main>
  );
}
