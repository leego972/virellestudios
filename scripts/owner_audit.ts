// v6.69 Phase 13 — quick ownership lint.
//
// Scans server/routers.ts for protectedProcedure blocks and flags any whose
// body never references `ctx.user.id`. Runs locally with:
//   npx tsx scripts/owner_audit.ts
// Exits 0 even on findings — this is advisory, not a CI gate.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = resolve(process.cwd(), "server/routers.ts");
const text = readFileSync(SRC, "utf8");
const lines = text.split("\n");

type Finding = { line: number; preview: string };
const findings: Finding[] = [];

const PROC_RE = /protectedProcedure/;
const QUERY_OR_MUT_RE = /\.(query|mutation)\(/;
const OWNER_REFS = [
  "ctx.user.id",
  "ctx.user?.id",
  "ctx.user!.id",
  "ctx.user.role",
];
const SAFE_HELPERS = [
  "getProjectById",
  "getSceneById",
  "getCharacterById",
  "getUserById",
  "getUserProjects",
  "getRecapById",
];

let i = 0;
while (i < lines.length) {
  const line = lines[i];
  if (PROC_RE.test(line)) {
    // Find the start of the body (look for ".query(" / ".mutation(" up to 40 lines below).
    let bodyStart = -1;
    for (let j = i; j < Math.min(i + 40, lines.length); j++) {
      if (QUERY_OR_MUT_RE.test(lines[j])) { bodyStart = j; break; }
    }
    if (bodyStart === -1) { i++; continue; }
    // Scan forward until the matching close paren of this procedure (rough
    // heuristic: balance `{` and `}` plus `(` `)`).
    let depth = 0;
    let bodyEnd = bodyStart;
    let started = false;
    for (let j = bodyStart; j < Math.min(bodyStart + 200, lines.length); j++) {
      for (const ch of lines[j]) {
        if (ch === "{" || ch === "(") { depth++; started = true; }
        else if (ch === "}" || ch === ")") {
          depth--;
          if (started && depth <= 0) { bodyEnd = j; break; }
        }
      }
      if (started && depth <= 0) { bodyEnd = j; break; }
    }
    const body = lines.slice(bodyStart, bodyEnd + 1).join("\n");
    const ownerHit = OWNER_REFS.some((r) => body.includes(r));
    const helperHit = SAFE_HELPERS.some((h) => body.includes(h));
    if (!ownerHit && !helperHit) {
      findings.push({ line: bodyStart + 1, preview: lines[i].trim().slice(0, 120) });
    }
    i = bodyEnd + 1;
  } else {
    i++;
  }
}

console.log(`[owner_audit] scanned ${SRC}`);
console.log(`[owner_audit] protectedProcedure blocks without an owner reference: ${findings.length}`);
for (const f of findings.slice(0, 50)) {
  console.log(`  routers.ts:${f.line}  ${f.preview}`);
}
if (findings.length > 50) console.log(`  …and ${findings.length - 50} more.`);
process.exit(0);
