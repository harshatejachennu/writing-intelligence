import { NextResponse } from "next/server";
import { assembleApprovedExamples } from "@/lib/pipeline/dataset";
import { serializeDataset } from "@/lib/export/dataset-format";
import { EXPORT_FORMATS, type ExportFormat, type DatasetFilters } from "@/lib/schemas/dataset";

export const dynamic = "force-dynamic";

/**
 * GET /api/dataset/export?format=jsonl|json|csv & filters
 * Exports ONLY human-approved examples (task 3), copyright-safe (task 8), as a
 * downloadable file. Filters mirror the Dataset page.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "jsonl") as ExportFormat;
  if (!EXPORT_FORMATS.includes(format)) {
    return NextResponse.json({ error: `format must be one of ${EXPORT_FORMATS.join(", ")}` }, { status: 400 });
  }

  const filters: DatasetFilters = {
    agent_id: url.searchParams.get("agent_id") ?? undefined,
    genre: url.searchParams.get("genre") ?? undefined,
    manual_model: url.searchParams.get("manual_model") ?? undefined,
    task_type: url.searchParams.get("task_type") ?? undefined,
    min_quality: url.searchParams.get("min_quality") ? Number(url.searchParams.get("min_quality")) : undefined,
    from_date: url.searchParams.get("from_date") ?? undefined,
    to_date: url.searchParams.get("to_date") ?? undefined,
  };

  const examples = await assembleApprovedExamples(filters);
  const { body, contentType, extension } = serializeDataset(examples, format);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename="dataset-${stamp}.${extension}"`,
      "x-example-count": String(examples.length),
    },
  });
}
