import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import { storagePut } from "../../server/storage";
import { applyLamaloMasterReferencePack } from "../../server/_core/lamaloMasterReferences";
import { colourHex, colourKey, requiresGeneratedTexture } from "./colours.mjs";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "docs/lamalo-clothing-360-production.json");
const WORK_ROOT = path.resolve(process.env.LAMALO360_WORK_ROOT ?? path.join(ROOT, ".lamalo360"));

function parseArgs(argv: string[]) {
  const args: { ordinal?: number } = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--ordinal") args.ordinal = Number(argv[++i]);
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.ordinal) throw new Error("Provide --ordinal.");
  return args as { ordinal: number };
}

function readJson<T = any>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function safePath(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

async function uploadFile(key: string, filePath: string, contentType: string): Promise<string> {
  const result = await storagePut(key, fs.readFileSync(filePath), contentType, { public: true });
  return result.url;
}

async function uploadViewerFrame(key: string, filePath: string): Promise<string> {
  const data = await sharp(filePath)
    .resize(1024, 1024, { fit: "contain", background: { r: 45, g: 44, b: 42, alpha: 1 } })
    .webp({ quality: 94, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toBuffer();
  const result = await storagePut(key, data, "image/webp", { public: true });
  return result.url;
}

async function main() {
  const args = parseArgs(process.argv);
  const manifest = readJson<any>(MANIFEST_PATH);
  const master = manifest.masters.find((entry: any) => entry.ordinal === args.ordinal);
  if (!master) throw new Error(`Master ordinal ${args.ordinal} was not found.`);
  const masterDir = path.join(WORK_ROOT, master.masterKey.replaceAll(":", "__"));
  const assetRoot = `lamalo360/v2/${safePath(master.masterKey)}`;

  const firstColour = master.colours[0];
  if (!firstColour) throw new Error(`${master.baseName} has no colour SKUs.`);
  const firstPackDir = path.join(masterDir, "variants", colourKey(firstColour.name));
  const sharedGlbPath = path.join(firstPackDir, "master-clean.glb");
  if (!fs.existsSync(sharedGlbPath)) throw new Error(`Missing cleaned GLB for ${master.baseName}.`);
  const model3dUrl = await uploadFile(`${assetRoot}/master/master.glb`, sharedGlbPath, "model/gltf-binary");

  const variantsByColourKey: Record<string, {
    turntableFrameUrls: string[];
    continuityImageUrls: string[];
    primaryImageUrl: string;
    solidColourHex?: string;
  }> = {};

  for (const colour of master.colours) {
    const key = colourKey(colour.name);
    const packDir = path.join(masterDir, "variants", key);
    const packPath = path.join(packDir, "turntable-pack.json");
    const qualityPath = path.join(packDir, "quality-report.json");
    const approvalPath = path.join(packDir, "visual-approval.json");
    if (!fs.existsSync(packPath) || !fs.existsSync(qualityPath) || !fs.existsSync(approvalPath)) {
      throw new Error(`Incomplete render pack for ${master.baseName} — ${colour.name}.`);
    }
    const pack = readJson<any>(packPath);
    const quality = readJson<any>(qualityPath);
    const approval = readJson<any>(approvalPath);
    if (quality.status !== "approved" || approval.status !== "approved" || pack.frames?.length !== 36) {
      throw new Error(`Unapproved render pack for ${master.baseName} — ${colour.name}.`);
    }

    const viewerUrls: string[] = [];
    const continuityUrls: string[] = [];
    for (let index = 0; index < pack.frames.length; index += 1) {
      const frame = pack.frames[index];
      const framePath = path.join(packDir, frame.file);
      const frameStem = `${String(index + 1).padStart(2, "0")}-${String(frame.angleDegrees).padStart(3, "0")}`;
      viewerUrls.push(await uploadViewerFrame(`${assetRoot}/variants/${key}/viewer/${frameStem}.webp`, framePath));
      if (index < master.continuityReferenceFrames) {
        continuityUrls.push(await uploadFile(`${assetRoot}/variants/${key}/references/${frameStem}.png`, framePath, "image/png"));
      }
    }

    await uploadFile(`${assetRoot}/variants/${key}/turntable-pack.json`, packPath, "application/json");
    await uploadFile(`${assetRoot}/variants/${key}/quality-report.json`, qualityPath, "application/json");
    await uploadFile(`${assetRoot}/variants/${key}/visual-approval.json`, approvalPath, "application/json");

    variantsByColourKey[key] = {
      turntableFrameUrls: viewerUrls,
      continuityImageUrls: continuityUrls,
      primaryImageUrl: viewerUrls[0],
      ...(!requiresGeneratedTexture(colour.name) ? { solidColourHex: colourHex(colour.name) } : {}),
    };
  }

  const applied = await applyLamaloMasterReferencePack({
    baseDesignName: master.baseName,
    masterReferenceKey: master.masterKey,
    model3dUrl,
    variantsByColourKey,
    genderFit: master.genderFit,
    category: master.category,
    subcategory: master.subcategory,
  });

  master.status = "published";
  master.sourceReferenceStatus = "approved";
  master.geometryStatus = "approved";
  master.pbrStatus = "approved";
  master.turntableStatus = "ready";
  master.qualityStatus = "approved";
  master.model3dUrl = model3dUrl;
  master.publishedAt = new Date().toISOString();
  master.publishedColourSkus = Object.keys(variantsByColourKey).length;
  master.updatedVariants = applied.updatedVariants;
  manifest.summary.completedBaseDesigns = manifest.masters.filter((entry: any) => entry.status === "published").length;
  manifest.summary.failedBaseDesigns = manifest.masters.filter((entry: any) => entry.status === "failed").length;
  manifest.updatedAt = new Date().toISOString();
  writeJson(MANIFEST_PATH, manifest);

  console.log(JSON.stringify({
    masterKey: master.masterKey,
    model3dUrl,
    colourSkus: Object.keys(variantsByColourKey).length,
    updatedVariants: applied.updatedVariants,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
