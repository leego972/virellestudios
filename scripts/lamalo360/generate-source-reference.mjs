import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "docs/lamalo-clothing-360-production.json");
const WORK_ROOT = path.resolve(process.env.LAMALO360_WORK_ROOT ?? path.join(ROOT, ".lamalo360"));

function parseArgs(argv) {
  const args = { ordinal: undefined, key: undefined, force: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--ordinal") args.ordinal = Number(argv[++i]);
    else if (argv[i] === "--key") args.key = argv[++i];
    else if (argv[i] === "--force") args.force = true;
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.ordinal && !args.key) throw new Error("Provide --ordinal or --key.");
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const master = args.key
    ? manifest.masters.find((entry) => entry.masterKey === args.key)
    : manifest.masters.find((entry) => entry.ordinal === args.ordinal);
  if (!master) throw new Error("Lamalo clothing master was not found.");

  const outputDir = path.join(WORK_ROOT, master.masterKey.replaceAll(":", "__"));
  const imagePath = path.join(outputDir, "source-reference.png");
  const metadataPath = path.join(outputDir, "source-reference.json");
  fs.mkdirSync(outputDir, { recursive: true });

  const python = process.env.LAMALO_PYTHON_BIN || "python";
  const command = [
    "scripts/lamalo360/free/flux_generate.py",
    "--mode", "source",
    "--ordinal", String(master.ordinal),
    "--output", imagePath,
    "--metadata", metadataPath,
    ...(args.force ? ["--force"] : []),
  ];
  const result = spawnSync(python, command, { cwd: ROOT, env: process.env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Local FLUX source generation exited with ${result.status}.`);
  console.log(imagePath);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
}
