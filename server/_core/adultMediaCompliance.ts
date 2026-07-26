import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { sql } from "drizzle-orm";
import { invokeLLM } from "./llm";
import { logger } from "./logger";
import { storagePut } from "../storage";

const execFileAsync = promisify(execFile);

export const ADULT_AI_DISCLOSURE_TITLE = "NOTICE — AI-ASSISTED SYNTHETIC MEDIA";
export const ADULT_AI_DISCLOSURE_TEXT =
  "This production contains or may contain artificial-intelligence-assisted facial replacement, body transformation, age progression or regression, voice synthesis, compositing, or other synthetic-media techniques. The creator represents and warrants that all required rights, permissions, releases, and legally valid consents have been obtained for every identifiable person's likeness, voice, image, and personal attributes. The creator is solely responsible for the submitted media and resulting content. Virelle Studios supplies production technology and does not create, direct, sponsor, approve, or endorse user-generated content. Virelle Studios applies automated safety screening, provenance controls, audit logging, and human review where content is flagged. Unauthorised impersonation, non-consensual intimate imagery, exploitation of minors, deceptive identity misuse, and other unlawful use are prohibited.";

export type AdultRiskDecision = "allow" | "review" | "block";
export type AdultRiskAssessment = {
  score: number;
  decision: AdultRiskDecision;
  reasons: string[];
  model: string;
  reviewedByAi: boolean;
};

type AdultRiskInput = {
  userId: number;
  jobId: number;
  transformGoal?: string | null;
  targetAge?: number | null;
  targetPresentation?: string | null;
  directorNotes?: string | null;
  publicFigureLikeness?: boolean;
  aiGeneratedCharactersOnly?: boolean;
  consentConfirmed?: boolean;
  allSubjectsAdultsConfirmed?: boolean;
};

function fallbackAssessment(input: AdultRiskInput): AdultRiskAssessment {
  let score = 8;
  const reasons: string[] = [];
  const text = `${input.targetPresentation || ""}\n${input.directorNotes || ""}`.toLowerCase();
  if (!input.consentConfirmed && !input.aiGeneratedCharactersOnly) {
    score += 55;
    reasons.push("Consent confirmation is absent for a real-person transformation.");
  }
  if (!input.allSubjectsAdultsConfirmed) {
    score += 80;
    reasons.push("All depicted subjects have not been confirmed as adults.");
  }
  if (input.publicFigureLikeness) {
    score += 70;
    reasons.push("A public-figure likeness was declared.");
  }
  if (input.targetAge != null && input.targetAge < 18) {
    score += 100;
    reasons.push("Target age is below 18.");
  }
  if (["younger_self", "older_self", "adult_to_child", "child_to_adult"].includes(String(input.transformGoal))) {
    score += 12;
    reasons.push("Age transformation requires enhanced review signals.");
  }
  if (/without consent|revenge|secretly|hidden camera|blackmail|rape|minor|underage|schoolgirl|schoolboy/.test(text)) {
    score += 100;
    reasons.push("High-risk non-consensual or minor-related language was detected.");
  }
  const bounded = Math.max(0, Math.min(100, score));
  return {
    score: bounded,
    decision: bounded >= 80 ? "block" : bounded >= 45 ? "review" : "allow",
    reasons: reasons.length ? reasons : ["No elevated deterministic risk signal was detected."],
    model: "virelle-deterministic-fallback-v1",
    reviewedByAi: false,
  };
}

export async function assessAdultMediaRisk(input: AdultRiskInput): Promise<AdultRiskAssessment> {
  const fallback = fallbackAssessment(input);
  try {
    const result = await invokeLLM({
      systemTag: "adult-media-safety-review",
      maxTokens: 500,
      responseFormat: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are Virelle Studios' adult synthetic-media safety reviewer. Return strict JSON with score 0-100, decision allow|review|block, and reasons string array. Block any possible minor involvement, non-consensual intimate imagery, coercion, public-figure sexual deepfakes, deceptive impersonation, or absent consent. Do not approve based only on the user's assertion when contradictory signals exist.",
        },
        {
          role: "user",
          content: JSON.stringify({
            transformGoal: input.transformGoal,
            targetAge: input.targetAge,
            targetPresentation: input.targetPresentation,
            directorNotes: input.directorNotes,
            publicFigureLikeness: input.publicFigureLikeness,
            aiGeneratedCharactersOnly: input.aiGeneratedCharactersOnly,
            consentConfirmed: input.consentConfirmed,
            allSubjectsAdultsConfirmed: input.allSubjectsAdultsConfirmed,
            deterministicAssessment: fallback,
          }),
        },
      ],
    });
    const raw = result.choices?.[0]?.message?.content;
    const text = typeof raw === "string" ? raw : JSON.stringify(raw || {});
    const parsed = JSON.parse(text);
    const score = Math.max(fallback.score, Math.max(0, Math.min(100, Number(parsed.score) || 0)));
    const decision: AdultRiskDecision = score >= 80 || parsed.decision === "block"
      ? "block"
      : score >= 45 || parsed.decision === "review"
        ? "review"
        : "allow";
    return {
      score,
      decision,
      reasons: Array.isArray(parsed.reasons) && parsed.reasons.length
        ? parsed.reasons.map(String).slice(0, 8)
        : fallback.reasons,
      model: result.model || "virelle-ai-moderator",
      reviewedByAi: true,
    };
  } catch (error) {
    logger.warn("[AdultMediaCompliance] AI moderation unavailable; deterministic review retained.", { error: String(error) });
    return fallback;
  }
}

export async function recordAdultModerationReview(
  dbConn: any,
  input: AdultRiskInput,
  assessment: AdultRiskAssessment,
): Promise<void> {
  await dbConn.execute(sql`
    INSERT INTO moderationIncidents
      (userId, contentType, contentSnippet, violations, severity,
       shouldFreeze, shouldReport, status, createdAt, updatedAt)
    VALUES
      (${input.userId}, 'adult_studio_render',
       ${String(input.directorNotes || input.targetPresentation || "Adult Studio render").slice(0, 500)},
       ${JSON.stringify([{ category: "ADULT_SYNTHETIC_MEDIA_REVIEW", severity: assessment.decision === "block" ? "HIGH" : "MEDIUM", score: assessment.score, reasons: assessment.reasons, model: assessment.model }])},
       ${assessment.decision === "block" ? "HIGH" : "MEDIUM"},
       0, 0, 'pending_review', NOW(), NOW())
  `);
}

export function buildAdultProvenance(jobId: number, userId: number, transformGoal?: string | null) {
  const issuedAt = new Date().toISOString();
  const secret = process.env.ADULT_PROVENANCE_SECRET || process.env.JWT_SECRET || "virelle-development-provenance";
  const payload = `${jobId}:${userId}:${transformGoal || "unknown"}:${issuedAt}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return {
    version: "virelle-adult-provenance-v1",
    markerId: crypto.createHash("sha256").update(signature).digest("hex").slice(0, 32),
    signature,
    issuedAt,
    transformGoal: transformGoal || "unknown",
    invisible: true,
    verificationEndpoint: "/api/adult-studio/provenance/verify",
  };
}

function escapeDrawtext(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/%/g, "\\%");
}

export async function applyAdultOpeningDisclosure(opts: {
  sourceUrl: string;
  jobId: number;
  userId: number;
  transformGoal?: string | null;
}): Promise<{ url: string; provenance: ReturnType<typeof buildAdultProvenance> }> {
  const provenance = buildAdultProvenance(opts.jobId, opts.userId, opts.transformGoal);
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "virelle-adult-disclosure-"));
  const sourcePath = path.join(tempDir, "source.mp4");
  const cardPath = path.join(tempDir, "notice.mp4");
  const outputPath = path.join(tempDir, "output.mp4");
  const listPath = path.join(tempDir, "concat.txt");
  try {
    const response = await fetch(opts.sourceUrl);
    if (!response.ok) throw new Error(`Could not download rendered video (${response.status}).`);
    await writeFile(sourcePath, Buffer.from(await response.arrayBuffer()));
    const title = escapeDrawtext(ADULT_AI_DISCLOSURE_TITLE);
    const body = escapeDrawtext(ADULT_AI_DISCLOSURE_TEXT);
    await execFileAsync("ffmpeg", [
      "-y", "-f", "lavfi", "-i", "color=c=0x070708:s=1920x1080:d=5:r=30",
      "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
      "-vf", `drawtext=text='${title}':fontcolor=0xE6C866:fontsize=54:x=(w-text_w)/2:y=130,drawtext=text='${body}':fontcolor=white:fontsize=31:line_spacing=12:x=140:y=260:box=1:boxcolor=black@0.42:boxborderw=24`,
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", cardPath,
    ], { maxBuffer: 8 * 1024 * 1024 });
    await writeFile(listPath, `file '${cardPath.replace(/'/g, "'\\''")}'\nfile '${sourcePath.replace(/'/g, "'\\''")}'\n`);
    await execFileAsync("ffmpeg", [
      "-y", "-f", "concat", "-safe", "0", "-i", listPath,
      "-metadata", `virelle_provenance=${JSON.stringify(provenance)}`,
      "-metadata", "comment=AI-assisted synthetic media; creator responsible for likeness rights and consent.",
      "-c", "copy", outputPath,
    ], { maxBuffer: 8 * 1024 * 1024 });
    const data = await readFile(outputPath);
    const uploaded = await storagePut(
      `adult-studio/compliant/${opts.userId}/${opts.jobId}-${provenance.markerId}.mp4`,
      data,
      "video/mp4",
      { public: false },
    );
    return { url: uploaded.url, provenance };
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
