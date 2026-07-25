export const FUNDING_PAID_TIERS = new Set([
  "indie",
  "amateur",
  "independent",
  "creator",
  "studio",
  "pro",
  "industry",
  "beta",
]);

export type FundingAccessUser = {
  role?: string | null;
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
};

export function hasFundingAccess(user: FundingAccessUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  const tier = String(user.subscriptionTier || "free").toLowerCase();
  if (!FUNDING_PAID_TIERS.has(tier)) return false;
  const status = String(user.subscriptionStatus || "none").toLowerCase();
  return !["canceled", "past_due", "unpaid"].includes(status);
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const MOJIBAKE_MARKERS = /(?:Ã.|Â.|â[\x80-\xBF]|ð[\x80-\xBF]|�)/;

export function normaliseMojibake(value: unknown): string {
  let current = String(value ?? "");
  if (!MOJIBAKE_MARKERS.test(current)) return current;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const decoded = Buffer.from(current, "latin1").toString("utf8");
      if (!decoded || decoded.includes("�")) break;
      if (decoded === current) break;
      current = decoded;
      if (!MOJIBAKE_MARKERS.test(current)) break;
    } catch {
      break;
    }
  }
  return current;
}

export function normaliseFundingSource<T extends Record<string, any>>(source: T): T {
  const stringFields = [
    "country",
    "organization",
    "type",
    "supports",
    "stage",
    "fundingForm",
    "eligibility",
    "notes",
    "packType",
    "primaryLanguage",
    "packTitle",
    "localizedSections",
    "recommendedAttachments",
    "tailoringNotes",
  ];
  const next: Record<string, any> = { ...source };
  for (const key of stringFields) {
    if (typeof next[key] === "string") next[key] = normaliseMojibake(next[key]);
  }
  return next as T;
}

export function parseMoney(value: unknown): number {
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : 0;
}

export type FundingProfileData = {
  applicantLegalName?: string;
  tradingName?: string;
  companyCountry?: string;
  companyNumber?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  projectTitle?: string;
  workingTitle?: string;
  format?: string;
  stage?: string;
  productionCountries?: string;
  coProductionTerritories?: string;
  genre?: string;
  targetAudience?: string;
  logline?: string;
  shortSynopsis?: string;
  longSynopsis?: string;
  directorStatement?: string;
  producerStatement?: string;
  creativeApproach?: string;
  rightsPosition?: string;
  teamSummary?: string;
  totalBudget?: string;
  currency?: string;
  fundingRequested?: string;
  securedFinance?: string;
  pendingFinance?: string;
  taxIncentives?: string;
  producerContribution?: string;
  gap?: string;
  distributionStrategy?: string;
  audienceStrategy?: string;
  festivalStrategy?: string;
  productionSchedule?: string;
  productionRisks?: string;
  sustainabilityAccessibility?: string;
  whyNow?: string;
  whyTeam?: string;
  milestoneUnlocked?: string;
  attachmentChecklist?: Record<string, boolean>;
  budgetLines?: Record<string, string>;
  [key: string]: unknown;
};

const PROFILE_REQUIRED: Array<keyof FundingProfileData> = [
  "applicantLegalName",
  "companyCountry",
  "contactName",
  "contactEmail",
  "projectTitle",
  "format",
  "stage",
  "productionCountries",
  "genre",
  "logline",
  "shortSynopsis",
  "rightsPosition",
  "teamSummary",
  "totalBudget",
  "currency",
  "fundingRequested",
  "distributionStrategy",
  "whyTeam",
];

export function calculateProfileCompletion(profile: FundingProfileData): {
  score: number;
  missing: string[];
} {
  const missing = PROFILE_REQUIRED.filter((key) => !String(profile[key] ?? "").trim()).map(String);
  const completed = PROFILE_REQUIRED.length - missing.length;
  return {
    score: Math.round((completed / PROFILE_REQUIRED.length) * 100),
    missing,
  };
}

export function calculateBudgetChecks(profile: FundingProfileData) {
  const total = parseMoney(profile.totalBudget);
  const requested = parseMoney(profile.fundingRequested);
  const secured = parseMoney(profile.securedFinance);
  const pending = parseMoney(profile.pendingFinance);
  const incentives = parseMoney(profile.taxIncentives);
  const producer = parseMoney(profile.producerContribution);
  const statedGap = parseMoney(profile.gap);
  const budgetLines = Object.values(profile.budgetLines || {}).reduce(
    (sum, value) => sum + parseMoney(value),
    0,
  );
  const calculatedGap = Math.max(0, total - requested - secured - pending - incentives - producer);
  const warnings: string[] = [];

  if (total <= 0) warnings.push("Total budget is missing or invalid.");
  if (requested > total && total > 0) warnings.push("Funding requested exceeds the total project budget.");
  if (budgetLines > 0 && total > 0 && Math.abs(budgetLines - total) > Math.max(1, total * 0.01)) {
    warnings.push("Budget line items do not reconcile to the stated total budget.");
  }
  if (statedGap > 0 && Math.abs(statedGap - calculatedGap) > Math.max(1, total * 0.01)) {
    warnings.push("The stated finance gap does not match the calculated shortfall.");
  }

  return {
    total,
    requested,
    requestedPercent: total > 0 ? Math.round((requested / total) * 1000) / 10 : 0,
    budgetLines,
    calculatedGap,
    warnings,
  };
}

export function calculateReadiness(profile: FundingProfileData) {
  const completion = calculateProfileCompletion(profile);
  const budget = calculateBudgetChecks(profile);
  const attachments = profile.attachmentChecklist || {};
  const attachmentTotal = Object.keys(attachments).length;
  const attachmentDone = Object.values(attachments).filter(Boolean).length;
  const attachmentScore = attachmentTotal ? Math.round((attachmentDone / attachmentTotal) * 100) : 0;
  const warnings = [...budget.warnings];

  if (String(profile.logline || "").trim().length > 0 && String(profile.logline || "").trim().length < 20) {
    warnings.push("The logline is unusually short.");
  }
  if (String(profile.shortSynopsis || "").trim().split(/\s+/).filter(Boolean).length < 50) {
    warnings.push("The short synopsis is below 50 words.");
  }
  if (!profile.whyTeam || String(profile.whyTeam).trim().length < 40) {
    warnings.push("The team case needs more detail.");
  }

  const score = Math.max(
    0,
    Math.min(100, Math.round(completion.score * 0.65 + attachmentScore * 0.2 + (warnings.length ? 5 : 15))),
  );

  return {
    score,
    completionScore: completion.score,
    attachmentScore,
    missing: completion.missing,
    warnings,
    budget,
  };
}

function tokenise(value: unknown): Set<string> {
  return new Set(
    String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 4),
  );
}

function containsAny(haystack: string, values: string[]) {
  return values.some((value) => value && haystack.includes(value.toLowerCase()));
}

export function scoreFundingSource(source: Record<string, any>, project: Record<string, any>, profile: FundingProfileData) {
  const sourceText = [
    source.country,
    source.organization,
    source.type,
    source.supports,
    source.stage,
    source.fundingForm,
    source.eligibility,
    source.notes,
    source.tailoringNotes,
  ].filter(Boolean).join(" ").toLowerCase();

  const productionCountries = String(profile.productionCountries || profile.companyCountry || "")
    .split(/[,;/]/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const format = String(profile.format || project.type || project.format || "").toLowerCase();
  const stage = String(profile.stage || project.stage || project.productionStage || "").toLowerCase();
  const genre = String(profile.genre || project.genre || "").toLowerCase();
  const narrative = [
    profile.logline,
    profile.shortSynopsis,
    profile.longSynopsis,
    project.plotSummary,
    project.description,
    project.themes,
    project.targetAudience,
  ].filter(Boolean).join(" ");

  const breakdown = {
    country: 0,
    stage: 0,
    format: 0,
    relevance: 0,
    readiness: 0,
    freshness: 0,
  };
  const reasons: string[] = [];
  const concerns: string[] = [];

  const sourceCountry = String(source.country || "").toLowerCase();
  if (productionCountries.some((country) => sourceCountry.includes(country) || sourceText.includes(country))) {
    breakdown.country = 25;
    reasons.push("Production/applicant country appears aligned.");
  } else if (containsAny(sourceCountry, ["international", "global", "world", "europe / eu"])) {
    breakdown.country = 17;
    reasons.push("The source has international or multi-country scope.");
  } else if (!productionCountries.length) {
    breakdown.country = 8;
    concerns.push("Add applicant and production countries for a firmer eligibility result.");
  } else {
    concerns.push("Country eligibility is not confirmed.");
  }

  if (stage && sourceText.includes(stage)) {
    breakdown.stage = 15;
    reasons.push(`Stage aligns with ${profile.stage || stage}.`);
  } else if (!stage) {
    breakdown.stage = 5;
    concerns.push("Project stage is missing.");
  } else if (/development\/production|all stages|multiple stages/.test(sourceText)) {
    breakdown.stage = 10;
  } else {
    concerns.push("The listed programme stage may not match the project.");
  }

  const formatAliases: Record<string, string[]> = {
    "feature film": ["feature", "narrative", "film"],
    documentary: ["documentary", "non-fiction", "nonfiction"],
    animation: ["animation", "animated"],
    "short film": ["short", "short-form"],
    series: ["series", "television", "tv", "episodic"],
  };
  const aliases = formatAliases[format] || [format];
  if (aliases.filter(Boolean).some((alias) => sourceText.includes(alias))) {
    breakdown.format = 15;
    reasons.push("Format appears supported.");
  } else if (!format) {
    breakdown.format = 5;
    concerns.push("Project format is missing.");
  } else {
    concerns.push("Format support needs verification.");
  }

  if (genre && sourceText.includes(genre)) {
    breakdown.relevance += 8;
    reasons.push(`The listing mentions ${profile.genre || genre}.`);
  }
  const narrativeTokens = tokenise(narrative);
  const sourceTokens = tokenise(sourceText);
  const overlap = [...narrativeTokens].filter((token) => sourceTokens.has(token)).slice(0, 8);
  breakdown.relevance += Math.min(17, overlap.length * 3);
  if (overlap.length) reasons.push(`${overlap.length} project-theme keyword${overlap.length === 1 ? "" : "s"} align.`);

  const readiness = calculateReadiness(profile);
  breakdown.readiness = Math.round(readiness.score * 0.15);
  if (readiness.score >= 75) reasons.push("Application materials are substantially ready.");
  else concerns.push(`Funding profile readiness is ${readiness.score}%.`);

  if (source.lastVerifiedAt) {
    const ageDays = Math.floor((Date.now() - new Date(source.lastVerifiedAt).getTime()) / 86_400_000);
    if (Number.isFinite(ageDays) && ageDays <= 90) breakdown.freshness = 10;
    else if (Number.isFinite(ageDays) && ageDays <= 365) breakdown.freshness = 5;
    else concerns.push("Listing verification is older than one year.");
  } else {
    concerns.push("Listing freshness has not been formally verified.");
  }

  const hardRestriction = /only|must|required|restricted|citizen|resident|incorporated|co-producer/.test(
    String(source.eligibility || "").toLowerCase(),
  );
  const countryAligned = breakdown.country >= 17;
  const eligibility = hardRestriction && !countryAligned
    ? "verify"
    : breakdown.country === 0 && productionCountries.length
      ? "unlikely"
      : breakdown.country >= 17 && breakdown.stage >= 10
        ? "eligible"
        : "verify";

  const score = Math.min(100, Object.values(breakdown).reduce((sum, value) => sum + value, 0));
  return { score, breakdown, reasons, concerns, eligibility, readiness };
}

export function classifyFundingSource(source: Record<string, any>): "crowdfunding" | "incentive" | "grant" | "market" | "finance_pathway" {
  const text = `${source.organization || ""} ${source.type || ""} ${source.fundingForm || ""} ${source.supports || ""}`.toLowerCase();
  if (/crowd|kickstarter|indiegogo|seed\s*&?\s*spark|pozible|fundrazr/.test(text)) return "crowdfunding";
  if (/tax|rebate|offset|incentive|credit/.test(text)) return "incentive";
  if (/market|lab|pitch|forum/.test(text)) return "market";
  if (/grant|fund|public agency|screen agency|film commission/.test(text)) return "grant";
  return "finance_pathway";
}
