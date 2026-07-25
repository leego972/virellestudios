import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Calculator,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileDown,
  FileText,
  Flag,
  FolderOpen,
  Globe,
  LayoutDashboard,
  Loader2,
  Mail,
  Presentation,
  RefreshCw,
  Save,
  Search,
  Send,
  Sparkles,
  Target,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import SiteHead from "@/components/SiteHead";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  BUDGET_CATEGORIES,
  FUNDING_ATTACHMENTS,
  createBudgetCsv,
  createFundingDocx,
  createFundingPdf,
  downloadBlob,
  downloadHtml,
  estimateIncentive,
  formatMoney,
  localBudgetReview,
  wordCount,
  type FundingProfile,
} from "@/lib/fundingTools";

const TAB_VALUES = ["overview", "matches", "shortlist", "profile", "applications", "incentives", "crowdfunding", "directory"] as const;
type TabValue = (typeof TAB_VALUES)[number];

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  additional_materials: "Additional materials",
  interview: "Interview / pitch",
  waitlisted: "Waitlisted",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

function queryTab(): TabValue {
  const value = new URLSearchParams(window.location.search).get("tab") as TabValue | null;
  return value && TAB_VALUES.includes(value) ? value : "overview";
}

function safeName(value: unknown) {
  return String(value || "funding-pack").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "funding-pack";
}

function dateText(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-AU") : "Not recorded";
}

function freshnessLabel(source: any) {
  if (!source.lastVerifiedAt) return "Not yet formally verified";
  const days = Math.max(0, Math.floor((Date.now() - new Date(source.lastVerifiedAt).getTime()) / 86_400_000));
  return `Verified ${days} day${days === 1 ? "" : "s"} ago`;
}

function LoadingCard() {
  return <Card><CardContent className="flex min-h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></CardContent></Card>;
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <Card className="border-amber-500/15 bg-black/20"><CardContent className="p-4"><div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-bold text-amber-300">{value}</div>{hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}</CardContent></Card>;
}

function CountedTextarea({ label, value, onChange, rows = 4, hint, recommended }: { label: string; value: string; onChange: (value: string) => void; rows?: number; hint?: string; recommended?: string }) {
  return <div className="space-y-1.5"><div className="flex items-end justify-between gap-3"><Label>{label}</Label><span className="text-[10px] text-muted-foreground">{wordCount(value)} words · {value.length} characters</span></div><Textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} />{(hint || recommended) && <p className="text-[11px] text-muted-foreground">{recommended ? `Suggested: ${recommended}. ` : ""}{hint}</p>}</div>;
}

function PreviewGate({ preview, onUpgrade }: { preview: any[]; onUpgrade: () => void }) {
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
    <Card className="border-amber-500/25 bg-amber-500/5"><CardContent className="p-6 text-center"><WalletCards className="mx-auto h-10 w-10 text-amber-400" /><h1 className="mt-3 text-2xl font-bold text-gold-shimmer">Global Film Funding</h1><p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">Preview verified funding pathways below. Active Virelle members receive the full directory, project matching, reusable funding profiles, drafts, tracking, reminders and exports.</p><Button onClick={onUpgrade} className="mt-4 bg-amber-500 text-black hover:bg-amber-400">View membership plans</Button></CardContent></Card>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{preview.map((source) => <Card key={source.id}><CardContent className="p-4"><div className="font-semibold">{source.organization}</div><div className="mt-1 text-xs text-muted-foreground">{source.country} · {source.type || source.sourceCategory}</div><p className="mt-3 line-clamp-3 text-xs text-muted-foreground">{source.supports || source.eligibility}</p>{source.officialSite && <a href={source.officialSite} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="mt-3"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Official site</Button></a>}</CardContent></Card>)}</div>
  </div>;
}

function SourceCard({ source, saved, onSave, onApply, onReport, match }: { source: any; saved: boolean; onSave: () => void; onApply: () => void; onReport: () => void; match?: any }) {
  const eligibility = match?.eligibility || "verify";
  return <Card className="border-border/80 bg-card/60 transition hover:border-amber-500/30"><CardContent className="space-y-3 p-4">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold text-amber-100">{source.organization}</h3><p className="mt-1 text-xs text-muted-foreground">{source.country} · {source.type || source.sourceCategory || "Funding source"}</p></div>{match && <div className="text-center"><div className="text-2xl font-bold text-amber-300">{match.score}</div><div className="text-[9px] uppercase text-muted-foreground">fit</div></div>}</div>
    <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{source.supports || source.eligibility || "Review the official programme guidance."}</p>
    <div className="flex flex-wrap gap-1.5"><Badge variant="outline" className={eligibility === "eligible" ? "border-emerald-500/30 text-emerald-300" : eligibility === "unlikely" ? "border-rose-500/30 text-rose-300" : "border-amber-500/30 text-amber-300"}>{eligibility === "eligible" ? "Likely eligible" : eligibility === "unlikely" ? "Likely ineligible" : "Eligibility: verify"}</Badge><Badge variant="outline">{source.applicationOpen === "open" ? "Open" : source.rollingDeadline ? "Rolling" : "Window unknown"}</Badge>{source.deadlineAt && <Badge variant="outline">Due {dateText(source.deadlineAt)}</Badge>}</div>
    {match && <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground"><span>Country {match.breakdown.country}/25</span><span>Stage {match.breakdown.stage}/15</span><span>Format {match.breakdown.format}/15</span><span>Relevance {match.breakdown.relevance}/25</span><span>Readiness {match.breakdown.readiness}/15</span><span>Freshness {match.breakdown.freshness}/10</span></div>}
    {match?.concerns?.length > 0 && <div className="rounded-md border border-amber-500/15 bg-amber-500/5 p-2 text-[11px] text-amber-200/80">{match.concerns.slice(0, 2).join(" ")}</div>}
    <div className="text-[10px] text-muted-foreground">{freshnessLabel(source)}. Always verify the live portal.</div>
    <div className="flex flex-wrap gap-2"><Button size="sm" onClick={onApply} className="bg-amber-500 text-black hover:bg-amber-400"><FileText className="mr-1.5 h-3.5 w-3.5" />Apply</Button><Button size="sm" variant="outline" onClick={onSave}>{saved ? <BookmarkCheck className="mr-1.5 h-3.5 w-3.5" /> : <Bookmark className="mr-1.5 h-3.5 w-3.5" />}{saved ? "Saved" : "Shortlist"}</Button>{source.officialSite && <a href={source.officialGuidelinesUrl || source.officialSite} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Official</Button></a>}<Button size="sm" variant="ghost" onClick={onReport}><Flag className="mr-1.5 h-3.5 w-3.5" />Report</Button></div>
  </CardContent></Card>;
}

function ProfileEditor({ profile, setProfile, readiness, saving }: { profile: FundingProfile; setProfile: (next: FundingProfile) => void; readiness: any; saving: boolean }) {
  const set = (key: string, value: unknown) => setProfile({ ...profile, [key]: value });
  const setBudget = (key: string, value: string) => setProfile({ ...profile, budgetLines: { ...(profile.budgetLines || {}), [key]: value } });
  const setAttachment = (key: string, value: boolean) => setProfile({ ...profile, attachmentChecklist: { ...(profile.attachmentChecklist || {}), [key]: value } });
  const budget = localBudgetReview(profile);
  return <div className="space-y-5">
    <Card className="border-amber-500/20"><CardContent className="p-4"><div className="flex items-center justify-between gap-4"><div><div className="font-semibold">Master Funding Profile</div><p className="text-xs text-muted-foreground">Saved once and reused for matching, applications, the pitch package and finance planning.</p></div><div className="text-right"><div className="text-2xl font-bold text-amber-300">{readiness?.score ?? 0}%</div><div className="text-[10px] text-muted-foreground">readiness {saving ? "· saving…" : "· saved automatically"}</div></div></div><Progress value={readiness?.score || 0} className="mt-3" />{readiness?.warnings?.length > 0 && <div className="mt-3 rounded-md border border-amber-500/15 bg-amber-500/5 p-2 text-xs text-amber-200/80">{readiness.warnings.slice(0, 4).join(" ")}</div>}</CardContent></Card>
    <Tabs defaultValue="identity"><TabsList className="flex h-auto flex-wrap"><TabsTrigger value="identity">Applicant & project</TabsTrigger><TabsTrigger value="story">Story & team</TabsTrigger><TabsTrigger value="finance">Budget & finance</TabsTrigger><TabsTrigger value="market">Market & readiness</TabsTrigger><TabsTrigger value="attachments">Attachments</TabsTrigger></TabsList>
      <TabsContent value="identity"><Card><CardContent className="grid gap-4 p-5 md:grid-cols-2">{[
        ["applicantLegalName", "Legal applicant"], ["tradingName", "Trading / company name"], ["companyCountry", "Country of incorporation / residence"], ["contactName", "Primary contact"], ["contactEmail", "Contact email"], ["contactPhone", "Contact phone"], ["projectTitle", "Project title"], ["workingTitle", "Working title"], ["format", "Format"], ["stage", "Production stage"], ["productionCountries", "Production countries"], ["coProductionTerritories", "Co-production territories"], ["genre", "Genre"], ["targetAudience", "Target audience"],
      ].map(([key, label]) => <div key={key} className="space-y-1.5"><Label>{label}</Label><Input value={String(profile[key] || "")} onChange={(event) => set(key, event.target.value)} /></div>)}</CardContent></Card></TabsContent>
      <TabsContent value="story"><Card><CardContent className="space-y-4 p-5"><CountedTextarea label="Logline" value={String(profile.logline || "")} onChange={(value) => set("logline", value)} rows={2} recommended="20–40 words" /><CountedTextarea label="Short synopsis" value={String(profile.shortSynopsis || "")} onChange={(value) => set("shortSynopsis", value)} recommended="100–250 words" /><CountedTextarea label="Long synopsis" value={String(profile.longSynopsis || "")} onChange={(value) => set("longSynopsis", value)} rows={7} /><CountedTextarea label="Director statement" value={String(profile.directorStatement || "")} onChange={(value) => set("directorStatement", value)} /><CountedTextarea label="Producer statement" value={String(profile.producerStatement || "")} onChange={(value) => set("producerStatement", value)} /><CountedTextarea label="Creative approach" value={String(profile.creativeApproach || "")} onChange={(value) => set("creativeApproach", value)} /><CountedTextarea label="Rights position and chain of title" value={String(profile.rightsPosition || "")} onChange={(value) => set("rightsPosition", value)} /><CountedTextarea label="Key team and relevant experience" value={String(profile.teamSummary || "")} onChange={(value) => set("teamSummary", value)} /></CardContent></Card></TabsContent>
      <TabsContent value="finance"><div className="space-y-4"><Card><CardContent className="grid gap-4 p-5 md:grid-cols-3">{[["currency", "Currency"], ["totalBudget", "Total budget"], ["fundingRequested", "Funding requested"], ["securedFinance", "Finance secured"], ["pendingFinance", "Finance pending"], ["taxIncentives", "Tax incentives / rebates"], ["producerContribution", "Producer contribution / deferrals"], ["gap", "Stated finance gap"]].map(([key, label]) => <div key={key} className="space-y-1.5"><Label>{label}</Label><Input value={String(profile[key] || "")} onChange={(event) => set(key, event.target.value)} /></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Budget top sheet</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{BUDGET_CATEGORIES.map(([key, label]) => <div key={key} className="grid grid-cols-[1fr_150px] items-center gap-3"><Label>{label}</Label><Input inputMode="decimal" value={String(profile.budgetLines?.[key] || "")} onChange={(event) => setBudget(key, event.target.value)} /></div>)}</CardContent></Card><Card><CardContent className="grid gap-3 p-4 md:grid-cols-4"><Metric label="Budget total" value={formatMoney(budget.total, String(profile.currency || "AUD"))} /><Metric label="Line-item total" value={formatMoney(budget.lineTotal, String(profile.currency || "AUD"))} /><Metric label="Request" value={`${budget.requestedPercent}%`} /><Metric label="Calculated gap" value={formatMoney(budget.calculatedGap, String(profile.currency || "AUD"))} />{budget.warnings.length > 0 && <div className="md:col-span-4 rounded-md border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-200">{budget.warnings.join(" ")}</div>}</CardContent></Card></div></TabsContent>
      <TabsContent value="market"><Card><CardContent className="space-y-4 p-5"><CountedTextarea label="Distribution strategy" value={String(profile.distributionStrategy || "")} onChange={(value) => set("distributionStrategy", value)} /><CountedTextarea label="Audience strategy" value={String(profile.audienceStrategy || "")} onChange={(value) => set("audienceStrategy", value)} /><CountedTextarea label="Festival and market strategy" value={String(profile.festivalStrategy || "")} onChange={(value) => set("festivalStrategy", value)} /><CountedTextarea label="Production schedule" value={String(profile.productionSchedule || "")} onChange={(value) => set("productionSchedule", value)} /><CountedTextarea label="Production risks and mitigations" value={String(profile.productionRisks || "")} onChange={(value) => set("productionRisks", value)} /><CountedTextarea label="Accessibility and sustainability" value={String(profile.sustainabilityAccessibility || "")} onChange={(value) => set("sustainabilityAccessibility", value)} /><CountedTextarea label="Why this project is timely" value={String(profile.whyNow || "")} onChange={(value) => set("whyNow", value)} /><CountedTextarea label="Why this team" value={String(profile.whyTeam || "")} onChange={(value) => set("whyTeam", value)} /><CountedTextarea label="Milestone the funding will unlock" value={String(profile.milestoneUnlocked || "")} onChange={(value) => set("milestoneUnlocked", value)} /></CardContent></Card></TabsContent>
      <TabsContent value="attachments"><Card><CardContent className="grid gap-3 p-5 md:grid-cols-2">{FUNDING_ATTACHMENTS.map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"><Checkbox checked={Boolean(profile.attachmentChecklist?.[key])} onCheckedChange={(checked) => setAttachment(key, Boolean(checked))} /><span className="text-sm">{label}</span></label>)}</CardContent></Card></TabsContent>
    </Tabs>
  </div>;
}

function IncentivePanel({ sources }: { sources: any[] }) {
  const [total, setTotal] = useState("");
  const [local, setLocal] = useState("");
  const [labour, setLabour] = useState("");
  const [rate, setRate] = useState("");
  const [labourRate, setLabourRate] = useState("");
  const [minimum, setMinimum] = useState("");
  const [cap, setCap] = useState("");
  const estimate = estimateIncentive({ totalBudget: Number(total) || 0, qualifyingLocalSpend: Number(local) || 0, qualifyingLabourSpend: Number(labour) || 0, headlineRate: Number(rate) || 0, labourRate: labourRate ? Number(labourRate) : undefined, minimumSpend: minimum ? Number(minimum) : undefined, projectCap: cap ? Number(cap) : undefined });
  const incentives = sources.filter((source) => source.sourceCategory === "incentive");
  return <div className="space-y-4"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calculator className="h-4 w-4 text-amber-400" />Qualified-spend incentive calculator</CardTitle></CardHeader><CardContent className="space-y-4"><div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-200">This calculator applies the rate only to qualifying local expenditure and labour. Enter figures from the live official guidance; it does not assume the entire project budget qualifies.</div><div className="grid gap-4 md:grid-cols-3">{[[total, setTotal, "Total project budget"], [local, setLocal, "Qualifying local spend"], [labour, setLabour, "Qualifying local labour"], [rate, setRate, "Non-labour rate (%)"], [labourRate, setLabourRate, "Labour rate (%)"], [minimum, setMinimum, "Minimum qualifying spend"], [cap, setCap, "Project cap (optional)"]].map(([value, setter, label]: any) => <div key={label} className="space-y-1.5"><Label>{label}</Label><Input type="number" min="0" value={value} onChange={(event) => setter(event.target.value)} /></div>)}</div><div className="grid gap-3 md:grid-cols-3"><Metric label="Estimated gross incentive" value={formatMoney(estimate.estimated, "AUD")} /><Metric label="Qualifying local spend" value={formatMoney(estimate.localSpend, "AUD")} /><Metric label="Qualifying labour" value={formatMoney(estimate.labourSpend, "AUD")} /></div>{estimate.warnings.length > 0 && <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">{estimate.warnings.join(" ")}</div>}</CardContent></Card><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{incentives.map((source) => <Card key={source.id}><CardContent className="p-4"><div className="font-semibold">{source.organization}</div><div className="mt-1 text-xs text-muted-foreground">{source.country}</div><p className="mt-3 line-clamp-3 text-xs text-muted-foreground">{source.supports || source.notes}</p>{source.officialSite && <a href={source.officialGuidelinesUrl || source.officialSite} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="mt-3"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Check current rules</Button></a>}</CardContent></Card>)}</div></div>;
}

export default function FundingCommandCentre() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<TabValue>(queryTab);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [profile, setProfile] = useState<FundingProfile>({});
  const [profileHydrated, setProfileHydrated] = useState(false);
  const [country, setCountry] = useState("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [includeReferences, setIncludeReferences] = useState(false);
  const [activeSource, setActiveSource] = useState<any | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<number | null>(null);
  const [draft, setDraft] = useState<FundingProfile>({});
  const [emailCopy, setEmailCopy] = useState(false);
  const [reportSource, setReportSource] = useState<any | null>(null);
  const [reportReason, setReportReason] = useState("wrong_url");
  const [reportDetails, setReportDetails] = useState("");
  const [expandedApplication, setExpandedApplication] = useState<number | null>(null);

  const access = trpc.funding.access.useQuery();
  const preview = trpc.funding.preview.useQuery();
  const projects = trpc.project.list.useQuery(undefined, { enabled: Boolean(user) });
  const allowed = Boolean(access.data?.allowed);
  const activeProject = (projects.data || []).find((project: any) => Number(project.id) === projectId);

  useEffect(() => {
    if (!projectId && projects.data?.length) setProjectId(Number(projects.data[0].id));
  }, [projectId, projects.data]);

  const list = trpc.funding.list.useQuery({ country: country === "all" ? undefined : country, search: search || undefined, category: category === "all" ? undefined : category, includeReferences }, { enabled: allowed });
  const allSources = trpc.funding.list.useQuery({ includeReferences: true }, { enabled: allowed });
  const profileQuery = trpc.funding.profile.useQuery({ projectId: projectId || 0 }, { enabled: allowed && Boolean(projectId) });
  const dashboard = trpc.funding.dashboard.useQuery({ projectId: projectId || 0 }, { enabled: allowed && Boolean(projectId) });
  const shortlist = trpc.funding.shortlist.useQuery({ projectId: projectId || 0 }, { enabled: allowed && Boolean(projectId) });
  const savedIds = new Set((shortlist.data || []).map((item: any) => Number(item.fundingSourceId)));
  const matches = trpc.funding.matchScore.useQuery({ projectId: projectId || 0, limit: 50, country: country === "all" ? undefined : country }, { enabled: allowed && Boolean(projectId) && tab === "matches" });
  const drafts = trpc.funding.drafts.useQuery({ projectId: projectId || 0 }, { enabled: allowed && Boolean(projectId) });
  const applications = trpc.funding.applicationsList.useQuery({ projectId: projectId || undefined }, { enabled: allowed && Boolean(projectId) });
  const events = trpc.funding.applicationEvents.useQuery({ applicationId: expandedApplication || 0 }, { enabled: allowed && Boolean(expandedApplication) });

  const saveProfile = trpc.funding.saveProfile.useMutation({ onSuccess: (result) => { dashboard.refetch(); if (result.readiness) profileQuery.refetch(); } });
  const toggleSaved = trpc.funding.toggleSaved.useMutation({ onSuccess: () => { shortlist.refetch(); dashboard.refetch(); } });
  const autoDraft = trpc.funding.autofillDraft.useMutation();
  const saveDraft = trpc.funding.saveDraft.useMutation({ onSuccess: (result) => { setActiveDraftId(Number(result.id)); drafts.refetch(); dashboard.refetch(); toast.success("Draft saved"); } });
  const submit = trpc.funding.submitApplication.useMutation({ onSuccess: (result) => { applications.refetch(); drafts.refetch(); dashboard.refetch(); result.emailSent ? toast.success("Application recorded and email sent") : toast.warning(result.emailError || "Application recorded; no email sent"); } });
  const setStatus = trpc.funding.setApplicationStatus.useMutation({ onSuccess: () => { applications.refetch(); events.refetch(); toast.success("Tracker updated"); } });
  const report = trpc.funding.reportListing.useMutation({ onSuccess: () => { toast.success("Listing report submitted"); setReportSource(null); setReportDetails(""); } });
  const reminders = trpc.funding.syncReminders.useMutation({ onSuccess: (result) => toast.success(`${result.created} new funding reminder${result.created === 1 ? "" : "s"} created`) });

  useEffect(() => {
    if (!profileQuery.data?.data || !projectId) return;
    const localKey = `virelle:funding-profile:${projectId}`;
    let local: FundingProfile = {};
    try { local = JSON.parse(localStorage.getItem(localKey) || "{}"); } catch { local = {}; }
    setProfile({ ...(profileQuery.data.data as FundingProfile), ...local });
    setProfileHydrated(true);
  }, [profileQuery.data?.data, projectId]);

  useEffect(() => {
    if (!allowed || !projectId || !profileHydrated) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(`virelle:funding-profile:${projectId}`, JSON.stringify(profile));
      saveProfile.mutate({ projectId, data: profile as Record<string, unknown> });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [allowed, projectId, profile, profileHydrated]);

  const countries = useMemo(() => [...new Set((allSources.data || []).map((source: any) => String(source.country)))].sort(), [allSources.data]);
  const sourceCategories = useMemo(() => [...new Set((allSources.data || []).map((source: any) => String(source.sourceCategory || "grant")))].sort(), [allSources.data]);
  const readiness = profileQuery.data?.readiness || { score: 0, warnings: [], missing: [] };

  function changeTab(value: string) {
    const next = value as TabValue;
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }

  async function openApplication(source: any, existing?: any) {
    if (!projectId) return toast.error("Select a project first");
    setActiveSource(source);
    if (existing) {
      setActiveDraftId(Number(existing.id));
      setDraft(existing.data || {});
      return;
    }
    try {
      const result = await autoDraft.mutateAsync({ projectId, fundingSourceId: Number(source.id) });
      setDraft(result.draft as FundingProfile);
      setActiveDraftId(null);
      toast.success("Application prefilled from your project and master profile — 0 credits");
    } catch (error: any) {
      toast.error(error.message || "Could not create draft");
    }
  }

  function saveCurrentDraft() {
    if (!projectId || !activeSource) return;
    saveDraft.mutate({ id: activeDraftId || undefined, projectId, fundingSourceId: Number(activeSource.id), title: `${draft.projectTitle || activeProject?.title || "Project"} → ${activeSource.organization}`, data: draft as Record<string, unknown> });
  }

  function exportFiles(kind: "pdf" | "docx" | "csv" | "html") {
    if (!activeSource) return;
    const base = `${safeName(draft.projectTitle)}-${safeName(activeSource.organization)}`;
    if (kind === "pdf") downloadBlob(createFundingPdf(draft, activeSource), `${base}.pdf`);
    if (kind === "docx") downloadBlob(createFundingDocx(draft, activeSource), `${base}.docx`);
    if (kind === "csv") downloadBlob(createBudgetCsv(draft), `${base}-budget.csv`);
    if (kind === "html") {
      const html = `<html><head><meta charset="utf-8"><title>${draft.projectTitle || "Funding pack"}</title></head><body><pre style="white-space:pre-wrap;font:14px Arial">${JSON.stringify(draft, null, 2).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre></body></html>`;
      downloadHtml(html, base);
    }
    toast.success(`${kind.toUpperCase()} downloaded`);
  }

  async function recordSubmitted() {
    if (!projectId || !activeSource) return;
    let draftId = activeDraftId;
    if (!draftId) {
      const result = await saveDraft.mutateAsync({ projectId, fundingSourceId: Number(activeSource.id), title: `${draft.projectTitle || "Project"} → ${activeSource.organization}`, data: draft as Record<string, unknown> });
      draftId = Number(result.id);
      setActiveDraftId(draftId);
    }
    await submit.mutateAsync({ draftId, emailCopy });
    setActiveSource(null);
  }

  if (access.isLoading || preview.isLoading) return <div className="p-8"><LoadingCard /></div>;
  if (!allowed) return <PreviewGate preview={preview.data || []} onUpgrade={() => navigate("/pricing")} />;

  const applicationCounts = dashboard.data?.applications || {};
  const crowdfundingSources = (allSources.data || []).filter((source: any) => source.sourceCategory === "crowdfunding");

  return <div className="min-h-screen px-4 py-6"><SiteHead title="Funding Command Centre" description="Match, prepare, export and track film funding applications from one project workspace." /><div className="mx-auto max-w-7xl space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><button onClick={() => navigate("/")} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Dashboard</button><h1 className="flex items-center gap-2 text-2xl font-bold text-gold-shimmer"><WalletCards className="h-6 w-6 text-amber-400" />Funding Command Centre</h1><p className="mt-1 text-sm text-muted-foreground">One reusable project profile for grants, incentives, markets, pitch packages and crowdfunding.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => navigate(projectId ? `/projects/${projectId}/pitch-deck` : "/projects")}><Presentation className="mr-1.5 h-4 w-4" />Pitch deck</Button><Button variant="outline" onClick={() => reminders.mutate()} disabled={reminders.isPending}><CalendarClock className="mr-1.5 h-4 w-4" />Check reminders</Button></div></div>
    <Card><CardContent className="flex flex-wrap items-center gap-3 p-4"><Label className="shrink-0">Active project</Label><Select value={projectId ? String(projectId) : ""} onValueChange={(value) => { setProjectId(Number(value)); setProfileHydrated(false); }}><SelectTrigger className="max-w-md"><SelectValue placeholder="Choose a project" /></SelectTrigger><SelectContent>{(projects.data || []).map((project: any) => <SelectItem key={project.id} value={String(project.id)}>{project.title}</SelectItem>)}</SelectContent></Select>{projects.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}{activeProject && <Badge variant="outline">{activeProject.genre || "Genre not set"}</Badge>}</CardContent></Card>
    {!projectId ? <Card><CardContent className="p-10 text-center text-muted-foreground">Create or select a project to use the Funding Command Centre.</CardContent></Card> : <Tabs value={tab} onValueChange={changeTab} className="space-y-4"><TabsList className="flex h-auto flex-wrap justify-start"><TabsTrigger value="overview"><LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />Overview</TabsTrigger><TabsTrigger value="matches"><Target className="mr-1.5 h-3.5 w-3.5" />Smart matches</TabsTrigger><TabsTrigger value="shortlist"><Bookmark className="mr-1.5 h-3.5 w-3.5" />Shortlist</TabsTrigger><TabsTrigger value="profile"><Users className="mr-1.5 h-3.5 w-3.5" />Master profile</TabsTrigger><TabsTrigger value="applications"><FolderOpen className="mr-1.5 h-3.5 w-3.5" />Drafts & tracker</TabsTrigger><TabsTrigger value="incentives"><Calculator className="mr-1.5 h-3.5 w-3.5" />Tax incentives</TabsTrigger><TabsTrigger value="crowdfunding"><Sparkles className="mr-1.5 h-3.5 w-3.5" />Crowdfunding</TabsTrigger><TabsTrigger value="directory"><Globe className="mr-1.5 h-3.5 w-3.5" />Directory</TabsTrigger></TabsList>
      <TabsContent value="overview" className="space-y-4"><div className="grid gap-3 md:grid-cols-4"><Metric label="Profile readiness" value={`${readiness.score || 0}%`} hint={`${readiness.missing?.length || 0} core fields missing`} /><Metric label="Shortlist" value={dashboard.data?.shortlist || 0} /><Metric label="Draft applications" value={dashboard.data?.drafts || 0} /><Metric label="Submitted / active" value={(applicationCounts.submitted || 0) + (applicationCounts.under_review || 0) + (applicationCounts.additional_materials || 0) + (applicationCounts.interview || 0)} /></div><div className="grid gap-4 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">Recommended next action</CardTitle></CardHeader><CardContent>{(readiness.score || 0) < 70 ? <div><p className="text-sm text-muted-foreground">Complete the master profile before relying on match scores or starting several applications.</p><Button className="mt-3" onClick={() => changeTab("profile")}>Complete profile</Button></div> : <div><p className="text-sm text-muted-foreground">Your base materials are ready. Review transparent project matches and build a focused shortlist.</p><Button className="mt-3" onClick={() => changeTab("matches")}>Review matches</Button></div>}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Funding workflow</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground"><div>1. Complete the master profile</div><div>2. Verify eligibility and deadlines</div><div>3. Shortlist focused opportunities</div><div>4. Tailor and export each pack</div><div>5. Record submission and follow-up</div></CardContent></Card></div></TabsContent>
      <TabsContent value="profile">{profileQuery.isLoading ? <LoadingCard /> : <ProfileEditor profile={profile} setProfile={setProfile} readiness={readiness} saving={saveProfile.isPending} />}</TabsContent>
      <TabsContent value="matches" className="space-y-4"><div className="flex flex-wrap items-center gap-3"><Select value={country} onValueChange={setCountry}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All countries</SelectItem>{countries.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><span className="text-xs text-muted-foreground">Rules-based transparent matching; no credits and no AI overclaim.</span></div>{matches.isLoading ? <LoadingCard /> : <div className="grid gap-4 lg:grid-cols-2">{(matches.data || []).map((match: any) => <SourceCard key={match.source.id} source={match.source} match={match} saved={savedIds.has(Number(match.source.id))} onSave={() => toggleSaved.mutate({ projectId, sourceId: Number(match.source.id), saved: !savedIds.has(Number(match.source.id)) })} onApply={() => openApplication(match.source)} onReport={() => setReportSource(match.source)} />)}</div>}</TabsContent>
      <TabsContent value="shortlist">{shortlist.isLoading ? <LoadingCard /> : (shortlist.data || []).length === 0 ? <Card><CardContent className="p-10 text-center text-muted-foreground">No shortlisted opportunities yet.</CardContent></Card> : <div className="grid gap-4 lg:grid-cols-2">{(shortlist.data || []).map((source: any) => <SourceCard key={source.fundingSourceId} source={{ ...source, id: source.fundingSourceId }} saved onSave={() => toggleSaved.mutate({ projectId, sourceId: Number(source.fundingSourceId), saved: false })} onApply={() => openApplication({ ...source, id: source.fundingSourceId })} onReport={() => setReportSource({ ...source, id: source.fundingSourceId })} />)}</div>}</TabsContent>
      <TabsContent value="applications" className="space-y-4"><Card><CardHeader><CardTitle className="text-base">Saved drafts</CardTitle></CardHeader><CardContent className="space-y-2">{drafts.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (drafts.data || []).length === 0 ? <p className="text-sm text-muted-foreground">No drafts yet. Open a match or directory listing and choose Apply.</p> : (drafts.data || []).map((item: any) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><div className="font-medium">{item.title || `${item.organization} application`}</div><div className="text-xs text-muted-foreground">{item.completeness}% complete · updated {dateText(item.updatedAt)}</div></div><Button size="sm" onClick={() => openApplication({ id: item.fundingSourceId, organization: item.organization, country: item.country, officialSite: item.officialSite }, item)}>Resume</Button></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Application tracker</CardTitle></CardHeader><CardContent className="space-y-3">{applications.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (applications.data || []).length === 0 ? <p className="text-sm text-muted-foreground">No applications recorded yet.</p> : (applications.data || []).map((application: any) => <div key={application.id} className="rounded-lg border p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-semibold">{application.projectTitle} → {application.organization}</div><div className="text-xs text-muted-foreground">Submitted {dateText(application.submittedAt)} · email {application.emailStatus}</div></div><div className="flex flex-wrap gap-2"><Select value={application.status} onValueChange={(status) => setStatus.mutate({ applicationId: Number(application.id), status: status as any })}><SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Button size="sm" variant="outline" onClick={() => setExpandedApplication(expandedApplication === Number(application.id) ? null : Number(application.id))}>{expandedApplication === Number(application.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}History</Button></div></div><div className="mt-3 grid gap-3 md:grid-cols-3"><div><Label className="text-xs">Deadline</Label><Input type="date" defaultValue={application.deadlineAt ? new Date(application.deadlineAt).toISOString().slice(0, 10) : ""} onBlur={(event) => setStatus.mutate({ applicationId: Number(application.id), status: application.status, deadlineAt: event.target.value || null })} /></div><div><Label className="text-xs">Follow-up date</Label><Input type="date" defaultValue={application.followUpAt ? new Date(application.followUpAt).toISOString().slice(0, 10) : ""} onBlur={(event) => setStatus.mutate({ applicationId: Number(application.id), status: application.status, followUpAt: event.target.value || null })} /></div><div><Label className="text-xs">Tracker note</Label><Input defaultValue={application.notes || ""} onBlur={(event) => setStatus.mutate({ applicationId: Number(application.id), status: application.status, notes: event.target.value })} /></div></div>{expandedApplication === Number(application.id) && <div className="mt-3 space-y-2 rounded-md bg-muted/20 p-3">{events.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (events.data || []).map((event: any) => <div key={event.id} className="text-xs"><span className="font-medium">{dateText(event.createdAt)}</span> · {event.eventType.replace(/_/g, " ")}{event.fromStatus || event.toStatus ? ` · ${event.fromStatus || "new"} → ${event.toStatus || ""}` : ""}{event.note ? ` · ${event.note}` : ""}</div>)}</div>}</div>)}</CardContent></Card></TabsContent>
      <TabsContent value="incentives"><IncentivePanel sources={allSources.data || []} /></TabsContent>
      <TabsContent value="crowdfunding" className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><Card className="border-amber-500/25"><CardHeader><CardTitle className="text-base">Launch on Virelle</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Create and manage a Virelle-hosted film campaign, rewards and payout setup.</p><Button className="mt-3" onClick={() => navigate(projectId ? `/projects/${projectId}/crowdfunding` : "/crowdfunding")}>Open Virelle crowdfunding</Button></CardContent></Card><Card><CardHeader><CardTitle className="text-base">External platforms</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Compare external platforms separately. Virelle does not imply endorsement and does not submit campaigns to them.</p></CardContent></Card></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{crowdfundingSources.map((source: any) => <Card key={source.id}><CardContent className="p-4"><div className="font-semibold">{source.organization}</div><div className="mt-1 text-xs text-muted-foreground">{source.country}</div><p className="mt-3 line-clamp-3 text-xs text-muted-foreground">{source.supports || source.notes}</p>{source.officialSite && <a href={source.officialSite} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="mt-3"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Visit platform</Button></a>}</CardContent></Card>)}</div></TabsContent>
      <TabsContent value="directory" className="space-y-4"><div className="flex flex-wrap gap-3"><div className="relative min-w-56 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search organisations, eligibility, stages…" value={search} onChange={(event) => setSearch(event.target.value)} /></div><Select value={country} onValueChange={setCountry}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All countries</SelectItem>{countries.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><Select value={category} onValueChange={setCategory}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{sourceCategories.map((value) => <SelectItem key={value} value={value}>{value.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select><label className="flex items-center gap-2 rounded-md border px-3 text-xs"><Checkbox checked={includeReferences} onCheckedChange={(value) => setIncludeReferences(Boolean(value))} />Include industry references</label></div>{list.isLoading ? <LoadingCard /> : <div className="grid gap-4 lg:grid-cols-2">{(list.data || []).map((source: any) => <SourceCard key={source.id} source={source} saved={savedIds.has(Number(source.id))} onSave={() => toggleSaved.mutate({ projectId, sourceId: Number(source.id), saved: !savedIds.has(Number(source.id)) })} onApply={() => openApplication(source)} onReport={() => setReportSource(source)} />)}</div>}</TabsContent>
    </Tabs>}
  </div>

  <Dialog open={Boolean(activeSource)} onOpenChange={(open) => { if (!open) setActiveSource(null); }}><DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>Funding application — {activeSource?.organization}</DialogTitle><DialogDescription>Prefilled from the project and master profile without credits. Tailor the answers, save a draft, export files and record the real submission yourself.</DialogDescription></DialogHeader>{autoDraft.isPending ? <div className="flex min-h-60 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-amber-400" /></div> : <div className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><div className="space-y-1.5"><Label>Project title</Label><Input value={String(draft.projectTitle || "")} onChange={(event) => setDraft({ ...draft, projectTitle: event.target.value })} /></div><div className="space-y-1.5"><Label>Funding requested</Label><Input value={String(draft.fundingRequested || "")} onChange={(event) => setDraft({ ...draft, fundingRequested: event.target.value })} /></div></div><CountedTextarea label="Logline" value={String(draft.logline || "")} onChange={(value) => setDraft({ ...draft, logline: value })} rows={2} /><CountedTextarea label="Short synopsis" value={String(draft.shortSynopsis || "")} onChange={(value) => setDraft({ ...draft, shortSynopsis: value })} recommended="100–250 words" /><CountedTextarea label="Why this project and team fit this programme" value={String(draft.reasonForApplying || draft.whyTeam || "")} onChange={(value) => setDraft({ ...draft, reasonForApplying: value })} /><CountedTextarea label="Fund-specific tailoring notes" value={String(draft.fundSpecificNotes || "")} onChange={(value) => setDraft({ ...draft, fundSpecificNotes: value })} /><div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-200">Virelle compiles a working pack only. Verify the live portal, eligibility, deadline, declarations, word limits and attachment rules before submission.</div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={saveCurrentDraft} disabled={saveDraft.isPending}><Save className="mr-1.5 h-4 w-4" />Save draft</Button><Button variant="outline" onClick={() => exportFiles("pdf")}><FileDown className="mr-1.5 h-4 w-4" />PDF</Button><Button variant="outline" onClick={() => exportFiles("docx")}><FileText className="mr-1.5 h-4 w-4" />DOCX</Button><Button variant="outline" onClick={() => exportFiles("csv")}><Download className="mr-1.5 h-4 w-4" />Budget CSV</Button><Button variant="ghost" onClick={() => exportFiles("html")}>HTML backup</Button></div><label className="flex items-center gap-2 text-sm"><Checkbox checked={emailCopy} onCheckedChange={(value) => setEmailCopy(Boolean(value))} /><Mail className="h-4 w-4" />Also email a copy when recording submission</label></div>}<DialogFooter><Button variant="outline" onClick={() => setActiveSource(null)}>Close</Button><Button onClick={recordSubmitted} disabled={submit.isPending || autoDraft.isPending} className="bg-amber-500 text-black hover:bg-amber-400">{submit.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}Record as submitted</Button></DialogFooter></DialogContent></Dialog>

  <Dialog open={Boolean(reportSource)} onOpenChange={(open) => { if (!open) setReportSource(null); }}><DialogContent><DialogHeader><DialogTitle>Report outdated listing</DialogTitle><DialogDescription>{reportSource?.organization}</DialogDescription></DialogHeader><div className="space-y-3"><Select value={reportReason} onValueChange={setReportReason}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="wrong_url">Wrong URL</SelectItem><SelectItem value="closed">Programme closed</SelectItem><SelectItem value="deadline_changed">Deadline changed</SelectItem><SelectItem value="eligibility_changed">Eligibility changed</SelectItem><SelectItem value="duplicate">Duplicate entry</SelectItem><SelectItem value="encoding">Text / encoding problem</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select><Textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} placeholder="Describe what needs checking" /></div><DialogFooter><Button variant="outline" onClick={() => setReportSource(null)}>Cancel</Button><Button onClick={() => reportSource && report.mutate({ fundingSourceId: Number(reportSource.id), reason: reportReason as any, details: reportDetails || undefined })} disabled={report.isPending}>Submit report</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
