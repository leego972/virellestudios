import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("Lamalo free true-360 production contract", () => {
  it("uses local open models instead of paid generation APIs", () => {
    const production = [
      ".github/workflows/lamalo-clothing-360-production.yml",
      "scripts/lamalo360/generate-source-reference.mjs",
      "scripts/lamalo360/review-source-reference.mjs",
      "scripts/lamalo360/generate-geometry.mjs",
      "scripts/lamalo360/generate-pattern-texture.mjs",
      "scripts/lamalo360/review-turntable.mjs",
    ].map(read).join("\n");

    expect(production).not.toContain("OPENAI_API_KEY");
    expect(production).not.toContain("MESHY_API_KEY");
    expect(production).not.toContain("api.meshy.ai");
    expect(production).not.toContain("client.images.generate");
    expect(production).not.toContain("client.responses.create");

    expect(read("scripts/lamalo360/free/flux_generate.py")).toContain("black-forest-labs/FLUX.1-schnell");
    expect(read("scripts/lamalo360/free/local_visual_review.py")).toContain("Qwen/Qwen3-VL-4B-Instruct");
    expect(read("scripts/lamalo360/free/generate_geometry.py")).toContain("TRELLIS");
    expect(read("scripts/lamalo360/free/generate_geometry.py")).toContain("TripoSR");
  });

  it("keeps permanent GLB geometry, 36 frames and fail-closed publication", () => {
    const runner = read("scripts/lamalo360/run-master.mjs");
    const publisher = read("scripts/lamalo360/publish-pack.ts");
    const geometry = read("scripts/lamalo360/free/generate_geometry.py");

    expect(runner).toContain('"--frames", "36"');
    expect(runner).toContain("review-turntable.mjs");
    expect(runner).toContain("validate-pack.mjs");
    expect(publisher).toContain("pack.frames?.length !== 36");
    expect(publisher).toContain("applyLamaloMasterReferencePack");
    expect(geometry).toContain("master-raw.glb");
    expect(geometry).toContain("awaiting_cleanup_and_validation");
  });

  it("ships a free GPU notebook and resumable bootstrap", () => {
    const notebook = JSON.parse(read("notebooks/lamalo-free-360-kaggle.ipynb"));
    expect(notebook.nbformat).toBe(4);
    expect(notebook.cells.some((cell: any) => JSON.stringify(cell.source).includes("bootstrap_kaggle.sh"))).toBe(true);
    expect(read("scripts/lamalo360/free/bootstrap_kaggle.sh")).toContain("VAST-AI-Research/TripoSR");
    expect(read("scripts/lamalo360/free/bootstrap_kaggle.sh")).toContain("microsoft/TRELLIS");
  });
});
