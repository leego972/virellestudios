import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const productionFiles = [
  ".github/workflows/lamalo-clothing-360-production.yml",
  "scripts/lamalo360/generate-source-reference.mjs",
  "scripts/lamalo360/review-source-reference.mjs",
  "scripts/lamalo360/generate-geometry.mjs",
  "scripts/lamalo360/generate-pattern-texture.mjs",
  "scripts/lamalo360/review-turntable.mjs",
];
const requiredFiles = [
  "scripts/lamalo360/free/flux_generate.py",
  "scripts/lamalo360/free/local_visual_review.py",
  "scripts/lamalo360/free/generate_geometry.py",
  "scripts/lamalo360/free/bootstrap_kaggle.sh",
  "scripts/lamalo360/free/requirements.txt",
];
const forbidden = [
  /OPENAI_API_KEY/,
  /MESHY_API_KEY/,
  /api\.meshy\.ai/,
  /client\.images\.generate/,
  /client\.responses\.create/,
];

const failures = [];
for (const relative of requiredFiles) {
  if (!fs.existsSync(path.join(ROOT, relative))) failures.push(`Missing required free-pipeline file: ${relative}`);
}
for (const relative of productionFiles) {
  const absolute = path.join(ROOT, relative);
  if (!fs.existsSync(absolute)) {
    failures.push(`Missing production file: ${relative}`);
    continue;
  }
  const source = fs.readFileSync(absolute, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(source)) failures.push(`${relative} still contains forbidden paid-provider reference ${pattern}`);
  }
}

const geometry = fs.readFileSync(path.join(ROOT, "scripts/lamalo360/free/generate_geometry.py"), "utf8");
for (const required of ["TRELLIS", "TripoSR", "local-open-model", "glTF"]) {
  if (!geometry.includes(required)) failures.push(`Free geometry implementation is missing ${required}`);
}
const source = fs.readFileSync(path.join(ROOT, "scripts/lamalo360/free/flux_generate.py"), "utf8");
if (!source.includes("black-forest-labs/FLUX.1-schnell")) failures.push("FLUX.1-schnell is not the default local source model");
const review = fs.readFileSync(path.join(ROOT, "scripts/lamalo360/free/local_visual_review.py"), "utf8");
if (!review.includes("Qwen/Qwen3-VL-4B-Instruct")) failures.push("Qwen3-VL is not the default local visual reviewer");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Lamalo free true-360 contract verified: no paid generation API remains in the production path.");
