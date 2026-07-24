import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { colourHex, colourKey, requiresGeneratedTexture } from "./colours.mjs";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "docs/lamalo-clothing-360-production.json");
const WORK_ROOT = path.resolve(process.env.LAMALO360_WORK_ROOT ?? path.join(ROOT, ".lamalo360"));
const BLENDER = process.env.BLENDER_BIN ?? "blender";

function parseArgs(argv) {
  const args = { ordinal: undefined, force: false, skipPublish: false, maxColours: undefined };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--ordinal") args.ordinal = Number(argv[++i]);
    else if (argv[i] === "--force") args.force = true;
    else if (argv[i] === "--skip-publish") args.skipPublish = true;
    else if (argv[i] === "--max-colours") args.maxColours = Math.max(1, Number(argv[++i]));
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.ordinal) throw new Error("Provide --ordinal.");
  return args;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: process.env,
      stdio: "inherit",
      ...options,
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function updateState(statePath, patch) {
  const current = fs.existsSync(statePath) ? readJson(statePath) : {};
  writeJson(statePath, { ...current, ...patch, updatedAt: new Date().toISOString() });
}

async function ensureApprovedSource(master, masterDir, force) {
  const sourcePath = path.join(masterDir, "source-reference.png");
  const metadataPath = path.join(masterDir, "source-reference.json");
  if (!force && fs.existsSync(metadataPath) && readJson(metadataPath).status === "approved") return;
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      await run(process.execPath, [
        "scripts/lamalo360/generate-source-reference.mjs",
        "--ordinal", String(master.ordinal),
        ...(attempt > 1 || force ? ["--force"] : []),
      ]);
      await run(process.execPath, [
        "scripts/lamalo360/review-source-reference.mjs",
        "--image", sourcePath,
        "--metadata", metadataPath,
      ]);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error(`Could not approve source reference for ${master.baseName}.`);
}

async function ensureGeometry(master, masterDir, force) {
  const modelPath = path.join(masterDir, "master-raw.glb");
  const metadataPath = path.join(masterDir, "geometry.json");
  if (!force && fs.existsSync(modelPath) && fs.existsSync(metadataPath)) return;
  await run(process.execPath, [
    "scripts/lamalo360/generate-geometry.mjs",
    "--ordinal", String(master.ordinal),
    ...(force ? ["--force"] : []),
  ]);
}

async function renderColour(master, masterDir, colour, force) {
  const key = colourKey(colour.name);
  const outputDir = path.join(masterDir, "variants", key);
  const approvalPath = path.join(outputDir, "visual-approval.json");
  const qualityPath = path.join(outputDir, "quality-report.json");
  if (!force && fs.existsSync(approvalPath) && fs.existsSync(qualityPath)) {
    const approval = readJson(approvalPath);
    const quality = readJson(qualityPath);
    if (approval.status === "approved" && quality.status === "approved") return;
  }
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const renderArgs = [
    "--background",
    "--python", "scripts/lamalo360/blender/render_turntable.py",
    "--",
    "--input", path.join(masterDir, "master-raw.glb"),
    "--output-dir", outputDir,
    "--name", master.baseName,
    "--master-key", master.masterKey,
    "--frames", "36",
    "--resolution", String(master.renderResolution ?? 2048),
    "--samples", String(process.env.LAMALO360_CYCLES_SAMPLES ?? 256),
    "--colour-name", colour.name,
  ];

  if (requiresGeneratedTexture(colour.name)) {
    await run(process.execPath, [
      "scripts/lamalo360/generate-pattern-texture.mjs",
      "--ordinal", String(master.ordinal),
      "--colour", colour.name,
      ...(force ? ["--force"] : []),
    ]);
    renderArgs.push("--texture", path.join(masterDir, "textures", `${key}.png`));
  } else {
    renderArgs.push("--colour", colourHex(colour.name));
  }

  await run(BLENDER, renderArgs);
  const packPath = path.join(outputDir, "turntable-pack.json");
  await run(process.execPath, ["scripts/lamalo360/review-turntable.mjs", "--pack", packPath]);
  await run(process.execPath, ["scripts/lamalo360/validate-pack.mjs", "--pack", packPath, "--require-visual-approval"]);
}

async function main() {
  const args = parseArgs(process.argv);
  const manifest = readJson(MANIFEST_PATH);
  const master = manifest.masters.find((entry) => entry.ordinal === args.ordinal);
  if (!master) throw new Error(`Master ordinal ${args.ordinal} was not found.`);
  const masterDir = path.join(WORK_ROOT, master.masterKey.replaceAll(":", "__"));
  const statePath = path.join(masterDir, "state.json");
  fs.mkdirSync(masterDir, { recursive: true });
  updateState(statePath, {
    masterKey: master.masterKey,
    ordinal: master.ordinal,
    baseName: master.baseName,
    status: "processing",
    startedAt: new Date().toISOString(),
  });

  try {
    await ensureApprovedSource(master, masterDir, args.force);
    updateState(statePath, { sourceReferenceStatus: "approved" });
    await ensureGeometry(master, masterDir, args.force);
    updateState(statePath, { geometryStatus: "generated" });

    const colours = args.maxColours ? master.colours.slice(0, args.maxColours) : master.colours;
    for (let index = 0; index < colours.length; index += 1) {
      const colour = colours[index];
      updateState(statePath, {
        currentColour: colour.name,
        colourProgress: `${index + 1}/${colours.length}`,
      });
      await renderColour(master, masterDir, colour, args.force);
    }
    updateState(statePath, { turntableStatus: "approved", currentColour: null });

    if (!args.skipPublish) {
      await run("pnpm", ["tsx", "scripts/lamalo360/publish-pack.ts", "--ordinal", String(master.ordinal)]);
    }
    updateState(statePath, {
      status: args.skipPublish ? "approved_not_published" : "published",
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    updateState(statePath, {
      status: "failed",
      error: error instanceof Error ? error.stack ?? error.message : String(error),
    });
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
