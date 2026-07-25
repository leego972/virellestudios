import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function text(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function gitBlobSha(relativePath: string): string {
  const payload = fs.readFileSync(path.join(ROOT, relativePath));
  return crypto
    .createHash("sha1")
    .update(Buffer.from(`blob ${payload.length}\0`))
    .update(payload)
    .digest("hex");
}

describe("Virelle and Lamalo brand integrity", () => {
  it("keeps the approved Virelle logo binary unchanged", () => {
    expect(gitBlobSha("client/public/virelle-logo-square.png")).toBe("534a3c52e070a635e1e3f9e5b27514991cdfe000");
  });

  it("keeps the approved Lamalo logo binary unchanged", () => {
    expect(gitBlobSha("client/public/lamalo/lamalo-logo.png")).toBe("906a5bf24d6856c536460f500f6a66b64ca2db5e");
  });

  it("does not visually filter or recolour supplied logos", () => {
    const css = text("client/src/hollywood-system.css");
    expect(css).toContain('img[src*="virelle-logo"]');
    expect(css).toContain('img[src*="lamalo-logo"]');
    expect(css).toContain("filter: none !important");
    expect(css).toContain("mix-blend-mode: normal !important");
  });
});

describe("designer garment upload UI", () => {
  it("uses the branded Hollywood icon system instead of Lucide icons", () => {
    for (const file of [
      "client/src/components/DesignerCommercePanel.tsx",
      "client/src/components/DesignerGarmentUploadForm.tsx",
      "client/src/components/Lamalo360Viewer.tsx",
    ]) {
      const source = text(file);
      expect(source).toContain("HollywoodIcon");
      expect(source).not.toContain("lucide-react");
    }
  });

  it("offers simple photo and short 360 video capture choices", () => {
    const source = text("client/src/components/DesignerGarmentUploadForm.tsx");
    expect(source).toContain("3–6 quick photos");
    expect(source).toContain("Front photo + short 360° video");
    expect(source).toContain("8–20 second 360° mannequin video");
    expect(source).toContain("Phone photos are sufficient");
  });

  it("shows one customer image and describes the technical pack as hidden", () => {
    const viewer = text("client/src/components/Lamalo360Viewer.tsx");
    const panel = text("client/src/components/DesignerCommercePanel.tsx");
    expect(viewer).toContain("one clean product image");
    expect(viewer).not.toContain("Drag to rotate");
    expect(panel).toContain("The technical asset pack remains private");
  });
});

describe("designer ingestion backend contract", () => {
  it("keeps public shop images separate from hidden continuity references", () => {
    const source = text("server/designer-garment-ingestion-router.ts");
    expect(source).toContain('addColumn("wardrobeItems", "continuityImageUrls", "JSON NULL")');
    expect(source).toContain("imageUrls = CAST(${JSON.stringify([input.shopImageUrl])} AS JSON)");
    expect(source).toContain("continuityImageUrls = CAST(${JSON.stringify(input.continuityImageUrls)} AS JSON)");
    expect(source).toContain("Exactly 12 or 24 continuity references are required.");
    expect(source).toContain("verificationFrameUrls: z.array(HTTPS_URL).length(36)");
  });

  it("keeps queued garments private until the generation pack is approved", () => {
    const source = text("server/designer-garment-ingestion-router.ts");
    expect(source).toContain("status = 'processing', visibility = 'private'");
    expect(source).toContain("characterWardrobeAllowed = 0");
    expect(source).toContain('generationReadinessStatus = \'ready\'');
  });

  it("allows the ingestion namespace only through designer-protected routing", () => {
    const access = text("server/_core/portalAccess.ts");
    expect(access.match(/wardrobeMarket\.commerce\.garmentIngestion\./g)?.length).toBe(2);
  });
});

describe("free Kaggle execution contract", () => {
  it("generates the full catalogue without infrastructure secrets", () => {
    const notebook = text("notebooks/lamalo-free-360-kaggle.ipynb");
    expect(notebook).toContain("COUNT = 149");
    expect(notebook).toContain("--skip-publish");
    expect(notebook).toContain("lamalo-collection");
    expect(notebook).not.toContain("DATABASE_URL");
    expect(notebook).not.toContain("AWS_ACCESS_KEY_ID");
    expect(notebook).not.toContain("AWS_SECRET_ACCESS_KEY");
    expect(notebook).not.toContain("PUBLISH = True");
  });
});
