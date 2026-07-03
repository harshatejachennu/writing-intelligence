"use client";

/** Client-side Markdown export — downloads a .md file, no server round-trip.
 * Markdown builders live in lib/export/markdown.ts (plain module). */
export function ExportButton({ filename, markdown }: { filename: string; markdown: string }) {
  function download() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      className="rounded border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:border-slate-500 dark:border-slate-700 dark:text-slate-400"
    >
      Export .md
    </button>
  );
}
