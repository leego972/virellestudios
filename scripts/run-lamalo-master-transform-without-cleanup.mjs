import fs from "node:fs";

const unlinkSync = fs.unlinkSync.bind(fs);
fs.unlinkSync = (path) => {
  const normalized = String(path).replaceAll("\\", "/");
  if (
    normalized.endsWith("scripts/apply-lamalo-master-360-variants.mjs") ||
    normalized.endsWith(".github/workflows/apply-lamalo-master-360-variants.yml")
  ) {
    return;
  }
  return unlinkSync(path);
};

await import("./apply-lamalo-master-360-variants.mjs");
