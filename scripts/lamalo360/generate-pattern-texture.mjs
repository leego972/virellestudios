import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import OpenAI from "openai";
import { colourKey, patternPrompt } from "./colours.mjs";

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

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function main() {
  const args = parseArgs(process.argv);
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required on the private render worker.");
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
  if (!args.force && fs.existsSync(imagePath) && fs.existsSync(metadataPath)) {
    console.log(imagePath);
    return;
  }

  const model = process.env.LAMALO_TEXTURE_IMAGE_MODEL ?? "gpt-image-1.5";
  const prompt = patternPrompt(args.colour, master);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.images.generate({
    model,
    prompt,
    size: "1024x1024",
    quality: "high",
    background: "opaque",
    output_format: "png",
    n: 1,
  });
  const encoded = response.data?.[0]?.b64_json;
  if (!encoded) throw new Error("Texture generator returned no image.");
  const image = Buffer.from(encoded, "base64");
  fs.writeFileSync(imagePath, image);
  fs.writeFileSync(metadataPath, `${JSON.stringify({
    masterKey: master.masterKey,
    baseName: master.baseName,
    colour: args.colour,
    colourKey: key,
    provider: "openai",
    model,
    prompt,
    sha256: sha256(image),
    createdAt: new Date().toISOString(),
    status: "generated",
  }, null, 2)}\n`);
  console.log(imagePath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
