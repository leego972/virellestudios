import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "docs/lamalo-clothing-360-production.json");
const WORK_ROOT = path.resolve(process.env.LAMALO360_WORK_ROOT ?? path.join(ROOT, ".lamalo360"));
const ENDPOINT = String(process.env.HUNYUAN3D_URL ?? "http://127.0.0.1:8081").replace(/\/$/, "");

function parseArgs(argv) {
  const args = { ordinal: undefined, key: undefined, force: false, retries: 3 };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--ordinal") args.ordinal = Number(argv[++i]);
    else if (argv[i] === "--key") args.key = argv[++i];
    else if (argv[i] === "--force") args.force = true;
    else if (argv[i] === "--retries") args.retries = Math.max(1, Number(argv[++i]));
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

async function generate(endpoint, image, seed, retries) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(`${endpoint}/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          image: image.toString("base64"),
          texture: true,
          seed,
          type: "glb",
        }),
        signal: AbortSignal.timeout(45 * 60 * 1000),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Hunyuan3D ${response.status}: ${body.slice(0, 500)}`);
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("model/gltf-binary") && !contentType.includes("application/octet-stream")) {
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.subarray(0, 4).toString("ascii") !== "glTF") {
          throw new Error(`Hunyuan3D returned unexpected content type ${contentType || "unknown"}.`);
        }
        return bytes;
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < retries) await delay(2 ** attempt * 5_000);
    }
  }
  throw lastError;
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
  if (sourceMetadata.status !== "approved") {
    throw new Error(`Source reference for ${master.baseName} is not approved.`);
  }
  if (!args.force && fs.existsSync(modelPath) && fs.existsSync(metadataPath)) {
    console.log(modelPath);
    return;
  }

  const image = fs.readFileSync(sourcePath);
  const seed = Number.parseInt(sha256(Buffer.from(master.masterKey)).slice(0, 8), 16) >>> 0;
  const model = await generate(ENDPOINT, image, seed, args.retries);
  if (model.length < 10_000 || model.subarray(0, 4).toString("ascii") !== "glTF") {
    throw new Error("Generated geometry is not a valid non-empty GLB payload.");
  }
  fs.writeFileSync(modelPath, model);
  fs.writeFileSync(metadataPath, `${JSON.stringify({
    masterKey: master.masterKey,
    ordinal: master.ordinal,
    baseName: master.baseName,
    endpoint: ENDPOINT,
    provider: "Tencent Hunyuan3D 2.1",
    seed,
    sourceReferenceSha256: sha256(image),
    glbSha256: sha256(model),
    glbBytes: model.length,
    createdAt: new Date().toISOString(),
    status: "awaiting_cleanup_and_validation",
  }, null, 2)}\n`);
  console.log(modelPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
