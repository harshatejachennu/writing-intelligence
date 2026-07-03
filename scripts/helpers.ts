import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/** Load .env.local into process.env (tsx does not auto-load env files). */
export function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[2] && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

/** Simple check counter shared by verification scripts. */
export function makeChecker() {
  let failures = 0;
  function check(name: string, cond: boolean, detail?: string) {
    console.log(`${cond ? "✅" : "❌"} ${name}${!cond && detail ? ` — ${detail}` : ""}`);
    if (!cond) failures++;
  }
  function done(label: string) {
    console.log(failures === 0 ? `\nAll ${label} checks passed.` : `\n${failures} check(s) failed.`);
    process.exit(failures === 0 ? 0 : 1);
  }
  return { check, done };
}
