import nodemailer from "nodemailer";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { logger } from "./_core/logger";
import { ensureFundingCommandSchema } from "./_core/funding-schema";
import { createNotification, getDb, getProjectById } from "./db";
import {
  calculateReadiness,
  escapeHtml,
  hasFundingAccess,
  normaliseFundingSource,
  scoreFundingSource,
  type FundingProfileData,
} from "./_core/funding-utils";

const PREVIEW_LIMIT = 12;
const STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "additional_materials",
  "interview",
  "waitlisted",
  "accepted",
  "rejected",
  "withdrawn",
] as const;

const recordSchema = z.record(z.string(), z.unknown());
type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

function rowsFrom(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result[0])) return result[0];
  if (Array.isArray(result) && result.every((item) => item && typeof item === "object" && !("affectedRows" in item))) return result;
  return [];
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value as T;
  try { return JSON.parse(String(value)) as T; } catch { return fallback; }
}

function dateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : null;
}

function assertAccess(user: any) {
  if (!hasFundingAccess(user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "The complete Funding Command Centre is available to active Virelle members.",
    });
  }
}

async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  await ensureFundingCommandSchema(db);
  return db;
}

async function sourceRows(db: Db): Promise<any[]> {
  const result = await db.execute(sql`SELECT
    fs.*,
    fm.sourceCategory,
    fm.listingStatus,
    fm.verificationStatus,
    fm.applicationOpen,
    fm.deadlineAt,
    fm.rollingDeadline,
    fm.fundingMinimum,
    fm.fundingMaximum,
    fm.currency,
    fm.officialGuidelinesUrl,
    fm.lastVerifiedAt,
    fm.confidence
  FROM funding_sources fs
  LEFT JOIN funding_source_metadata fm ON fm.fundingSourceId = fs.id
  ORDER BY fs.country ASC, fs.organization ASC`);
  const seen = new Set<string>();
  return rowsFrom(result)
    .map((row) => normaliseFundingSource(row))
    .filter((row) => {
      const key = `${String(row.country).toLowerCase()}|||${String(row.organization).toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function filterSources(sources: any[], input: { country?: string; search?: string; category?: string; includeReferences?: boolean }) {
  const country = input.country?.trim().toLowerCase();
  const search = input.search?.trim().toLowerCase();
  return sources.filter((source) => {
    if (!input.includeReferences && source.listingStatus === "industry_reference") return false;
    if (country && country !== "all" && String(source.country).toLowerCase() !== country) return false;
    if (input.category && input.category !== "all" && source.sourceCategory !== input.category) return false;
    if (search) {
      const haystack = [source.organization, source.country, source.type, source.supports, source.stage, source.eligibility, source.fundingForm]
        .filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

async function sourceById(db: Db, id: number) {
  const source = (await sourceRows(db)).find((row) => Number(row.id) === id);
  if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Funding source not found" });
  return source;
}

async function projectForUser(projectId: number, userId: number) {
  const project = await getProjectById(projectId, userId);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  return project as any;
}

function profileFromProject(project: any, user: any, saved: FundingProfileData = {}): FundingProfileData {
  return {
    applicantLegalName: saved.applicantLegalName || user.companyName || user.name || "",
    tradingName: saved.tradingName || user.companyName || "",
    companyCountry: saved.companyCountry || user.country || "",
    contactName: saved.contactName || user.name || "",
    contactEmail: saved.contactEmail || user.email || "",
    contactPhone: saved.contactPhone || user.phone || "",
    projectTitle: saved.projectTitle || project.title || "",
    workingTitle: saved.workingTitle || project.title || "",
    format: saved.format || project.format || project.type || "Feature Film",
    stage: saved.stage || project.productionStage || "Development",
    productionCountries: saved.productionCountries || project.country || project.location || user.country || "",
    coProductionTerritories: saved.coProductionTerritories || "",
    genre: saved.genre || project.genre || "",
    targetAudience: saved.targetAudience || project.targetAudience || "",
    logline: saved.logline || project.logline || project.description || "",
    shortSynopsis: saved.shortSynopsis || project.plotSummary || project.description || "",
    longSynopsis: saved.longSynopsis || project.mainPlot || project.plotSummary || "",
    directorStatement: saved.directorStatement || "",
    producerStatement: saved.producerStatement || "",
    creativeApproach: saved.creativeApproach || [project.tone, project.themes, project.cinemaIndustry].filter(Boolean).join(" · "),
    rightsPosition: saved.rightsPosition || "",
    teamSummary: saved.teamSummary || "",
    totalBudget: saved.totalBudget || "",
    currency: saved.currency || "AUD",
    fundingRequested: saved.fundingRequested || "",
    securedFinance: saved.securedFinance || "",
    pendingFinance: saved.pendingFinance || "",
    taxIncentives: saved.taxIncentives || "",
    producerContribution: saved.producerContribution || "",
    gap: saved.gap || "",
    distributionStrategy: saved.distributionStrategy || "",
    audienceStrategy: saved.audienceStrategy || project.targetAudience || "",
    festivalStrategy: saved.festivalStrategy || "",
    productionSchedule: saved.productionSchedule || "",
    productionRisks: saved.productionRisks || "",
    sustainabilityAccessibility: saved.sustainabilityAccessibility || "",
    whyNow: saved.whyNow || "",
    whyTeam: saved.whyTeam || "",
    milestoneUnlocked: saved.milestoneUnlocked || "",
    attachmentChecklist: saved.attachmentChecklist || {},
    budgetLines: saved.budgetLines || {},
    ...saved,
  };
}

async function savedProfile(db: Db, userId: number, projectId: number): Promise<FundingProfileData> {
  const result = await db.execute(sql`SELECT data FROM funding_profiles WHERE userId = ${userId} AND projectId = ${projectId} LIMIT 1`);
  return parseJson(rowsFrom(result)[0]?.data, {});
}

function safeField(label: string, value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return `<section><h3>${escapeHtml(label)}</h3><div>${escapeHtml(text).replace(/\n/g, "<br>")}</div></section>`;
}

function buildWorkingPack(profile: FundingProfileData, source: any): string {
  const budget = Object.entries(profile.budgetLines || {})
    .filter(([, value]) => String(value ?? "").trim())
    .map(([key, value]) => `<tr><td>${escapeHtml(key.replace(/([A-Z])/g, " $1"))}</td><td>${escapeHtml(value)}</td></tr>`)
    .join("");
  const attachments = Object.entries(profile.attachmentChecklist || {})
    .map(([key, checked]) => `<li>${checked ? "✓" : "☐"} ${escapeHtml(key.replace(/([A-Z])/g, " $1"))}</li>`)
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(profile.projectTitle || "Funding application")}</title><style>
  body{font-family:Arial,sans-serif;background:#f4f4f5;color:#18181b;margin:0;padding:24px;line-height:1.55}.page{max-width:860px;margin:auto;background:white;border-radius:14px;overflow:hidden;box-shadow:0 4px 28px #0001}.head{padding:34px 42px;background:#090910;color:white;border-bottom:5px solid #d7a928}.head h1{margin:0;color:#f7d76f}.head p{margin:8px 0 0;color:#ddd}.body{padding:32px 42px}section{margin:0 0 22px}h2{color:#8b6500;border-bottom:1px solid #ddd;padding-bottom:7px}h3{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#777;margin:0 0 5px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #eee;text-align:left}.notice{padding:14px;border:1px solid #e0b93b;background:#fff9de;border-radius:8px;font-size:12px}ul{columns:2;padding-left:18px}@media print{body{padding:0;background:white}.page{box-shadow:none;border-radius:0}}</style></head><body><div class="page"><div class="head"><h1>${escapeHtml(profile.projectTitle || "Funding application")}</h1><p>Working pack for ${escapeHtml(source.organization)} · ${escapeHtml(source.country)}</p></div><div class="body"><div class="notice"><strong>Manual verification required.</strong> Check the live funder portal for current eligibility, deadlines, declarations, word limits and attachment rules before submitting.</div>
  <h2>Applicant and project</h2>${safeField("Legal applicant", profile.applicantLegalName)}${safeField("Trading name", profile.tradingName)}${safeField("Applicant country", profile.companyCountry)}${safeField("Contact", profile.contactName)}${safeField("Email", profile.contactEmail)}${safeField("Project title", profile.projectTitle)}${safeField("Format", profile.format)}${safeField("Stage", profile.stage)}${safeField("Production countries", profile.productionCountries)}${safeField("Genre", profile.genre)}${safeField("Target audience", profile.targetAudience)}
  <h2>Story and creative case</h2>${safeField("Logline", profile.logline)}${safeField("Short synopsis", profile.shortSynopsis)}${safeField("Long synopsis", profile.longSynopsis)}${safeField("Director statement", profile.directorStatement)}${safeField("Producer statement", profile.producerStatement)}${safeField("Creative approach", profile.creativeApproach)}
  <h2>Rights and team</h2>${safeField("Rights position", profile.rightsPosition)}${safeField("Team summary", profile.teamSummary)}
  <h2>Budget and finance</h2>${safeField("Currency", profile.currency)}${safeField("Total budget", profile.totalBudget)}${safeField("Funding requested", profile.fundingRequested)}${safeField("Secured finance", profile.securedFinance)}${safeField("Pending finance", profile.pendingFinance)}${safeField("Tax incentives", profile.taxIncentives)}${safeField("Producer contribution", profile.producerContribution)}${safeField("Finance gap", profile.gap)}${budget ? `<table><thead><tr><th>Budget category</th><th>Amount</th></tr></thead><tbody>${budget}</tbody></table>` : ""}
  <h2>Market and production readiness</h2>${safeField("Distribution strategy", profile.distributionStrategy)}${safeField("Audience strategy", profile.audienceStrategy)}${safeField("Festival strategy", profile.festivalStrategy)}${safeField("Production schedule", profile.productionSchedule)}${safeField("Production risks", profile.productionRisks)}${safeField("Accessibility and sustainability", profile.sustainabilityAccessibility)}${safeField("Why now", profile.whyNow)}${safeField("Why this team", profile.whyTeam)}${safeField("Milestone unlocked", profile.milestoneUnlocked)}${attachments ? `<h2>Attachment checklist</h2><ul>${attachments}</ul>` : ""}
  ${source.tailoringNotes ? `<h2>Fund-specific notes</h2>${safeField("Tailoring guidance", source.tailoringNotes)}` : ""}
  ${source.recommendedAttachments ? safeField("Recommended attachments", source.recommendedAttachments) : ""}
  </div></div></body></html>`;
}

function transporter() {
  if (!ENV.gmailUser || !ENV.gmailAppPassword) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user: ENV.gmailUser, pass: ENV.gmailAppPassword } });
}

async function insertId(db: Db): Promise<number> {
  const result = await db.execute(sql`SELECT LAST_INSERT_ID() AS id`);
  return Number(rowsFrom(result)[0]?.id || 0);
}

async function addEvent(db: Db, values: { applicationId: number; userId: number; eventType: string; fromStatus?: string | null; toStatus?: string | null; note?: string | null }) {
  await db.execute(sql`INSERT INTO funding_application_events (applicationId,userId,eventType,fromStatus,toStatus,note)
    VALUES (${values.applicationId},${values.userId},${values.eventType},${values.fromStatus || null},${values.toStatus || null},${values.note || null})`);
}

export const fundingRouter = router({
  access: publicProcedure.query(({ ctx }) => ({
    allowed: hasFundingAccess(ctx.user as any),
    tier: (ctx.user as any)?.subscriptionTier || "free",
    previewLimit: PREVIEW_LIMIT,
  })),

  preview: publicProcedure.query(async () => {
    const db = await requireDb();
    return filterSources(await sourceRows(db), {}).slice(0, PREVIEW_LIMIT);
  }),

  list: publicProcedure
    .input(z.object({ country: z.string().optional(), search: z.string().optional(), category: z.string().optional(), includeReferences: z.boolean().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const filtered = filterSources(await sourceRows(db), input || {});
      return hasFundingAccess(ctx.user as any) ? filtered : filtered.slice(0, PREVIEW_LIMIT);
    }),

  countries: publicProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const sources = hasFundingAccess(ctx.user as any) ? await sourceRows(db) : (await sourceRows(db)).slice(0, PREVIEW_LIMIT);
    return [...new Set(sources.map((source) => String(source.country)))].sort();
  }),

  get: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input, ctx }) => {
    const db = await requireDb();
    const source = await sourceById(db, input.id);
    if (!hasFundingAccess(ctx.user as any)) {
      const preview = (await sourceRows(db)).slice(0, PREVIEW_LIMIT).some((row) => Number(row.id) === input.id);
      if (!preview) throw new TRPCError({ code: "FORBIDDEN", message: "Upgrade required for the full directory" });
    }
    return source;
  }),

  dashboard: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ input, ctx }) => {
    assertAccess(ctx.user);
    const db = await requireDb();
    await projectForUser(input.projectId, ctx.user.id);
    const [shortlist, drafts, applications] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) AS count FROM funding_shortlists WHERE userId=${ctx.user.id} AND projectId=${input.projectId}`),
      db.execute(sql`SELECT COUNT(*) AS count FROM funding_drafts WHERE userId=${ctx.user.id} AND projectId=${input.projectId}`),
      db.execute(sql`SELECT status,COUNT(*) AS count FROM funding_applications WHERE userId=${ctx.user.id} AND projectId=${input.projectId} GROUP BY status`),
    ]);
    const statuses = Object.fromEntries(rowsFrom(applications).map((row) => [row.status, Number(row.count)]));
    return { shortlist: Number(rowsFrom(shortlist)[0]?.count || 0), drafts: Number(rowsFrom(drafts)[0]?.count || 0), applications: statuses };
  }),

  profile: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ input, ctx }) => {
    assertAccess(ctx.user);
    const db = await requireDb();
    const project = await projectForUser(input.projectId, ctx.user.id);
    const data = profileFromProject(project, ctx.user, await savedProfile(db, ctx.user.id, input.projectId));
    return { data, readiness: calculateReadiness(data) };
  }),

  saveProfile: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), data: recordSchema })).mutation(async ({ input, ctx }) => {
    assertAccess(ctx.user);
    const db = await requireDb();
    const project = await projectForUser(input.projectId, ctx.user.id);
    const data = profileFromProject(project, ctx.user, input.data as FundingProfileData);
    const readiness = calculateReadiness(data);
    await db.execute(sql`INSERT INTO funding_profiles (userId,projectId,data,completionScore)
      VALUES (${ctx.user.id},${input.projectId},${JSON.stringify(data)},${readiness.completionScore})
      ON DUPLICATE KEY UPDATE data=VALUES(data),completionScore=VALUES(completionScore),updatedAt=CURRENT_TIMESTAMP`);
    return { success: true, data, readiness };
  }),

  matchScore: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), limit: z.number().int().min(1).max(100).default(25), country: z.string().optional() })).query(async ({ input, ctx }) => {
    assertAccess(ctx.user);
    const db = await requireDb();
    const project = await projectForUser(input.projectId, ctx.user.id);
    const profile = profileFromProject(project, ctx.user, await savedProfile(db, ctx.user.id, input.projectId));
    const sources = filterSources(await sourceRows(db), { country: input.country });
    return sources
      .map((source) => ({ source, ...scoreFundingSource(source, project, profile) }))
      .filter((match) => match.score > 0 && match.eligibility !== "unlikely")
      .sort((a, b) => b.score - a.score)
      .slice(0, input.limit);
  }),

  shortlist: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ input, ctx }) => {
    assertAccess(ctx.user);
    const db = await requireDb();
    await projectForUser(input.projectId, ctx.user.id);
    const result = await db.execute(sql`SELECT s.*,fs.organization,fs.country,fs.type,fs.supports,fs.officialSite,
      fm.sourceCategory,fm.deadlineAt,fm.lastVerifiedAt,fm.applicationOpen
      FROM funding_shortlists s JOIN funding_sources fs ON fs.id=s.fundingSourceId
      LEFT JOIN funding_source_metadata fm ON fm.fundingSourceId=fs.id
      WHERE s.userId=${ctx.user.id} AND s.projectId=${input.projectId} ORDER BY s.updatedAt DESC`);
    return rowsFrom(result).map((row) => normaliseFundingSource(row));
  }),

  savedList: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ input, ctx }) => {
    assertAccess(ctx.user);
    const db = await requireDb();
    const result = await db.execute(sql`SELECT fundingSourceId FROM funding_shortlists WHERE userId=${ctx.user.id} AND projectId=${input.projectId}`);
    return rowsFrom(result).map((row) => Number(row.fundingSourceId));
  }),

  toggleSaved: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), sourceId: z.number().int().positive(), saved: z.boolean(), notes: z.string().max(3000).optional() })).mutation(async ({ input, ctx }) => {
    assertAccess(ctx.user);
    const db = await requireDb();
    await projectForUser(input.projectId, ctx.user.id);
    if (input.saved) {
      await db.execute(sql`INSERT INTO funding_shortlists (userId,projectId,fundingSourceId,notes)
        VALUES (${ctx.user.id},${input.projectId},${input.sourceId},${input.notes || null})
        ON DUPLICATE KEY UPDATE notes=VALUES(notes),updatedAt=CURRENT_TIMESTAMP`);
    } else {
      await db.execute(sql`DELETE FROM funding_shortlists WHERE userId=${ctx.user.id} AND projectId=${input.projectId} AND fundingSourceId=${input.sourceId}`);
    }
    return { success: true };
  }),

  drafts: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ input, ctx }) => {
    assertAccess(ctx.user);
    const db = await requireDb();
    const result = await db.execute(sql`SELECT d.*,fs.organization,fs.country,fs.officialSite
      FROM funding_drafts d JOIN funding_sources fs ON fs.id=d.fundingSourceId
      WHERE d.userId=${ctx.user.id} AND d.projectId=${input.projectId} ORDER BY d.updatedAt DESC`);
    return rowsFrom(result).map((row) => ({ ...row, data: parseJson(row.data, {}), readiness: parseJson(row.readiness, {}) }));
  }),

  saveDraft: protectedProcedure.input(z.object({ id: z.number().int().positive().optional(), projectId: z.number().int().positive(), fundingSourceId: z.number().int().positive(), title: z.string().max(255).optional(), data: recordSchema })).mutation(async ({ input, ctx }) => {
    assertAccess(ctx.user);
    const db = await requireDb();
    await projectForUser(input.projectId, ctx.user.id);
    await sourceById(db, input.fundingSourceId);
    const readiness = calculateReadiness(input.data as FundingProfileData);
    if (input.id) {
      await db.execute(sql`UPDATE funding_drafts SET title=${input.title || null},data=${JSON.stringify(input.data)},completeness=${readiness.completionScore},readiness=${JSON.stringify(readiness)},updatedAt=CURRENT_TIMESTAMP
        WHERE id=${input.id} AND userId=${ctx.user.id}`);
      return { success: true, id: input.id, readiness };
    }
    await db.execute(sql`INSERT INTO funding_drafts (userId,projectId,fundingSourceId,title,data,completeness,readiness)
      VALUES (${ctx.user.id},${input.projectId},${input.fundingSourceId},${input.title || null},${JSON.stringify(input.data)},${readiness.completionScore},${JSON.stringify(readiness)})`);
    return { success: true, id: await insertId(db), readiness };
  }),

  deleteDraft: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    assertAccess(ctx.user);
    const db = await requireDb();
    await db.execute(sql`DELETE FROM funding_drafts WHERE id=${input.id} AND userId=${ctx.user.id}`);
    return { success: true };
  }),

  autofillDraft: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), fundingSourceId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    assertAccess(ctx.user);
    const db = await requireDb();
    const project = await projectForUser(input.projectId, ctx.user.id);
    const source = await sourceById(db, input.fundingSourceId);
    const profile = profileFromProject(project, ctx.user, await savedProfile(db, ctx.user.id, input.projectId));
    const draft = {
      ...profile,
      fundingSourceId: source.id,
      fundingOrganization: source.organization,
      fundingCountry: source.country,
      reasonForApplying: [
        source.supports ? `The project aligns with the programme focus on ${source.supports}.` : "",
        profile.milestoneUnlocked ? `Support would unlock ${profile.milestoneUnlocked}.` : "",
      ].filter(Boolean).join(" "),
      fundSpecificNotes: source.tailoringNotes || "",
    };
    return { draft, readiness: calculateReadiness(draft), costCharged: 0, method: "deterministic_project_prefill" };
  }),

  submitApplication: protectedProcedure.input(z.object({
    draftId: z.number().int().positive().optional(),
    projectId: z.number().int().positive().optional(),
    fundingSourceId: z.number().int().positive().optional(),
    data: recordSchema.optional(),
    emailCopy: z.boolean().default(false),
    notes: z.string().max(5000).optional(),
    deadlineAt: z.string().nullable().optional(),
    followUpAt: z.string().nullable().optional(),
  })).mutation(async ({ input, ctx }) => {
    assertAccess(ctx.user);
    const db = await requireDb();
    let projectId = input.projectId;
    let fundingSourceId = input.fundingSourceId;
    let data = input.data as FundingProfileData | undefined;
    if (input.draftId) {
      const result = await db.execute(sql`SELECT * FROM funding_drafts WHERE id=${input.draftId} AND userId=${ctx.user.id} LIMIT 1`);
      const draft = rowsFrom(result)[0];
      if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
      projectId = Number(draft.projectId);
      fundingSourceId = Number(draft.fundingSourceId);
      data = parseJson(draft.data, {});
    }
    if (!projectId || !fundingSourceId || !data) throw new TRPCError({ code: "BAD_REQUEST", message: "Project, funding source and application data are required" });
    await projectForUser(projectId, ctx.user.id);
    const source = await sourceById(db, fundingSourceId);
    const profile = data as FundingProfileData;
    const html = buildWorkingPack(profile, source);
    let emailStatus = input.emailCopy ? "failed" : "not_requested";
    let emailError: string | null = null;
    if (input.emailCopy) {
      const mailer = transporter();
      const recipient = String(profile.contactEmail || ctx.user.email || "").trim();
      if (!mailer) emailError = "Email delivery is not configured. The downloadable files remain available.";
      else if (!recipient) emailError = "No recipient email is available.";
      else {
        try {
          await mailer.sendMail({ from: ENV.emailFromAddress || ENV.gmailUser, to: recipient, subject: `Funding working pack — ${profile.projectTitle || "Project"} → ${source.organization}`, html });
          emailStatus = "sent";
        } catch (error) {
          emailError = error instanceof Error ? error.message : "Email delivery failed";
          logger.errorWithStack("[Funding] email delivery failed", error);
        }
      }
    }
    await db.execute(sql`INSERT INTO funding_applications (userId,projectId,fundingSourceId,draftId,organization,country,projectTitle,status,formData,emailStatus,emailError,notes,deadlineAt,followUpAt)
      VALUES (${ctx.user.id},${projectId},${fundingSourceId},${input.draftId || null},${source.organization},${source.country},${String(profile.projectTitle || "Untitled project")},'submitted',${JSON.stringify(profile)},${emailStatus},${emailError},${input.notes || null},${dateOrNull(input.deadlineAt)},${dateOrNull(input.followUpAt)})`);
    const applicationId = await insertId(db);
    await addEvent(db, { applicationId, userId: ctx.user.id, eventType: "submitted", toStatus: "submitted", note: input.notes || "Application recorded as submitted by the user." });
    return {
      success: true,
      applicationId,
      html,
      emailSent: emailStatus === "sent",
      emailStatus,
      emailError,
      message: emailStatus === "sent" ? "Application recorded and emailed." : "Application recorded. Download remains available; no email was sent.",
    };
  }),

  applicationsList: protectedProcedure.input(z.object({ projectId: z.number().int().positive().optional() }).optional()).query(async ({ input, ctx }) => {
    assertAccess(ctx.user);
    const db = await requireDb();
    const result = input?.projectId
      ? await db.execute(sql`SELECT a.*,fs.officialSite FROM funding_applications a LEFT JOIN funding_sources fs ON fs.id=a.fundingSourceId WHERE a.userId=${ctx.user.id} AND a.projectId=${input.projectId} ORDER BY a.updatedAt DESC`)
      : await db.execute(sql`SELECT a.*,fs.officialSite FROM funding_applications a LEFT JOIN funding_sources fs ON fs.id=a.fundingSourceId WHERE a.userId=${ctx.user.id} ORDER BY a.updatedAt DESC`);
    return rowsFrom(result).map((row) => ({ ...row, formData: parseJson(row.formData, {}) }));
  }),

  applicationEvents: protectedProcedure.input(z.object({ applicationId: z.number().int().positive() })).query(async ({ input, ctx }) => {
    assertAccess(ctx.user);
    const db = await requireDb();
    const result = await db.execute(sql`SELECT e.* FROM funding_application_events e JOIN funding_applications a ON a.id=e.applicationId WHERE e.applicationId=${input.applicationId} AND a.userId=${ctx.user.id} ORDER BY e.createdAt ASC`);
    return rowsFrom(result);
  }),

  setApplicationStatus: protectedProcedure.input(z.object({
    applicationId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
    status: z.enum(STATUSES),
    notes: z.string().max(5000).optional(),
    deadlineAt: z.string().nullable().optional(),
    followUpAt: z.string().nullable().optional(),
  })).mutation(async ({ input, ctx }) => {
    assertAccess(ctx.user);
    const db = await requireDb();
    const id = Number(input.applicationId);
    const currentResult = await db.execute(sql`SELECT status,organization,deadlineAt,followUpAt FROM funding_applications WHERE id=${id} AND userId=${ctx.user.id} LIMIT 1`);
    const current = rowsFrom(currentResult)[0];
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
    const deadline = input.deadlineAt === undefined ? current.deadlineAt : dateOrNull(input.deadlineAt);
    const followUp = input.followUpAt === undefined ? current.followUpAt : dateOrNull(input.followUpAt);
    await db.execute(sql`UPDATE funding_applications SET status=${input.status},notes=COALESCE(${input.notes ?? null},notes),deadlineAt=${deadline},followUpAt=${followUp},updatedAt=CURRENT_TIMESTAMP WHERE id=${id} AND userId=${ctx.user.id}`);
    await addEvent(db, { applicationId: id, userId: ctx.user.id, eventType: current.status === input.status ? "note" : "status_change", fromStatus: current.status, toStatus: input.status, note: input.notes || null });
    if (current.status !== input.status) {
      await createNotification({ userId: ctx.user.id, type: "funding_application", title: `Funding tracker: ${input.status.replace(/_/g, " ")}`, message: `${current.organization} changed from ${String(current.status).replace(/_/g, " ")} to ${input.status.replace(/_/g, " ")}. This is your self-tracked status.`, link: "/funding?tab=applications" }).catch(() => undefined);
    }
    return { success: true };
  }),

  syncReminders: protectedProcedure.mutation(async ({ ctx }) => {
    assertAccess(ctx.user);
    const db = await requireDb();
    const result = await db.execute(sql`SELECT id,organization,projectTitle,deadlineAt,followUpAt FROM funding_applications
      WHERE userId=${ctx.user.id} AND status NOT IN ('accepted','rejected','withdrawn') AND (
        (deadlineAt IS NOT NULL AND deadlineAt BETWEEN NOW() AND DATE_ADD(NOW(),INTERVAL 30 DAY)) OR
        (followUpAt IS NOT NULL AND followUpAt <= DATE_ADD(NOW(),INTERVAL 1 DAY))
      )`);
    let created = 0;
    for (const application of rowsFrom(result)) {
      const due = application.followUpAt || application.deadlineAt;
      const kind = application.followUpAt ? "follow-up" : "deadline";
      const key = `application:${application.id}:${kind}:${new Date(due).toISOString().slice(0, 10)}`;
      const insert = await db.execute(sql`INSERT IGNORE INTO funding_reminder_log (userId,reminderKey) VALUES (${ctx.user.id},${key})`);
      const affected = Number((insert as any)?.[0]?.affectedRows || 0);
      if (affected > 0) {
        created += 1;
        await createNotification({ userId: ctx.user.id, type: "funding_application", title: kind === "follow-up" ? "Funding follow-up due" : "Funding deadline approaching", message: `${application.projectTitle} → ${application.organization}: ${kind} ${new Date(due).toLocaleDateString("en-AU")}.`, link: "/funding?tab=applications" }).catch(() => undefined);
      }
    }
    return { success: true, created };
  }),

  reportListing: protectedProcedure.input(z.object({ fundingSourceId: z.number().int().positive(), reason: z.enum(["wrong_url","closed","deadline_changed","eligibility_changed","duplicate","encoding","other"]), details: z.string().max(5000).optional() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    await db.execute(sql`INSERT INTO funding_listing_reports (fundingSourceId,userId,reason,details) VALUES (${input.fundingSourceId},${ctx.user.id},${input.reason},${input.details || null})`);
    return { success: true };
  }),
});
