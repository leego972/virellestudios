import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import OpenAI from "openai";
import sharp from "sharp";

function parseArgs(argv) {
  const args = { pack: undefined };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--pack") args.pack = path.resolve(argv[++i]);
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.pack) throw new Error("Provide --pack <turntable-pack.json>.");
  return args;
}

function extractJson(text) {
  const trimmed = String(text ?? "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Turntable reviewer returned no JSON object.");
    return JSON.parse(match[0]);
  }
}

async function buildContactSheet(pack, packDir) {
  const tile = 320;
  const columns = 6;
  const rows = 6;
  const composites = [];
  for (let index = 0; index < pack.frames.length; index += 1) {
    const frame = pack.frames[index];
    const input = path.join(packDir, frame.file);
    const label = Buffer.from(`
      <svg width="${tile}" height="32">
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.72)"/>
        <text x="10" y="22" font-size="15" font-family="Arial" fill="white">${index + 1}. ${frame.angleDegrees}° ${frame.label}</text>
      </svg>
    `);
    const tileBuffer = await sharp(input)
      .resize(tile, tile, { fit: "contain", background: "#2d2c2a" })
      .composite([{ input: label, gravity: "south" }])
      .png()
      .toBuffer();
    composites.push({ input: tileBuffer, left: (index % columns) * tile, top: Math.floor(index / columns) * tile });
  }
  return sharp({
    create: { width: tile * columns, height: tile * rows, channels: 3, background: "#262523" },
  }).composite(composites).png().toBuffer();
}

async function main() {
  const args = parseArgs(process.argv);
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for visual quality review.");
  const packDir = path.dirname(args.pack);
  const pack = JSON.parse(fs.readFileSync(args.pack, "utf8"));
  if (!Array.isArray(pack.frames) || pack.frames.length !== 36) throw new Error("A 36-frame pack is required for review.");
  const contactSheet = await buildContactSheet(pack, packDir);
  const contactSheetPath = path.join(packDir, "contact-sheet.png");
  fs.writeFileSync(contactSheetPath, contactSheet);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.LAMALO_VISION_MODEL ?? "gpt-5.1";
  const response = await client.responses.create({
    model,
    input: [{
      role: "user",
      content: [
        {
          type: "input_text",
          text: [
            `Audit this 36-angle production turntable for ${pack.baseName}.`,
            "All frames were rendered from one GLB model. Return only JSON with: approved (boolean), score (0-100), defects (array of objects with frameNumbers and description), strengths (string array), remediation (string array).",
            "Approve only when all conditions are satisfied:",
            "- one complete garment remains centred and uncropped in every frame",
            "- the silhouette, seams, closures, pockets, hems, panel joins and material appearance are coherent around the entire rotation",
            "- no mesh holes, exploded parts, floating pieces, self-intersections, broken normals, severe texture seams or lighting discontinuities",
            "- no person, mannequin, hanger, text, watermark or unrelated prop",
            "- the first four views are useful canonical front-three-quarter, front, back and side references",
            "- studio lighting reveals construction without crushed blacks, clipping or excessive reflections",
            "- the asset is suitable for film wardrobe continuity and an interactive shop turntable",
            "Set approved=true only for score >= 94 with no material defect.",
          ].join("\n"),
        },
        {
          type: "input_image",
          image_url: `data:image/png;base64,${contactSheet.toString("base64")}`,
          detail: "high",
        },
      ],
    }],
  });
  const verdict = extractJson(response.output_text);
  const materialDefects = Array.isArray(verdict.defects) ? verdict.defects : [];
  const approved = verdict.approved === true && Number(verdict.score) >= 94 && materialDefects.length === 0;
  const approval = {
    schemaVersion: 2,
    masterKey: pack.masterKey,
    baseName: pack.baseName,
    model,
    reviewedAt: new Date().toISOString(),
    contactSheet: path.basename(contactSheetPath),
    status: approved ? "approved" : "rejected",
    review: verdict,
  };
  const approvalPath = path.join(packDir, "visual-approval.json");
  fs.writeFileSync(approvalPath, `${JSON.stringify(approval, null, 2)}\n`);
  if (!approved) {
    throw new Error(`Turntable rejected (${verdict.score ?? "unknown"}/100): ${materialDefects.map((defect) => defect.description ?? defect).join("; ") || "quality threshold not met"}`);
  }
  console.log(approvalPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
