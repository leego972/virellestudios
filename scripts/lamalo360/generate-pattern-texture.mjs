import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { colourKey } from "./colours.mjs";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "docs/lamalo-clothing-360-production.json");
const WORK_ROOT = path.resolve(process.env.LAMALO360_WORK_ROOT ?? path.join(ROOT, ".lamalo360"));

function parseArgs(argv) {
  const args = { ordinal: undefined, colour: undefined, force: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--ordinal") args.ordinal = Number(argv[++i]);
    else if (argv[i] === "--colour") args.colour = argv[++i];
    else if (argv[i] === "--force") args.force = true;
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.ordinal || !args.colour) throw new Error("Provide --ordinal and --colour.");
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const master = manifest.masters.find((entry) => entry.ordinal === args.ordinal);
  if (!master) throw new Error(`Master ordinal ${args.ordinal} was not found.`);
  const colour = master.colours.find((entry) => entry.name === args.colour);
  if (!colour) throw new Error(`Colour ${args.colour} is not a SKU for ${master.baseName}.`);

  const outputDir = path.join(WORK_ROOT, master.masterKey.replaceAll(":", "__"), "textures");
  const key = colourKey(args.colour);
  const imagePath = path.join(outputDir, `${key}.png`);
  const metadataPath = path.join(outputDir, `${key}.json`);
  fs.mkdirSync(outputDir, { recursive: true });

  const python = process.env.LAMALO_PYTHON_BIN || "python";
  const result = spawnSync(python, [
    "scripts/lamalo360/free/flux_generate.py",
    "--mode", "texture",
    "--ordinal", String(master.ordinal),
    "--colour", args.colour,
    "--output", imagePath,
    "--metadata", metadataPath,
    ...(args.force ? ["--force"] : []),
  ], { cwd: ROOT, env: process.env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Local FLUX texture generation exited with ${result.status}.`);
  console.log(imagePath);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
}
