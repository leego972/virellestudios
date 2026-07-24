import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import OpenAI from "openai";

function parseArgs(argv) {
  const args = { image: undefined, metadata: undefined };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--image") args.image = path.resolve(argv[++i]);
    else if (argv[i] === "--metadata") args.metadata = path.resolve(argv[++i]);
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.image || !args.metadata) throw new Error("Provide --image and --metadata.");
  return args;
}

function extractJson(text) {
  const trimmed = String(text ?? "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Quality reviewer returned no JSON object.");
    return JSON.parse(match[0]);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for visual quality review.");
  const metadata = JSON.parse(fs.readFileSync(args.metadata, "utf8"));
  const image = fs.readFileSync(args.image).toString("base64");
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
            `Audit this source reference for the 3D reconstruction of ${metadata.baseName}.`,
            "Return only JSON with: approved (boolean), score (0-100), defects (string array), strengths (string array), regenerationInstruction (string or null).",
            "Approve only when all conditions are satisfied:",
            "- exactly one complete garment is visible and not cropped",
            "- no person, body, hands, mannequin, hanger, rack, text, logo or unrelated prop",
            "- neutral medium-grey garment on a neutral warm-grey seamless studio background",
            "- front three-quarter angle with clear front and side construction",
            "- physically plausible seams, hems, pockets, closures, cuffs, waistbands, panel joins and fabric thickness",
            "- clean silhouette and low perspective distortion",
            "- no duplicated parts, melted construction, asymmetry, holes or impossible folds",
            "- suitable as a definitive image-to-3D source rather than merely a fashion illustration",
            "Set approved=true only for score >= 92 with no material defect.",
          ].join("\n"),
        },
        {
          type: "input_image",
          image_url: `data:image/png;base64,${image}`,
          detail: "high",
        },
      ],
    }],
  });
  const verdict = extractJson(response.output_text);
  const approved = verdict.approved === true && Number(verdict.score) >= 92 && (!verdict.defects || verdict.defects.length === 0);
  const updated = {
    ...metadata,
    reviewModel: model,
    reviewedAt: new Date().toISOString(),
    review: verdict,
    status: approved ? "approved" : "rejected",
  };
  fs.writeFileSync(args.metadata, `${JSON.stringify(updated, null, 2)}\n`);
  if (!approved) {
    throw new Error(`Source reference rejected (${verdict.score ?? "unknown"}/100): ${(verdict.defects ?? []).join("; ") || "quality threshold not met"}`);
  }
  console.log(args.metadata);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
