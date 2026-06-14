import { useMemo, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { NextStageCTA } from "@/components/NextStageCTA";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Loader2,
  Copy,
  Rocket,
  Gift,
  Plus,
  Film,
  Target,
  Zap,
  Users,
  CalendarDays,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Video,
  Settings,
  Trash2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { SubscriptionGate } from "@/components/SubscriptionGate";

// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Helpers ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ

function isCrowdfundingSource(src: any) {
  const type = (src.type || "").toLowerCase();
  const org = (src.organization || "").toLowerCase();
  return (
    type.includes("crowd") ||
    type.includes("community") ||
    org.includes("kickstarter") ||
    org.includes("indiegogo") ||
    org.includes("seed&spark") ||
    org.includes("seed & spark") ||
    org.includes("pozible") ||
    org.includes("backit") ||
    org.includes("fundrazr") ||
    type.includes("platform") ||
    (src.supports || "").toLowerCase().includes("crowd")
  );
}

type Kind = "campaign" | "rewards" | "videoScript";

const PROMPTS: Record<Kind, (b: BriefState, title: string) => string> = {
  campaign: (b, t) =>
    `Write a compelling crowdfunding campaign pitch page for the film "${t}".
Format: ${b.format}. Genre: ${b.genre}. Target audience: ${b.audience}. Tone: ${b.tone}.
Premise: ${b.premise}
Funding goal: ${b.goal} ${b.currency}. Campaign length: ${b.duration} days.
Include: hook paragraph, story summary (3-4 sentences), director statement, how funds will be used (3-4 bullet points), and a CTA.`,
  rewards: (b, t) =>
    `Design 5-7 reward tiers for the crowdfunding campaign "${t}".
Format: ${b.format}. Genre: ${b.genre}. Goal: ${b.goal} ${b.currency}.
Tiers should escalate from $5 to $5,000+. For each tier: name, dollar amount, 1-line description, estimated delivery.`,
  videoScript: (b, t) =>
    `Write a 90-second pitch-video script for the "${t}" crowdfunding campaign.
Format: ${b.format}. Genre: ${b.genre}. Tone: ${b.tone}. Premise: ${b.premise}
Goal: ${b.goal} ${b.currency}.
Two columns: VISUAL | AUDIO. Open with a 5-second hook. Include filmmaker on-camera moment, story tease, ask, and a URL CTA.`,
};

interface BriefState {
  format: string;
  genre: string;
  audience: string;
  tone: string;
  premise: string;
  goal: string;
  currency: string;
  duration: string;
}

interface NewCampaignState {
  title: string;
  tagline: string;
  goalAud: string;
  fundingModel: "all_or_nothing" | "keep_it_all";
  format: string;
  genre: string;
}

const FMT_AUD = (cents: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0 }).format(cents / 100);

function CrowdfundingHubInner() {
  const params = useParams<{ projectId?: string }>();
  const [, navigate] = useLocation();
  const projectId = parseInt(params.projectId || "0");
  const hasProject = !!projectId;

  const { data: sources } = trpc.funding.list.useQuery({});
  const { data: project } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: hasProject }
  );

  const { data: myCampaigns, isLoading: myCampaignsLoading, refetch: refetchCampaigns } =
    trpc.crowdfund.campaign.listMine.useQuery();

  // ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Campaign mutations ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
  const createCampaignMutation = trpc.crowdfund.campaign.create.useMutation({
    onSuccess: ({ slug }) => {
      toast.success("Campaign created! Next: set up your payouts.");
      setShowCreateModal(false);
      setCreating(false);
      void refetchCampaigns();
      navigate(`/crowdfund/c/${slug}`);
    },
    onError: (err) => {
      toast.error(err.message);
      setCreating(false);
    },
  });

  const createConnectAccountMutation = trpc.crowdfund.connect.createAccount.useMutation();
  const getOnboardingUrlMutation = trpc.crowdfund.connect.getOnboardingUrl.useMutation();

  const launchMutation = trpc.crowdfund.campaign.launch.useMutation({
    onSuccess: () => {
      toast.success("Campaign is now live!");
      setShowLaunchModal(false);
      setLaunchingId(null);
      void refetchCampaigns();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Platforms ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
  const platforms = useMemo(
    () => (sources ?? []).filter(isCrowdfundingSource),
    [sources]
  );

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return platforms;
    return platforms.filter(
      (p: any) =>
        (p.organization || "").toLowerCase().includes(s) ||
        (p.country || "").toLowerCase().includes(s) ||
        (p.supports || "").toLowerCase().includes(s)
    );
  }, [platforms, search]);

  // ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ AI Campaign Builder state ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
  const [brief, setBrief] = useState<BriefState>({
    format: "Feature",
    genre: "",
    audience: "",
    tone: "Warm, urgent",
    premise: "",
    goal: "25000",
    currency: "USD",
    duration: "30",
  });
  const [generating, setGenerating] = useState<Kind | null>(null);

  // ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Create modal state ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCampaign, setNewCampaign] = useState<NewCampaignState>({
    title: "",
    tagline: "",
    goalAud: "",
    fundingModel: "all_or_nothing",
    format: "Feature",
    genre: "",
  });

  // ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Launch modal state ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [launchingId, setLaunchingId] = useState<number | null>(null);
  const [deadlineDays, setDeadlineDays] = useState(30);
  const [settingUpPayoutsId, setSettingUpPayoutsId] = useState<number | null>(null);
  const [manageCampaignId, setManageCampaignId] = useState<number | null>(null);
  const { data: manageData, refetch: refetchManage } = trpc.crowdfund.campaign.getById.useQuery(
    { id: manageCampaignId ?? 0 },
    { enabled: !!manageCampaignId }
  );

  const updateCampaignMutation = trpc.crowdfund.campaign.update.useMutation({
    onSuccess: () => {
      toast.success("Campaign updated");
      refetchManage();
      refetchCampaigns();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCampaignMutation = trpc.crowdfund.campaign.delete.useMutation({
    onSuccess: () => {
      toast.success("Campaign cancelled");
      setManageCampaignId(null);
      refetchCampaigns();
    },
    onError: (e) => toast.error(e.message),
  });

  const createRewardMutation = trpc.crowdfund.reward.create.useMutation({
    onSuccess: () => {
      toast.success("Reward created");
      refetchManage();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRewardMutation = trpc.crowdfund.reward.update.useMutation({
    onSuccess: () => {
      toast.success("Reward updated");
      refetchManage();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteRewardMutation = trpc.crowdfund.reward.delete.useMutation({
    onSuccess: () => {
      toast.success("Reward removed");
      refetchManage();
    },
    onError: (e) => toast.error(e.message),
  });

  // ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Director AI ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
  const sendMessage = trpc.directorChat.send.useMutation();
  const { data: history, refetch: refetchHistory } = trpc.directorChat.history.useQuery(
    { projectId },
    { enabled: hasProject, refetchInterval: 4000 }
  );

  const lastByKind = useMemo(() => {
    const out: Record<string, string> = {};
    for (const m of history ?? []) {
      const tag = (m as any).metadata?.crowdfundingKind as string | undefined;
      if (tag && (m as any).role === "assistant") {
        out[tag] = (m as any).content as string;
      }
    }
    return out;
  }, [history]);

  // ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Handlers ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
  async function generate(kind: Kind) {
    if (!hasProject) {
      toast.error("Open this from a project to generate AI copy.");
      return;
    }
    if (!brief.premise.trim()) {
      toast.error("Add a premise before generating.");
      return;
    }
    setGenerating(kind);
    try {
      await sendMessage.mutateAsync({
        projectId,
        message: `[CrowdfundingHub:${kind}]\n\n${PROMPTS[kind](brief, project?.title || "Untitled")}`,
      });
      await refetchHistory();
      toast.success(`${kind} drafted.`);
    } catch (e: any) {
      toast.error(e?.message || "Generation failed.");
    } finally {
      setGenerating(null);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied.");
  }

  function handleCreateCampaign() {
    const goalCents = Math.round(parseFloat(newCampaign.goalAud || "0") * 100);
    if (!newCampaign.title.trim()) { toast.error("Campaign title required"); return; }
    if (goalCents < 100) { toast.error("Minimum goal is A$1"); return; }
    setCreating(true);
    createCampaignMutation.mutate({
      title: newCampaign.title.trim(),
      tagline: newCampaign.tagline.trim() || undefined,
      goalAmountCents: goalCents,
      fundingModel: newCampaign.fundingModel,
      format: newCampaign.format as any,
      genre: newCampaign.genre.trim() || undefined,
      projectId: hasProject ? projectId : undefined,
    });
  }

  async function handleSetupPayouts(campaign: { id: number; stripeConnectAccountId: string | null }) {
    setSettingUpPayoutsId(campaign.id);
    try {
      // Step 1: create or retrieve Connect account
      const { accountId } = await createConnectAccountMutation.mutateAsync({ campaignId: campaign.id });
      // Step 2: get onboarding URL and redirect
      const returnUrl = `${window.location.origin}/crowdfunding`;
      const { url } = await getOnboardingUrlMutation.mutateAsync({ campaignId: campaign.id, returnUrl });
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message || "Failed to start payout setup.");
    } finally {
      setSettingUpPayoutsId(null);
    }
  }

  function openLaunchModal(id: number) {
    setLaunchingId(id);
    setDeadlineDays(30);
    setShowLaunchModal(true);
  }

  function confirmLaunch() {
    if (!launchingId) return;
    launchMutation.mutate({ id: launchingId, deadlineDays });
  }

  const statusColors: Record<string, string> = {
    draft: "bg-zinc-500/20 text-zinc-400",
    active: "bg-blue-500/20 text-blue-400",
    funded: "bg-amber-500/20 text-amber-400",
    failed: "bg-red-500/20 text-red-400",
    paid_out: "bg-emerald-500/20 text-emerald-400",
    cancelled: "bg-zinc-500/20 text-zinc-500",
  };

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href={hasProject ? `/projects/${projectId}` : "/funding"}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Rocket className="h-4 w-4" /> Crowdfunding Hub
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text-gold">Crowdfunding Hub</h1>
        <p className="text-muted-foreground mt-1">
          {platforms.length} platforms ÃÂÃÂÃÂÃÂ· launch-ready campaign copy, reward tiers, and pitch-video scripts.
        </p>
      </div>

      {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ My Campaigns ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5">
                <Film className="h-4 w-4 text-amber-400" /> My Campaigns
              </CardTitle>
              <CardDescription>Your crowdfunding campaigns launched on Virelle.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/crowdfund/browse")}>
                Browse All
              </Button>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-1.5"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-3.5 w-3.5" /> New Campaign
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {myCampaignsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" /> Loading campaignsÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¦
            </div>
          ) : !myCampaigns || myCampaigns.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <Film className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">No campaigns yet. Launch your first one and fund your film through your audience.</p>
              <Button size="sm" variant="outline" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Create your first campaign
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCampaigns.map((campaign) => {
                const progress = Math.min(100, Math.round((campaign.raisedAmountCents / campaign.goalAmountCents) * 100));
                const days = campaign.deadline
                  ? Math.max(0, Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / 86400000))
                  : null;
                const isSettingUp = settingUpPayoutsId === campaign.id;
                return (
                  <Card
                    key={campaign.id}
                    className="overflow-hidden hover:border-amber-500/40 transition-colors group glass-card shadow-lg shadow-amber-500/5"
                  >
                    {campaign.posterUrl ? (
                      <div
                        className="h-32 overflow-hidden cursor-pointer"
                        onClick={() => navigate(`/crowdfund/c/${campaign.slug}`)}
                      >
                        <img
                          src={campaign.posterUrl}
                          alt={campaign.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div
                        className="h-20 bg-gradient-to-br from-amber-900/20 to-black/40 flex items-center justify-center cursor-pointer"
                        onClick={() => navigate(`/crowdfund/c/${campaign.slug}`)}
                      >
                        <Film className="w-8 h-8 text-amber-500/30" />
                      </div>
                    )}
                    <CardContent className="p-3 space-y-2 glass-card shadow-lg shadow-amber-500/5">
                      <div
                        className="flex items-start justify-between gap-2 cursor-pointer"
                        onClick={() => navigate(`/crowdfund/c/${campaign.slug}`)}
                      >
                        <p className="font-semibold text-sm line-clamp-1 flex-1">{campaign.title}</p>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${statusColors[campaign.status] ?? ""}`}
                        >
                          {campaign.status.replace("_", " ")}
                        </span>
                      </div>
                      <Progress value={progress} className="h-1.5 rounded-full [&>div]:bg-amber-500" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{FMT_AUD(campaign.raisedAmountCents)}</span>
                        <span>{progress}% of {FMT_AUD(campaign.goalAmountCents)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />{campaign.backerCount}
                        </span>
                        {days !== null && campaign.status === "active" && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />{days}d left
                          </span>
                        )}
                        <Badge variant="outline" className="text-[10px] h-4 px-1 ml-auto">
                          {campaign.fundingModel === "all_or_nothing" ? "All-or-Nothing" : "Keep-it-All"}
                        </Badge>
                      </div>

                      {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Draft actions ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
                      {campaign.status === "draft" && (
                        <div className="flex flex-col gap-1.5 pt-1">
                          {!campaign.stripeConnectOnboarded ? (
                            <>
                              <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 rounded px-2 py-1">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                Payout setup required before launch
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-7 text-xs gap-1.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                                disabled={isSettingUp}
                                onClick={(e) => { e.stopPropagation(); void handleSetupPayouts(campaign); }}
                              >
                                {isSettingUp
                                  ? <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                                  : <Settings className="w-3 h-3" />
                                }
                                {isSettingUp ? "RedirectingÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¦" : "Set up payouts"}
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 rounded px-2 py-1">
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                Payouts configured ÃÂÃÂÃÂÃÂ· ready to launch
                              </div>
                              <Button
                                size="sm"
                                className="w-full h-7 text-xs gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                                onClick={(e) => { e.stopPropagation(); openLaunchModal(campaign.id); }}
                              >
                                <Rocket className="w-3 h-3" />
                                Launch Campaign
                              </Button>
                            </>
                          )}
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full h-7 text-xs gap-1.5"
                        onClick={(e) => { e.stopPropagation(); setManageCampaignId(campaign.id); }}
                      >
                        <Settings className="w-3 h-3" />
                        Manage Campaign
                      </Button>
                    </CardContent>
                  </Card>
              );
            })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Platforms list */}
        <Card className="lg:col-span-1 glass-card shadow-lg shadow-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base gradient-text-gold glass-card shadow-lg shadow-amber-500/5">Platforms</CardTitle>
            <CardDescription>Curated from the Funding Directory.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 glass-card shadow-lg shadow-amber-500/5">
            <Input
              placeholder="Search platformsÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¦"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filtered.map((p: any) => (
                <a
                  key={p.id}
                  href={p.website || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg border hover:border-amber-400/40 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{p.organization}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p.country}{p.type ? ` ÃÂÃÂÃÂÃÂ· ${p.type}` : ""}
                      </div>
                    </div>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground mt-0.5" />
                  </div>
                  {p.supports && (
                    <div className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                      {p.supports}
                    </div>
                  )}
                </a>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No platforms match.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI campaign builder */}
        <Card className="lg:col-span-2 glass-card shadow-lg shadow-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5">
              <Sparkles className="h-4 w-4" /> AI Campaign Builder
            </CardTitle>
            <CardDescription>
              {hasProject
                ? `Draft pitch, rewards, and a 90-second video script for "${project?.title || "your project"}".`
                : "Open from a project to generate AI copy."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 glass-card shadow-lg shadow-amber-500/5">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Format</Label>
                <Select value={brief.format} onValueChange={(v) => setBrief({ ...brief, format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Feature">Feature</SelectItem>
                    <SelectItem value="Short">Short</SelectItem>
                    <SelectItem value="Series">Series</SelectItem>
                    <SelectItem value="Documentary">Documentary</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Genre</Label>
                <Input value={brief.genre} onChange={(e) => setBrief({ ...brief, genre: e.target.value })} placeholder="Drama, Sci-Fi, HorrorÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¦" />
              </div>
              <div>
                <Label className="text-xs">Audience</Label>
                <Input value={brief.audience} onChange={(e) => setBrief({ ...brief, audience: e.target.value })} placeholder="e.g. 25ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ45 indie film fans" />
              </div>
              <div>
                <Label className="text-xs">Tone</Label>
                <Input value={brief.tone} onChange={(e) => setBrief({ ...brief, tone: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Goal</Label>
                <Input value={brief.goal} onChange={(e) => setBrief({ ...brief, goal: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Currency</Label>
                <Select value={brief.currency} onValueChange={(v) => setBrief({ ...brief, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Campaign Duration</Label>
                <Select value={brief.duration} onValueChange={(v) => setBrief({ ...brief, duration: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 days ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Sprint</SelectItem>
                    <SelectItem value="21">21 days ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Short</SelectItem>
                    <SelectItem value="30">30 days ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Standard</SelectItem>
                    <SelectItem value="45">45 days ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Extended</SelectItem>
                    <SelectItem value="60">60 days ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Long</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Premise (1ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ3 sentences)</Label>
                <Textarea
                  rows={3}
                  value={brief.premise}
                  onChange={(e) => setBrief({ ...brief, premise: e.target.value })}
                  placeholder="A one-paragraph premise the AI can build from."
                />
              </div>
            </div>

            {brief.goal && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <Rocket className="h-4 w-4 text-amber-400 shrink-0" />
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span><span className="text-muted-foreground">Goal</span> <span className="font-medium">{brief.goal} {brief.currency}</span></span>
                  <span><span className="text-muted-foreground">Duration</span> <span className="font-medium">{brief.duration} days</span></span>
                  <span><span className="text-muted-foreground">Format</span> <span className="font-medium">{brief.format}</span></span>
                  {brief.genre && <span><span className="text-muted-foreground">Genre</span> <span className="font-medium">{brief.genre}</span></span>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => generate("campaign")} disabled={!!generating || !hasProject} className="gap-2" size="sm">
                {generating === "campaign" ? <Loader2 className="h-3 w-3 animate-spin text-amber-400" /> : <Rocket className="h-3 w-3" />}
                Pitch
              </Button>
              <Button onClick={() => generate("rewards")} disabled={!!generating || !hasProject} className="gap-2" size="sm" variant="outline">
                {generating === "rewards" ? <Loader2 className="h-3 w-3 animate-spin text-amber-400" /> : <Gift className="h-3 w-3" />}
                Rewards
              </Button>
              <Button onClick={() => generate("videoScript")} disabled={!!generating || !hasProject} className="gap-2" size="sm" variant="outline">
                {generating === "videoScript" ? <Loader2 className="h-3 w-3 animate-spin text-amber-400" /> : <Video className="h-3 w-3" />}
                Video
              </Button>
            </div>

            {(["campaign", "rewards", "videoScript"] as Kind[]).map((k) =>
              lastByKind[k] ? (
                <div key={k} className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-[10px] uppercase">{k}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => copy(lastByKind[k])} className="h-6 gap-1 text-xs">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{lastByKind[k]}</pre>
                </div>
              ) : null
            )}
          </CardContent>
        </Card>
      </div>

      {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Create Campaign Modal ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 gradient-text-gold">
              <Film className="w-5 h-5 text-amber-400" /> New Crowdfunding Campaign
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Campaign Title *</Label>
              <Input
                placeholder="e.g. The Last Sundowner"
                value={newCampaign.title}
                onChange={e => setNewCampaign(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Tagline</Label>
              <Input
                placeholder="One sentence that hooks backers"
                value={newCampaign.tagline}
                onChange={e => setNewCampaign(p => ({ ...p, tagline: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Funding Goal (AUD) *</Label>
                <Input
                  type="number"
                  min="100"
                  placeholder="25000"
                  value={newCampaign.goalAud}
                  onChange={e => setNewCampaign(p => ({ ...p, goalAud: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Funding Model *</Label>
                <Select
                  value={newCampaign.fundingModel}
                  onValueChange={v => setNewCampaign(p => ({ ...p, fundingModel: v as "all_or_nothing" | "keep_it_all" }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_or_nothing">All-or-Nothing</SelectItem>
                    <SelectItem value="keep_it_all">Keep-it-All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Format</Label>
                <Select value={newCampaign.format} onValueChange={v => setNewCampaign(p => ({ ...p, format: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Feature">Feature</SelectItem>
                    <SelectItem value="Short">Short</SelectItem>
                    <SelectItem value="Series">Series</SelectItem>
                    <SelectItem value="Documentary">Documentary</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Genre</Label>
                <Input placeholder="Drama, Sci-FiÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¦" value={newCampaign.genre} onChange={e => setNewCampaign(p => ({ ...p, genre: e.target.value }))} />
              </div>
            </div>
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-amber-400 flex items-center gap-1.5">
                <CreditCard className="w-3 h-3" />7% Platform Fee
              </p>
              <p>Virelle charges a 7% fee on all funds raised. You receive payouts via Stripe Connect after campaign closes.</p>
              {newCampaign.fundingModel === "all_or_nothing" && (
                <p className="text-amber-300/80">
                  <Target className="w-3 h-3 inline mr-1" />
                  All-or-Nothing: backers are only charged if the full goal is met by the deadline.
                </p>
              )}
              {newCampaign.fundingModel === "keep_it_all" && (
                <p className="text-emerald-300/80">
                  <Zap className="w-3 h-3 inline mr-1" />
                  Keep-it-All: you receive all funds raised, whether or not the goal is reached.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
              disabled={creating || !newCampaign.title.trim() || !newCampaign.goalAud}
              onClick={handleCreateCampaign}
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2 text-amber-400" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Launch Campaign Modal ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
      <Dialog open={showLaunchModal} onOpenChange={(open) => { if (!open) { setShowLaunchModal(false); setLaunchingId(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 gradient-text-gold">
              <Rocket className="w-5 h-5 text-amber-400" /> Launch Campaign
            </DialogTitle>
            <DialogDescription>
              Choose a deadline. Once live, backers can discover and fund your campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Campaign Duration</Label>
              <Select value={String(deadlineDays)} onValueChange={(v) => setDeadlineDays(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 days ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Sprint</SelectItem>
                  <SelectItem value="21">21 days ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Short</SelectItem>
                  <SelectItem value="30">30 days ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Standard</SelectItem>
                  <SelectItem value="45">45 days ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Extended</SelectItem>
                  <SelectItem value="60">60 days ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Long</SelectItem>
                  <SelectItem value="90">90 days ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Maximum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-zinc-500/5 border border-zinc-500/20 p-3 text-xs text-muted-foreground">
              <CalendarDays className="w-3 h-3 inline mr-1" />
              Deadline: <span className="text-foreground font-medium">
                {new Date(Date.now() + deadlineDays * 86400000).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowLaunchModal(false); setLaunchingId(null); }}>Cancel</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2"
              disabled={launchMutation.isPending}
              onClick={confirmLaunch}
            >
              {launchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Rocket className="w-4 h-4" />}
              Go Live
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Manage Campaign Modal ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
      <Dialog open={!!manageCampaignId} onOpenChange={(open) => !open && setManageCampaignId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 gradient-text-gold">
              <Settings className="w-5 h-5 text-amber-400" /> Manage Campaign
            </DialogTitle>
            <DialogDescription>
              Edit details, manage reward tiers, and view contributions.
            </DialogDescription>
          </DialogHeader>

          {!manageData ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
          ) : (
            <div className="space-y-6 py-2">
              {/* Basic Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground uppercase">Title</Label>
                  <Input
                    value={manageData.campaign.title}
                    onChange={e => updateCampaignMutation.mutate({ id: manageData.campaign.id, title: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground uppercase">Tagline</Label>
                  <Input
                    value={manageData.campaign.tagline || ""}
                    onChange={e => updateCampaignMutation.mutate({ id: manageData.campaign.id, tagline: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground uppercase">Description (HTML supported)</Label>
                  <Textarea
                    rows={4}
                    value={manageData.campaign.description || ""}
                    onChange={e => updateCampaignMutation.mutate({ id: manageData.campaign.id, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Poster URL</Label>
                  <Input
                    value={manageData.campaign.posterUrl || ""}
                    onChange={e => updateCampaignMutation.mutate({ id: manageData.campaign.id, posterUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Pitch Video URL (Embed)</Label>
                  <Input
                    value={manageData.campaign.videoUrl || ""}
                    onChange={e => updateCampaignMutation.mutate({ id: manageData.campaign.id, videoUrl: e.target.value })}
                    placeholder="https://youtube.com/embed/..."
                  />
                </div>
              </div>

              <Separator />

              {/* Reward Tiers */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm flex items-center gap-2 gradient-text-gold">
                    <Gift className="w-4 h-4 text-amber-400" /> Reward Tiers
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs hover:border-amber-500/50 hover:text-amber-400"
                    onClick={() => createRewardMutation.mutate({
                      campaignId: manageData.campaign.id,
                      title: "New Reward",
                      amountCents: 1000,
                      description: "Description of the reward...",
                    })}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Tier
                  </Button>
                </div>

                <div className="space-y-3">
                  {manageData.rewards.map(reward => (
                    <div key={reward.id} className="p-3 border rounded-lg bg-zinc-500/5 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 grid grid-cols-4 gap-2">
                          <div className="col-span-2">
                            <Label className="text-[10px] text-muted-foreground uppercase">Tier Title</Label>
                            <Input
                              className="h-8 text-sm"
                              value={reward.title}
                              onChange={e => updateRewardMutation.mutate({ id: reward.id, title: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground uppercase">Amount (AUD)</Label>
                            <Input
                              className="h-8 text-sm"
                              type="number"
                              value={reward.amountCents / 100}
                              onChange={e => updateRewardMutation.mutate({ id: reward.id, amountCents: Math.round(parseFloat(e.target.value) * 100) })}
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground uppercase">Limit (Optional)</Label>
                            <Input
                              className="h-8 text-sm"
                              type="number"
                              value={reward.limitCount || ""}
                              onChange={e => updateRewardMutation.mutate({ id: reward.id, limitCount: e.target.value ? parseInt(e.target.value) : null })}
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                          onClick={() => deleteRewardMutation.mutate({ id: reward.id })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground uppercase">Description</Label>
                        <Textarea
                          className="text-xs"
                          rows={2}
                          value={reward.description || ""}
                          onChange={e => updateRewardMutation.mutate({ id: reward.id, description: e.target.value })}
                        />
                      </div>
                    </div>
                  ))}
                  {manageData.rewards.length === 0 && (
                    <div className="text-center py-6 border border-dashed rounded-lg text-sm text-muted-foreground">
                      No reward tiers created yet.
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Contributions */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm flex items-center gap-2 gradient-text-gold">
                  <Users className="w-4 h-4 text-amber-400" /> Recent Contributions
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {manageData.contributions.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2 border rounded text-xs">
                      <div className="flex flex-col">
                        <span className="font-medium">{FMT_AUD(c.amountCents)}</span>
                        <span className="text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <Badge variant="outline" className="capitalize">{c.status}</Badge>
                    </div>
                  ))}
                  {manageData.contributions.length === 0 && (
                    <div className="text-center py-4 text-xs text-muted-foreground">No contributions yet.</div>
                  )}
                </div>
              </div>

              {manageData.campaign.status === "draft" && (
                <div className="pt-4 border-t">
                  <Button
                    variant="ghost"
                    className="w-full text-red-400 hover:text-red-300 hover:bg-red-400/10 gap-2"
                    onClick={() => {
                      if (confirm("Are you sure you want to cancel this draft campaign?")) {
                        deleteCampaignMutation.mutate({ id: manageData.campaign.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" /> Cancel Campaign
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {!!projectId && <NextStageCTA projectId={projectId} currentStage={5} />}
    </div>
  );
}

export default function CrowdfundingHub() {
  return (
    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
    <SubscriptionGate
      feature="Crowdfunding Hub"
      featureKey="canUseCrowdfunding"
      requiredTier="indie"
    >
      <CrowdfundingHubInner />
    </SubscriptionGate>
  );
}
