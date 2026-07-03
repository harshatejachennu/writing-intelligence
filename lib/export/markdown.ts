/** Markdown builders for exportable artifacts. Plain module — usable from
 * server components and client components alike. */

export function draftToMarkdown(args: {
  text: string;
  techniquesUsed?: Array<{ technique: string; where: string; intended_effect: string }>;
  weaknesses?: string[];
  choicesExplained?: string;
}): string {
  const lines = ["# Draft", "", "> DRAFT — generated with technique-driven planning. Verify before use.", "", args.text, ""];
  if (args.techniquesUsed?.length) {
    lines.push("## Techniques used", "");
    for (const t of args.techniquesUsed) lines.push(`- **${t.technique}** @ ${t.where} — ${t.intended_effect}`);
    lines.push("");
  }
  if (args.choicesExplained) lines.push("## Why it's built this way", "", args.choicesExplained, "");
  if (args.weaknesses?.length) {
    lines.push("## Possible weaknesses", "");
    for (const w of args.weaknesses) lines.push(`- ${w}`);
    lines.push("");
  }
  return lines.join("\n");
}

export function analysisToMarkdown(args: { passage: string; analysis: Record<string, unknown> }): string {
  const a = args.analysis;
  const lines = ["# Passage analysis", "", "## Passage", "", `> ${args.passage.replaceAll("\n", "\n> ")}`, ""];
  const scalar = (k: string, label: string) => {
    if (typeof a[k] === "string" && a[k]) lines.push(`- **${label}:** ${a[k]}`);
  };
  lines.push("## Structure & texture", "");
  scalar("macro_structure", "Macro structure");
  scalar("voice", "Voice");
  scalar("tone", "Tone");
  scalar("pacing", "Pacing");
  scalar("diction", "Diction");
  scalar("imagery", "Imagery");
  scalar("symbolism", "Symbolism");
  scalar("reader_effect", "Reader effect");
  scalar("memorability", "Memorability");
  lines.push("");
  const tt = a.transferable_techniques as Array<{ name: string; plain_name: string; transfer_rule: string }> | undefined;
  if (tt?.length) {
    lines.push("## Transferable techniques", "");
    for (const t of tt) lines.push(`- **${t.name}** (${t.plain_name}) — ${t.transfer_rule}`);
    lines.push("");
  }
  const warn = a.imitation_warnings as string[] | undefined;
  if (warn?.length) {
    lines.push("## Imitation warnings", "");
    for (const w of warn) lines.push(`- ${w}`);
  }
  return lines.join("\n");
}
