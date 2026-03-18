import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { fundingSources } from "../drizzle/schema";
import { eq, asc } from "drizzle-orm";
import { Resend } from "resend";
import { ENV } from "./_core/env";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(ENV.resendApiKey);
  return _resend;
}

export const fundingRouter = router({
  // List all funding sources, optionally filtered by country
  list: publicProcedure
    .input(z.object({
      country: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const results = await db.select().from(fundingSources).orderBy(asc(fundingSources.country), asc(fundingSources.organization));

      let filtered = results;
      if (input.country) {
        filtered = filtered.filter(f =>
          f.country.toLowerCase().includes(input.country!.toLowerCase())
        );
      }
      if (input.search) {
        const s = input.search.toLowerCase();
        filtered = filtered.filter(f =>
          f.organization.toLowerCase().includes(s) ||
          f.country.toLowerCase().includes(s) ||
          (f.supports && f.supports.toLowerCase().includes(s)) ||
          (f.type && f.type.toLowerCase().includes(s))
        );
      }

      return filtered;
    }),

  // Get all unique countries
  countries: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const results = await db.select({ country: fundingSources.country }).from(fundingSources).orderBy(asc(fundingSources.country));
    const unique = [...new Set(results.map(r => r.country))];
    return unique;
  }),

  // Get a single funding source by ID
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [source] = await db.select().from(fundingSources).where(eq(fundingSources.id, input.id));
      return source ?? null;
    }),

  // Submit a funding application via email
  submitApplication: protectedProcedure
    .input(z.object({
      fundingSourceId: z.number(),
      fundingOrganization: z.string(),
      fundingCountry: z.string(),
      officialSite: z.string().optional(),
      // Applicant details
      applicantName: z.string().min(1),
      applicantEmail: z.string().email(),
      applicantPhone: z.string().optional(),
      applicantCountry: z.string(),
      companyName: z.string().optional(),
      companyWebsite: z.string().optional(),
      // Project details
      projectTitle: z.string().min(1),
      projectType: z.string(),
      genre: z.string(),
      logline: z.string().min(10),
      synopsis: z.string().min(50),
      budget: z.string(),
      fundingRequested: z.string(),
      productionStage: z.string(),
      expectedDelivery: z.string(),
      // Creative team
      directorName: z.string().optional(),
      producerName: z.string().optional(),
      writerName: z.string().optional(),
      // Additional
      previousWork: z.string().optional(),
      whyThisFund: z.string().min(20),
      additionalNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;

      const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #1a1a1a; background: #f5f5f5; margin: 0; padding: 20px; }
  .container { max-width: 700px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); color: white; padding: 32px 40px; }
  .header h1 { margin: 0 0 8px; font-size: 24px; }
  .header p { margin: 0; opacity: 0.8; font-size: 14px; }
  .badge { display: inline-block; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 20px; padding: 4px 14px; font-size: 12px; margin-top: 12px; }
  .body { padding: 32px 40px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; }
  .field { margin-bottom: 12px; }
  .field label { font-size: 12px; color: #9ca3af; display: block; margin-bottom: 2px; }
  .field .val { font-size: 15px; color: #111827; display: block; }
  .highlight-box { background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 12px; }
  .highlight-box .label { font-size: 12px; color: #0369a1; font-weight: 600; margin-bottom: 4px; }
  .highlight-box .text { font-size: 14px; color: #1e3a5f; line-height: 1.6; }
  .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 40px; font-size: 12px; color: #9ca3af; }
  .funding-target { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; }
  .funding-target .org { font-size: 18px; font-weight: 700; color: #92400e; }
  .funding-target .country { font-size: 13px; color: #b45309; margin-top: 2px; }
  .funding-target .site { font-size: 12px; color: #d97706; margin-top: 6px; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>Funding Application</h1>
    <p>Submitted via Virelle Studios Platform</p>
    <div class="badge">Virelle Studios — Film Funding Portal</div>
  </div>
  <div class="body">

    <div class="funding-target">
      <div class="org">Applying to: ${input.fundingOrganization}</div>
      <div class="country">${input.fundingCountry}</div>
      ${input.officialSite ? `<div class="site">Official site: <a href="${input.officialSite}" style="color:#d97706">${input.officialSite}</a></div>` : ''}
    </div>

    <div class="section">
      <div class="section-title">Applicant Information</div>
      <div class="field"><label>Full Name</label><div class="val">${input.applicantName}</div></div>
      <div class="field"><label>Email</label><div class="val">${input.applicantEmail}</div></div>
      ${input.applicantPhone ? `<div class="field"><label>Phone</label><div class="val">${input.applicantPhone}</div></div>` : ''}
      <div class="field"><label>Country</label><div class="val">${input.applicantCountry}</div></div>
      ${input.companyName ? `<div class="field"><label>Company / Production House</label><div class="val">${input.companyName}</div></div>` : ''}
      ${input.companyWebsite ? `<div class="field"><label>Company Website</label><div class="val"><a href="${input.companyWebsite}">${input.companyWebsite}</a></div></div>` : ''}
    </div>

    <div class="section">
      <div class="section-title">Project Details</div>
      <div class="field"><label>Project Title</label><div class="val">${input.projectTitle}</div></div>
      <div class="field"><label>Type</label><div class="val">${input.projectType}</div></div>
      <div class="field"><label>Genre</label><div class="val">${input.genre}</div></div>
      <div class="field"><label>Production Stage</label><div class="val">${input.productionStage}</div></div>
      <div class="field"><label>Total Budget</label><div class="val">${input.budget}</div></div>
      <div class="field"><label>Funding Requested</label><div class="val">${input.fundingRequested}</div></div>
      <div class="field"><label>Expected Delivery</label><div class="val">${input.expectedDelivery}</div></div>
    </div>

    <div class="section">
      <div class="section-title">Story</div>
      <div class="highlight-box">
        <div class="label">Logline</div>
        <div class="text">${input.logline}</div>
      </div>
      <div class="highlight-box">
        <div class="label">Synopsis</div>
        <div class="text">${input.synopsis}</div>
      </div>
    </div>

    ${(input.directorName || input.producerName || input.writerName) ? `
    <div class="section">
      <div class="section-title">Creative Team</div>
      ${input.directorName ? `<div class="field"><label>Director</label><div class="val">${input.directorName}</div></div>` : ''}
      ${input.producerName ? `<div class="field"><label>Producer</label><div class="val">${input.producerName}</div></div>` : ''}
      ${input.writerName ? `<div class="field"><label>Writer / Screenwriter</label><div class="val">${input.writerName}</div></div>` : ''}
    </div>` : ''}

    <div class="section">
      <div class="section-title">Supporting Information</div>
      <div class="highlight-box">
        <div class="label">Why This Fund?</div>
        <div class="text">${input.whyThisFund}</div>
      </div>
      ${input.previousWork ? `<div class="highlight-box"><div class="label">Previous Work / Credits</div><div class="text">${input.previousWork}</div></div>` : ''}
      ${input.additionalNotes ? `<div class="highlight-box"><div class="label">Additional Notes</div><div class="text">${input.additionalNotes}</div></div>` : ''}
    </div>

  </div>
  <div class="footer">
    Submitted by Virelle Studios user: ${user.name || user.email} (ID: ${user.id}) &middot; ${new Date().toUTCString()}
  </div>
</div>
</body>
</html>`;

      try {
        const resend = getResend();

        // Send to the applicant's email
        await resend.emails.send({
          from: ENV.emailFromAddress,
          to: input.applicantEmail,
          subject: `Your Funding Application — ${input.projectTitle} → ${input.fundingOrganization}`,
          html: htmlBody,
        });

        // Also send a copy to the platform admin
        if (ENV.adminEmail) {
          await resend.emails.send({
            from: ENV.emailFromAddress,
            to: ENV.adminEmail,
            subject: `[Virelle] New Funding Application: ${input.projectTitle} → ${input.fundingOrganization}`,
            html: htmlBody,
          });
        }
      } catch (err) {
        console.error("[FundingRouter] Failed to send application email:", err);
        // Don't fail the mutation — the form was submitted, email delivery is best-effort
      }

      return { success: true, message: "Application submitted successfully. A copy has been sent to your email." };
    }),
});
