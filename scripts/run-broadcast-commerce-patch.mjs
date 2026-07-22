import fs from "node:fs";
import { spawnSync } from "node:child_process";

const sourcePath = "scripts/apply-broadcast-commerce-once.mjs";
let source = fs.readFileSync(sourcePath, "utf8");

// Replace nested output templates that must not interpolate while this
// generator itself is executing.
{
  const endpointMarker = "return createBroadcastMinuteCheckout({";
  const marker = source.indexOf(endpointMarker);
  const start = source.indexOf("      successUrl:", marker);
  const end = source.indexOf("\\n    });", start);
  if (marker < 0 || start < 0 || end < 0) {
    throw new Error("Broadcast checkout URL patch boundary was not found.");
  }
  source = source.slice(0, start)
    + '      successUrl: returnUrl + separator + "broadcast_minutes=success&pack=" + input.packId,\\n'
    + '      cancelUrl: returnUrl + separator + "broadcast_minutes=cancelled",'
    + source.slice(end);
}

{
  const logMarker = source.indexOf("[BroadcastMinutes]");
  const start = source.lastIndexOf("            logger.info(", logMarker);
  const end = source.indexOf("\\n            );", logMarker);
  if (logMarker < 0 || start < 0 || end < 0) {
    throw new Error("Broadcast fulfilment log patch boundary was not found.");
  }
  source = source.slice(0, start)
    + '            logger.info(\\n'
    + '              "[BroadcastMinutes] " + (fulfilled.credited ? "Credited" : "Already fulfilled")\\n'
    + '                + ": user=" + userId + " pack=" + fulfilled.pack.id\\n'
    + '                + " minutes=" + fulfilled.minutes + " session=" + session.id,\\n'
    + '            );'
    + source.slice(end + "\\n            );".length);
}

// Normalize doubled escapes used to represent nested TypeScript literals.
source = source
  .replaceAll("\\\\`", "\\`")
  .replaceAll("\\\\${", "\\${")
  .replace("  BROADCAST_MINUTE_PACKS,\n", "")
  .replace('    const managed = input.serviceMode !== "direct";\n', "");

function normalizeGeneratedTemplate(name) {
  const declaration = `  const ${name} = String.raw`;
  const start = source.indexOf(declaration);
  if (start < 0) throw new Error(`Generated template not found: ${name}`);
  const open = source.indexOf("`", start + declaration.length);
  const nextPatch = source.indexOf("\n\n  content = replaceBetween(", open + 1);
  if (open < 0 || nextPatch < 0) throw new Error(`Generated template boundary not found: ${name}`);
  const close = source.lastIndexOf("`;", nextPatch);
  if (close < open) throw new Error(`Generated template closing delimiter not found: ${name}`);

  let body = source.slice(open + 1, close);
  body = body
    .replace(/(?<!\\)`/g, "\\`")
    .replace(/(?<!\\)\$\{/g, "\\${");

  source = source.slice(0, start)
    + `  const ${name} = \``
    + body
    + "`;"
    + source.slice(close + 2);
}

normalizeGeneratedTemplate("newBroadcastBlock");
normalizeGeneratedTemplate("validationReplacement");
normalizeGeneratedTemplate("submitReplacement");
normalizeGeneratedTemplate("broadcastCard");

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
if (executed.status !== 0) process.exit(executed.status ?? 1);

console.log("One-time source integration completed.");
