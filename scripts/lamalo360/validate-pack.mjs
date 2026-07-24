import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

function parseArgs(argv) {
  const args = { pack: undefined, requireVisualApproval: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--pack") args.pack = path.resolve(argv[++i]);
    else if (argv[i] === "--require-visual-approval") args.requireVisualApproval = true;
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.pack) throw new Error("Provide --pack <turntable-pack.json>.");
  return args;
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function validateGlb(filePath) {
  const bytes = fs.readFileSync(filePath);
  if (bytes.length < 10_000 || bytes.subarray(0, 4).toString("ascii") !== "glTF") {
    throw new Error("Clean master is not a non-empty GLB 2.0 file.");
  }
  let validator;
  try {
    validator = await import("gltf-validator");
  } catch {
    throw new Error("gltf-validator is required. Run pnpm install before validation.");
  }
  const report = await validator.validateBytes(new Uint8Array(bytes), {
    uri: path.basename(filePath),
    maxIssues: 200,
    externalResourceFunction: async () => new Uint8Array(),
  });
  const errors = report.issues?.numErrors ?? 0;
  if (errors > 0) {
    const messages = (report.issues?.messages ?? [])
      .filter((message) => message.severity === 0)
      .slice(0, 10)
      .map((message) => `${message.code}: ${message.message}`)
      .join("; ");
    throw new Error(`glTF validation failed with ${errors} errors: ${messages}`);
  }
  return {
    sha256: sha256(bytes),
    bytes: bytes.length,
    errors,
    warnings: report.issues?.numWarnings ?? 0,
    infos: report.issues?.numInfos ?? 0,
    hints: report.issues?.numHints ?? 0,
  };
}

async function validateFrame(filePath, expectedResolution) {
  const buffer = fs.readFileSync(filePath);
  const image = sharp(buffer, { failOn: "error" });
  const metadata = await image.metadata();
  if (metadata.width !== expectedResolution || metadata.height !== expectedResolution) {
    throw new Error(`${path.basename(filePath)} is ${metadata.width}x${metadata.height}; expected ${expectedResolution}x${expectedResolution}.`);
  }
  if (buffer.length < 35_000) throw new Error(`${path.basename(filePath)} is suspiciously small.`);
  const stats = await image.stats();
  const entropy = await image.clone().greyscale().stats().then((value) => value.entropy ?? 0);
  if (entropy < 1.1) throw new Error(`${path.basename(filePath)} has insufficient visual information.`);
  const channels = stats.channels.map((channel) => ({ min: channel.min, max: channel.max, mean: channel.mean }));
  return {
    file: path.basename(filePath),
    sha256: sha256(buffer),
    bytes: buffer.length,
    width: metadata.width,
    height: metadata.height,
    entropy,
    channels,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const packPath = args.pack;
  const packDir = path.dirname(packPath);
  const pack = JSON.parse(fs.readFileSync(packPath, "utf8"));
  const errors = [];
  const requiredAngles = [45, 0, 180, 90];

  if (pack.frameCount !== 36 || pack.frames?.length !== 36) errors.push("Exactly 36 turntable frames are required.");
  if (pack.angleStepDegrees !== 10) errors.push("Turntable step must be 10 degrees.");
  if (pack.sameGeometryEveryFrame !== true) errors.push("Pack must declare one immutable geometry source for all frames.");
  const firstAngles = (pack.frames ?? []).slice(0, 4).map((frame) => frame.angleDegrees);
  if (JSON.stringify(firstAngles) !== JSON.stringify(requiredAngles)) {
    errors.push(`Canonical first angles must be ${requiredAngles.join(", ")}.`);
  }
  const angleSet = new Set((pack.frames ?? []).map((frame) => frame.angleDegrees));
  if (angleSet.size !== 36) errors.push("Turntable contains duplicate or missing angles.");
  for (let angle = 0; angle < 360; angle += 10) {
    if (!angleSet.has(angle)) errors.push(`Missing ${angle} degree frame.`);
  }

  const frameReports = [];
  const hashes = new Set();
  for (const frame of pack.frames ?? []) {
    const filePath = path.join(packDir, frame.file);
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing frame ${frame.file}.`);
      continue;
    }
    try {
      const report = await validateFrame(filePath, pack.resolution);
      if (hashes.has(report.sha256)) errors.push(`Duplicate rendered image detected: ${frame.file}.`);
      hashes.add(report.sha256);
      if (frame.sha256 && frame.sha256 !== report.sha256) errors.push(`Checksum mismatch for ${frame.file}.`);
      frameReports.push(report);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  let glbReport;
  const glbPath = path.join(packDir, pack.cleanGlb ?? "master-clean.glb");
  try {
    glbReport = await validateGlb(glbPath);
    if (pack.cleanGlbSha256 && pack.cleanGlbSha256 !== glbReport.sha256) errors.push("Clean GLB checksum mismatch.");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const approvalPath = path.join(packDir, "visual-approval.json");
  let visualApproval = null;
  if (fs.existsSync(approvalPath)) {
    visualApproval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
  }
  if (args.requireVisualApproval && visualApproval?.status !== "approved") {
    errors.push("Visual approval is required before publication.");
  }

  const report = {
    schemaVersion: 2,
    masterKey: pack.masterKey,
    baseName: pack.baseName,
    validatedAt: new Date().toISOString(),
    status: errors.length ? "failed" : visualApproval?.status === "approved" ? "approved" : "machine_validated",
    frameCount: frameReports.length,
    uniqueFrameCount: hashes.size,
    resolution: pack.resolution,
    glb: glbReport ?? null,
    visualApproval,
    errors,
  };
  fs.writeFileSync(path.join(packDir, "quality-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  if (errors.length) throw new Error(`Lamalo 360 quality gate failed:\n- ${errors.join("\n- ")}`);
  console.log(path.join(packDir, "quality-report.json"));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
