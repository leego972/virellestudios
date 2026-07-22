import fs from "node:fs";
import { spawnSync } from "node:child_process";

const sourcePath = "scripts/apply-broadcast-commerce-once.mjs";
let source = fs.readFileSync(sourcePath, "utf8");

// The patch generator contains nested TypeScript template literals. Normalize
// doubled escapes before Node parses it, while preserving the escapes required
// to emit those literals into the target source files.
source = source
  .replaceAll("\\\\`", "\\`")
  .replaceAll("\\\\${", "\\${")
  .replace("  BROADCAST_MINUTE_PACKS,\n", "")
  .replace('    const managed = input.serviceMode !== "direct";\n', "");

const runnablePath = "/tmp/apply-broadcast-commerce-once.mjs";
fs.writeFileSync(runnablePath, source);

const checked = spawnSync(process.execPath, ["--check", runnablePath], {
  stdio: "inherit",
  cwd: process.cwd(),
});
if (checked.status !== 0) process.exit(checked.status ?? 1);

const executed = spawnSync(process.execPath, [runnablePath], {
  stdio: "inherit",
  cwd: process.cwd(),
});
process.exit(executed.status ?? 1);
