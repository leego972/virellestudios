import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Gift,
  Loader2,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Search,
  Settings,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { HollywoodIcon } from "@/components/HollywoodIcon";
import { NextStageCTA } from "@/components/NextStageCTA";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  campaignReadiness,
  createCampaignPack,
  createRewardTemplates,
  crowdfundingEconomics,
  isCrowdfundingPlatform,
  parseAmount,
  type CrowdfundingBrief,
} from "@/lib/crowdfundingTools";
import { trpc } from "@/lib/trpc";

const formatAud = (cents: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);

const statusClasses: Record<string, string> = {
  draft: "bg-zinc-500/20 text-zinc-300",
  active: "bg-blue-500/20 text-blue-300",
  funded: "bg-amber-500/20 text-amber-300",
  failed: "bg-red-500/20 text-red-300",
  paid_out: "bg-emerald-500/20 text-emerald-300",
  cancelled: "bg-zinc-500/20 text-zinc-500",
};

type CampaignForm = {
  title: string;
  tagline: string;
  description: string;
  goalAud: string;
  fundingModel: "all_or_nothing" | "keep_it_all";
  format: "Feature" | "Short" | "Series" | "Documentary" | "Other";
  genre: string;
};

type RewardDraft = {
  title: string;
  description: string;
  amountAud: string;
  estimatedDelivery: string;
  limitCount: string;
};

function downloadText(name: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        toast.success("Copied");
      }}
    >
      <Copy className="h-3.5 w-3.5" /> {label}
    </Button>
  );
}

function ReadinessCard({ readiness }: { readiness: ReturnType<typeof campaignReadiness> }) {
  return (
    <Card className="border-amber-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base gradient-text-gold">
          <HollywoodIcon tool="reports" size={24} alt="Campaign readiness" />
          Launch readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <span className="text-sm text-muted-foreground">Campaign completeness</span>
          <strong className="text-2xl text-amber-400">{readiness.score}%</strong>
        </div>
        <Progress value={readiness.score} className="h-2 [&>div]:bg-amber-500" />
        <div className="space-y-1.5">
          {readiness.checks.map((check) => (
            <div key={check.key} className="flex items-center gap-2 text-xs">
              {check.complete ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              )}
              <span className={check.complete ? "text-muted-foreground" : "text-foreground"}>
                {check.label}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">{check.points} pts</span>
            </div>
          ))}
        </div>
        {readiness.warnings.map((warning) => (
          <p key={warning} className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-[11px] text-amber-200">
            {warning}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

function CrowdfundingHubInner() {
  const params = useParams<{ projectId?: string }>();
  const [, navigate] = useLocation();
  const projectId = Number(params.projectId || 0);
  const hasProject = projectId > 0;
  const utils = trpc.useUtils();

  const projectQuery = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: hasProject },
  );
  const fundingSourcesQuery = trpc.funding.list.useQuery({});
  const campaignsQuery = trpc.crowdfund.campaign.listMine.useQuery();

  const [tab, setTab] = useState("campaigns");
  const [platformSearch, setPlatformSearch] = useState("");
  const [platformCountry, setPlatformCountry] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showLaunch, setShowLaunch] = useState(false);
  const [launchingId, setLaunchingId] = useState<number | null>(null);
  const [deadlineDays, setDeadlineDays] = useState(30);
  const [manageCampaignId, setManageCampaignId] = useState<number | null>(null);
  const [launchAcknowledged, setLaunchAcknowledged] = useState(false);

  const [brief, setBrief] = useState<CrowdfundingBrief>({
    format: "Feature",
    genre: "",
    audience: "",
    tone: "Warm, direct and credible",
    premise: "",
    goal: "25000",
    currency: "AUD",
    duration: "30",
    useOfFunds: "",
    filmmakerStory: "",
  });
  const [generatedPack, setGeneratedPack] = useState<ReturnType<typeof createCampaignPack> | null>(null);
  const [newCampaign, setNewCampaign] = useState<CampaignForm>({
    title: "",
    tagline: "",
    description: "",
    goalAud: "25000",
    fundingModel: "all_or_nothing",
    format: "Feature",
    genre: "",
  });

  const manageQuery = trpc.crowdfund.campaign.getById.useQuery(
    { id: manageCampaignId || 0 },
    { enabled: Boolean(manageCampaignId) },
  );
  const payoutStatusQuery = trpc.crowdfund.connect.getStatus.useQuery(
    { campaignId: manageCampaignId || 0 },
    { enabled: Boolean(manageCampaignId) },
  );

  const [manageDraft, setManageDraft] = useState({
    title: "",
    tagline: "",
    description: "",
    posterUrl: "",
    videoUrl: "",
    goalAud: "",
  });
  const [rewardDrafts, setRewardDrafts] = useState<Record<number, RewardDraft>>({});

  useEffect(() => {
    if (!hasProject || !projectQuery.data) return;
    const project = projectQuery.data as any;
    setBrief((current) => ({
      ...current,
      format: project.format || project.type || current.format,
      genre: project.genre || current.genre,
      audience: project.targetAudience || current.audience,
      premise: project.plotSummary || project.description || project.mainPlot || current.premise,
    }));
    setNewCampaign((current) => ({
      ...current,
      title: current.title || project.title || "",
      genre: current.genre || project.genre || "",
      format: (project.format || project.type || current.format) as CampaignForm["format"],
    }));
  }, [hasProject, projectQuery.data]);

  useEffect(() => {
    const key = `virelle:crowdfunding-brief:${projectId || "global"}`;
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "{}");
      setBrief((current) => ({ ...current, ...stored }));
    } catch {
      // Ignore malformed local drafts.
    }
  }, [projectId]);

  useEffect(() => {
    const key = `virelle:crowdfunding-brief:${projectId || "global"}`;
    const timer = window.setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(brief));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [brief, projectId]);

  useEffect(() => {
    const data = manageQuery.data as any;
    if (!data?.campaign) return;
    setManageDraft({
      title: data.campaign.title || "",
      tagline: data.campaign.tagline || "",
      description: data.campaign.description || "",
      posterUrl: data.campaign.posterUrl || "",
      videoUrl: data.campaign.videoUrl || "",
      goalAud: String((data.campaign.goalAmountCents || 0) / 100),
    });
    const drafts: Record<number, RewardDraft> = {};
    for (const reward of data.rewards || []) {
      drafts[reward.id] = {
        title: reward.title || "",
        description: reward.description || "",
        amountAud: String((reward.amountCents || 0) / 100),
        estimatedDelivery: reward.estimatedDelivery || "",
        limitCount: reward.limitCount ? String(reward.limitCount) : "",
      };
    }
    setRewardDrafts(drafts);
  }, [manageQuery.data]);

  const campaigns = (campaignsQuery.data || []) as any[];
  const platformSources = useMemo(
    () => (fundingSourcesQuery.data || []).filter(isCrowdfundingPlatform) as any[],
    [fundingSourcesQuery.data],
  );
  const platformCountries = useMemo(
    () => [...new Set(platformSources.map((source) => String(source.country || "Global")))].sort(),
    [platformSources],
  );
  const filteredPlatforms = useMemo(() => {
    const query = platformSearch.trim().toLowerCase();
    return platformSources.filter((source) => {
      if (platformCountry !== "all" && String(source.country || "Global") !== platformCountry) return false;
      if (!query) return true;
      return [source.organization, source.country, source.type, source.supports, source.eligibility]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [platformCountry, platformSearch, platformSources]);

  const campaignTotals = useMemo(
    () => campaigns.reduce(
      (totals, campaign) => ({
        raised: totals.raised + Number(campaign.raisedAmountCents || 0),
        backers: totals.backers + Number(campaign.backerCount || 0),
        active: totals.active + (campaign.status === "active" ? 1 : 0),
      }),
      { raised: 0, backers: 0, active: 0 },
    ),
    [campaigns],
  );

  const builderGoalCents = Math.round(parseAmount(brief.goal) * 100);
  const builderEconomics = crowdfundingEconomics(builderGoalCents);
  const manageData = manageQuery.data as any;
  const manageCampaign = manageData?.campaign;
  const manageRewards = (manageData?.rewards || []) as any[];
  const manageReadiness = campaignReadiness(
    {
      ...(manageCampaign || {}),
      ...manageDraft,
      goalAmountCents: Math.round(parseAmount(manageDraft.goalAud) * 100),
      stripeConnectOnboarded:
        payoutStatusQuery.data?.onboarded ?? manageCampaign?.stripeConnectOnboarded,
    },
    manageRewards.map((reward) => rewardDrafts[reward.id] || reward),
  );

  const createCampaign = trpc.crowdfund.campaign.create.useMutation({
    onSuccess: ({ slug }) => {
      toast.success("Campaign created as a draft");
      setShowCreate(false);
      campaignsQuery.refetch();
      navigate(`/crowdfund/c/${slug}`);
    },
    onError: (error) => toast.error(error.message),
  });
  const updateCampaign = trpc.crowdfund.campaign.update.useMutation({
    onSuccess: () => {
      toast.success("Campaign details saved");
      manageQuery.refetch();
      campaignsQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteCampaign = trpc.crowdfund.campaign.delete.useMutation({
    onSuccess: () => {
      toast.success("Draft campaign cancelled");
      setManageCampaignId(null);
      campaignsQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  const launchCampaign = trpc.crowdfund.campaign.launch.useMutation({
    onSuccess: () => {
      toast.success("Campaign is live");
      setShowLaunch(false);
      setLaunchingId(null);
      setLaunchAcknowledged(false);
      campaignsQuery.refetch();
      manageQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  const createConnectAccount = trpc.crowdfund.connect.createAccount.useMutation();
  const getOnboardingUrl = trpc.crowdfund.connect.getOnboardingUrl.useMutation();
  const createReward = trpc.crowdfund.reward.create.useMutation();
  const updateReward = trpc.crowdfund.reward.update.useMutation();
  const deleteReward = trpc.crowdfund.reward.delete.useMutation();

  async function setupPayouts(campaignId: number) {
    try {
      await createConnectAccount.mutateAsync({ campaignId });
      const returnUrl = `${window.location.origin}${hasProject ? `/projects/${projectId}/crowdfunding` : "/crowdfunding"}`;
      const result = await getOnboardingUrl.mutateAsync({ campaignId, returnUrl });
      window.location.href = result.url;
    } catch (error: any) {
      toast.error(error?.message || "Payout setup could not be started");
    }
  }

  function buildFreePack() {
    const title = String((projectQuery.data as any)?.title || newCampaign.title || "Untitled Film");
    if (!brief.premise.trim()) {
      toast.error("Add the film premise first");
      return;
    }
    const pack = createCampaignPack(brief, title);
    setGeneratedPack(pack);
    setNewCampaign((current) => ({
      ...current,
      title: current.title || title,
      genre: current.genre || brief.genre,
      format: (brief.format || current.format) as CampaignForm["format"],
      goalAud: brief.goal || current.goalAud,
      description: pack.pitch,
      tagline: current.tagline || brief.premise.split(/[.!?]/)[0].slice(0, 180),
    }));
    toast.success("Free campaign pack created locally");
  }

  function submitNewCampaign() {
    const goalAmountCents = Math.round(parseAmount(newCampaign.goalAud) * 100);
    if (newCampaign.title.trim().length < 3) {
      toast.error("Campaign title must contain at least three characters");
      return;
    }
    if (goalAmountCents < 100) {
      toast.error("Funding goal must be at least A$1");
      return;
    }
    createCampaign.mutate({
      title: newCampaign.title.trim(),
      tagline: newCampaign.tagline.trim() || undefined,
      description: newCampaign.description.trim() || undefined,
      goalAmountCents,
      fundingModel: newCampaign.fundingModel,
      format: newCampaign.format,
      genre: newCampaign.genre.trim() || undefined,
      projectId: hasProject ? projectId : undefined,
    });
  }

  async function addRecommendedRewards() {
    if (!manageCampaign) return;
    if (manageRewards.length > 0 && !window.confirm("Add another set of recommended reward tiers?")) return;
    const templates = createRewardTemplates(Number(manageCampaign.goalAmountCents || 0) / 100);
    try {
      for (let index = 0; index < templates.length; index += 1) {
        const reward = templates[index];
        await createReward.mutateAsync({
          campaignId: manageCampaign.id,
          title: reward.title,
          description: reward.description,
          amountCents: reward.amountCents,
          estimatedDelivery: reward.estimatedDelivery,
          limitCount: reward.limitCount,
          sortOrder: manageRewards.length + index,
        });
      }
      toast.success("Recommended reward tiers added");
      manageQuery.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Rewards could not be added");
    }
  }

  async function saveReward(rewardId: number) {
    const draft = rewardDrafts[rewardId];
    if (!draft) return;
    try {
      await updateReward.mutateAsync({
        id: rewardId,
        title: draft.title,
        description: draft.description,
        amountCents: Math.max(100, Math.round(parseAmount(draft.amountAud) * 100)),
        estimatedDelivery: draft.estimatedDelivery,
        limitCount: draft.limitCount ? Math.max(1, Number(draft.limitCount)) : null,
      });
      toast.success("Reward saved");
      manageQuery.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Reward could not be saved");
    }
  }

  const generatedExport = generatedPack
    ? `CROWDFUNDING CAMPAIGN PACK\n\nPITCH\n${generatedPack.pitch}\n\nPITCH VIDEO\n${generatedPack.videoScript}\n\nREWARD TIERS\n${generatedPack.rewards.map((reward) => `${formatAud(reward.amountCents)} — ${reward.title}\n${reward.description}\nDelivery: ${reward.estimatedDelivery}`).join("\n\n")}`
    : "";

  return (
    <div className="container max-w-7xl space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={hasProject ? `/projects/${projectId}` : "/funding"}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <Badge variant="outline" className="gap-1.5 border-amber-500/30 text-amber-300">
          <HollywoodIcon tool="reports" size={18} alt="Funding" /> Funding · Crowdfunding
        </Badge>
      </div>

      <Card className="overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/8 via-background to-background">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
              <HollywoodIcon tool="reports" size={46} alt="Crowdfunding" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-gold-shimmer">Crowdfunding</h1>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Plan the campaign, calculate the funding target, create rewards, compare external platforms, configure payouts and track Virelle campaigns from one Funding workspace.
              </p>
            </div>
          </div>
          <Button
            className="min-h-11 shrink-0 gap-2 bg-amber-500 font-semibold text-black hover:bg-amber-400"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" /> New campaign
          </Button>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="campaigns">My campaigns</TabsTrigger>
          <TabsTrigger value="builder">Campaign builder</TabsTrigger>
          <TabsTrigger value="platforms">External platforms</TabsTrigger>
          <TabsTrigger value="guidance">Launch guidance</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Campaigns</p><p className="text-3xl font-bold">{campaigns.length}</p></CardContent></Card>
            <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Active</p><p className="text-3xl font-bold text-blue-300">{campaignTotals.active}</p></CardContent></Card>
            <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Raised</p><p className="text-3xl font-bold text-amber-300">{formatAud(campaignTotals.raised)}</p></CardContent></Card>
            <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Backers</p><p className="text-3xl font-bold text-emerald-300">{campaignTotals.backers}</p></CardContent></Card>
          </div>

          {campaignsQuery.isLoading ? (
            <Card><CardContent className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-amber-400" />Loading campaigns</CardContent></Card>
          ) : campaigns.length === 0 ? (
            <Card><CardContent className="space-y-4 py-14 text-center"><HollywoodIcon tool="reports" size={52} className="mx-auto opacity-60" alt="Crowdfunding" /><div><p className="font-semibold">No campaigns yet</p><p className="mt-1 text-sm text-muted-foreground">Build a campaign pack first, then create a Virelle campaign or compare external platforms.</p></div><div className="flex justify-center gap-2"><Button variant="outline" onClick={() => setTab("builder")}>Open builder</Button><Button onClick={() => setShowCreate(true)} className="bg-amber-500 text-black hover:bg-amber-400">Create campaign</Button></div></CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {campaigns.map((campaign) => {
                const progress = campaign.goalAmountCents > 0
                  ? Math.min(100, Math.round((campaign.raisedAmountCents / campaign.goalAmountCents) * 100))
                  : 0;
                const daysLeft = campaign.deadline
                  ? Math.max(0, Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / 86_400_000))
                  : null;
                const economics = crowdfundingEconomics(campaign.goalAmountCents, campaign.platformFeeBps);
                const readiness = campaignReadiness(campaign, []);
                return (
                  <Card key={campaign.id} className="overflow-hidden transition-colors hover:border-amber-500/40">
                    {campaign.posterUrl ? (
                      <button className="block h-36 w-full overflow-hidden" onClick={() => navigate(`/crowdfund/c/${campaign.slug}`)}>
                        <img src={campaign.posterUrl} alt={campaign.title} className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
                      </button>
                    ) : (
                      <button className="flex h-24 w-full items-center justify-center bg-gradient-to-br from-amber-900/20 to-black/40" onClick={() => navigate(`/crowdfund/c/${campaign.slug}`)}>
                        <HollywoodIcon tool="reports" size={42} className="opacity-50" alt="Crowdfunding" />
                      </button>
                    )}
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><h3 className="truncate font-semibold">{campaign.title}</h3><p className="line-clamp-2 text-xs text-muted-foreground">{campaign.tagline || "Add a clear audience-facing tagline."}</p></div>
                        <Badge className={`shrink-0 capitalize ${statusClasses[campaign.status] || ""}`}>{String(campaign.status).replace(/_/g, " ")}</Badge>
                      </div>
                      <div className="space-y-1"><div className="flex justify-between text-xs"><span>{formatAud(campaign.raisedAmountCents)} raised</span><span>{progress}%</span></div><Progress value={progress} className="h-2 [&>div]:bg-amber-500" /></div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><Users className="h-3 w-3" />{campaign.backerCount} backers</span><span className="flex items-center justify-end gap-1"><CalendarDays className="h-3 w-3" />{daysLeft === null ? "Not launched" : `${daysLeft} days left`}</span><span>Goal: {formatAud(campaign.goalAmountCents)}</span><span className="text-right">Net before processing: {formatAud(economics.netBeforePaymentProcessingCents)}</span></div>
                      {campaign.status === "draft" && <div className="flex items-center justify-between rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1.5 text-[11px]"><span>Basic readiness</span><strong className="text-amber-300">{readiness.score}%</strong></div>}
                      <div className="flex gap-2"><Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/crowdfund/c/${campaign.slug}`)}>Preview</Button><Button size="sm" className="flex-1 gap-1.5" onClick={() => setManageCampaignId(campaign.id)}><Settings className="h-3.5 w-3.5" />Manage</Button></div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="builder" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <Card>
              <CardHeader><CardTitle className="gradient-text-gold">Free campaign builder</CardTitle><CardDescription>Creates campaign copy, a pitch-video structure and reward tiers locally. No paid API or AI credit is required.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label>Format</Label><Select value={brief.format} onValueChange={(value) => setBrief((current) => ({ ...current, format: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Feature", "Short", "Series", "Documentary", "Other"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label>Genre</Label><Input value={brief.genre} onChange={(event) => setBrief((current) => ({ ...current, genre: event.target.value }))} placeholder="Drama, documentary, horror…" /></div>
                  <div className="space-y-1.5"><Label>Audience</Label><Input value={brief.audience} onChange={(event) => setBrief((current) => ({ ...current, audience: event.target.value }))} placeholder="Who will back and watch this film?" /></div>
                  <div className="space-y-1.5"><Label>Tone</Label><Input value={brief.tone} onChange={(event) => setBrief((current) => ({ ...current, tone: event.target.value }))} /></div>
                  <div className="space-y-1.5"><Label>Funding goal</Label><Input inputMode="decimal" value={brief.goal} onChange={(event) => setBrief((current) => ({ ...current, goal: event.target.value }))} /></div>
                  <div className="space-y-1.5"><Label>Campaign duration</Label><Select value={brief.duration} onValueChange={(value) => setBrief((current) => ({ ...current, duration: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[15, 21, 30, 45, 60].map((value) => <SelectItem key={value} value={String(value)}>{value} days</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="space-y-1.5"><Label>Premise</Label><Textarea rows={4} value={brief.premise} onChange={(event) => setBrief((current) => ({ ...current, premise: event.target.value }))} placeholder="Describe the film in one to three clear sentences." /></div>
                <div className="space-y-1.5"><Label>Why you are making it</Label><Textarea rows={3} value={brief.filmmakerStory || ""} onChange={(event) => setBrief((current) => ({ ...current, filmmakerStory: event.target.value }))} placeholder="Why this story, why now, and why your team?" /></div>
                <div className="space-y-1.5"><Label>Use of funds</Label><Textarea rows={3} value={brief.useOfFunds || ""} onChange={(event) => setBrief((current) => ({ ...current, useOfFunds: event.target.value }))} placeholder="Production, post, music, accessibility, marketing…" /></div>
                <Button onClick={buildFreePack} className="min-h-11 gap-2 bg-amber-500 font-semibold text-black hover:bg-amber-400"><Rocket className="h-4 w-4" />Build campaign pack</Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-base gradient-text-gold">Funding target</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><div className="flex justify-between"><span>Gross campaign goal</span><strong>{formatAud(builderEconomics.grossGoalCents)}</strong></div><div className="flex justify-between"><span>Virelle platform fee (7%)</span><strong>-{formatAud(builderEconomics.platformFeeCents)}</strong></div><Separator /><div className="flex justify-between"><span>Net before payment processing</span><strong className="text-emerald-300">{formatAud(builderEconomics.netBeforePaymentProcessingCents)}</strong></div><p className="text-[10px] leading-relaxed text-muted-foreground">Stripe payment-processing charges, taxes, refunds and reward fulfilment costs are separate and may reduce the final amount received.</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-base gradient-text-gold">Goal planning</CardTitle></CardHeader><CardContent className="space-y-2 text-xs text-muted-foreground"><p>To retain approximately {formatAud(builderEconomics.grossGoalCents)} before payment-processing costs, set the gross campaign target near <strong className="text-foreground">{formatAud(builderEconomics.grossRequiredForNetCents)}</strong>.</p><p>Do not describe rewards as investments, equity, profit sharing or guaranteed financial returns unless a properly regulated offering has been established.</p></CardContent></Card>
            </div>
          </div>

          {generatedPack && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card><CardHeader className="pb-2"><div className="flex items-center justify-between gap-2"><CardTitle className="text-base gradient-text-gold">Campaign pitch</CardTitle><CopyButton text={generatedPack.pitch} /></div></CardHeader><CardContent><pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{generatedPack.pitch}</pre></CardContent></Card>
              <Card><CardHeader className="pb-2"><div className="flex items-center justify-between gap-2"><CardTitle className="flex items-center gap-2 text-base gradient-text-gold"><Video className="h-4 w-4" />Pitch-video outline</CardTitle><CopyButton text={generatedPack.videoScript} /></div></CardHeader><CardContent><pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{generatedPack.videoScript}</pre></CardContent></Card>
              <Card className="lg:col-span-2"><CardHeader className="pb-2"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="flex items-center gap-2 text-base gradient-text-gold"><Gift className="h-4 w-4" />Recommended reward ladder</CardTitle><div className="flex gap-2"><Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadText("crowdfunding-campaign-pack.txt", generatedExport)}><Download className="h-3.5 w-3.5" />Download pack</Button><Button size="sm" onClick={() => setShowCreate(true)} className="bg-amber-500 text-black hover:bg-amber-400">Create Virelle campaign</Button></div></div></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{generatedPack.rewards.map((reward) => <div key={reward.title} className="rounded-lg border border-border/60 bg-muted/10 p-3"><div className="text-lg font-bold text-amber-300">{formatAud(reward.amountCents)}</div><div className="font-semibold">{reward.title}</div><p className="mt-1 text-xs text-muted-foreground">{reward.description}</p><p className="mt-2 text-[10px] text-muted-foreground">Delivery: {reward.estimatedDelivery}</p></div>)}</div></CardContent></Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          <Card><CardHeader><CardTitle className="gradient-text-gold">External crowdfunding platforms</CardTitle><CardDescription>Compare external options separately from Virelle-hosted campaigns. Always confirm current fees, country support and project eligibility on the official platform.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3 sm:flex-row"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={platformSearch} onChange={(event) => setPlatformSearch(event.target.value)} placeholder="Search platforms, countries or eligibility…" /></div><Select value={platformCountry} onValueChange={setPlatformCountry}><SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All countries</SelectItem>{platformCountries.map((country) => <SelectItem key={country} value={country}>{country}</SelectItem>)}</SelectContent></Select></CardContent></Card>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredPlatforms.map((source) => { const officialUrl = source.officialGuidelinesUrl || source.officialSite; return <Card key={source.id}><CardHeader className="pb-2"><CardTitle className="text-base gradient-text-gold">{source.organization}</CardTitle><div className="flex flex-wrap gap-1.5"><Badge variant="outline">{source.country || "Global"}</Badge>{source.type && <Badge variant="outline">{source.type}</Badge>}{source.verificationStatus && <Badge variant="outline" className="capitalize">{String(source.verificationStatus).replace(/_/g, " ")}</Badge>}</div></CardHeader><CardContent className="space-y-3"><p className="text-xs leading-relaxed text-muted-foreground">{source.supports || source.eligibility || "Review the official platform for current campaign requirements."}</p>{source.eligibility && <div className="rounded-md border border-border/50 bg-muted/10 p-2 text-[11px]"><strong>Eligibility:</strong> {source.eligibility}</div>}{officialUrl ? <a href={officialUrl} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline" className="w-full gap-1.5">Open official platform <ExternalLink className="h-3.5 w-3.5" /></Button></a> : <p className="text-[11px] text-amber-300">No verified official URL is stored. Search and verify the platform independently.</p>}</CardContent></Card>; })}</div>
          {!filteredPlatforms.length && <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No crowdfunding platforms match those filters.</CardContent></Card>}
        </TabsContent>

        <TabsContent value="guidance">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[{ title: "Build the audience first", icon: "community" as const, text: "Identify likely backers, collect permission-based contacts and plan launch-day outreach before the campaign opens." }, { title: "Show where the money goes", icon: "reports" as const, text: "Use a simple budget breakdown and explain the exact production milestone each funding level unlocks." }, { title: "Price rewards honestly", icon: "wardrobe" as const, text: "Include manufacturing, postage, tax, support time and delivery risk before promising physical or experiential rewards." }, { title: "Publish regular updates", icon: "distribution" as const, text: "Report progress, schedule changes, risks and delivery status. Do not wait for problems to become public complaints." }].map((item) => <Card key={item.title}><CardContent className="space-y-3 pt-5"><HollywoodIcon tool={item.icon} size={34} alt={item.title} /><h3 className="font-semibold gradient-text-gold">{item.title}</h3><p className="text-xs leading-relaxed text-muted-foreground">{item.text}</p></CardContent></Card>)}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto glass-dark">
          <DialogHeader><DialogTitle className="flex items-center gap-2 gradient-text-gold"><HollywoodIcon tool="reports" size={28} alt="Crowdfunding" />Create Virelle campaign</DialogTitle><DialogDescription>Create a private draft first. You can complete rewards, media and payout setup before launch.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5 sm:col-span-2"><Label>Campaign title</Label><Input value={newCampaign.title} onChange={(event) => setNewCampaign((current) => ({ ...current, title: event.target.value }))} /></div><div className="space-y-1.5 sm:col-span-2"><Label>Tagline</Label><Input value={newCampaign.tagline} onChange={(event) => setNewCampaign((current) => ({ ...current, tagline: event.target.value }))} placeholder="One clear sentence for potential backers" /></div><div className="space-y-1.5 sm:col-span-2"><Label>Campaign story</Label><Textarea rows={7} value={newCampaign.description} onChange={(event) => setNewCampaign((current) => ({ ...current, description: event.target.value }))} /></div><div className="space-y-1.5"><Label>Funding goal (AUD)</Label><Input inputMode="decimal" value={newCampaign.goalAud} onChange={(event) => setNewCampaign((current) => ({ ...current, goalAud: event.target.value }))} /></div><div className="space-y-1.5"><Label>Funding model</Label><Select value={newCampaign.fundingModel} onValueChange={(value) => setNewCampaign((current) => ({ ...current, fundingModel: value as CampaignForm["fundingModel"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all_or_nothing">All-or-Nothing</SelectItem><SelectItem value="keep_it_all">Keep-it-All</SelectItem></SelectContent></Select></div><div className="space-y-1.5"><Label>Format</Label><Select value={newCampaign.format} onValueChange={(value) => setNewCampaign((current) => ({ ...current, format: value as CampaignForm["format"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Feature", "Short", "Series", "Documentary", "Other"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Genre</Label><Input value={newCampaign.genre} onChange={(event) => setNewCampaign((current) => ({ ...current, genre: event.target.value }))} /></div></div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs"><div className="flex justify-between"><span>Goal</span><strong>{formatAud(Math.round(parseAmount(newCampaign.goalAud) * 100))}</strong></div><div className="mt-1 flex justify-between"><span>Estimated Virelle fee</span><strong>-{formatAud(crowdfundingEconomics(Math.round(parseAmount(newCampaign.goalAud) * 100)).platformFeeCents)}</strong></div><div className="mt-1 flex justify-between text-emerald-300"><span>Net before payment processing</span><strong>{formatAud(crowdfundingEconomics(Math.round(parseAmount(newCampaign.goalAud) * 100)).netBeforePaymentProcessingCents)}</strong></div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button disabled={createCampaign.isPending} onClick={submitNewCampaign} className="gap-2 bg-amber-500 font-semibold text-black hover:bg-amber-400">{createCampaign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create draft</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(manageCampaignId)} onOpenChange={(open) => { if (!open) setManageCampaignId(null); }}>
        <DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto glass-dark">
          <DialogHeader><DialogTitle className="flex items-center gap-2 gradient-text-gold"><Settings className="h-5 w-5" />Manage campaign</DialogTitle><DialogDescription>Complete the campaign, rewards and payout checklist before launch.</DialogDescription></DialogHeader>
          {!manageCampaign ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-amber-400" /></div> : (
            <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
              <div className="space-y-5">
                <Card><CardHeader><CardTitle className="text-base gradient-text-gold">Campaign details</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5 sm:col-span-2"><Label>Title</Label><Input disabled={manageCampaign.status !== "draft"} value={manageDraft.title} onChange={(event) => setManageDraft((current) => ({ ...current, title: event.target.value }))} /></div><div className="space-y-1.5 sm:col-span-2"><Label>Tagline</Label><Input disabled={manageCampaign.status !== "draft"} value={manageDraft.tagline} onChange={(event) => setManageDraft((current) => ({ ...current, tagline: event.target.value }))} /></div><div className="space-y-1.5 sm:col-span-2"><Label>Campaign story</Label><Textarea disabled={manageCampaign.status !== "draft"} rows={7} value={manageDraft.description} onChange={(event) => setManageDraft((current) => ({ ...current, description: event.target.value }))} /></div><div className="space-y-1.5"><Label>Poster URL</Label><Input disabled={manageCampaign.status !== "draft"} value={manageDraft.posterUrl} onChange={(event) => setManageDraft((current) => ({ ...current, posterUrl: event.target.value }))} placeholder="https://…" /></div><div className="space-y-1.5"><Label>Pitch-video URL</Label><Input disabled={manageCampaign.status !== "draft"} value={manageDraft.videoUrl} onChange={(event) => setManageDraft((current) => ({ ...current, videoUrl: event.target.value }))} placeholder="https://…" /></div><div className="space-y-1.5"><Label>Goal (AUD)</Label><Input disabled={manageCampaign.status !== "draft"} inputMode="decimal" value={manageDraft.goalAud} onChange={(event) => setManageDraft((current) => ({ ...current, goalAud: event.target.value }))} /></div></div>{manageCampaign.status === "draft" && <Button className="gap-2" disabled={updateCampaign.isPending} onClick={() => updateCampaign.mutate({ id: manageCampaign.id, title: manageDraft.title, tagline: manageDraft.tagline, description: manageDraft.description, posterUrl: manageDraft.posterUrl, videoUrl: manageDraft.videoUrl, goalAmountCents: Math.max(100, Math.round(parseAmount(manageDraft.goalAud) * 100)) })}><Save className="h-4 w-4" />Save details</Button>}</CardContent></Card>

                <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle className="flex items-center gap-2 text-base gradient-text-gold"><Gift className="h-4 w-4" />Reward tiers</CardTitle><CardDescription>Keep the choice set clear and include realistic delivery dates.</CardDescription></div>{manageCampaign.status === "draft" && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={addRecommendedRewards}>Recommended tiers</Button><Button size="sm" onClick={() => createReward.mutate({ campaignId: manageCampaign.id, title: "New Reward", description: "Describe the reward and what is not included.", amountCents: 1000, estimatedDelivery: "At release", sortOrder: manageRewards.length }, { onSuccess: () => manageQuery.refetch() })}><Plus className="mr-1 h-3.5 w-3.5" />Add tier</Button></div>}</div></CardHeader><CardContent className="space-y-3">{manageRewards.map((reward) => { const draft = rewardDrafts[reward.id] || { title: reward.title, description: reward.description || "", amountAud: String(reward.amountCents / 100), estimatedDelivery: reward.estimatedDelivery || "", limitCount: reward.limitCount ? String(reward.limitCount) : "" }; return <div key={reward.id} className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3"><div className="grid gap-2 sm:grid-cols-4"><div className="space-y-1 sm:col-span-2"><Label className="text-[10px] uppercase text-muted-foreground">Title</Label><Input disabled={manageCampaign.status !== "draft"} value={draft.title} onChange={(event) => setRewardDrafts((current) => ({ ...current, [reward.id]: { ...draft, title: event.target.value } }))} /></div><div className="space-y-1"><Label className="text-[10px] uppercase text-muted-foreground">Amount</Label><Input disabled={manageCampaign.status !== "draft"} inputMode="decimal" value={draft.amountAud} onChange={(event) => setRewardDrafts((current) => ({ ...current, [reward.id]: { ...draft, amountAud: event.target.value } }))} /></div><div className="space-y-1"><Label className="text-[10px] uppercase text-muted-foreground">Limit</Label><Input disabled={manageCampaign.status !== "draft"} inputMode="numeric" value={draft.limitCount} onChange={(event) => setRewardDrafts((current) => ({ ...current, [reward.id]: { ...draft, limitCount: event.target.value } }))} /></div></div><div className="space-y-1"><Label className="text-[10px] uppercase text-muted-foreground">Description</Label><Textarea disabled={manageCampaign.status !== "draft"} rows={2} value={draft.description} onChange={(event) => setRewardDrafts((current) => ({ ...current, [reward.id]: { ...draft, description: event.target.value } }))} /></div><div className="space-y-1"><Label className="text-[10px] uppercase text-muted-foreground">Estimated delivery</Label><Input disabled={manageCampaign.status !== "draft"} value={draft.estimatedDelivery} onChange={(event) => setRewardDrafts((current) => ({ ...current, [reward.id]: { ...draft, estimatedDelivery: event.target.value } }))} /></div>{manageCampaign.status === "draft" && <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" className="text-red-300" onClick={() => deleteReward.mutate({ id: reward.id }, { onSuccess: () => manageQuery.refetch() })}><Trash2 className="mr-1 h-3.5 w-3.5" />Remove</Button><Button size="sm" onClick={() => saveReward(reward.id)}><Save className="mr-1 h-3.5 w-3.5" />Save tier</Button></div>}</div>; })}{manageRewards.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No reward tiers yet.</div>}</CardContent></Card>

                <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base gradient-text-gold"><Users className="h-4 w-4" />Contributions</CardTitle></CardHeader><CardContent className="space-y-2">{(manageData.contributions || []).map((contribution: any) => <div key={contribution.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 p-2 text-xs"><div><strong>{formatAud(contribution.amountCents)}</strong><p className="text-muted-foreground">{contribution.isAnonymous ? "Anonymous backer" : contribution.backerName || contribution.backerEmail || "Backer"}</p></div><Badge variant="outline" className="capitalize">{contribution.status}</Badge></div>)}{!manageData.contributions?.length && <p className="py-6 text-center text-sm text-muted-foreground">No contributions yet.</p>}</CardContent></Card>
              </div>

              <div className="space-y-4">
                <ReadinessCard readiness={manageReadiness} />
                <Card><CardHeader className="pb-2"><CardTitle className="text-base gradient-text-gold">Payouts and launch</CardTitle></CardHeader><CardContent className="space-y-3"><div className={`rounded-md border p-3 text-xs ${payoutStatusQuery.data?.onboarded || manageCampaign.stripeConnectOnboarded ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-200" : "border-amber-500/30 bg-amber-500/5 text-amber-200"}`}>{payoutStatusQuery.data?.onboarded || manageCampaign.stripeConnectOnboarded ? "Payout account is configured." : "Complete Stripe Connect verification before launch."}</div><div className="flex gap-2"><Button variant="outline" className="flex-1 gap-1.5" onClick={() => setupPayouts(manageCampaign.id)}><CreditCard className="h-3.5 w-3.5" />Set up payouts</Button><Button variant="outline" size="icon" title="Refresh payout status" onClick={() => payoutStatusQuery.refetch()}><RefreshCw className="h-4 w-4" /></Button></div>{manageCampaign.status === "draft" && <Button className="w-full gap-2 bg-amber-500 font-semibold text-black hover:bg-amber-400" disabled={manageReadiness.score < 70 || !(payoutStatusQuery.data?.onboarded || manageCampaign.stripeConnectOnboarded)} onClick={() => { setLaunchingId(manageCampaign.id); setDeadlineDays(30); setLaunchAcknowledged(false); setShowLaunch(true); }}><Rocket className="h-4 w-4" />Launch campaign</Button>}<p className="text-[10px] leading-relaxed text-muted-foreground">The readiness score is guidance, not a guarantee of campaign performance. Verify legal, tax, consumer-law and reward-delivery obligations before launch.</p></CardContent></Card>
                {manageCampaign.status === "draft" && <Button variant="ghost" className="w-full gap-2 text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => { if (window.confirm("Cancel this draft campaign?")) deleteCampaign.mutate({ id: manageCampaign.id }); }}><Trash2 className="h-4 w-4" />Cancel draft campaign</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showLaunch} onOpenChange={(open) => { setShowLaunch(open); if (!open) { setLaunchingId(null); setLaunchAcknowledged(false); } }}>
        <DialogContent className="max-w-md glass-dark"><DialogHeader><DialogTitle className="flex items-center gap-2 gradient-text-gold"><Rocket className="h-5 w-5" />Launch campaign</DialogTitle><DialogDescription>Choose the campaign duration and confirm that the public information is accurate.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-1.5"><Label>Campaign duration</Label><Select value={String(deadlineDays)} onValueChange={(value) => setDeadlineDays(Number(value))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[15, 21, 30, 45, 60, 90].map((days) => <SelectItem key={days} value={String(days)}>{days} days</SelectItem>)}</SelectContent></Select></div><div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs">Expected deadline: <strong>{new Date(Date.now() + deadlineDays * 86_400_000).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</strong></div><label className="flex cursor-pointer items-start gap-2 rounded-md border border-border/60 p-3 text-xs"><input type="checkbox" className="mt-0.5" checked={launchAcknowledged} onChange={(event) => setLaunchAcknowledged(event.target.checked)} /><span>I have reviewed the campaign claims, funding model, reward costs, delivery estimates, payout details and public links.</span></label></div><DialogFooter><Button variant="outline" onClick={() => setShowLaunch(false)}>Cancel</Button><Button className="gap-2 bg-amber-500 font-semibold text-black hover:bg-amber-400" disabled={!launchAcknowledged || launchCampaign.isPending || !launchingId} onClick={() => launchingId && launchCampaign.mutate({ id: launchingId, deadlineDays })}>{launchCampaign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}Go live</Button></DialogFooter></DialogContent>
      </Dialog>

      {hasProject && <NextStageCTA projectId={projectId} currentStage={5} />}
    </div>
  );
}

export default function CrowdfundingHub() {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#07070e_0%,#0c0b18_60%,#07070a_100%)]">
      <SubscriptionGate
        feature="Crowdfunding"
        featureKey="canUseCrowdfunding"
        requiredTier="indie"
      >
        <CrowdfundingHubInner />
      </SubscriptionGate>
    </div>
  );
}
