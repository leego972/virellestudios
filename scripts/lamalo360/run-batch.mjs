import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "docs/lamalo-clothing-360-production.json");

function parseArgs(argv) {
  const args = {
    parity: "all",
    count: 1,
    start: 1,
    force: false,
    retryFailed: false,
    skipPublish: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--parity") args.parity = argv[++i];
    else if (argv[i] === "--count") args.count = Math.max(1, Number(argv[++i]));
    else if (argv[i] === "--start") args.start = Math.max(1, Number(argv[++i]));
    else if (argv[i] === "--force") args.force = true;
    else if (argv[i] === "--retry-failed") args.retryFailed = true;
    else if (argv[i] === "--skip-publish") args.skipPublish = true;
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!["odd", "even", "all"].includes(args.parity)) throw new Error("--parity must be odd, even or all.");
  return args;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, env: process.env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

function readManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

function writeManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function main() {
  const args = parseArgs(process.argv);
  const initial = readManifest();
  const selected = initial.masters
    .filter((master) => master.ordinal >= args.start)
    .filter((master) => args.parity === "all" || (args.parity === "odd" ? master.ordinal % 2 === 1 : master.ordinal % 2 === 0))
    .filter((master) => master.status === "queued" || master.status === "approved_not_published" || (args.retryFailed && master.status === "failed"))
    .slice(0, args.count);

  if (!selected.length) {
    console.log("No matching Lamalo clothing masters are queued.");
    return;
  }

  const results = [];
  for (const master of selected) {
    try {
      await run(process.execPath, [
        "scripts/lamalo360/run-master.mjs",
        "--ordinal", String(master.ordinal),
        ...(args.force ? ["--force"] : []),
        ...(args.skipPublish ? ["--skip-publish"] : []),
      ]);
      results.push({
        ordinal: master.ordinal,
        masterKey: master.masterKey,
        status: args.skipPublish ? "approved_not_published" : "published",
      });
    } catch (error) {
      const manifest = readManifest();
      const current = manifest.masters.find((entry) => entry.ordinal === master.ordinal);
      if (current) {
        current.status = "failed";
        current.lastError = error instanceof Error ? error.stack ?? error.message : String(error);
        current.failedAt = new Date().toISOString();
      }
      manifest.summary.failedBaseDesigns = manifest.masters.filter((entry) => entry.status === "failed").length;
      manifest.updatedAt = new Date().toISOString();
      writeManifest(manifest);
      results.push({ ordinal: master.ordinal, masterKey: master.masterKey, status: "failed", error: current?.lastError });
    }
  }

  const failed = results.filter((result) => result.status === "failed");
  console.log(JSON.stringify({
    selected: selected.length,
    completed: results.length - failed.length,
    published: args.skipPublish ? 0 : results.length - failed.length,
    approvedNotPublished: args.skipPublish ? results.length - failed.length : 0,
    failed: failed.length,
    results,
  }, null, 2));
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
