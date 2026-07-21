import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { invokeLLM } from "./llm";
import { logger } from "./logger";
import { safeJsonExtract } from "./safeParse";
import type { CanonicalSceneSpec } from "./canonicalSceneSpec";

const execFileAsync = promisify(execFile);

export type VideoQualityPolicy = "off" | "technical" | "standard" | "strict";

export interface VideoProbe {
  durationSeconds: number;
  width: number;
  height: number;
  frameRate: number;
  hasVideo: boolean;
  hasAudio: boolean;
  blackRatio: number;
  freezeEvents: number;
}

export interface VisualQualityReview {
  pass: boolean;
  score: number;
  identityScore: number;
  wardrobeScore: number;
  actionScore: number;
  locationScore: number;
  cameraScore: number;
  continuityScore: number;
  artifactScore: number;
  issues: string[];
  corrections: string[];
}

export interface VideoQualityReview {
  pass: boolean;
  policy: VideoQualityPolicy;
  technical: VideoProbe;
  visual?: VisualQualityReview;
  issues: string[];
  correctionPrompt?: string;
  reviewFrames?: string[];
}

export interface ReviewGeneratedClipInput {
  videoUrl: string;
  canonicalSpec: CanonicalSceneSpec;
  expectedDurationSeconds: number;
  policy?: VideoQualityPolicy;
  previousFrameUrl?: string;
  referenceImages?: string[];
  userOpenAiKey?: string | null;
  clipIndex?: number;
  totalClips?: number;
}

function ratioValue(value: string): number | undefined {
  const match = value.match(/^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/);
  if (!match) return undefined;
  const width = Number(match[1]);
  const height = Number(match[2]);
  return width > 0 && height > 0 ? width / height : undefined;
}

function parseFrameRate(value: string | undefined): number {
  if (!value) return 0;
  if (value.includes("/")) {
    const [a, b] = value.split("/").map(Number);
    return b ? a / b : 0;
  }
  return Number(value) || 0;
}

async function downloadVideo(videoUrl: string, localPath: string): Promise<void> {
  const response = await fetch(videoUrl, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`Quality gate could not download clip: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 10_000) throw new Error(`Quality gate received an invalid clip (${buffer.length} bytes).`);
  await fs.promises.writeFile(localPath, buffer);
}

async function probeVideo(localPath: string): Promise<VideoProbe> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-print_format", "json",
    "-show_streams",
    "-show_format",
    localPath,
  ], { timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
  const data = JSON.parse(stdout) as any;
  const video = (data.streams || []).find((stream: any) => stream.codec_type === "video");
  const audio = (data.streams || []).find((stream: any) => stream.codec_type === "audio");
  const durationSeconds = Number(data.format?.duration || video?.duration || 0);

  let blackRatio = 0;
  try {
    const result = await execFileAsync("ffmpeg", [
      "-hide_banner", "-nostats", "-i", localPath,
      "-vf", "blackdetect=d=0.35:pic_th=0.98:pix_th=0.12",
      "-an", "-f", "null", "-",
    ], { timeout: 90_000, maxBuffer: 8 * 1024 * 1024 });
    const diagnostic = `${result.stderr || ""}`;
    const durations = Array.from(diagnostic.matchAll(/black_duration:([0-9.]+)/g)).map((match) => Number(match[1]) || 0);
    blackRatio = durationSeconds > 0 ? durations.reduce((sum, value) => sum + value, 0) / durationSeconds : 0;
  } catch (error: any) {
    const diagnostic = String(error?.stderr || "");
    const durations = Array.from(diagnostic.matchAll(/black_duration:([0-9.]+)/g)).map((match) => Number(match[1]) || 0);
    blackRatio = durationSeconds > 0 ? durations.reduce((sum, value) => sum + value, 0) / durationSeconds : 0;
  }

  let freezeEvents = 0;
  try {
    const result = await execFileAsync("ffmpeg", [
      "-hide_banner", "-nostats", "-i", localPath,
      "-vf", "freezedetect=n=-50dB:d=1.5",
      "-an", "-f", "null", "-",
    ], { timeout: 90_000, maxBuffer: 8 * 1024 * 1024 });
    freezeEvents = Array.from(String(result.stderr || "").matchAll(/freeze_start:/g)).length;
  } catch (error: any) {
    freezeEvents = Array.from(String(error?.stderr || "").matchAll(/freeze_start:/g)).length;
  }

  return {
    durationSeconds,
    width: Number(video?.width || 0),
    height: Number(video?.height || 0),
    frameRate: parseFrameRate(video?.avg_frame_rate || video?.r_frame_rate),
    hasVideo: Boolean(video),
    hasAudio: Boolean(audio),
    blackRatio,
    freezeEvents,
  };
}

async function extractReviewFrames(localPath: string, durationSeconds: number, outputDir: string): Promise<string[]> {
  const positions = durationSeconds > 1
    ? [Math.max(0.05, durationSeconds * 0.08), durationSeconds * 0.5, Math.max(0.1, durationSeconds * 0.9)]
    : [0];
  const frames: string[] = [];
  for (let index = 0; index < positions.length; index++) {
    const output = path.join(outputDir, `review-${index}.jpg`);
    await execFileAsync("ffmpeg", [
      "-hide_banner", "-loglevel", "error",
      "-ss", String(positions[index]),
      "-i", localPath,
      "-frames:v", "1",
      "-vf", "scale='min(960,iw)':-2",
      "-q:v", "3",
      "-y", output,
    ], { timeout: 30_000 });
    const buffer = await fs.promises.readFile(output);
    frames.push(`data:image/jpeg;base64,${buffer.toString("base64")}`);
  }
  return frames;
}

function technicalIssues(probe: VideoProbe, spec: CanonicalSceneSpec, expectedDuration: number, policy: VideoQualityPolicy): string[] {
  const issues: string[] = [];
  if (!probe.hasVideo) issues.push("No video stream was detected.");
  if (probe.durationSeconds <= 0) issues.push("Clip duration could not be measured.");
  const minimumDurationRatio = policy === "strict" ? 0.72 : 0.55;
  if (expectedDuration > 0 && probe.durationSeconds < expectedDuration * minimumDurationRatio) {
    issues.push(`Clip is too short: ${probe.durationSeconds.toFixed(2)}s generated for ${expectedDuration}s requested.`);
  }
  if (probe.width < 480 || probe.height < 480) issues.push(`Resolution is below production minimum: ${probe.width}x${probe.height}.`);
  if (probe.frameRate > 0 && probe.frameRate < 12) issues.push(`Frame rate is too low for professional playback: ${probe.frameRate.toFixed(2)}fps.`);
  const expectedRatio = ratioValue(spec.camera.aspectRatio);
  const actualRatio = probe.height > 0 ? probe.width / probe.height : undefined;
  if (expectedRatio && actualRatio && Math.abs(expectedRatio - actualRatio) / expectedRatio > 0.12) {
    issues.push(`Aspect ratio mismatch: expected ${spec.camera.aspectRatio}, received ${probe.width}:${probe.height}.`);
  }
  if (probe.blackRatio > (policy === "strict" ? 0.08 : 0.2)) issues.push(`Excessive black frames detected (${Math.round(probe.blackRatio * 100)}% of the clip).`);
  if (probe.freezeEvents > (policy === "strict" ? 0 : 1)) issues.push(`Unexpected frozen-frame events detected: ${probe.freezeEvents}.`);
  return issues;
}

function uniqueReferenceImages(input: ReviewGeneratedClipInput): string[] {
  return Array.from(new Set((input.referenceImages || [])
    .filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url.trim()))
    .map((url) => url.trim())))
    .filter((url) => url !== input.previousFrameUrl)
    .slice(0, 8);
}

async function visualReview(
  frames: string[],
  input: ReviewGeneratedClipInput,
): Promise<VisualQualityReview> {
  const schema = {
    name: "video_clip_quality_review",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        pass: { type: "boolean" },
        score: { type: "number", minimum: 0, maximum: 100 },
        identityScore: { type: "number", minimum: 0, maximum: 100 },
        wardrobeScore: { type: "number", minimum: 0, maximum: 100 },
        actionScore: { type: "number", minimum: 0, maximum: 100 },
        locationScore: { type: "number", minimum: 0, maximum: 100 },
        cameraScore: { type: "number", minimum: 0, maximum: 100 },
        continuityScore: { type: "number", minimum: 0, maximum: 100 },
        artifactScore: { type: "number", minimum: 0, maximum: 100 },
        issues: { type: "array", items: { type: "string" } },
        corrections: { type: "array", items: { type: "string" } },
      },
      required: ["pass", "score", "identityScore", "wardrobeScore", "actionScore", "locationScore", "cameraScore", "continuityScore", "artifactScore", "issues", "corrections"],
    },
  };
  const contractReferences = uniqueReferenceImages(input);
  const visualContent: any[] = [{
    type: "text",
    text: [
      "Review the supplied first, middle and final frames from one generated film clip.",
      "Judge only whether the generated frames comply with the scene contract and exact reference images below.",
      "Be strict about character identity, which named character wears which exact garment, garment colour/material/cut/fit/accessories, number of characters, props, location, blocking, action progression, camera requirements, continuity, anatomy, duplicate limbs/faces, warped objects, text, watermarks and unexplained visual resets.",
      "A garment appearing on the wrong character is an automatic wardrobe failure. Any unexplained clothing change between generated frames or from the continuity frame is an automatic continuity failure.",
      `Clip position: ${(input.clipIndex ?? 0) + 1}/${input.totalClips ?? 1}.`,
      `Scene contract ${input.canonicalSpec.fingerprint}:`,
      input.canonicalSpec.lockedRequirements.join("\n"),
      `Camera: ${JSON.stringify(input.canonicalSpec.camera)}`,
      `Narrative: ${input.canonicalSpec.baseNarrative}`,
      input.previousFrameUrl ? "After the generated review frames, one accepted continuity/opening frame is supplied." : "No previous/opening continuity frame was supplied.",
      contractReferences.length ? `After the continuity frame, ${contractReferences.length} authoritative character/wardrobe contract reference image(s) are supplied in canonical reference order.` : "No separate contract reference images were supplied.",
    ].join("\n"),
  }];
  for (const frame of frames) visualContent.push({ type: "image_url", image_url: { url: frame, detail: "high" } });
  if (input.previousFrameUrl) {
    visualContent.push({ type: "text", text: "ACCEPTED OPENING/PREVIOUS CONTINUITY FRAME:" });
    visualContent.push({ type: "image_url", image_url: { url: input.previousFrameUrl, detail: "high" } });
  }
  if (contractReferences.length) {
    visualContent.push({ type: "text", text: "AUTHORITATIVE CHARACTER AND WARDROBE CONTRACT REFERENCES:" });
    contractReferences.forEach((url, index) => {
      visualContent.push({ type: "text", text: `Contract reference ${index + 1}: compare it against the named identity/garment bindings in the locked scene requirements.` });
      visualContent.push({ type: "image_url", image_url: { url, detail: "high" } });
    });
  }

  const result = await invokeLLM({
    userApiKey: input.userOpenAiKey || undefined,
    userModel: "gpt-4.1",
    model: "gpt-4.1",
    maxTokens: 1200,
    outputSchema: schema,
    messages: [
      { role: "system", content: "You are a senior film dailies reviewer and script supervisor. Return objective structured quality control, not compliments." },
      { role: "user", content: visualContent },
    ],
  });
  const raw = result.choices?.[0]?.message?.content;
  const text = typeof raw === "string" ? raw : JSON.stringify(raw);
  const fallback: VisualQualityReview = {
    pass: false,
    score: 0,
    identityScore: 0,
    wardrobeScore: 0,
    actionScore: 0,
    locationScore: 0,
    cameraScore: 0,
    continuityScore: 0,
    artifactScore: 0,
    issues: ["Visual quality reviewer returned an invalid response."],
    corrections: ["Regenerate the clip while following every locked requirement."],
  };
  return safeJsonExtract<VisualQualityReview>(text, fallback);
}

export async function reviewGeneratedClip(input: ReviewGeneratedClipInput): Promise<VideoQualityReview> {
  const policy = input.policy ?? "standard";
  if (policy === "off") {
    return {
      pass: true,
      policy,
      technical: { durationSeconds: input.expectedDurationSeconds, width: 0, height: 0, frameRate: 0, hasVideo: true, hasAudio: false, blackRatio: 0, freezeEvents: 0 },
      issues: [],
    };
  }

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "virelle-quality-"));
  const localPath = path.join(tmpDir, "clip.mp4");
  try {
    await downloadVideo(input.videoUrl, localPath);
    const technical = await probeVideo(localPath);
    const issues = technicalIssues(technical, input.canonicalSpec, input.expectedDurationSeconds, policy);
    let frames: string[] = [];
    let visual: VisualQualityReview | undefined;

    if (policy === "standard" || policy === "strict") {
      frames = await extractReviewFrames(localPath, technical.durationSeconds, tmpDir);
      try {
        visual = await visualReview(frames, input);
        const threshold = policy === "strict" ? 82 : 72;
        if (!visual.pass || visual.score < threshold) {
          issues.push(...visual.issues.map((issue) => `Visual review: ${issue}`));
        }
        const minimumDimensionScore = policy === "strict" ? 75 : 60;
        const criticalScores = [visual.identityScore, visual.wardrobeScore, visual.actionScore, visual.continuityScore, visual.artifactScore];
        if (criticalScores.some((score) => score < minimumDimensionScore)) {
          issues.push("One or more critical visual dimensions fell below the acceptance threshold.");
        }
      } catch (error: any) {
        logger.warn(`[VideoQualityGate] Visual review unavailable: ${error.message}`);
        if (policy === "strict") issues.push(`Strict visual quality review could not be completed: ${error.message}`);
      }
    }

    const corrections = visual?.corrections || [];
    return {
      pass: issues.length === 0,
      policy,
      technical,
      visual,
      issues,
      correctionPrompt: corrections.length
        ? `QUALITY-CONTROL CORRECTIONS — fix every issue in the regeneration: ${corrections.join("; ")}`
        : undefined,
      reviewFrames: frames,
    };
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
