import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb, deductCredits } from "./db";
import { fundingSources } from "../drizzle/schema";
import { eq, asc } from "drizzle-orm";
import { Resend } from "resend";
import { ENV } from "./_core/env";
import { CREDIT_COSTS } from "./_core/subscription";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(ENV.resendApiKey);
  return _resend;
}

// ─── Zod schema for the full 13-section application ───────────────────────────
const applicationInputSchema = z.object({
  fundingSourceId: z.number(),
  fundingOrganization: z.string(),
  fundingCountry: z.string(),
  officialSite: z.string().optional(),

  // § 2 — Applicant & Project Identification
  applicantLegalName: z.string().min(1),
  tradingName: z.string().optional(),
  companyCountry: z.string().min(1),
  primaryContactName: z.string().min(1),
  primaryContactEmail: z.string().email(),
  primaryContactPhone: z.string().optional(),
  projectTitle: z.string().min(1),
  workingTitle: z.string().optional(),
  format: z.string(),                         // Feature / Short / Documentary / Animation / Series / Hybrid
  stage: z.string(),                          // Development / Production / Post / Completion / Distribution
  runningTime: z.string().optional(),
  primaryLanguage: z.string().optional(),
  productionCountry: z.string().optional(),
  coProductionTerritories: z.string().optional(),
  genre: z.string(),
  targetAudience: z.string().optional(),
  comparableTitles: z.string().optional(),
  festivalStrategy: z.string().optional(),
  currentStatus: z.string().optional(),

  // § 3 — Story Materials
  logline: z.string().min(10),
  shortSynopsis: z.string().min(50),
  longSynopsis: z.string().optional(),
  treatment: z.string().optional(),
  seriesOverview: z.string().optional(),
  sampleCutNotes: z.string().optional(),

  // § 4 — Creative & Editorial Case
  directorStatement: z.string().optional(),
  producerStatement: z.string().optional(),
  writerStatement: z.string().optional(),
  creativeApproach: z.string().optional(),
  editorialIntention: z.string().optional(),
  culturalConsultation: z.string().optional(),

  // § 5 — Rights, Chain of Title & Clearances
  rightsType: z.string().optional(),          // Original / Adapted / Life rights / etc.
  rightsHolder: z.string().optional(),
  applicantRightsPosition: z.string().optional(), // Owned / Optioned / Licensed / Commissioned
  chainOfTitleDocs: z.string().optional(),
  expiryReversionDates: z.string().optional(),
  lifeRightsReleases: z.string().optional(),
  legalCounsel: z.string().optional(),
  outstandingRightsIssues: z.string().optional(),

  // § 6 — Key Creative & Producing Team
  directorName: z.string().optional(),
  producerName: z.string().optional(),
  writerName: z.string().optional(),
  leadCast: z.string().optional(),
  cinematographer: z.string().optional(),
  editor: z.string().optional(),
  composer: z.string().optional(),
  execProducer: z.string().optional(),
  teamBios: z.string().optional(),

  // § 7 — Budget, Financing & Recoupment
  totalBudget: z.string(),
  projectCurrency: z.string().optional(),
  fundingRequested: z.string(),
  fundingRequestedPercent: z.string().optional(),
  otherFinancingSecured: z.string().optional(),
  otherFinancingPending: z.string().optional(),
  producerCashDeferrals: z.string().optional(),
  taxCredits: z.string().optional(),
  gapShortfall: z.string().optional(),
  recoupmentPosition: z.string().optional(),
  cashflowRequirement: z.string().optional(),
  // Budget top sheet line items
  budgetDevelopment: z.string().optional(),
  budgetAboveTheLine: z.string().optional(),
  budgetProductionCrew: z.string().optional(),
  budgetCastContributors: z.string().optional(),
  budgetTravelAccommodation: z.string().optional(),
  budgetLocationsPermits: z.string().optional(),
  budgetEquipmentRentals: z.string().optional(),
  budgetPostProduction: z.string().optional(),
  budgetMusicArchiveRights: z.string().optional(),
  budgetInsuranceLegalAccounting: z.string().optional(),
  budgetMarketingFestivals: z.string().optional(),
  budgetContingency: z.string().optional(),

  // § 8 — Market, Audience & Distribution Plan
  primaryReleasePathway: z.string().optional(),
  marketAttachments: z.string().optional(),
  audienceStrategy: z.string().optional(),
  comparablePerformance: z.string().optional(),
  territoryFocus: z.string().optional(),
  distributionConversations: z.string().optional(),
  impactOutreachPlan: z.string().optional(),

  // § 9 — Production Readiness
  currentMaterialsComplete: z.string().optional(),
  estimatedPrepStart: z.string().optional(),
  estimatedPrincipalPhotography: z.string().optional(),
  estimatedPostProduction: z.string().optional(),
  keyLocations: z.string().optional(),
  productionRisks: z.string().optional(),
  insuranceEO: z.string().optional(),
  accessibilitySustainability: z.string().optional(),

  // § 10 — Short-Form Portal Answers
  whyTimely: z.string().optional(),
  whyTeamUnique: z.string().min(20),
  whatChangedSinceLastApplication: z.string().optional(),
  whatMilestoneWillFundingUnlock: z.string().optional(),
  biggestCreativeRisk: z.string().optional(),
  biggestFinancingRisk: z.string().optional(),

  // § 11 — Attachment Checklist (booleans)
  hasScript: z.boolean().optional(),
  hasSynopsisTreatment: z.boolean().optional(),
  hasDirectorStatement: z.boolean().optional(),
  hasProducerStatement: z.boolean().optional(),
  hasBudgetTopSheet: z.boolean().optional(),
  hasDetailedBudget: z.boolean().optional(),
  hasFinancePlan: z.boolean().optional(),
  hasProductionSchedule: z.boolean().optional(),
  hasChainOfTitle: z.boolean().optional(),
  hasCVsBios: z.boolean().optional(),
  hasVisualMaterials: z.boolean().optional(),
  hasMarketAttachments: z.boolean().optional(),
  hasSampleFootage: z.boolean().optional(),
  hasConsentLetters: z.boolean().optional(),

  // Misc
  additionalNotes: z.string().optional(),
});

function field(label: string, value?: string | null) {
  if (!value) return "";
  return `<div class="field"><label>${label}</label><div class="val">${value.replace(/\n/g, "<br>")}</div></div>`;
}
function highlight(label: string, value?: string | null) {
  if (!value) return "";
  return `<div class="highlight-box"><div class="label">${label}</div><div class="text">${value.replace(/\n/g, "<br>")}</div></div>`;
}
function section(title: string, content: string) {
  if (!content.trim()) return "";
  return `<div class="section"><div class="section-title">${title}</div>${content}</div>`;
}
function checklist(items: { label: string; checked?: boolean }[]) {
  return items.map(i => `<div class="check-item ${i.checked ? "checked" : ""}">${i.checked ? "✅" : "☐"} ${i.label}</div>`).join("");
}

function buildHtmlEmail(input: z.infer<typeof applicationInputSchema>, userName: string | null | undefined, userId: number): string {
  const displayName = userName ?? "Unknown";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #1a1a1a; background: #f5f5f5; margin: 0; padding: 20px; }
  .container { max-width: 760px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); color: white; padding: 32px 40px; }
  .header h1 { margin: 0 0 6px; font-size: 26px; letter-spacing: -0.5px; }
  .header p { margin: 0; opacity: 0.75; font-size: 13px; }
  .badge { display: inline-block; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 20px; padding: 4px 14px; font-size: 11px; margin-top: 12px; letter-spacing: 0.04em; }
  .body { padding: 32px 40px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 14px; }
  .field { margin-bottom: 10px; }
  .field label { font-size: 11px; color: #9ca3af; display: block; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.05em; }
  .field .val { font-size: 14px; color: #111827; display: block; line-height: 1.5; }
  .highlight-box { background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-bottom: 10px; }
  .highlight-box .label { font-size: 11px; color: #0369a1; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
  .highlight-box .text { font-size: 14px; color: #1e3a5f; line-height: 1.65; }
  .funding-target { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
  .funding-target .org { font-size: 20px; font-weight: 700; color: #92400e; }
  .funding-target .country { font-size: 13px; color: #b45309; margin-top: 2px; }
  .funding-target .site { font-size: 12px; color: #d97706; margin-top: 6px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
  .budget-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  .budget-table th { background: #f3f4f6; text-align: left; padding: 7px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
  .budget-table td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; color: #374151; }
  .budget-table tr:last-child td { font-weight: 700; background: #fef9ee; border-top: 2px solid #fbbf24; }
  .check-item { font-size: 13px; padding: 4px 0; color: #374151; }
  .check-item.checked { color: #059669; }
  .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 18px 40px; font-size: 11px; color: #9ca3af; }
  .notice { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #1d4ed8; margin-bottom: 24px; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>Global Film Funding Application</h1>
    <p>Professional submission package compiled via Virelle Studios</p>
    <div class="badge">Virelle Studios — Film Funding Portal</div>
  </div>
  <div class="body">
    <div class="notice">
      <strong>Professional Working Pack — Important Notice.</strong> This framework is structured around recurring requirements published by representative official bodies, including BFI, Telefilm Canada, Screen Australia, IDFA Bertha Fund, and Doha Film Institute — covering budget, finance plan, rights / chain of title, schedules, and supporting materials. For international co-productions and documentary programmes, additional items such as co-production agreements and registration extracts may be required by the target fund.
      <br><br>
      <strong>Legal declarations, exact upload wording, and submission requirements must be verified against the target fund's live portal before final submission.</strong> The native-language localisation layer is provided as a working framework only — official terminology should be cross-checked against the fund's published guidelines.
      <br><br>
      This document is for manual submission only. Virelle Studios compiles and organises your application package; it does not submit on your behalf. Submit directly to the funder${input.officialSite ? ` at <a href="${input.officialSite}" style="color:#1d4ed8">${input.officialSite}</a>` : ""}.
    </div>

    <div class="funding-target">
      <div class="org">Applying to: ${input.fundingOrganization}</div>
      <div class="country">${input.fundingCountry}</div>
      ${input.officialSite ? `<div class="site">Official site: <a href="${input.officialSite}" style="color:#d97706">${input.officialSite}</a></div>` : ""}
    </div>

    ${section("§ 2 — Applicant & Project Identification",
      `<div class="grid-2">
        ${field("Legal Applicant Name", input.applicantLegalName)}
        ${field("Trading / Company Name", input.tradingName)}
        ${field("Country of Incorporation / Residence", input.companyCountry)}
        ${field("Primary Contact Name", input.primaryContactName)}
        ${field("Primary Contact Email", input.primaryContactEmail)}
        ${field("Mobile / Phone", input.primaryContactPhone)}
        ${field("Project Title", input.projectTitle)}
        ${field("Working Title", input.workingTitle)}
        ${field("Format", input.format)}
        ${field("Stage", input.stage)}
        ${field("Running Time / Episode Count", input.runningTime)}
        ${field("Primary Language(s)", input.primaryLanguage)}
        ${field("Country / Countries of Production", input.productionCountry)}
        ${field("Co-Production Territories", input.coProductionTerritories)}
        ${field("Genre", input.genre)}
        ${field("Target Audience", input.targetAudience)}
      </div>
      ${field("Comparable Titles", input.comparableTitles)}
      ${field("Festival / Market Strategy", input.festivalStrategy)}
      ${field("Current Status", input.currentStatus)}`
    )}

    ${section("§ 3 — Story Materials",
      `${highlight("Logline", input.logline)}
       ${highlight("Short Synopsis (100–250 words)", input.shortSynopsis)}
       ${highlight("Long Synopsis (incl. ending)", input.longSynopsis)}
       ${highlight("Treatment / Director's Treatment", input.treatment)}
       ${highlight("Series Overview (if applicable)", input.seriesOverview)}
       ${highlight("Sample / Current Cut Notes", input.sampleCutNotes)}`
    )}

    ${section("§ 4 — Creative & Editorial Case",
      `${highlight("Director Statement", input.directorStatement)}
       ${highlight("Producer Statement", input.producerStatement)}
       ${highlight("Writer Statement", input.writerStatement)}
       ${highlight("Creative Approach", input.creativeApproach)}
       ${highlight("Editorial Intention", input.editorialIntention)}
       ${highlight("Cultural / Community Consultation", input.culturalConsultation)}`
    )}

    ${section("§ 5 — Rights, Chain of Title & Clearances",
      `<div class="grid-2">
        ${field("Rights Type", input.rightsType)}
        ${field("Rights Holder(s)", input.rightsHolder)}
        ${field("Applicant's Rights Position", input.applicantRightsPosition)}
        ${field("Key Chain-of-Title Documents", input.chainOfTitleDocs)}
        ${field("Expiry / Reversion Dates", input.expiryReversionDates)}
        ${field("Life Rights / Releases Required", input.lifeRightsReleases)}
        ${field("Legal Counsel", input.legalCounsel)}
      </div>
      ${highlight("Outstanding Rights Issues", input.outstandingRightsIssues)}`
    )}

    ${section("§ 6 — Key Creative & Producing Team",
      `<table class="budget-table">
        <thead><tr><th>Role</th><th>Name</th></tr></thead>
        <tbody>
          ${input.directorName ? `<tr><td>Director</td><td>${input.directorName}</td></tr>` : ""}
          ${input.producerName ? `<tr><td>Producer</td><td>${input.producerName}</td></tr>` : ""}
          ${input.writerName ? `<tr><td>Writer / Screenwriter</td><td>${input.writerName}</td></tr>` : ""}
          ${input.leadCast ? `<tr><td>Lead Cast / Subject</td><td>${input.leadCast}</td></tr>` : ""}
          ${input.cinematographer ? `<tr><td>Cinematographer</td><td>${input.cinematographer}</td></tr>` : ""}
          ${input.editor ? `<tr><td>Editor</td><td>${input.editor}</td></tr>` : ""}
          ${input.composer ? `<tr><td>Composer</td><td>${input.composer}</td></tr>` : ""}
          ${input.execProducer ? `<tr><td>Exec Producer / Co-Producer</td><td>${input.execProducer}</td></tr>` : ""}
        </tbody>
      </table>
      ${highlight("Team Bios / Company Profile", input.teamBios)}`
    )}

    ${section("§ 7 — Budget, Financing & Recoupment",
      `<div class="grid-2">
        ${field("Project Currency", input.projectCurrency || "USD")}
        ${field("Total Project Budget", input.totalBudget)}
        ${field("Funding Requested from This Fund", input.fundingRequested)}
        ${field("Funding Request as % of Budget", input.fundingRequestedPercent)}
        ${field("Other Financing Secured", input.otherFinancingSecured)}
        ${field("Other Financing Pending", input.otherFinancingPending)}
        ${field("Producer Cash / Deferrals / In-Kind", input.producerCashDeferrals)}
        ${field("Tax Credits / Rebates", input.taxCredits)}
        ${field("Gap / Shortfall", input.gapShortfall)}
        ${field("Cashflow Requirement", input.cashflowRequirement)}
      </div>
      ${highlight("Recoupment Position", input.recoupmentPosition)}
      ${(input.budgetDevelopment || input.budgetAboveTheLine || input.budgetProductionCrew || input.budgetPostProduction || input.budgetContingency) ? `
      <div style="margin-top:16px">
        <div class="section-title" style="margin-bottom:8px">Budget Top Sheet</div>
        <table class="budget-table">
          <thead><tr><th>Category</th><th>Amount (${input.projectCurrency || "USD"})</th></tr></thead>
          <tbody>
            ${input.budgetDevelopment ? `<tr><td>Development</td><td>${input.budgetDevelopment}</td></tr>` : ""}
            ${input.budgetAboveTheLine ? `<tr><td>Above-the-Line</td><td>${input.budgetAboveTheLine}</td></tr>` : ""}
            ${input.budgetProductionCrew ? `<tr><td>Production Crew</td><td>${input.budgetProductionCrew}</td></tr>` : ""}
            ${input.budgetCastContributors ? `<tr><td>Cast / Contributors</td><td>${input.budgetCastContributors}</td></tr>` : ""}
            ${input.budgetTravelAccommodation ? `<tr><td>Travel & Accommodation</td><td>${input.budgetTravelAccommodation}</td></tr>` : ""}
            ${input.budgetLocationsPermits ? `<tr><td>Locations / Permits</td><td>${input.budgetLocationsPermits}</td></tr>` : ""}
            ${input.budgetEquipmentRentals ? `<tr><td>Equipment / Rentals</td><td>${input.budgetEquipmentRentals}</td></tr>` : ""}
            ${input.budgetPostProduction ? `<tr><td>Post-Production</td><td>${input.budgetPostProduction}</td></tr>` : ""}
            ${input.budgetMusicArchiveRights ? `<tr><td>Music / Archive / Rights</td><td>${input.budgetMusicArchiveRights}</td></tr>` : ""}
            ${input.budgetInsuranceLegalAccounting ? `<tr><td>Insurance / Legal / Accounting</td><td>${input.budgetInsuranceLegalAccounting}</td></tr>` : ""}
            ${input.budgetMarketingFestivals ? `<tr><td>Marketing / Festivals</td><td>${input.budgetMarketingFestivals}</td></tr>` : ""}
            ${input.budgetContingency ? `<tr><td>Contingency</td><td>${input.budgetContingency}</td></tr>` : ""}
            <tr><td><strong>TOTAL</strong></td><td><strong>${input.totalBudget}</strong></td></tr>
          </tbody>
        </table>
      </div>` : ""}`
    )}

    ${section("§ 8 — Market, Audience & Distribution Plan",
      `${field("Primary Release Pathway", input.primaryReleasePathway)}
       ${field("Market Attachments", input.marketAttachments)}
       ${field("Audience Strategy", input.audienceStrategy)}
       ${field("Comparable Performance", input.comparablePerformance)}
       ${field("Territory Focus", input.territoryFocus)}
       ${field("Distribution / Sales Conversations", input.distributionConversations)}
       ${highlight("Impact / Outreach Plan", input.impactOutreachPlan)}`
    )}

    ${section("§ 9 — Production Readiness",
      `<div class="grid-2">
        ${field("Current Materials Complete", input.currentMaterialsComplete)}
        ${field("Estimated Prep Start", input.estimatedPrepStart)}
        ${field("Estimated Principal Photography", input.estimatedPrincipalPhotography)}
        ${field("Estimated Post-Production", input.estimatedPostProduction)}
        ${field("Key Locations", input.keyLocations)}
        ${field("Insurance & E&O Status", input.insuranceEO)}
        ${field("Accessibility & Sustainability", input.accessibilitySustainability)}
      </div>
      ${highlight("Production Risks", input.productionRisks)}`
    )}

    ${section("§ 10 — Short-Form Portal Answers",
      `${highlight("Why is this project timely now?", input.whyTimely)}
       ${highlight("Why is this team uniquely positioned to make it?", input.whyTeamUnique)}
       ${highlight("What changed since the last application or draft?", input.whatChangedSinceLastApplication)}
       ${highlight("What specific milestone will this funding unlock?", input.whatMilestoneWillFundingUnlock)}
       ${highlight("Biggest creative risk and how you will manage it", input.biggestCreativeRisk)}
       ${highlight("Biggest financing risk and how you will close it", input.biggestFinancingRisk)}`
    )}

    ${section("§ 11 — Attachment Checklist",
      `<div style="columns:2;gap:24px">
        ${checklist([
          { label: "Script / screenplay or sample scenes", checked: input.hasScript },
          { label: "Synopsis and treatment", checked: input.hasSynopsisTreatment },
          { label: "Director statement", checked: input.hasDirectorStatement },
          { label: "Producer statement / note", checked: input.hasProducerStatement },
          { label: "Budget top sheet", checked: input.hasBudgetTopSheet },
          { label: "Detailed budget", checked: input.hasDetailedBudget },
          { label: "Finance plan", checked: input.hasFinancePlan },
          { label: "Production schedule", checked: input.hasProductionSchedule },
          { label: "Chain of title memo + rights docs", checked: input.hasChainOfTitle },
          { label: "CVs / bios and company profile", checked: input.hasCVsBios },
          { label: "Visual materials (lookbook, mood board)", checked: input.hasVisualMaterials },
          { label: "Market attachments / LOIs", checked: input.hasMarketAttachments },
          { label: "Sample footage / rough cut / teaser", checked: input.hasSampleFootage },
          { label: "Consent / release / access letters", checked: input.hasConsentLetters },
        ])}
      </div>`
    )}

    ${input.additionalNotes ? section("Additional Notes", highlight("", input.additionalNotes)) : ""}

  </div>
  <div class="footer">
    Compiled by Virelle Studios for: ${displayName} (User ID: ${userId}) &middot; ${new Date().toUTCString()}<br>
    This document was generated by the Virelle Studios Film Funding Portal. Submit directly to the funder.
  </div>
</div>
</body>
</html>`;
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

  // Submit a full 13-section funding application via email
  submitApplication: protectedProcedure
    .input(applicationInputSchema)
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;

      // Deduct credits before compiling and sending the application
      await deductCredits(user.id, CREDIT_COSTS.funding_app_submit.cost, "funding_app_submit", `Funding application: ${input.projectTitle} → ${input.fundingOrganization}`);

      const htmlBody = buildHtmlEmail(input, user.name ?? user.email, user.id);

      try {
        const resend = getResend();
        // Send to the applicant's email
        await resend.emails.send({
          from: ENV.emailFromAddress,
          to: input.primaryContactEmail,
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
        // Don't fail the mutation — form was submitted, email is best-effort
      }
      return { success: true, message: "Application compiled and sent to your email." };
    }),
});
