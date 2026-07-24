import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import OpenAI from "openai";

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

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function selectMaster(manifest, args) {
  const master = args.key
    ? manifest.masters.find((entry) => entry.masterKey === args.key)
    : manifest.masters.find((entry) => entry.ordinal === args.ordinal);
  if (!master) throw new Error("Lamalo clothing master was not found.");
  return master;
}

function buildPrompt(master) {
  const materials = master.materials?.length ? master.materials.join(", ") : "production-accurate fabric";
  return [
    `Create the definitive product reference for ${master.baseName}.`,
    master.referencePrompt,
    `Materials: ${materials}.`,
    "One complete garment only, fully visible from hem to collar, centred and not cropped.",
    "Front three-quarter view with enough side visibility for image-to-3D reconstruction.",
    "Neutral medium-grey colourway with no logos, text, branding, model, mannequin, hanger, rack, body, hands or props.",
    "Photorealistic high-end apparel product photography on a neutral warm-grey seamless studio background.",
    "Construction must be physically plausible and explicit: accurate seams, hems, pockets, closures, cuffs, waistbands, lining edges, panel joins and fabric thickness.",
    "Avoid dramatic folds, wind, motion, asymmetrical posing and perspective distortion. Keep the garment naturally supported as an invisible form while showing no body or mannequin.",
    "This image is the immutable geometry reference for a production 3D asset, so prioritise clean silhouette, exact proportions and unambiguous construction over styling.",
  ].filter(Boolean).join(" ");
}

async function main() {
  const args = parseArgs(process.argv);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const master = selectMaster(manifest, args);
  const outputDir = path.join(WORK_ROOT, master.masterKey.replaceAll(":", "__"));
  const imagePath = path.join(outputDir, "source-reference.png");
  const metadataPath = path.join(outputDir, "source-reference.json");
  fs.mkdirSync(outputDir, { recursive: true });

  if (!args.force && fs.existsSync(imagePath) && fs.existsSync(metadataPath)) {
    console.log(imagePath);
    return;
  }

  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required on the private GPU worker.");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.LAMALO_SOURCE_IMAGE_MODEL ?? "gpt-image-1.5";
  const prompt = buildPrompt(master);
  const response = await client.images.generate({
    model,
    prompt,
    size: "1024x1536",
    quality: "high",
    background: "opaque",
    output_format: "png",
    n: 1,
  });
  const encoded = response.data?.[0]?.b64_json;
  if (!encoded) throw new Error("The image provider returned no base64 image.");
  const image = Buffer.from(encoded, "base64");
  fs.writeFileSync(imagePath, image);
  fs.writeFileSync(metadataPath, `${JSON.stringify({
    masterKey: master.masterKey,
    ordinal: master.ordinal,
    baseName: master.baseName,
    provider: "openai",
    model,
    prompt,
    createdAt: new Date().toISOString(),
    sha256: sha256(image),
    status: "awaiting_visual_approval",
  }, null, 2)}\n`);
  console.log(imagePath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
