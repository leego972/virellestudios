import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

function compileManifest(): { directory: string; output: string; manifest: any } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lamalo360-catalogue-"));
  temporaryDirectories.push(directory);
  const output = path.join(directory, "manifest.json");
  execFileSync(process.execPath, ["scripts/lamalo360/catalogue.mjs", "--output", output], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
  return { directory, output, manifest: JSON.parse(fs.readFileSync(output, "utf8")) };
}

afterEach(() => {
  while (temporaryDirectories.length) {
    fs.rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe("Lamalo clothing true-360 catalogue", () => {
  it("freezes the current clothing-only production scope without merging colour SKUs", () => {
    const { manifest } = compileManifest();

    expect(manifest.summary.clothingBaseDesigns).toBe(149);
    expect(manifest.summary.separateColourSkus).toBe(1206);
    expect(manifest.masters).toHaveLength(149);
    expect(new Set(manifest.masters.map((master: any) => master.masterKey)).size).toBe(149);
    expect(manifest.masters.reduce((sum: number, master: any) => sum + master.colours.length, 0)).toBe(1206);

    expect(manifest.summary.excludedCollections).toEqual(expect.arrayContaining([
      "Lamalo Men's Footwear",
      "Lamalo Women's Footwear",
      "Lamalo Watches",
      "Lamalo Eyewear",
      "Lamalo Headwear",
      "Lamalo Bags & Handbags",
      "Lamalo Accessories",
      "Lamalo Kids' Footwear",
    ]));

    for (const master of manifest.masters) {
      expect(master.masterKey).toMatch(/^lamalo-clothing:/);
      expect(master.turntableFrames).toBe(36);
      expect([12, 24]).toContain(master.continuityReferenceFrames);
      expect(master.renderResolution).toBe(2048);
      expect(master.viewerResolution).toBe(1024);
      expect(master.colours.length).toBeGreaterThan(0);
      expect(new Set(master.colours.map((colour: any) => colour.key)).size).toBe(master.colours.length);
      expect(master.category).not.toBe("footwear");
    }
  });

  it("preserves approved production state when the source catalogue is recompiled", () => {
    const { output, manifest } = compileManifest();
    const first = manifest.masters[0];
    first.status = "published";
    first.sourceReferenceStatus = "approved";
    first.geometryStatus = "approved";
    first.pbrStatus = "approved";
    first.turntableStatus = "ready";
    first.qualityStatus = "approved";
    first.model3dUrl = "https://cdn.example.test/lamalo/master.glb";
    first.publishedColourSkus = first.colours.length;
    first.updatedVariants = first.colours.length;
    first.publishedAt = "2026-07-24T00:00:00.000Z";
    manifest.summary.completedBaseDesigns = 1;
    fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);

    execFileSync(process.execPath, ["scripts/lamalo360/catalogue.mjs", "--output", output], {
      cwd: process.cwd(),
      stdio: "pipe",
    });
    const recompiled = JSON.parse(fs.readFileSync(output, "utf8"));
    const preserved = recompiled.masters.find((master: any) => master.masterKey === first.masterKey);

    expect(preserved).toMatchObject({
      status: "published",
      sourceReferenceStatus: "approved",
      geometryStatus: "approved",
      pbrStatus: "approved",
      turntableStatus: "ready",
      qualityStatus: "approved",
      model3dUrl: "https://cdn.example.test/lamalo/master.glb",
      publishedColourSkus: first.colours.length,
      updatedVariants: first.colours.length,
      publishedAt: "2026-07-24T00:00:00.000Z",
    });
    expect(recompiled.summary.completedBaseDesigns).toBe(1);
    expect(recompiled.generatedAt).toBe(manifest.generatedAt);
  });
});
