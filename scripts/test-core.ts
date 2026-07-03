/**
 * Phase 0 verification — runs with NO API keys.
 * Proves the dual-mode core: build a prompt, then validate (a) a clean response,
 * (b) a dirty/fenced response, and (c) a broken response (errors + fix-it prompt).
 *   Run: npm run test:core
 */

import { buildAgentPrompt, ingestAgentResponse } from "@/lib/models/execute";
import type { Analysis } from "@/lib/schemas/analyzer";

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "✅" : "❌"} ${name}`);
  if (!cond) failures++;
}

const input = {
  passageText:
    "The snow had begun in the gloaming, and Bunny had been dead for several weeks before we came to understand the gravity of our situation.",
  genre: "fiction_opening",
};

// 1. Build the prompt (no provider contacted).
const built = buildAgentPrompt("analyzer", input);
check("build: mode is manual with no key", built.mode === "manual");
check("build: prompt contains the passage", built.copyText.includes("snow had begun"));
check("build: prompt states the JSON contract", built.copyText.includes("ONLY"));

// A complete, valid analysis object.
const validAnalysis: Analysis = {
  macro_structure: "Consequence stated before any context.",
  paragraph_functions: [{ index: 0, function: "reveal outcome", evidence: "Bunny had been dead" }],
  sentence_functions: [{ quote: "the snow had begun", function: "tonal contrast" }],
  rhetorical_devices: [{ device: "juxtaposition", example: "snow vs. dead", effect: "unease" }],
  syntax_patterns: "long compound sentence",
  pacing: "slow, controlled",
  transitions: "temporal",
  voice: "calm retrospective",
  tone: "detached",
  diction: "plain",
  imagery: "seasonal",
  symbolism: "snow as cover",
  motifs: ["death", "weather"],
  emotional_progression: [{ stage: "opening", reader_feels: "curiosity" }],
  reader_effect: "narrative pull",
  genre_expectations: "literary thriller opening",
  clarity: "high",
  compression: "high",
  tension: "high",
  persuasiveness: "n/a",
  memorability: "high",
  transferable_techniques: [
    { name: "consequence_before_context", plain_name: "result first", transfer_rule: "open with the outcome" },
  ],
  imitation_warnings: ["Do not force suspense onto unrelated writing."],
};

// 2. Clean response.
const clean = ingestAgentResponse("analyzer", JSON.stringify(validAnalysis));
check("clean: validates", clean.validation.ok);

// 3. Dirty response — fenced + preamble + trailing note.
const dirty = "Sure! Here's the JSON:\n```json\n" + JSON.stringify(validAnalysis) + "\n```\nHope that helps!";
const dirtyResult = ingestAgentResponse("analyzer", dirty);
check("dirty: strips fences/preamble and validates", dirtyResult.validation.ok);

// 4. Broken response — missing required field.
const broken = { ...validAnalysis } as Partial<Analysis>;
delete broken.macro_structure;
const brokenResult = ingestAgentResponse("analyzer", JSON.stringify(broken));
check("broken: fails validation", !brokenResult.validation.ok);
check(
  "broken: reports the missing field",
  !brokenResult.validation.ok &&
    brokenResult.validation.errors.some((e) => e.includes("macro_structure")),
);
check("broken: produces a fix-it prompt", typeof brokenResult.fixItPrompt === "string");

// 5. Total garbage — no JSON at all.
const garbage = ingestAgentResponse("analyzer", "I cannot help with that.");
check("garbage: fails at extract stage", !garbage.validation.ok && garbage.validation.stage === "extract");

console.log(failures === 0 ? "\nAll core checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
