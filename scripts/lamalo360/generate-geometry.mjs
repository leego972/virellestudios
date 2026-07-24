import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "docs/lamalo-clothing-360-production.json");
const WORK_ROOT = path.resolve(process.env.LAMALO360_WORK_ROOT ?? path.join(ROOT, ".lamalo360"));
const API_ROOT = String(process.env.MESHY_API_URL ?? "https://api.meshy.ai/openapi/v1").replace(/\/$/, "");

function parseArgs(argv) {
  const args = { ordinal: undefined, key: undefined, force: false, timeoutMinutes: 45 };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--ordinal") args.ordinal = Number(argv[++i]);
    else if (argv[i] === "--key") args.key = argv[++i];
    else if (argv[i] === "--force") args.force = true;
    else if (argv[i] === "--timeout-minutes") args.timeoutMinutes = Math.max(5, Number(argv[++i]));
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.ordinal && !args.key) throw new Error("Provide --ordinal or --key.");
  return args;
}

function selectMaster(manifest, args) {
  const master = args.key
    ? manifest.masters.find((entry) => entry.masterKey === args.key)
    : manifest.masters.find((entry) => entry.ordinal === args.ordinal);
  if (!master) throw new Error("Lamalo clothing master was not found.");
  return master;
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiRequest(pathname, options = {}) {
  if (!process.env.MESHY_API_KEY) throw new Error("MESHY_API_KEY is required on the private production worker.");
  const response = await fetch(`${API_ROOT}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.MESHY_API_KEY}`,
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Meshy ${response.status}: ${body.slice(0, 1_000)}`);
  }
  return response.json();
}

async function createTask(image, master) {
  const model = process.env.MESHY_IMAGE_TO_3D_MODEL ?? "meshy-6";
  const targetPolycount = Number(process.env.LAMALO360_TARGET_POLYCOUNT ?? 100_000);
  const payload = {
    image_url: `data:image/png;base64,${image.toString("base64")}`,
    ai_model: model,
    model_type: "standard",
    enable_pbr: true,
    should_texture: true,
    should_remesh: true,
    topology: "triangle",
    target_polycount: targetPolycount,
    target_formats: ["glb"],
    texture_prompt: [
      `Neutral medium-grey physically based material for ${master.baseName}.`,
      `Preserve the construction and material character of ${(master.materials ?? []).join(", ") || "the garment"}.`,
      "No logo, text, print, branding, dirt, damage or decorative pattern.",
      "Clean high-end product asset with realistic roughness and fabric microdetail.",
    ].join(" ").slice(0, 600),
  };
  const created = await apiRequest("/image-to-3d", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const taskId = created.result ?? created.id;
  if (!taskId) throw new Error("Meshy did not return an image-to-3D task ID.");
  return { taskId, model, targetPolycount };
}

async function waitForTask(taskId, timeoutMinutes) {
  const deadline = Date.now() + timeoutMinutes * 60_000;
  let lastProgress = -1;
  while (Date.now() < deadline) {
    const task = await apiRequest(`/image-to-3d/${encodeURIComponent(taskId)}`);
    const status = String(task.status ?? "").toUpperCase();
    const progress = Number(task.progress ?? 0);
    if (progress !== lastProgress) {
      console.log(`Meshy task ${taskId}: ${status || "PENDING"} ${progress}%`);
      lastProgress = progress;
    }
    if (status === "SUCCEEDED") {
      const glbUrl = task.model_urls?.glb;
      if (!glbUrl) throw new Error("Meshy task succeeded without a GLB URL.");
      return { task, glbUrl };
    }
    if (["FAILED", "CANCELED", "CANCELLED", "EXPIRED"].includes(status)) {
      throw new Error(`Meshy task ${taskId} ${status}: ${task.task_error?.message ?? "unknown error"}`);
    }
    await delay(10_000);
  }
  throw new Error(`Meshy task ${taskId} exceeded ${timeoutMinutes} minutes.`);
}

async function downloadGlb(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10 * 60_000) });
  if (!response.ok) throw new Error(`Could not download Meshy GLB (${response.status}).`);
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const args = parseArgs(process.argv);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const master = selectMaster(manifest, args);
  const outputDir = path.join(WORK_ROOT, master.masterKey.replaceAll(":", "__"));
  const sourcePath = path.join(outputDir, "source-reference.png");
  const sourceMetadataPath = path.join(outputDir, "source-reference.json");
  const modelPath = path.join(outputDir, "master-raw.glb");
  const metadataPath = path.join(outputDir, "geometry.json");
  fs.mkdirSync(outputDir, { recursive: true });

  if (!fs.existsSync(sourcePath) || !fs.existsSync(sourceMetadataPath)) {
    throw new Error(`Missing approved source reference for ${master.baseName}. Run lamalo360:source first.`);
  }
  const sourceMetadata = JSON.parse(fs.readFileSync(sourceMetadataPath, "utf8"));
  if (sourceMetadata.status !== "approved") throw new Error(`Source reference for ${master.baseName} is not approved.`);
  if (!args.force && fs.existsSync(modelPath) && fs.existsSync(metadataPath)) {
    const existing = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    if (["awaiting_cleanup_and_validation", "approved"].includes(existing.status)) {
      console.log(modelPath);
      return;
    }
  }

  const image = fs.readFileSync(sourcePath);
  const createdAt = new Date().toISOString();
  const { taskId, model, targetPolycount } = await createTask(image, master);
  fs.writeFileSync(metadataPath, `${JSON.stringify({
    masterKey: master.masterKey,
    ordinal: master.ordinal,
    baseName: master.baseName,
    provider: "Meshy",
    model,
    targetPolycount,
    taskId,
    sourceReferenceSha256: sha256(image),
    createdAt,
    status: "processing",
  }, null, 2)}\n`);

  const { task, glbUrl } = await waitForTask(taskId, args.timeoutMinutes);
  const glb = await downloadGlb(glbUrl);
  if (glb.length < 10_000 || glb.subarray(0, 4).toString("ascii") !== "glTF") {
    throw new Error("Generated geometry is not a valid non-empty GLB payload.");
  }
  fs.writeFileSync(modelPath, glb);
  fs.writeFileSync(metadataPath, `${JSON.stringify({
    masterKey: master.masterKey,
    ordinal: master.ordinal,
    baseName: master.baseName,
    provider: "Meshy",
    model,
    targetPolycount,
    taskId,
    sourceReferenceSha256: sha256(image),
    glbSha256: sha256(glb),
    glbBytes: glb.length,
    thumbnailUrl: task.thumbnail_url ?? null,
    createdAt,
    completedAt: new Date().toISOString(),
    status: "awaiting_cleanup_and_validation",
  }, null, 2)}\n`);
  console.log(modelPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
