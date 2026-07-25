import fs from "node:fs";

const cataloguePath = "scripts/lamalo360/catalogue.mjs";
const manifestPath = "docs/lamalo-clothing-360-production.json";

let catalogue = fs.readFileSync(cataloguePath, "utf8");
const replacements = new Map([
  ["version: 2,", "version: 3,"],
  ['sourceReference: "approved high-resolution isolated garment image",', 'sourceReference: "local FLUX.1-schnell isolated garment image approved by local Qwen3-VL",'],
  ['geometry: "Meshy 6 commercial image-to-3D PBR generation or an approved artist-authored replacement mesh",', 'geometry: "local Microsoft TRELLIS image-to-3D generation with TripoSR fallback or an approved artist-authored replacement mesh",'],
  ['material: "PBR material generation with physically based maps",', 'material: "deterministic Blender PBR materials; local FLUX textures only for patterned or multi-tone SKUs",'],
]);
for (const [before, after] of replacements) {
  if (!catalogue.includes(before)) throw new Error(`Catalogue metadata marker not found: ${before}`);
  catalogue = catalogue.replace(before, after);
}
fs.writeFileSync(cataloguePath, catalogue);

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.version = 3;
manifest.pipeline = {
  ...manifest.pipeline,
  sourceReference: "local FLUX.1-schnell isolated garment image approved by local Qwen3-VL",
  geometry: "local Microsoft TRELLIS image-to-3D generation with TripoSR fallback or an approved artist-authored replacement mesh",
  material: "deterministic Blender PBR materials; local FLUX textures only for patterned or multi-tone SKUs",
  generationCostPolicy: "no paid generation API; assets are generated once and retained permanently",
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log("Applied Lamalo free-pipeline metadata to compiler and manifest.");
