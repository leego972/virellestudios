import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Search,
  Globe,
  ExternalLink,
  DollarSign,
  Filter,
  X,
  Send,
  Loader2,
  ChevronRight,
  Building2,
  MapPin,
  Layers,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import type { FundingSource } from "../../../drizzle/schema";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AppForm {
  // § 2 — Applicant & Project Identification
  applicantLegalName: string;
  tradingName: string;
  companyCountry: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  projectTitle: string;
  workingTitle: string;
  format: string;
  stage: string;
  runningTime: string;
  primaryLanguage: string;
  productionCountry: string;
  coProductionTerritories: string;
  genre: string;
  targetAudience: string;
  comparableTitles: string;
  festivalStrategy: string;
  currentStatus: string;
  // § 3 — Story Materials
  logline: string;
  shortSynopsis: string;
  longSynopsis: string;
  treatment: string;
  seriesOverview: string;
  sampleCutNotes: string;
  // § 4 — Creative & Editorial Case
  directorStatement: string;
  producerStatement: string;
  writerStatement: string;
  creativeApproach: string;
  editorialIntention: string;
  culturalConsultation: string;
  // § 5 — Rights, Chain of Title & Clearances
  rightsType: string;
  rightsHolder: string;
  applicantRightsPosition: string;
  chainOfTitleDocs: string;
  expiryReversionDates: string;
  lifeRightsReleases: string;
  legalCounsel: string;
  outstandingRightsIssues: string;
  // § 6 — Key Creative & Producing Team
  directorName: string;
  producerName: string;
  writerName: string;
  leadCast: string;
  cinematographer: string;
  editor: string;
  composer: string;
  execProducer: string;
  teamBios: string;
  // § 7 — Budget, Financing & Recoupment
  totalBudget: string;
  projectCurrency: string;
  fundingRequested: string;
  fundingRequestedPercent: string;
  otherFinancingSecured: string;
  otherFinancingPending: string;
  producerCashDeferrals: string;
  taxCredits: string;
  gapShortfall: string;
  recoupmentPosition: string;
  cashflowRequirement: string;
  budgetDevelopment: string;
  budgetAboveTheLine: string;
  budgetProductionCrew: string;
  budgetCastContributors: string;
  budgetTravelAccommodation: string;
  budgetLocationsPermits: string;
  budgetEquipmentRentals: string;
  budgetPostProduction: string;
  budgetMusicArchiveRights: string;
  budgetInsuranceLegalAccounting: string;
  budgetMarketingFestivals: string;
  budgetContingency: string;
  // § 8 — Market, Audience & Distribution Plan
  primaryReleasePathway: string;
  marketAttachments: string;
  audienceStrategy: string;
  comparablePerformance: string;
  territoryFocus: string;
  distributionConversations: string;
  impactOutreachPlan: string;
  // § 9 — Production Readiness
  currentMaterialsComplete: string;
  estimatedPrepStart: string;
  estimatedPrincipalPhotography: string;
  estimatedPostProduction: string;
  keyLocations: string;
  productionRisks: string;
  insuranceEO: string;
  accessibilitySustainability: string;
  // § 10 — Short-Form Portal Answers
  whyTimely: string;
  whyTeamUnique: string;
  whatChangedSinceLastApplication: string;
  whatMilestoneWillFundingUnlock: string;
  biggestCreativeRisk: string;
  biggestFinancingRisk: string;
  // § 11 — Attachment Checklist
  hasScript: boolean;
  hasSynopsisTreatment: boolean;
  hasDirectorStatement: boolean;
  hasProducerStatement: boolean;
  hasBudgetTopSheet: boolean;
  hasDetailedBudget: boolean;
  hasFinancePlan: boolean;
  hasProductionSchedule: boolean;
  hasChainOfTitle: boolean;
  hasCVsBios: boolean;
  hasVisualMaterials: boolean;
  hasMarketAttachments: boolean;
  hasSampleFootage: boolean;
  hasConsentLetters: boolean;
  // Misc
  additionalNotes: string;
}

const EMPTY_FORM: AppForm = {
  applicantLegalName: "", tradingName: "", companyCountry: "",
  primaryContactName: "", primaryContactEmail: "", primaryContactPhone: "",
  projectTitle: "", workingTitle: "", format: "Feature Film", stage: "Development",
  runningTime: "", primaryLanguage: "", productionCountry: "", coProductionTerritories: "",
  genre: "", targetAudience: "", comparableTitles: "", festivalStrategy: "", currentStatus: "",
  logline: "", shortSynopsis: "", longSynopsis: "", treatment: "", seriesOverview: "", sampleCutNotes: "",
  directorStatement: "", producerStatement: "", writerStatement: "", creativeApproach: "",
  editorialIntention: "", culturalConsultation: "",
  rightsType: "", rightsHolder: "", applicantRightsPosition: "", chainOfTitleDocs: "",
  expiryReversionDates: "", lifeRightsReleases: "", legalCounsel: "", outstandingRightsIssues: "",
  directorName: "", producerName: "", writerName: "", leadCast: "", cinematographer: "",
  editor: "", composer: "", execProducer: "", teamBios: "",
  totalBudget: "", projectCurrency: "USD", fundingRequested: "", fundingRequestedPercent: "",
  otherFinancingSecured: "", otherFinancingPending: "", producerCashDeferrals: "", taxCredits: "",
  gapShortfall: "", recoupmentPosition: "", cashflowRequirement: "",
  budgetDevelopment: "", budgetAboveTheLine: "", budgetProductionCrew: "", budgetCastContributors: "",
  budgetTravelAccommodation: "", budgetLocationsPermits: "", budgetEquipmentRentals: "",
  budgetPostProduction: "", budgetMusicArchiveRights: "", budgetInsuranceLegalAccounting: "",
  budgetMarketingFestivals: "", budgetContingency: "",
  primaryReleasePathway: "", marketAttachments: "", audienceStrategy: "", comparablePerformance: "",
  territoryFocus: "", distributionConversations: "", impactOutreachPlan: "",
  currentMaterialsComplete: "", estimatedPrepStart: "", estimatedPrincipalPhotography: "",
  estimatedPostProduction: "", keyLocations: "", productionRisks: "", insuranceEO: "",
  accessibilitySustainability: "",
  whyTimely: "", whyTeamUnique: "", whatChangedSinceLastApplication: "",
  whatMilestoneWillFundingUnlock: "", biggestCreativeRisk: "", biggestFinancingRisk: "",
  hasScript: false, hasSynopsisTreatment: false, hasDirectorStatement: false,
  hasProducerStatement: false, hasBudgetTopSheet: false, hasDetailedBudget: false,
  hasFinancePlan: false, hasProductionSchedule: false, hasChainOfTitle: false,
  hasCVsBios: false, hasVisualMaterials: false, hasMarketAttachments: false,
  hasSampleFootage: false, hasConsentLetters: false,
  additionalNotes: "",
};

// ─── HTML document builder for download ───────────────────────────────────────

function buildDownloadHtml(form: AppForm, source: FundingSource): string {
  const f = (label: string, val: string) =>
    val ? `<div class="field"><span class="label">${label}</span><span class="val">${val.replace(/\n/g, "<br>")}</span></div>` : "";
  const h = (label: string, val: string) =>
    val ? `<div class="highlight"><div class="hl-label">${label}</div><div class="hl-text">${val.replace(/\n/g, "<br>")}</div></div>` : "";
  const sec = (title: string, body: string) =>
    body.trim() ? `<div class="section"><div class="sec-title">${title}</div>${body}</div>` : "";
  const chk = (label: string, checked: boolean) =>
    `<div class="chk ${checked ? "done" : ""}">${checked ? "✅" : "☐"} ${label}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Funding Application — ${form.projectTitle} → ${source.organization}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', Arial, sans-serif; background: #f4f4f5; color: #18181b; font-size: 14px; line-height: 1.6; }
  .page { max-width: 820px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
  .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f3460 100%); color: #fff; padding: 40px 48px 32px; }
  .header h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 4px; }
  .header .sub { font-size: 13px; opacity: 0.7; margin-bottom: 16px; }
  .header .badge { display: inline-block; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25); border-radius: 20px; padding: 4px 14px; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
  .target-box { margin: 32px 48px 0; background: #fffbeb; border: 1px solid #f59e0b; border-radius: 10px; padding: 18px 22px; }
  .target-box .org { font-size: 20px; font-weight: 700; color: #92400e; }
  .target-box .country { font-size: 13px; color: #b45309; margin-top: 3px; }
  .target-box .site { font-size: 12px; color: #d97706; margin-top: 6px; }
  .notice { margin: 20px 48px 0; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #1d4ed8; }
  .body { padding: 32px 48px 48px; }
  .section { margin-bottom: 32px; }
  .sec-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #71717a; border-bottom: 1px solid #e4e4e7; padding-bottom: 8px; margin-bottom: 16px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 32px; }
  .field { margin-bottom: 12px; }
  .label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: #a1a1aa; margin-bottom: 2px; }
  .val { display: block; font-size: 14px; color: #18181b; }
  .highlight { background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-bottom: 12px; }
  .hl-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: #0369a1; font-weight: 700; margin-bottom: 5px; }
  .hl-text { font-size: 14px; color: #1e3a5f; line-height: 1.7; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
  th { background: #f4f4f5; text-align: left; padding: 8px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: #71717a; border-bottom: 2px solid #e4e4e7; }
  td { padding: 8px 12px; border-bottom: 1px solid #f4f4f5; }
  tr.total td { font-weight: 700; background: #fefce8; border-top: 2px solid #f59e0b; }
  .chk { font-size: 13px; padding: 4px 0; color: #52525b; }
  .chk.done { color: #059669; font-weight: 500; }
  .chk-grid { columns: 2; gap: 24px; }
  .footer { background: #fafafa; border-top: 1px solid #e4e4e7; padding: 18px 48px; font-size: 11px; color: #a1a1aa; }
  @media print { body { background: #fff; } .page { box-shadow: none; margin: 0; border-radius: 0; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>${source.packTitle || "Global Film Funding Application"}</h1>
    <div class="sub">Professional submission package compiled via Virelle Studios${source.packType ? " · " + source.packType : ""}</div>
    <div class="badge">Virelle Studios — Film Funding Portal</div>
  </div>

  <div class="target-box">
    <div class="org">Applying to: ${source.organization}</div>
    <div class="country">${source.country}${source.type ? " · " + source.type : ""}${source.primaryLanguage ? " · Application language: " + source.primaryLanguage : ""}</div>
    ${source.officialSite ? `<div class="site">Official site: <a href="${source.officialSite}" style="color:#d97706">${source.officialSite}</a></div>` : ""}
  </div>

  ${source.tailoringNotes ? `<div style="margin:16px 48px 0;background:#faf5ff;border:1px solid #c4b5fd;border-radius:8px;padding:14px 18px;font-size:12px;color:#5b21b6">
    <strong style="display:block;margin-bottom:4px;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;">Fund-Specific Tailoring Notes</strong>
    ${source.tailoringNotes}
  </div>` : ""}

  ${source.recommendedAttachments ? `<div style="margin:12px 48px 0;background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:14px 18px;font-size:12px;color:#92400e">
    <strong style="display:block;margin-bottom:4px;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;">Recommended Attachments for ${source.organization}</strong>
    ${source.recommendedAttachments}
  </div>` : ""}

  <div class="notice">
    <strong>Professional Working Pack — Important Notice.</strong> This framework is structured around recurring requirements published by representative official bodies, including BFI, Telefilm Canada, Screen Australia, IDFA Bertha Fund, and Doha Film Institute — covering budget, finance plan, rights / chain of title, schedules, and supporting materials. For international co-productions and documentary programmes, additional items such as co-production agreements and registration extracts may be required by the target fund.
    <br><br>
    <strong>Legal declarations, exact upload wording, and submission requirements must be verified against the target fund's live portal before final submission.</strong> The native-language localisation layer is provided as a working framework only — official terminology should be cross-checked against the fund's published guidelines.
    <br><br>
    This document is for manual submission only. Virelle Studios compiles and organises your application package; it does not submit on your behalf. Each funding body has its own portal, page limits, and upload rules.
  </div>

  <div class="body">

    ${sec("§ 2 — Applicant & Project Identification", `
      <div class="grid-2">
        ${f("Legal Applicant Name", form.applicantLegalName)}
        ${f("Trading / Company Name", form.tradingName)}
        ${f("Country of Incorporation / Residence", form.companyCountry)}
        ${f("Primary Contact Name", form.primaryContactName)}
        ${f("Primary Contact Email", form.primaryContactEmail)}
        ${f("Mobile / Phone", form.primaryContactPhone)}
        ${f("Project Title", form.projectTitle)}
        ${f("Working / Alternate Title", form.workingTitle)}
        ${f("Format", form.format)}
        ${f("Stage", form.stage)}
        ${f("Running Time / Episode Count", form.runningTime)}
        ${f("Primary Language(s)", form.primaryLanguage)}
        ${f("Country / Countries of Production", form.productionCountry)}
        ${f("Co-Production Territories", form.coProductionTerritories)}
        ${f("Genre", form.genre)}
        ${f("Target Audience", form.targetAudience)}
      </div>
      ${f("Comparable Titles", form.comparableTitles)}
      ${f("Festival / Market Strategy", form.festivalStrategy)}
      ${f("Current Status", form.currentStatus)}
    `)}

    ${sec("§ 3 — Story Materials", `
      ${h("Logline", form.logline)}
      ${h("Short Synopsis (100–250 words)", form.shortSynopsis)}
      ${h("Long Synopsis (including ending)", form.longSynopsis)}
      ${h("Treatment / Director's Treatment", form.treatment)}
      ${h("Series Overview (if applicable)", form.seriesOverview)}
      ${h("Sample / Current Cut Notes", form.sampleCutNotes)}
    `)}

    ${sec("§ 4 — Creative & Editorial Case", `
      ${h("Director Statement", form.directorStatement)}
      ${h("Producer Statement", form.producerStatement)}
      ${h("Writer Statement", form.writerStatement)}
      ${h("Creative Approach", form.creativeApproach)}
      ${h("Editorial Intention", form.editorialIntention)}
      ${h("Cultural / Community Consultation", form.culturalConsultation)}
    `)}

    ${sec("§ 5 — Rights, Chain of Title & Clearances", `
      <div class="grid-2">
        ${f("Rights Type", form.rightsType)}
        ${f("Rights Holder(s)", form.rightsHolder)}
        ${f("Applicant's Rights Position", form.applicantRightsPosition)}
        ${f("Key Chain-of-Title Documents", form.chainOfTitleDocs)}
        ${f("Expiry / Reversion Dates", form.expiryReversionDates)}
        ${f("Life Rights / Releases Required", form.lifeRightsReleases)}
        ${f("Legal Counsel", form.legalCounsel)}
      </div>
      ${h("Outstanding Rights Issues", form.outstandingRightsIssues)}
    `)}

    ${sec("§ 6 — Key Creative & Producing Team", `
      <table>
        <thead><tr><th>Role</th><th>Name</th></tr></thead>
        <tbody>
          ${form.directorName ? `<tr><td>Director</td><td>${form.directorName}</td></tr>` : ""}
          ${form.producerName ? `<tr><td>Producer</td><td>${form.producerName}</td></tr>` : ""}
          ${form.writerName ? `<tr><td>Writer / Screenwriter</td><td>${form.writerName}</td></tr>` : ""}
          ${form.leadCast ? `<tr><td>Lead Cast / Subject</td><td>${form.leadCast}</td></tr>` : ""}
          ${form.cinematographer ? `<tr><td>Cinematographer / Director of Photography</td><td>${form.cinematographer}</td></tr>` : ""}
          ${form.editor ? `<tr><td>Editor</td><td>${form.editor}</td></tr>` : ""}
          ${form.composer ? `<tr><td>Composer</td><td>${form.composer}</td></tr>` : ""}
          ${form.execProducer ? `<tr><td>Executive Producer / Co-Producer</td><td>${form.execProducer}</td></tr>` : ""}
        </tbody>
      </table>
      ${h("Team Bios / Company Profile", form.teamBios)}
    `)}

    ${sec("§ 7 — Budget, Financing & Recoupment", `
      <div class="grid-2">
        ${f("Project Currency", form.projectCurrency || "USD")}
        ${f("Total Project Budget", form.totalBudget)}
        ${f("Funding Requested from This Fund", form.fundingRequested)}
        ${f("Funding Request as % of Budget", form.fundingRequestedPercent)}
        ${f("Other Financing Secured", form.otherFinancingSecured)}
        ${f("Other Financing Pending", form.otherFinancingPending)}
        ${f("Producer Cash / Deferrals / In-Kind", form.producerCashDeferrals)}
        ${f("Tax Credits / Rebates", form.taxCredits)}
        ${f("Gap / Shortfall", form.gapShortfall)}
        ${f("Cashflow Requirement", form.cashflowRequirement)}
      </div>
      ${h("Recoupment Position", form.recoupmentPosition)}
      ${(form.budgetDevelopment || form.budgetAboveTheLine || form.budgetProductionCrew || form.budgetPostProduction || form.budgetContingency) ? `
        <div style="margin-top:20px">
          <div class="sec-title" style="margin-bottom:8px">Budget Top Sheet</div>
          <table>
            <thead><tr><th>Category</th><th>Amount (${form.projectCurrency || "USD"})</th></tr></thead>
            <tbody>
              ${form.budgetDevelopment ? `<tr><td>Development</td><td>${form.budgetDevelopment}</td></tr>` : ""}
              ${form.budgetAboveTheLine ? `<tr><td>Above-the-Line</td><td>${form.budgetAboveTheLine}</td></tr>` : ""}
              ${form.budgetProductionCrew ? `<tr><td>Production Crew</td><td>${form.budgetProductionCrew}</td></tr>` : ""}
              ${form.budgetCastContributors ? `<tr><td>Cast / Contributors</td><td>${form.budgetCastContributors}</td></tr>` : ""}
              ${form.budgetTravelAccommodation ? `<tr><td>Travel & Accommodation</td><td>${form.budgetTravelAccommodation}</td></tr>` : ""}
              ${form.budgetLocationsPermits ? `<tr><td>Locations / Permits</td><td>${form.budgetLocationsPermits}</td></tr>` : ""}
              ${form.budgetEquipmentRentals ? `<tr><td>Equipment / Rentals</td><td>${form.budgetEquipmentRentals}</td></tr>` : ""}
              ${form.budgetPostProduction ? `<tr><td>Post-Production</td><td>${form.budgetPostProduction}</td></tr>` : ""}
              ${form.budgetMusicArchiveRights ? `<tr><td>Music / Archive / Rights</td><td>${form.budgetMusicArchiveRights}</td></tr>` : ""}
              ${form.budgetInsuranceLegalAccounting ? `<tr><td>Insurance / Legal / Accounting</td><td>${form.budgetInsuranceLegalAccounting}</td></tr>` : ""}
              ${form.budgetMarketingFestivals ? `<tr><td>Marketing / Festivals</td><td>${form.budgetMarketingFestivals}</td></tr>` : ""}
              ${form.budgetContingency ? `<tr><td>Contingency</td><td>${form.budgetContingency}</td></tr>` : ""}
              <tr class="total"><td>TOTAL</td><td>${form.totalBudget}</td></tr>
            </tbody>
          </table>
        </div>
      ` : ""}
    `)}

    ${sec("§ 8 — Market, Audience & Distribution Plan", `
      ${f("Primary Release Pathway", form.primaryReleasePathway)}
      ${f("Market Attachments", form.marketAttachments)}
      ${f("Audience Strategy", form.audienceStrategy)}
      ${f("Comparable Performance", form.comparablePerformance)}
      ${f("Territory Focus", form.territoryFocus)}
      ${f("Distribution / Sales Conversations", form.distributionConversations)}
      ${h("Impact / Outreach Plan", form.impactOutreachPlan)}
    `)}

    ${sec("§ 9 — Production Readiness", `
      <div class="grid-2">
        ${f("Current Materials Complete", form.currentMaterialsComplete)}
        ${f("Estimated Prep Start", form.estimatedPrepStart)}
        ${f("Estimated Principal Photography", form.estimatedPrincipalPhotography)}
        ${f("Estimated Post-Production", form.estimatedPostProduction)}
        ${f("Key Locations", form.keyLocations)}
        ${f("Insurance & E&O Status", form.insuranceEO)}
        ${f("Accessibility & Sustainability", form.accessibilitySustainability)}
      </div>
      ${h("Production Risks", form.productionRisks)}
    `)}

    ${sec("§ 10 — Short-Form Portal Answers", `
      ${h("Why is this project timely now?", form.whyTimely)}
      ${h("Why is this team uniquely positioned to make it?", form.whyTeamUnique)}
      ${h("What changed since the last application or draft?", form.whatChangedSinceLastApplication)}
      ${h("What specific milestone will this funding unlock?", form.whatMilestoneWillFundingUnlock)}
      ${h("Biggest creative risk and how you will manage it", form.biggestCreativeRisk)}
      ${h("Biggest financing risk and how you will close it", form.biggestFinancingRisk)}
    `)}

    ${sec("§ 11 — Attachment Checklist", `
      <div class="chk-grid">
        ${chk("Script / screenplay or sample scenes", form.hasScript)}
        ${chk("Synopsis and treatment", form.hasSynopsisTreatment)}
        ${chk("Director statement", form.hasDirectorStatement)}
        ${chk("Producer statement / note", form.hasProducerStatement)}
        ${chk("Budget top sheet", form.hasBudgetTopSheet)}
        ${chk("Detailed budget", form.hasDetailedBudget)}
        ${chk("Finance plan", form.hasFinancePlan)}
        ${chk("Production schedule", form.hasProductionSchedule)}
        ${chk("Chain of title memo + rights docs", form.hasChainOfTitle)}
        ${chk("CVs / bios and company profile", form.hasCVsBios)}
        ${chk("Visual materials (lookbook, mood board)", form.hasVisualMaterials)}
        ${chk("Market attachments / LOIs", form.hasMarketAttachments)}
        ${chk("Sample footage / rough cut / teaser", form.hasSampleFootage)}
        ${chk("Consent / release / access letters", form.hasConsentLetters)}
      </div>
    `)}

    ${form.additionalNotes ? sec("Additional Notes", h("", form.additionalNotes)) : ""}

  </div>
  <div style="margin:0 48px 32px;background:#fffbeb;border:1px solid #f59e0b;border-radius:10px;padding:16px 22px;font-size:12px;color:#92400e">
    <strong style="display:block;margin-bottom:4px;">Represent a funding body, screen agency, or incentive programme?</strong>
    Virelle Studios maintains an independently curated global directory of public and private film finance vehicles &mdash; covering grants, soft money, co-production treaties, tax incentives, and broadcaster-backed funds. If your organisation is not yet listed, or if your fund&apos;s eligibility criteria, funding rounds, or submission windows have changed, we invite you to submit your details for consideration. Contact us at <a href="mailto:studiosvirelle@gmail.com?subject=Fund Listing Submission" style="color:#d97706">studiosvirelle@gmail.com</a> with the subject line <strong>&ldquo;Fund Listing Submission&rdquo;</strong>. Accepted entries are reviewed by our editorial team and published to the directory upon verification.
  </div>
  <div class="footer">
    Compiled by Virelle Studios Film Funding Portal &middot; ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
    &middot; This document is for manual submission only. Virelle Studios does not submit on your behalf.
  </div>
</div>
</body>
</html>`;
}

// ─── Application Modal ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Applicant & Project" },
  { id: 2, label: "Story Materials" },
  { id: 3, label: "Creative Case" },
  { id: 4, label: "Rights & Team" },
  { id: 5, label: "Budget & Finance" },
  { id: 6, label: "Market & Distribution" },
  { id: 7, label: "Production Readiness" },
  { id: 8, label: "Portal Answers" },
  { id: 9, label: "Checklist & Submit" },
];

interface ApplicationModalProps {
  source: FundingSource;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

function ApplicationModal({ source, onClose, userEmail, userName }: ApplicationModalProps) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<AppForm>({
    ...EMPTY_FORM,
    primaryContactName: userName || "",
    primaryContactEmail: userEmail || "",
    applicantLegalName: userName || "",
  });

  const set = (key: keyof AppForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submitMutation = trpc.funding.submitApplication.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (err) => toast.error("Failed to submit: " + err.message),
  });

  const handleDownload = () => {
    const html = buildDownloadHtml(form, source);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `funding-application_${form.projectTitle.replace(/\s+/g, "-") || "project"}_${source.organization.replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Application downloaded — open in browser and print to PDF");
  };

  const handleSubmit = () => {
    submitMutation.mutate({
      fundingSourceId: source.id,
      fundingOrganization: source.organization,
      fundingCountry: source.country,
      officialSite: source.officialSite || undefined,
      applicantLegalName: form.applicantLegalName,
      tradingName: form.tradingName || undefined,
      companyCountry: form.companyCountry,
      primaryContactName: form.primaryContactName,
      primaryContactEmail: form.primaryContactEmail,
      primaryContactPhone: form.primaryContactPhone || undefined,
      projectTitle: form.projectTitle,
      workingTitle: form.workingTitle || undefined,
      format: form.format,
      stage: form.stage,
      runningTime: form.runningTime || undefined,
      primaryLanguage: form.primaryLanguage || undefined,
      productionCountry: form.productionCountry || undefined,
      coProductionTerritories: form.coProductionTerritories || undefined,
      genre: form.genre,
      targetAudience: form.targetAudience || undefined,
      comparableTitles: form.comparableTitles || undefined,
      festivalStrategy: form.festivalStrategy || undefined,
      currentStatus: form.currentStatus || undefined,
      logline: form.logline,
      shortSynopsis: form.shortSynopsis,
      longSynopsis: form.longSynopsis || undefined,
      treatment: form.treatment || undefined,
      seriesOverview: form.seriesOverview || undefined,
      sampleCutNotes: form.sampleCutNotes || undefined,
      directorStatement: form.directorStatement || undefined,
      producerStatement: form.producerStatement || undefined,
      writerStatement: form.writerStatement || undefined,
      creativeApproach: form.creativeApproach || undefined,
      editorialIntention: form.editorialIntention || undefined,
      culturalConsultation: form.culturalConsultation || undefined,
      rightsType: form.rightsType || undefined,
      rightsHolder: form.rightsHolder || undefined,
      applicantRightsPosition: form.applicantRightsPosition || undefined,
      chainOfTitleDocs: form.chainOfTitleDocs || undefined,
      expiryReversionDates: form.expiryReversionDates || undefined,
      lifeRightsReleases: form.lifeRightsReleases || undefined,
      legalCounsel: form.legalCounsel || undefined,
      outstandingRightsIssues: form.outstandingRightsIssues || undefined,
      directorName: form.directorName || undefined,
      producerName: form.producerName || undefined,
      writerName: form.writerName || undefined,
      leadCast: form.leadCast || undefined,
      cinematographer: form.cinematographer || undefined,
      editor: form.editor || undefined,
      composer: form.composer || undefined,
      execProducer: form.execProducer || undefined,
      teamBios: form.teamBios || undefined,
      totalBudget: form.totalBudget,
      projectCurrency: form.projectCurrency || undefined,
      fundingRequested: form.fundingRequested,
      fundingRequestedPercent: form.fundingRequestedPercent || undefined,
      otherFinancingSecured: form.otherFinancingSecured || undefined,
      otherFinancingPending: form.otherFinancingPending || undefined,
      producerCashDeferrals: form.producerCashDeferrals || undefined,
      taxCredits: form.taxCredits || undefined,
      gapShortfall: form.gapShortfall || undefined,
      recoupmentPosition: form.recoupmentPosition || undefined,
      cashflowRequirement: form.cashflowRequirement || undefined,
      budgetDevelopment: form.budgetDevelopment || undefined,
      budgetAboveTheLine: form.budgetAboveTheLine || undefined,
      budgetProductionCrew: form.budgetProductionCrew || undefined,
      budgetCastContributors: form.budgetCastContributors || undefined,
      budgetTravelAccommodation: form.budgetTravelAccommodation || undefined,
      budgetLocationsPermits: form.budgetLocationsPermits || undefined,
      budgetEquipmentRentals: form.budgetEquipmentRentals || undefined,
      budgetPostProduction: form.budgetPostProduction || undefined,
      budgetMusicArchiveRights: form.budgetMusicArchiveRights || undefined,
      budgetInsuranceLegalAccounting: form.budgetInsuranceLegalAccounting || undefined,
      budgetMarketingFestivals: form.budgetMarketingFestivals || undefined,
      budgetContingency: form.budgetContingency || undefined,
      primaryReleasePathway: form.primaryReleasePathway || undefined,
      marketAttachments: form.marketAttachments || undefined,
      audienceStrategy: form.audienceStrategy || undefined,
      comparablePerformance: form.comparablePerformance || undefined,
      territoryFocus: form.territoryFocus || undefined,
      distributionConversations: form.distributionConversations || undefined,
      impactOutreachPlan: form.impactOutreachPlan || undefined,
      currentMaterialsComplete: form.currentMaterialsComplete || undefined,
      estimatedPrepStart: form.estimatedPrepStart || undefined,
      estimatedPrincipalPhotography: form.estimatedPrincipalPhotography || undefined,
      estimatedPostProduction: form.estimatedPostProduction || undefined,
      keyLocations: form.keyLocations || undefined,
      productionRisks: form.productionRisks || undefined,
      insuranceEO: form.insuranceEO || undefined,
      accessibilitySustainability: form.accessibilitySustainability || undefined,
      whyTimely: form.whyTimely || undefined,
      whyTeamUnique: form.whyTeamUnique,
      whatChangedSinceLastApplication: form.whatChangedSinceLastApplication || undefined,
      whatMilestoneWillFundingUnlock: form.whatMilestoneWillFundingUnlock || undefined,
      biggestCreativeRisk: form.biggestCreativeRisk || undefined,
      biggestFinancingRisk: form.biggestFinancingRisk || undefined,
      hasScript: form.hasScript,
      hasSynopsisTreatment: form.hasSynopsisTreatment,
      hasDirectorStatement: form.hasDirectorStatement,
      hasProducerStatement: form.hasProducerStatement,
      hasBudgetTopSheet: form.hasBudgetTopSheet,
      hasDetailedBudget: form.hasDetailedBudget,
      hasFinancePlan: form.hasFinancePlan,
      hasProductionSchedule: form.hasProductionSchedule,
      hasChainOfTitle: form.hasChainOfTitle,
      hasCVsBios: form.hasCVsBios,
      hasVisualMaterials: form.hasVisualMaterials,
      hasMarketAttachments: form.hasMarketAttachments,
      hasSampleFootage: form.hasSampleFootage,
      hasConsentLetters: form.hasConsentLetters,
      additionalNotes: form.additionalNotes || undefined,
    });
  };

  const canProceed1 = form.applicantLegalName.trim() && form.companyCountry.trim() && form.primaryContactName.trim() && form.primaryContactEmail.trim() && form.projectTitle.trim() && form.genre.trim();
  const canProceed2 = form.logline.trim().length >= 10 && form.shortSynopsis.trim().length >= 50;
  const canSubmit = form.whyTeamUnique.trim().length >= 20 && form.totalBudget.trim() && form.fundingRequested.trim();

  if (submitted) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <div className="flex flex-col items-center text-center gap-5 py-8">
            <div className="h-20 w-20 rounded-full bg-green-500/15 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Application Package Ready</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Your professional application for <strong>{source.organization}</strong> has been compiled and emailed to <strong>{form.primaryContactEmail}</strong>.
              </p>
              <p className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mt-3">
                Each funding body has its own portal and submission rules. Review your package, tailor it to the fund's requirements, and submit directly to the funder.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1 gap-2" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Download Package
              </Button>
              {source.officialSite && (
                <a
                  href={source.officialSite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                    <ExternalLink className="h-4 w-4" />
                    Visit Funder Site
                  </Button>
                </a>
              )}
            </div>
            <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-amber-500" />
              {source.packTitle || "Global Film Funding Application"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Applying to <strong>{source.organization}</strong> · {source.country}
              {source.packType && <> · <span className="text-amber-400">{source.packType}</span></>}
              {source.primaryLanguage && <> · Application language: {source.primaryLanguage}</>}
            </DialogDescription>
          </DialogHeader>

          {/* Professional working-pack notice */}
          <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-[11px] text-blue-300/80 leading-relaxed">
            <strong className="text-blue-300">Professional Working Pack.</strong> This framework is structured around recurring requirements published by representative official bodies — including BFI, Telefilm Canada, Screen Australia, IDFA Bertha Fund, and Doha Film Institute — covering budget, finance plan, rights / chain of title, schedules, and supporting materials. For international co-productions and documentary programmes, additional items such as co-production agreements and registration extracts may be required.
            {" "}<strong className="text-blue-300">Legal declarations, exact upload wording, and submission requirements must be verified against the target fund's live portal before final submission.</strong> The native-language localisation layer is provided as a working framework only.
          </div>
          {/* Step progress */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => step > s.id && setStep(s.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    step === s.id
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : step > s.id
                      ? "text-green-400 cursor-pointer hover:bg-green-500/10"
                      : "text-muted-foreground cursor-default"
                  }`}
                >
                  {step > s.id ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${step === s.id ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}>{s.id}</span>
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className="w-3 h-px bg-border shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── Step 1: Applicant & Project Identification ── */}
          {step === 1 && (
            <div className="space-y-5">
              <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <strong>§ 2 — Applicant & Project Identification.</strong> Use your exact legal name as it appears on company documents. Fields marked * are required.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Legal Applicant Name *</Label>
                  <Input value={form.applicantLegalName} onChange={(e) => set("applicantLegalName", e.target.value)} placeholder="Exact legal name of applicant company or individual" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Trading / Company Name</Label>
                  <Input value={form.tradingName} onChange={(e) => set("tradingName", e.target.value)} placeholder="If different from legal applicant" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Country of Incorporation / Residence *</Label>
                  <Input value={form.companyCountry} onChange={(e) => set("companyCountry", e.target.value)} placeholder="Company nationality and applicant residency" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Primary Contact Name *</Label>
                  <Input value={form.primaryContactName} onChange={(e) => set("primaryContactName", e.target.value)} placeholder="Producer or authorized signatory" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Primary Contact Email *</Label>
                  <Input type="email" value={form.primaryContactEmail} onChange={(e) => set("primaryContactEmail", e.target.value)} placeholder="Professional email address" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mobile / Phone</Label>
                  <Input value={form.primaryContactPhone} onChange={(e) => set("primaryContactPhone", e.target.value)} placeholder="+1 555 000 0000 (include country code)" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Project Title *</Label>
                  <Input value={form.projectTitle} onChange={(e) => set("projectTitle", e.target.value)} placeholder="Official project title" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Working / Alternate Title</Label>
                  <Input value={form.workingTitle} onChange={(e) => set("workingTitle", e.target.value)} placeholder="If any" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Format *</Label>
                  <Select value={form.format} onValueChange={(v) => set("format", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Feature Film", "Short Film", "Documentary", "Animation", "TV Series", "Limited Series", "Web Series", "Hybrid"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Stage *</Label>
                  <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Development", "Pre-Production", "Production", "Post-Production", "Completion", "Distribution"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Running Time / Episode Count</Label>
                  <Input value={form.runningTime} onChange={(e) => set("runningTime", e.target.value)} placeholder="e.g. 95 min / 6 × 45 min" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Primary Language(s)</Label>
                  <Input value={form.primaryLanguage} onChange={(e) => set("primaryLanguage", e.target.value)} placeholder="e.g. English, French" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Country / Countries of Production</Label>
                  <Input value={form.productionCountry} onChange={(e) => set("productionCountry", e.target.value)} placeholder="Majority and minority co-production territories" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Co-Production Territories</Label>
                  <Input value={form.coProductionTerritories} onChange={(e) => set("coProductionTerritories", e.target.value)} placeholder="Other co-production countries" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Genre *</Label>
                  <Input value={form.genre} onChange={(e) => set("genre", e.target.value)} placeholder="e.g. Drama, Thriller, Documentary" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Target Audience</Label>
                  <Input value={form.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} placeholder="Core audience + market positioning" className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Comparable Titles <span className="text-muted-foreground">(2–5 comps with year and relevance)</span></Label>
                <Textarea value={form.comparableTitles} onChange={(e) => set("comparableTitles", e.target.value)} placeholder="e.g. Parasite (2019) — class tension, ensemble; Moonlight (2016) — intimate character study" rows={2} className="text-sm resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Festival / Market Strategy</Label>
                <Input value={form.festivalStrategy} onChange={(e) => set("festivalStrategy", e.target.value)} placeholder="e.g. A-list festival premiere, specialist market, streamer focus" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Current Status</Label>
                <Input value={form.currentStatus} onChange={(e) => set("currentStatus", e.target.value)} placeholder="What is complete today: script draft, cast, rights, financing, sample, edit" className="h-9 text-sm" />
              </div>
            </div>
          )}

          {/* ── Step 2: Story Materials ── */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <strong>§ 3 — Story Materials.</strong> Write for a reviewer, not a pitch. Full story shape, not marketing copy. Include the ending in the long synopsis.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">Logline * <span className="text-muted-foreground">(1–2 sentences: hook, protagonist, central conflict, stakes)</span></Label>
                <Textarea value={form.logline} onChange={(e) => set("logline", e.target.value)} placeholder="A morally compromised detective in Lagos must choose between exposing a corrupt general or protecting his family — as the bodies pile up and the clock runs out." rows={2} className="text-sm resize-none" />
                <p className="text-[10px] text-right text-muted-foreground">{form.logline.length} chars</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Short Synopsis * <span className="text-muted-foreground">(100–250 words — full story shape, not marketing copy)</span></Label>
                <Textarea value={form.shortSynopsis} onChange={(e) => set("shortSynopsis", e.target.value)} placeholder="Write the full story arc including the protagonist's journey, key turning points, and emotional core..." rows={5} className="text-sm resize-none" />
                <p className="text-[10px] text-right text-muted-foreground">{form.shortSynopsis.length} chars (min 50)</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Long Synopsis <span className="text-muted-foreground">(approx. 1 page — include ending)</span></Label>
                <Textarea value={form.longSynopsis} onChange={(e) => set("longSynopsis", e.target.value)} placeholder="Full narrative including all major plot points, character arcs, and the ending..." rows={6} className="text-sm resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Treatment / Director's Treatment <span className="text-muted-foreground">(tone, structure, POV, cinematic approach)</span></Label>
                <Textarea value={form.treatment} onChange={(e) => set("treatment", e.target.value)} placeholder="Describe the visual language, tone, structural approach, and directorial POV..." rows={4} className="text-sm resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Series Overview <span className="text-muted-foreground">(if applicable — season arc, episode engine, future potential)</span></Label>
                <Textarea value={form.seriesOverview} onChange={(e) => set("seriesOverview", e.target.value)} placeholder="Season arc, episode structure, and future season potential..." rows={3} className="text-sm resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sample / Current Cut Notes <span className="text-muted-foreground">(what reviewers should focus on)</span></Label>
                <Textarea value={form.sampleCutNotes} onChange={(e) => set("sampleCutNotes", e.target.value)} placeholder="If submitting sample footage: what reviewers should focus on, what is rough, and what is final..." rows={2} className="text-sm resize-none" />
              </div>
            </div>
          )}

          {/* ── Step 3: Creative & Editorial Case ── */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <strong>§ 4 — Creative & Editorial Case.</strong> These statements are the creative heart of your application. Be specific, personal, and honest about your approach.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">Director Statement <span className="text-muted-foreground">(why this story, why now, visual language, tone, access or authorship)</span></Label>
                <Textarea value={form.directorStatement} onChange={(e) => set("directorStatement", e.target.value)} placeholder="Why am I the right director for this project? What is my visual language? What personal connection do I have to this material?" rows={4} className="text-sm resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Producer Statement <span className="text-muted-foreground">(why this project is producible now and how the team will deliver it)</span></Label>
                <Textarea value={form.producerStatement} onChange={(e) => set("producerStatement", e.target.value)} placeholder="Why is this project ready to be made? What is the production strategy? How will this team deliver on time and on budget?" rows={4} className="text-sm resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Writer Statement <span className="text-muted-foreground">(voice, adaptation strategy, structure, narrative engine)</span></Label>
                <Textarea value={form.writerStatement} onChange={(e) => set("writerStatement", e.target.value)} placeholder="What is the narrative engine of this story? How does the structure serve the theme?" rows={3} className="text-sm resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Creative Approach <span className="text-muted-foreground">(lookbook references, format choices, sound, casting, archive/animation approach)</span></Label>
                <Textarea value={form.creativeApproach} onChange={(e) => set("creativeApproach", e.target.value)} placeholder="Describe the visual references, sound design approach, casting philosophy, and any unique formal choices..." rows={3} className="text-sm resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Editorial Intention <span className="text-muted-foreground">(theme, POV, ethics, participant duty of care, sensitivity approach)</span></Label>
                <Textarea value={form.editorialIntention} onChange={(e) => set("editorialIntention", e.target.value)} placeholder="What is the editorial point of view? How are sensitive subjects handled? What is the ethical framework?" rows={3} className="text-sm resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cultural / Community Consultation <span className="text-muted-foreground">(permissions, advisors, access, consent process)</span></Label>
                <Textarea value={form.culturalConsultation} onChange={(e) => set("culturalConsultation", e.target.value)} placeholder="Describe any community consultation, cultural advisors, access agreements, or consent processes..." rows={2} className="text-sm resize-none" />
              </div>
            </div>
          )}

          {/* ── Step 4: Rights & Team ── */}
          {step === 4 && (
            <div className="space-y-5">
              <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <strong>§ 5 — Rights, Chain of Title & Clearances.</strong> Complete this section carefully. Many funds require a clear description of chain of title. Disclose all outstanding issues.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Rights Type</Label>
                  <Select value={form.rightsType} onValueChange={(v) => set("rightsType", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {["Original Screenplay", "Adapted — Novel / Book", "Adapted — Article / Journalism", "Life Rights", "Remake Rights", "Archive-Driven", "Commissioned", "Other"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Rights Holder(s)</Label>
                  <Input value={form.rightsHolder} onChange={(e) => set("rightsHolder", e.target.value)} placeholder="All parties controlling underlying rights" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Applicant's Rights Position</Label>
                  <Select value={form.applicantRightsPosition} onValueChange={(v) => set("applicantRightsPosition", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select position" /></SelectTrigger>
                    <SelectContent>
                      {["Owned", "Optioned", "Licensed", "Commissioned", "In Negotiation", "Not Yet Secured"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Key Chain-of-Title Documents</Label>
                  <Input value={form.chainOfTitleDocs} onChange={(e) => set("chainOfTitleDocs", e.target.value)} placeholder="Option agreement, writer agreement, assignment..." className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Expiry / Reversion Dates</Label>
                  <Input value={form.expiryReversionDates} onChange={(e) => set("expiryReversionDates", e.target.value)} placeholder="Any material deadlines" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Life Rights / Releases Required</Label>
                  <Input value={form.lifeRightsReleases} onChange={(e) => set("lifeRightsReleases", e.target.value)} placeholder="Appearance, location, archive, or music clearances" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Legal Counsel</Label>
                  <Input value={form.legalCounsel} onChange={(e) => set("legalCounsel", e.target.value)} placeholder="Name of production counsel if engaged" className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Outstanding Rights Issues <span className="text-muted-foreground">(any gap, dependency, or risk requiring disclosure)</span></Label>
                <Textarea value={form.outstandingRightsIssues} onChange={(e) => set("outstandingRightsIssues", e.target.value)} placeholder="Disclose any outstanding rights issues, gaps, or dependencies..." rows={2} className="text-sm resize-none" />
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-4">
                  <strong>§ 6 — Key Creative & Producing Team.</strong> Attach concise bios (75–150 words each). Include notable awards, grosses, and festival premieres.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "directorName", label: "Director" },
                    { key: "producerName", label: "Producer" },
                    { key: "writerName", label: "Writer / Screenwriter" },
                    { key: "leadCast", label: "Lead Cast / Subject" },
                    { key: "cinematographer", label: "Cinematographer / DOP" },
                    { key: "editor", label: "Editor" },
                    { key: "composer", label: "Composer" },
                    { key: "execProducer", label: "Executive Producer / Co-Producer" },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs">{label}</Label>
                      <Input value={(form as any)[key]} onChange={(e) => set(key as keyof AppForm, e.target.value)} placeholder={`${label} name`} className="h-9 text-sm" />
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5 mt-3">
                  <Label className="text-xs">Team Bios / Company Profile <span className="text-muted-foreground">(75–150 words per key person)</span></Label>
                  <Textarea value={form.teamBios} onChange={(e) => set("teamBios", e.target.value)} placeholder="Brief bios for director, producer, writer, and key cast. Include relevant credits, awards, and festival selections..." rows={4} className="text-sm resize-none" />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 5: Budget & Finance ── */}
          {step === 5 && (
            <div className="space-y-5">
              <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <strong>§ 7 — Budget, Financing & Recoupment.</strong> Budget and finance materials must reconcile across the form, budget top sheet, finance plan, and any portal fields. Use the same currency throughout.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Project Currency</Label>
                  <Select value={form.projectCurrency} onValueChange={(v) => set("projectCurrency", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["USD", "EUR", "GBP", "AUD", "CAD", "NZD", "ZAR", "NGN", "KES", "GHS", "INR", "JPY", "KRW", "CNY", "BRL", "MXN", "ARS", "NOK", "SEK", "DKK", "CHF", "Other"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Total Project Budget *</Label>
                  <Input value={form.totalBudget} onChange={(e) => set("totalBudget", e.target.value)} placeholder="e.g. 1,500,000" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Funding Requested from This Fund *</Label>
                  <Input value={form.fundingRequested} onChange={(e) => set("fundingRequested", e.target.value)} placeholder="e.g. 250,000" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Funding Request as % of Budget</Label>
                  <Input value={form.fundingRequestedPercent} onChange={(e) => set("fundingRequestedPercent", e.target.value)} placeholder="e.g. 16.7%" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Other Financing Secured</Label>
                  <Input value={form.otherFinancingSecured} onChange={(e) => set("otherFinancingSecured", e.target.value)} placeholder="Amount, source, recoupable/non-recoupable, status" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Other Financing Pending</Label>
                  <Input value={form.otherFinancingPending} onChange={(e) => set("otherFinancingPending", e.target.value)} placeholder="Applied / invited / in discussion / not yet approached" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Producer Cash / Deferrals / In-Kind</Label>
                  <Input value={form.producerCashDeferrals} onChange={(e) => set("producerCashDeferrals", e.target.value)} placeholder="Any internal contribution" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tax Credits / Rebates</Label>
                  <Input value={form.taxCredits} onChange={(e) => set("taxCredits", e.target.value)} placeholder="Territory, estimate, status, and assumptions" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Gap / Shortfall</Label>
                  <Input value={form.gapShortfall} onChange={(e) => set("gapShortfall", e.target.value)} placeholder="Amount still to close" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cashflow Requirement</Label>
                  <Input value={form.cashflowRequirement} onChange={(e) => set("cashflowRequirement", e.target.value)} placeholder="Any bridge-finance or cashflow timing issue" className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Recoupment Position</Label>
                <Textarea value={form.recoupmentPosition} onChange={(e) => set("recoupmentPosition", e.target.value)} placeholder="Describe recoupment corridor and any parity or cap arrangements..." rows={2} className="text-sm resize-none" />
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-3 font-medium">Budget Top Sheet — Line Items</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "budgetDevelopment", label: "Development" },
                    { key: "budgetAboveTheLine", label: "Above-the-Line" },
                    { key: "budgetProductionCrew", label: "Production Crew" },
                    { key: "budgetCastContributors", label: "Cast / Contributors" },
                    { key: "budgetTravelAccommodation", label: "Travel & Accommodation" },
                    { key: "budgetLocationsPermits", label: "Locations / Permits" },
                    { key: "budgetEquipmentRentals", label: "Equipment / Rentals" },
                    { key: "budgetPostProduction", label: "Post-Production" },
                    { key: "budgetMusicArchiveRights", label: "Music / Archive / Rights" },
                    { key: "budgetInsuranceLegalAccounting", label: "Insurance / Legal / Accounting" },
                    { key: "budgetMarketingFestivals", label: "Marketing / Festivals" },
                    { key: "budgetContingency", label: "Contingency" },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs">{label}</Label>
                      <Input value={(form as any)[key]} onChange={(e) => set(key as keyof AppForm, e.target.value)} placeholder={`Amount in ${form.projectCurrency || "USD"}`} className="h-9 text-sm" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 6: Market & Distribution ── */}
          {step === 6 && (
            <div className="space-y-4">
              <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <strong>§ 8 — Market, Audience & Distribution Plan.</strong> Demonstrate commercial awareness. Reviewers want to know your project can reach an audience.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">Primary Release Pathway</Label>
                <Select value={form.primaryReleasePathway} onValueChange={(v) => set("primaryReleasePathway", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select pathway" /></SelectTrigger>
                  <SelectContent>
                    {["Festival + Sales", "Theatrical", "Broadcaster", "Streamer", "Educational / Institutional", "Impact / Community", "Direct-to-Audience", "Hybrid"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Market Attachments</Label>
                <Textarea value={form.marketAttachments} onChange={(e) => set("marketAttachments", e.target.value)} placeholder="Broadcaster, streamer, distributor, sales agent, MG, LOI, talent attachment..." rows={2} className="text-sm resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Audience Strategy</Label>
                <Textarea value={form.audienceStrategy} onChange={(e) => set("audienceStrategy", e.target.value)} placeholder="Who will watch and why this project can break through..." rows={3} className="text-sm resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Comparable Performance</Label>
                <Textarea value={form.comparablePerformance} onChange={(e) => set("comparablePerformance", e.target.value)} placeholder="How your comp titles performed: festival, sales, platform, box office, audience..." rows={2} className="text-sm resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Territory Focus</Label>
                <Input value={form.territoryFocus} onChange={(e) => set("territoryFocus", e.target.value)} placeholder="Priority domestic and international territories" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Distribution / Sales Conversations</Label>
                <Textarea value={form.distributionConversations} onChange={(e) => set("distributionConversations", e.target.value)} placeholder="Who has read/seen materials and current response..." rows={2} className="text-sm resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Impact / Outreach Plan <span className="text-muted-foreground">(for issue-driven docs or social campaigns)</span></Label>
                <Textarea value={form.impactOutreachPlan} onChange={(e) => set("impactOutreachPlan", e.target.value)} placeholder="Community screenings, educational use, social campaign, advocacy partnerships..." rows={2} className="text-sm resize-none" />
              </div>
            </div>
          )}

          {/* ── Step 7: Production Readiness ── */}
          {step === 7 && (
            <div className="space-y-4">
              <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <strong>§ 9 — Production Readiness.</strong> Demonstrate that the project is executable. Reviewers need to believe you can deliver.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Current Materials Complete</Label>
                  <Input value={form.currentMaterialsComplete} onChange={(e) => set("currentMaterialsComplete", e.target.value)} placeholder="Script draft, budget, schedule, lookbook, teaser, rough cut, archive list, etc." className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estimated Prep Start</Label>
                  <Input value={form.estimatedPrepStart} onChange={(e) => set("estimatedPrepStart", e.target.value)} placeholder="e.g. March 2026" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estimated Principal Photography</Label>
                  <Input value={form.estimatedPrincipalPhotography} onChange={(e) => set("estimatedPrincipalPhotography", e.target.value)} placeholder="Start and finish dates" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estimated Post-Production</Label>
                  <Input value={form.estimatedPostProduction} onChange={(e) => set("estimatedPostProduction", e.target.value)} placeholder="Edit, sound, grade, VFX, delivery dates" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Key Locations</Label>
                  <Input value={form.keyLocations} onChange={(e) => set("keyLocations", e.target.value)} placeholder="Countries/regions; include permit or access status" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Insurance & E&O Status</Label>
                  <Input value={form.insuranceEO} onChange={(e) => set("insuranceEO", e.target.value)} placeholder="Current status and intended providers" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Accessibility & Sustainability</Label>
                  <Input value={form.accessibilitySustainability} onChange={(e) => set("accessibilitySustainability", e.target.value)} placeholder="Captioning, accessible screenings, green production measures" className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Production Risks <span className="text-muted-foreground">(access, weather, child actor, participant safety, archive dependency, travel, completion risk)</span></Label>
                <Textarea value={form.productionRisks} onChange={(e) => set("productionRisks", e.target.value)} placeholder="Identify risks and your mitigation strategy for each..." rows={3} className="text-sm resize-none" />
              </div>
            </div>
          )}

          {/* ── Step 8: Short-Form Portal Answers ── */}
          {step === 8 && (
            <div className="space-y-4">
              <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <strong>§ 10 — Short-Form Portal Answers.</strong> These are the questions most commonly asked in online portals. Answer concisely and specifically — avoid generic responses.
              </p>
              {[
                { key: "whyTimely", label: "Why is this project timely now?", placeholder: "What is happening in the world, in culture, or in the industry that makes this the right moment for this film?" },
                { key: "whyTeamUnique", label: "Why is this team uniquely positioned to make it? *", placeholder: "What specific experience, access, relationships, or perspective does this team bring that no other team could?" },
                { key: "whatChangedSinceLastApplication", label: "What changed since the last application or draft?", placeholder: "If this is a resubmission, what has materially changed? If first submission, leave blank." },
                { key: "whatMilestoneWillFundingUnlock", label: "What specific milestone will this funding unlock?", placeholder: "Be precise: e.g. 'This grant will fund the 6-week shoot in Lagos, enabling us to deliver a locked cut by Q3 2026.'" },
                { key: "biggestCreativeRisk", label: "What is the single biggest creative risk and how will you manage it?", placeholder: "Be honest. Reviewers respect candour over false confidence." },
                { key: "biggestFinancingRisk", label: "What is the single biggest financing risk and how will you close it?", placeholder: "Identify the gap and your strategy to close it." },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <Textarea
                    value={(form as any)[key]}
                    onChange={(e) => set(key as keyof AppForm, e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── Step 9: Checklist & Submit ── */}
          {step === 9 && (
            <div className="space-y-5">
              <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <strong>§ 11 — Attachment Checklist.</strong> Mark which supporting materials you have prepared. Each fund has different requirements — check their portal before submitting.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "hasScript", label: "Script / screenplay or sample scenes" },
                  { key: "hasSynopsisTreatment", label: "Synopsis and treatment" },
                  { key: "hasDirectorStatement", label: "Director statement" },
                  { key: "hasProducerStatement", label: "Producer statement / note" },
                  { key: "hasBudgetTopSheet", label: "Budget top sheet" },
                  { key: "hasDetailedBudget", label: "Detailed budget (itemized)" },
                  { key: "hasFinancePlan", label: "Finance plan" },
                  { key: "hasProductionSchedule", label: "Production schedule" },
                  { key: "hasChainOfTitle", label: "Chain of title memo + rights docs" },
                  { key: "hasCVsBios", label: "CVs / bios and company profile" },
                  { key: "hasVisualMaterials", label: "Visual materials (lookbook, mood board)" },
                  { key: "hasMarketAttachments", label: "Market attachments / LOIs" },
                  { key: "hasSampleFootage", label: "Sample footage / rough cut / teaser" },
                  { key: "hasConsentLetters", label: "Consent / release / access letters" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={key}
                      checked={(form as any)[key]}
                      onCheckedChange={(v) => set(key as keyof AppForm, !!v)}
                    />
                    <label htmlFor={key} className="text-xs text-muted-foreground cursor-pointer">{label}</label>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Additional Notes <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea value={form.additionalNotes} onChange={(e) => set("additionalNotes", e.target.value)} placeholder="Any other information relevant to your application..." rows={2} className="text-sm resize-none" />
              </div>

{source.recommendedAttachments && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-xs">
                  <p className="font-semibold text-amber-400 mb-1.5">Recommended Attachments for {source.organization}</p>
                  <p className="text-amber-300/80 leading-relaxed">{source.recommendedAttachments}</p>
                </div>
              )}
              {source.tailoringNotes && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-4 py-3 text-xs">
                  <p className="font-semibold text-purple-400 mb-1.5">Tailoring Notes</p>
                  <p className="text-purple-300/80 leading-relaxed">{source.tailoringNotes}</p>
                </div>
              )}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 text-xs text-blue-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p><strong>Manual submission required.</strong> Your compiled application package will be emailed to <strong>{form.primaryContactEmail}</strong> and available to download.</p>
                  <p>Each funding body has its own portal, page limits, and upload rules. Review your package carefully, tailor it to the fund's specific requirements, and submit directly to <strong>{source.organization}</strong>{source.officialSite ? ` at ${source.officialSite}` : ""}.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step < 9 ? (
              <Button
                size="sm"
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !canProceed1) ||
                  (step === 2 && !canProceed2)
                }
                className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                Next: {STEPS[step]?.label} <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" /> Download Package
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitMutation.isPending}
                  className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {submitMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Email & Download</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Funding Source Card ───────────────────────────────────────────────────────

function FundingCard({ source, onApply }: { source: FundingSource; onApply: () => void }) {
  const typeColors: Record<string, string> = {
    "National public agency": "bg-blue-500/15 text-blue-400 border-blue-500/20",
    "Regional public agency": "bg-purple-500/15 text-purple-400 border-purple-500/20",
    "Private/nonprofit fund": "bg-green-500/15 text-green-400 border-green-500/20",
    "International fund": "bg-amber-500/15 text-amber-400 border-amber-500/20",
    "National incentive": "bg-orange-500/15 text-orange-400 border-orange-500/20",
    "Regional incentive fund": "bg-pink-500/15 text-pink-400 border-pink-500/20",
    "Public/nonprofit fund": "bg-teal-500/15 text-teal-400 border-teal-500/20",
    "Broadcaster-backed fund": "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    "Public arts fund": "bg-rose-500/15 text-rose-400 border-rose-500/20",
  };
  const typeClass = (source.type && typeColors[source.type]) || "bg-muted/40 text-muted-foreground border-border";
  const shortType = source.type
    ?.replace("National public agency", "National")
    .replace("Regional public agency", "Regional")
    .replace("Private/nonprofit fund", "Nonprofit")
    .replace("International fund", "International")
    .replace("Public/nonprofit fund", "Public/Nonprofit")
    .replace("Broadcaster-backed fund", "Broadcaster")
    .replace("Public arts fund", "Arts Fund");

  return (
    <div className="group rounded-xl border border-border bg-card/60 hover:border-amber-500/30 hover:bg-card/80 transition-all duration-200 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold leading-tight truncate">{source.organization}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{source.country}</span>
          </div>
        </div>
        {source.type && (
          <Badge variant="outline" className={`text-[10px] shrink-0 border ${typeClass}`}>
            {shortType}
          </Badge>
        )}
      </div>

      <div className="space-y-1.5 flex-1">
        {source.supports && (
          <div className="flex items-start gap-1.5">
            <Layers className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{source.supports}</p>
          </div>
        )}
        {source.stage && (
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">{source.stage}</p>
          </div>
        )}
        {source.fundingForm && (
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3 w-3 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-400/80">{source.fundingForm}</p>
          </div>
        )}
        {source.eligibility && (
          <div className="flex items-center gap-1.5">
            <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">Eligible: {source.eligibility}</p>
          </div>
        )}
        {source.packType && (
          <div className="flex items-center gap-1.5">
            <FileText className="h-3 w-3 text-amber-500/70 shrink-0" />
            <p className="text-xs text-amber-400/70">{source.packType}</p>
          </div>
        )}
        {source.primaryLanguage && (
          <div className="flex items-center gap-1.5">
            <Globe className="h-3 w-3 text-blue-400/70 shrink-0" />
            <p className="text-xs text-blue-400/70">Application language: {source.primaryLanguage}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
          onClick={onApply}
        >
          <FileText className="h-3.5 w-3.5" />
          Apply Now
        </Button>
        {source.officialSite && (
          <a
            href={source.officialSite}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 w-8 rounded-md border border-border flex items-center justify-center hover:bg-accent transition-colors shrink-0"
            title="Visit official site"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function FundingDirectory() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [applyingTo, setApplyingTo] = useState<FundingSource | null>(null);

  const { data: sources = [], isLoading } = trpc.funding.list.useQuery({});
  const { data: countries = [] } = trpc.funding.countries.useQuery();

  const PAID_TIERS = ["independent", "creator", "studio", "pro", "industry", "beta"];
  const isPaidUser = user && PAID_TIERS.includes((user as any).subscriptionTier || "");

  if (user && !isPaidUser && (user as any).role !== "admin") {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto">
          <DollarSign className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-semibold">Global Film Funding Directory</h2>
        <p className="text-muted-foreground text-sm">
          Access to the global film funding directory is available to paid subscribers. Upgrade your plan to discover {sources.length || 101} funding sources across {countries.length || 73} countries and submit professional Hollywood-standard applications.
        </p>
        <Button onClick={() => setLocation("/pricing")} className="bg-amber-600 hover:bg-amber-700 text-white">
          View Plans
        </Button>
      </div>
    );
  }

  const allTypes = useMemo(() => {
    const types = [...new Set(sources.map((s) => s.type).filter(Boolean))].sort();
    return types as string[];
  }, [sources]);

  const filtered = useMemo(() => {
    let result = sources;
    if (selectedCountry !== "all") result = result.filter((s) => s.country === selectedCountry);
    if (selectedType !== "all") result = result.filter((s) => s.type === selectedType);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.organization.toLowerCase().includes(q) ||
          s.country.toLowerCase().includes(q) ||
          (s.supports && s.supports.toLowerCase().includes(q)) ||
          (s.type && s.type.toLowerCase().includes(q)) ||
          (s.eligibility && s.eligibility.toLowerCase().includes(q))
      );
    }
    return result;
  }, [sources, selectedCountry, selectedType, search]);

  const clearFilters = () => { setSearch(""); setSelectedCountry("all"); setSelectedType("all"); };
  const hasFilters = search || selectedCountry !== "all" || selectedType !== "all";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            onClick={() => setLocation("/")}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </button>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-amber-500" />
            Global Film Funding Directory
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {sources.length} funding sources across {countries.length} countries — grants, incentives, and co-production funds worldwide.
          </p>
        </div>
        <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-xs">
          Paid Members Only
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search funds, countries, types..." className="pl-9 h-9 text-sm" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
          <SelectTrigger className="h-9 text-sm w-[180px]">
            <Globe className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All Countries" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="h-9 text-sm w-[200px]">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="all">All Types</SelectItem>
            {allTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-xs text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Clear filters
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center mx-auto">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No funding sources found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your filters or search terms</p>
          {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear all filters</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((source) => (
            <FundingCard key={source.id} source={source} onApply={() => setApplyingTo(source)} />
          ))}
        </div>
      )}

      {/* Global Database Outreach Note */}
      <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
          <Globe className="h-5 w-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Represent a funding body, screen agency, or incentive programme?</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Virelle Studios maintains an independently curated global directory of public and private film finance vehicles — covering grants, soft money, co-production treaties, tax incentives, and broadcaster-backed funds. If your organisation is not yet listed, or if your fund's eligibility criteria, funding rounds, or submission windows have changed, we invite you to submit your details for consideration. Send your fund profile, official mandate, and any relevant programme documentation to{" "}
            <a
              href="mailto:studiosvirelle@gmail.com?subject=Fund%20Listing%20Submission%20—%20Virelle%20Studios%20Global%20Directory"
              className="text-amber-400 hover:text-amber-300 underline underline-offset-2 font-medium"
            >
              studiosvirelle@gmail.com
            </a>
            {" "}with the subject line <span className="font-medium text-foreground">"Fund Listing Submission"</span>. Accepted entries are reviewed by our editorial team and published to the directory upon verification.
          </p>
        </div>
      </div>

      {/* Application Modal */}
      {applyingTo && (
        <ApplicationModal
          source={applyingTo}
          onClose={() => setApplyingTo(null)}
          userEmail={user?.email || ""}
          userName={user?.name || ""}
        />
      )}
    </div>
  );
}
