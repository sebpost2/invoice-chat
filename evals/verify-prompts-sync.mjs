/**
 * Pre-eval guard: ensures `evals/groq-tool-provider.mjs` carries the same
 * SYSTEM_PROMPT_EN / SYSTEM_PROMPT_ES literals as the canonical source at
 * `src/lib/chat-prompts.ts`. Reads both files as text, parses the prompt
 * constants with a narrow regex, compares verbatim, and exits non-zero with
 * a diff on mismatch.
 *
 * Why exists: the eval suite can't import .ts directly without a TS loader,
 * so the prompts are duplicated in the .mjs provider. This script makes the
 * duplication safe by catching drift at eval time.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(here, "..");
const TS_PATH = join(REPO_ROOT, "src", "lib", "chat-prompts.ts");
const MJS_PATH = join(here, "groq-tool-provider.mjs");

const PROMPT_NAMES = ["SYSTEM_PROMPT_EN", "SYSTEM_PROMPT_ES"];

function extractPrompts(source, names) {
  const out = {};
  for (const name of names) {
    // Matches: export const NAME = `...`;
    const re = new RegExp(
      `export\\s+const\\s+${name}\\s*=\\s*\`([\\s\\S]*?)\`\\s*;`,
      "m",
    );
    const m = source.match(re);
    if (!m) {
      throw new Error(`could not find export const ${name} in source`);
    }
    out[name] = m[1];
  }
  return out;
}

const [tsSource, mjsSource] = await Promise.all([
  readFile(TS_PATH, "utf8"),
  readFile(MJS_PATH, "utf8"),
]);

const tsPrompts = extractPrompts(tsSource, PROMPT_NAMES);
const mjsPrompts = extractPrompts(mjsSource, PROMPT_NAMES);

const mismatches = [];
for (const name of PROMPT_NAMES) {
  if (tsPrompts[name] !== mjsPrompts[name]) {
    mismatches.push(name);
  }
}

if (mismatches.length === 0) {
  console.log(
    `evals: prompts in sync (${PROMPT_NAMES.length}/${PROMPT_NAMES.length})`,
  );
  process.exit(0);
}

console.error("evals: PROMPT DRIFT DETECTED\n");
for (const name of mismatches) {
  console.error(`--- ${name} (canonical: src/lib/chat-prompts.ts)`);
  console.error(tsPrompts[name]);
  console.error(`+++ ${name} (drifted: evals/groq-tool-provider.mjs)`);
  console.error(mjsPrompts[name]);
  console.error("");
}
console.error(
  "Sync the prompts in evals/groq-tool-provider.mjs to match src/lib/chat-prompts.ts.",
);
process.exit(1);
