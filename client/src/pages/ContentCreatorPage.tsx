/**
 * VirÉlle Studios — Content Creator Page
 *
 * Full-featured AI content generation dashboard with:
 * - Studio: generate platform-optimised content with SEO integration
 * - Content Queue: review, approve, schedule, and publish content
 * - Campaigns: create and manage multi-platform content campaigns
 * - TikTok Hub: direct TikTok posting with carousel and video support
 * - Analytics: performance metrics across all platforms
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  PenTool, Sparkles, Plus, RefreshCw, Send, Clock, CheckCircle,
  XCircle, Eye, BarChart3, TrendingUp, Target, Zap, Film,
  Instagram, Twitter, Linkedin, Facebook, Globe, Mail, BookOpen,
  Calendar, Copy, ExternalLink, Trash2, Play, Pause, AlertCircle,
  ChevronDown, ChevronUp, Image, Video, FileText, Hash, Star,
  ArrowUpRight, Users, MessageSquare, Heart, Share2, Bookmark,
  Search, Filter, Download, Upload, Settings, Info,
} from "lucide-react";

// ─── Platform Icons & Labels ──────────────────────────────────────────────────
const PLATFORM_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  tiktok: { label: "TikTok", color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20", icon: <Video className="h-4 w-4" /> },
  instagram: { label: "Instagram", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", icon: <Instagram className="h-4 w-4" /> },
  x_twitter: { label: "X (Twitter)", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20", icon: <Twitter className="h-4 w-4" /> },
  linkedin: { label: "LinkedIn", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: <Linkedin className="h-4 w-4" /> },
  facebook: { label: "Facebook", color: "text-blue-500", bg: "bg-blue-600/10 border-blue-600/20", icon: <Facebook className="h-4 w-4" /> },
  youtube_shorts: { label: "YouTube Shorts", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: <Video className="h-4 w-4" /> },
  blog: { label: "Blog", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", icon: <BookOpen className="h-4 w-4" /> },
  email: { label: "Email", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", icon: <Mail className="h-4 w-4" /> },
  pinterest: { label: "Pinterest", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", icon: <Image className="h-4 w-4" /> },
  reddit: { label: "Reddit", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", icon: <MessageSquare className="h-4 w-4" /> },
  discord: { label: "Discord", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20", icon: <MessageSquare className="h-4 w-4" /> },
  telegram: { label: "Telegram", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", icon: <Send className="h-4 w-4" /> },
  medium: { label: "Medium", color: "text-gray-300", bg: "bg-gray-500/10 border-gray-500/20", icon: <BookOpen className="h-4 w-4" /> },
  hackernews: { label: "Hacker News", color: "text-orange-500", bg: "bg-orange-600/10 border-orange-600/20", icon: <Globe className="h-4 w-4" /> },
  whatsapp: { label: "WhatsApp", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: <MessageSquare className="h-4 w-4" /> },
};

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Draft", color: "bg-gray-500/20 text-gray-300 border-gray-500/30", icon: <FileText className="h-3 w-3" /> },
  review: { label: "In Review", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", icon: <Eye className="h-3 w-3" /> },
  approved: { label: "Approved", color: "bg-green-500/20 text-green-300 border-green-500/30", icon: <CheckCircle className="h-3 w-3" /> },
  scheduled: { label: "Scheduled", color: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: <Clock className="h-3 w-3" /> },
  published: { label: "Published", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: <CheckCircle className="h-3 w-3" /> },
  failed: { label: "Failed", color: "bg-red-500/20 text-red-300 border-red-500/30", icon: <XCircle className="h-3 w-3" /> },
  archived: { label: "Archived", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30", icon: <Trash2 className="h-3 w-3" /> },
};

const PLATFORMS = [
  "tiktok", "instagram", "x_twitter", "linkedin", "facebook",
  "youtube_shorts", "blog", "email", "pinterest", "reddit",
  "discord", "telegram", "medium", "hackernews", "whatsapp",
];

const CONTENT_TYPES = [
  { value: "social_post", label: "Social Post" },
  { value: "video_script", label: "Video Script" },
  { value: "photo_carousel", label: "Photo Carousel" },
  { value: "blog_article", label: "Blog Article" },
  { value: "email_campaign", label: "Email Campaign" },
  { value: "ad_copy", label: "Ad Copy" },
  { value: "reel", label: "Reel / Short" },
  { value: "story", label: "Story" },
  { value: "infographic", label: "Infographic" },
  { value: "thread", label: "Thread" },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color = "text-blue-400", trend }: {
  label: string; value: string | number; icon: React.ReactNode; color?: string; trend?: string;
}) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={color}>{icon}</span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {trend && <div className="text-xs text-emerald-400 mt-1">{trend}</div>}
      </CardContent>
    </Card>
  );
}

// ─── Platform Badge ───────────────────────────────────────────────────────────
function PlatformBadge({ platform }: { platform: string }) {
  const meta = PLATFORM_META[platform] || { label: platform, color: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/20", icon: <Globe className="h-4 w-4" /> };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.bg} ${meta.color}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.color}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

// ─── Score Bar ────────────────────────────────────────────────────────────────
function ScoreBar({ label, score, color = "bg-blue-500" }: { label: string; score: number; color?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score}/100</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// ─── Content Piece Card ───────────────────────────────────────────────────────
function PieceCard({ piece, onApprove, onReject, onPublishTikTok, onSchedule }: {
  piece: any;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onPublishTikTok: (id: number) => void;
  onSchedule: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hashtags = Array.isArray(piece.hashtags) ? piece.hashtags : [];

  return (
    <Card className="bg-card/50 border-border/50 hover:border-border transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <PlatformBadge platform={piece.platform} />
            <StatusBadge status={piece.status} />
            {piece.contentType && (
              <span className="text-xs text-muted-foreground border border-border/50 px-2 py-0.5 rounded-full">
                {piece.contentType.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">Q:{piece.qualityScore}</span>
            <span className="text-xs text-muted-foreground ml-1">SEO:{piece.seoScore}</span>
          </div>
        </div>

        {piece.title && (
          <h3 className="font-semibold text-sm mb-1 line-clamp-1">{piece.title}</h3>
        )}
        {piece.hook && (
          <p className="text-xs text-blue-400 italic mb-2 line-clamp-1">"{piece.hook}"</p>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{piece.body}</p>

        {expanded && (
          <div className="space-y-3 mb-3 pt-3 border-t border-border/50">
            {piece.headline && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Headline</p>
                <p className="text-sm font-medium">{piece.headline}</p>
              </div>
            )}
            {piece.callToAction && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Call to Action</p>
                <p className="text-sm text-emerald-400">{piece.callToAction}</p>
              </div>
            )}
            {piece.body && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Full Body</p>
                <p className="text-sm whitespace-pre-wrap">{piece.body}</p>
              </div>
            )}
            {piece.videoScript && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Video Script</p>
                <p className="text-sm whitespace-pre-wrap text-purple-300">{piece.videoScript}</p>
              </div>
            )}
            {hashtags.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Hashtags</p>
                <div className="flex flex-wrap gap-1">
                  {hashtags.map((tag: string, i: number) => (
                    <span key={i} className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                      {tag.startsWith("#") ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {piece.mediaUrl && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Media</p>
                <img src={piece.mediaUrl} alt="Content media" className="rounded-lg max-h-48 object-cover" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <ScoreBar label="Quality Score" score={piece.qualityScore} color="bg-emerald-500" />
              <ScoreBar label="SEO Score" score={piece.seoScore} color="bg-blue-500" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Less" : "More"}
          </button>
          <div className="flex items-center gap-1">
            {piece.status === "draft" && (
              <>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onApprove(piece.id)}>
                  <CheckCircle className="h-3 w-3 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400" onClick={() => onReject(piece.id)}>
                  <XCircle className="h-3 w-3" />
                </Button>
              </>
            )}
            {piece.status === "approved" && (
              <>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onSchedule(piece.id)}>
                  <Clock className="h-3 w-3 mr-1" /> Schedule
                </Button>
                {piece.platform === "tiktok" && (
                  <Button size="sm" className="h-7 text-xs bg-pink-600 hover:bg-pink-700" onClick={() => onPublishTikTok(piece.id)}>
                    <Send className="h-3 w-3 mr-1" /> Post TikTok
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContentCreatorPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("studio");

  // Studio state
  const [platform, setPlatform] = useState("tiktok");
  const [contentType, setContentType] = useState("video_script");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [includeImage, setIncludeImage] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | undefined>();
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  // Campaign state
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignObjective, setNewCampaignObjective] = useState("");
  const [newCampaignPlatforms, setNewCampaignPlatforms] = useState<string[]>(["tiktok", "instagram", "x_twitter"]);
  const [newCampaignKeywords, setNewCampaignKeywords] = useState("");
  const [newCampaignTikTok, setNewCampaignTikTok] = useState(false);
  const [newCampaignSeo, setNewCampaignSeo] = useState(true);
  const [generateStrategy, setGenerateStrategy] = useState(true);

  // Queue state
  const [queuePlatformFilter, setQueuePlatformFilter] = useState<string | undefined>();
  const [queueStatusFilter, setQueueStatusFilter] = useState<string | undefined>();
  const [scheduleDialogPieceId, setScheduleDialogPieceId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");

  // Bulk generate state
  const [bulkCampaignId, setBulkCampaignId] = useState<number | undefined>();
  const [bulkPlatforms, setBulkPlatforms] = useState<string[]>(["tiktok", "instagram", "x_twitter", "linkedin"]);
  const [bulkTopic, setBulkTopic] = useState("");
  const [bulkIncludeImages, setBulkIncludeImages] = useState(false);

  // Admin guard
  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1">Admin Access Required</h2>
          <p className="text-muted-foreground text-sm">The Content Creator is available to administrators only.</p>
        </div>
      </div>
    );
  }

  // ─── Queries ──────────────────────────────────────────────────────────────
  const dashboardQuery = trpc.contentCreator.dashboard.useQuery(undefined, { refetchInterval: 30000 });
  const campaignsQuery = trpc.contentCreator.listCampaigns.useQuery({ limit: 50 });
  const piecesQuery = trpc.contentCreator.listPieces.useQuery({
    limit: 30,
    platform: queuePlatformFilter as any,
    status: queueStatusFilter as any,
  }, { refetchInterval: 15000 });
  const seoBriefsQuery = trpc.contentCreator.getSeoContentBriefs.useQuery({ count: 5 });
  const analyticsQuery = trpc.contentCreator.getAnalytics.useQuery({});

  // ─── Mutations ────────────────────────────────────────────────────────────
  const generateMutation = trpc.contentCreator.generatePiece.useMutation({
    onSuccess: (data) => {
      setGeneratedContent(data);
      toast.success("Content generated successfully!");
      piecesQuery.refetch();
      dashboardQuery.refetch();
    },
    onError: (err) => toast.error(`Generation failed: ${err.message}`),
  });

  const createCampaignMutation = trpc.contentCreator.createCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign created!");
      setShowCreateCampaign(false);
      setNewCampaignName("");
      setNewCampaignObjective("");
      campaignsQuery.refetch();
      dashboardQuery.refetch();
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const bulkGenerateMutation = trpc.contentCreator.bulkGenerate.useMutation({
    onSuccess: (data) => {
      toast.success(`Bulk generation complete: ${data.generated} pieces created, ${data.failed} failed`);
      piecesQuery.refetch();
      dashboardQuery.refetch();
    },
    onError: (err) => toast.error(`Bulk generation failed: ${err.message}`),
  });

  const approveMutation = trpc.contentCreator.approvePiece.useMutation({
    onSuccess: () => { toast.success("Approved!"); piecesQuery.refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.contentCreator.rejectPiece.useMutation({
    onSuccess: () => { toast.success("Rejected and archived."); piecesQuery.refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const publishTikTokMutation = trpc.contentCreator.publishToTikTok.useMutation({
    onSuccess: (data) => {
      if (data.success) toast.success(`Posted to TikTok! Publish ID: ${data.publishId}`);
      else toast.error(`TikTok post failed: ${data.error}`);
      piecesQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const scheduleMutation = trpc.contentCreator.schedulePiece.useMutation({
    onSuccess: () => {
      toast.success("Content scheduled!");
      setScheduleDialogPieceId(null);
      setScheduleDate("");
      piecesQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const processDueMutation = trpc.contentCreator.processDueSchedules.useMutation({
    onSuccess: (data) => {
      toast.success(`Processed ${data.processed} schedules: ${data.published} published, ${data.failed} failed`);
      piecesQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleGenerate = () => {
    generateMutation.mutate({
      platform: platform as any,
      contentType: contentType as any,
      topic: topic || undefined,
      seoKeywords: keywords ? keywords.split(",").map(k => k.trim()).filter(Boolean) : [],
      targetAudience: targetAudience || undefined,
      includeImage,
      campaignId: selectedCampaignId,
      saveToDb: true,
    });
  };

  const handleCreateCampaign = () => {
    if (!newCampaignName.trim()) { toast.error("Campaign name required"); return; }
    createCampaignMutation.mutate({
      name: newCampaignName,
      objective: newCampaignObjective || undefined,
      platforms: newCampaignPlatforms as any,
      seoKeywords: newCampaignKeywords ? newCampaignKeywords.split(",").map(k => k.trim()).filter(Boolean) : [],
      tiktokLinked: newCampaignTikTok,
      seoLinked: newCampaignSeo,
      generateStrategy,
    });
  };

  const handleBulkGenerate = () => {
    if (!bulkCampaignId) { toast.error("Select a campaign first"); return; }
    if (bulkPlatforms.length === 0) { toast.error("Select at least one platform"); return; }
    bulkGenerateMutation.mutate({
      campaignId: bulkCampaignId,
      platforms: bulkPlatforms as any,
      topic: bulkTopic || undefined,
      includeImages: bulkIncludeImages,
    });
  };

  const toggleBulkPlatform = (p: string) => {
    setBulkPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const toggleNewCampaignPlatform = (p: string) => {
    setNewCampaignPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const dashboardRaw = dashboardQuery.data;
  const dashboard = dashboardRaw ? {
    totalCampaigns: dashboardRaw.activeCampaigns?.length ?? 0,
    activeCampaigns: dashboardRaw.overview?.activeCampaigns ?? 0,
    totalPieces: dashboardRaw.overview?.totalPieces ?? 0,
    publishedPieces: dashboardRaw.overview?.statusBreakdown?.published ?? 0,
    scheduledPieces: dashboardRaw.overview?.scheduledPosts ?? 0,
    totalImpressions: dashboardRaw.analytics?.impressions ?? 0,
    totalEngagements: dashboardRaw.analytics?.engagements ?? 0,
    platformBreakdown: dashboardRaw.overview?.platformBreakdown ?? {},
    tiktokConfigured: false,
    advertisingLinked: false,
    topPerformingPieces: [] as any[],
    autonomousConfig: dashboardRaw.autonomousConfig,
  } : null;
  const campaigns = campaignsQuery.data?.campaigns || [];
  const pieces = piecesQuery.data?.pieces || [];
  const analytics = analyticsQuery.data;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PenTool className="h-6 w-6 text-blue-400" />
            Content Creator
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            AI-powered content for 15 platforms — SEO-driven, TikTok-ready, brand-aligned
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => processDueMutation.mutate()}
            disabled={processDueMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${processDueMutation.isPending ? "animate-spin" : ""}`} />
            Process Queue
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard label="Campaigns" value={dashboard.totalCampaigns} icon={<Target className="h-4 w-4" />} color="text-blue-400" />
          <StatCard label="Active" value={dashboard.activeCampaigns} icon={<Zap className="h-4 w-4" />} color="text-emerald-400" />
          <StatCard label="Total Pieces" value={dashboard.totalPieces} icon={<FileText className="h-4 w-4" />} color="text-purple-400" />
          <StatCard label="Published" value={dashboard.publishedPieces} icon={<CheckCircle className="h-4 w-4" />} color="text-green-400" />
          <StatCard label="Scheduled" value={dashboard.scheduledPieces} icon={<Clock className="h-4 w-4" />} color="text-yellow-400" />
          <StatCard label="Impressions" value={dashboard.totalImpressions.toLocaleString()} icon={<TrendingUp className="h-4 w-4" />} color="text-pink-400" />
        </div>
      )}

      {/* Integration Status */}
      {dashboard && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${dashboard.tiktokConfigured ? "bg-pink-500/10 border-pink-500/30 text-pink-300" : "bg-muted border-border text-muted-foreground"}`}>
            <div className={`h-1.5 w-1.5 rounded-full ${dashboard.tiktokConfigured ? "bg-pink-400" : "bg-gray-500"}`} />
            TikTok {dashboard.tiktokConfigured ? "Connected" : "Not Connected"}
          </div>
          <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border bg-blue-500/10 border-blue-500/30 text-blue-300">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            SEO Engine Active
          </div>
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${dashboard.advertisingLinked ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-muted border-border text-muted-foreground"}`}>
            <div className={`h-1.5 w-1.5 rounded-full ${dashboard.advertisingLinked ? "bg-emerald-400" : "bg-gray-500"}`} />
            Advertising {dashboard.advertisingLinked ? "Linked" : "Unlinked"}
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="studio">Studio</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="tiktok">TikTok Hub</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ─── Studio Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="studio" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Generator Panel */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  AI Content Generator
                </CardTitle>
                <CardDescription>Generate platform-optimised content powered by SEO data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Platform</Label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map(p => (
                          <SelectItem key={p} value={p}>
                            {PLATFORM_META[p]?.label || p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Content Type</Label>
                    <Select value={contentType} onValueChange={setContentType}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_TYPES.map(ct => (
                          <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Topic / Angle (optional)</Label>
                  <Input
                    placeholder="e.g. How AI is revolutionising indie filmmaking"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">SEO Keywords (comma-separated)</Label>
                  <Input
                    placeholder="e.g. AI film production, cinematic AI, indie filmmaker"
                    value={keywords}
                    onChange={e => setKeywords(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Target Audience (optional)</Label>
                  <Input
                    placeholder="e.g. Indie filmmakers aged 18-35"
                    value={targetAudience}
                    onChange={e => setTargetAudience(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Link to Campaign (optional)</Label>
                  <Select
                    value={selectedCampaignId?.toString() || "none"}
                    onValueChange={v => setSelectedCampaignId(v === "none" ? undefined : Number(v))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="No campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No campaign</SelectItem>
                      {campaigns.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={includeImage} onCheckedChange={setIncludeImage} id="include-image" />
                    <Label htmlFor="include-image" className="text-xs cursor-pointer">Generate cinematic image</Label>
                  </div>
                </div>

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" />Generate Content</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generated Content Preview */}
            <div className="space-y-4">
              {generatedContent ? (
                <Card className="bg-card/50 border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      Generated Content
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <PlatformBadge platform={generatedContent.platform} />
                      <span className="text-xs text-muted-foreground">{generatedContent.contentType?.replace(/_/g, " ")}</span>
                      <span className="text-xs text-muted-foreground">
                        {generatedContent.generationMs ? `${(generatedContent.generationMs / 1000).toFixed(1)}s` : ""}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {generatedContent.title && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Title</p>
                        <p className="font-semibold text-sm">{generatedContent.title}</p>
                      </div>
                    )}
                    {generatedContent.hook && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Hook</p>
                        <p className="text-sm text-blue-400 italic">"{generatedContent.hook}"</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Body</p>
                      <p className="text-sm whitespace-pre-wrap line-clamp-6">{generatedContent.body}</p>
                    </div>
                    {generatedContent.callToAction && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">CTA</p>
                        <p className="text-sm text-emerald-400">{generatedContent.callToAction}</p>
                      </div>
                    )}
                    {generatedContent.hashtags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {generatedContent.hashtags.map((tag: string, i: number) => (
                          <span key={i} className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                            {tag.startsWith("#") ? tag : `#${tag}`}
                          </span>
                        ))}
                      </div>
                    )}
                    {generatedContent.mediaUrl && (
                      <img src={generatedContent.mediaUrl} alt="Generated" className="rounded-lg w-full max-h-48 object-cover" />
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                      <ScoreBar label="Quality" score={generatedContent.qualityScore} color="bg-emerald-500" />
                      <ScoreBar label="SEO" score={generatedContent.seoScore} color="bg-blue-500" />
                    </div>
                    {generatedContent.pieceId && (
                      <p className="text-xs text-muted-foreground">Saved to queue as piece #{generatedContent.pieceId}</p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card/50 border-border/50 border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Sparkles className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">Generated content will appear here</p>
                    <p className="text-xs text-muted-foreground mt-1">Configure the generator and click Generate</p>
                  </CardContent>
                </Card>
              )}

              {/* SEO Briefs */}
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Search className="h-4 w-4 text-blue-400" />
                    SEO Content Briefs
                  </CardTitle>
                  <CardDescription className="text-xs">Live keyword opportunities from your SEO engine</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {seoBriefsQuery.isLoading ? (
                    <p className="text-xs text-muted-foreground">Loading SEO briefs...</p>
                  ) : seoBriefsQuery.data?.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No SEO briefs available — configure your SEO engine first.</p>
                  ) : (
                    seoBriefsQuery.data?.slice(0, 4).map((brief: any, i: number) => (
                      <div
                        key={i}
                        className="p-2 rounded-lg border border-border/50 bg-muted/30 cursor-pointer hover:border-blue-500/50 transition-colors"
                        onClick={() => {
                          setTopic(brief.topic);
                          setKeywords(brief.secondaryKeywords.join(", "));
                          if (brief.recommendedPlatforms[0]) setPlatform(brief.recommendedPlatforms[0]);
                        }}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-xs font-medium line-clamp-1">{brief.topic}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${brief.estimatedImpact === "high" ? "bg-emerald-500/20 text-emerald-300" : "bg-yellow-500/20 text-yellow-300"}`}>
                            {brief.estimatedImpact}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{brief.seoOpportunity}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── Queue Tab ──────────────────────────────────────────────────────── */}
        <TabsContent value="queue" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={queuePlatformFilter || "all"} onValueChange={v => setQueuePlatformFilter(v === "all" ? undefined : v)}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {PLATFORMS.map(p => <SelectItem key={p} value={p}>{PLATFORM_META[p]?.label || p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={queueStatusFilter || "all"} onValueChange={v => setQueueStatusFilter(v === "all" ? undefined : v)}>
              <SelectTrigger className="h-8 w-36">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.keys(STATUS_META).map(s => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => piecesQuery.refetch()} className="h-8">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">{piecesQuery.data?.total || 0} pieces</span>
          </div>

          {piecesQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="bg-card/50 border-border/50 animate-pulse h-32" />
              ))}
            </div>
          ) : pieces.length === 0 ? (
            <Card className="bg-card/50 border-border/50 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No content pieces yet</p>
                <p className="text-xs text-muted-foreground mt-1">Generate content in the Studio tab</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pieces.map((piece: any) => (
                <PieceCard
                  key={piece.id}
                  piece={piece}
                  onApprove={(id) => approveMutation.mutate({ id })}
                  onReject={(id) => rejectMutation.mutate({ id })}
                  onPublishTikTok={(id) => publishTikTokMutation.mutate({ pieceId: id })}
                  onSchedule={(id) => setScheduleDialogPieceId(id)}
                />
              ))}
            </div>
          )}

          {/* Schedule Dialog */}
          <Dialog open={scheduleDialogPieceId !== null} onOpenChange={() => setScheduleDialogPieceId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Content</DialogTitle>
                <DialogDescription>Choose when to publish this piece</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Publish Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!scheduleDialogPieceId || !scheduleDate) { toast.error("Select a date"); return; }
                    scheduleMutation.mutate({ pieceId: scheduleDialogPieceId, scheduledAt: scheduleDate });
                  }}
                  disabled={scheduleMutation.isPending}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ─── Campaigns Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="campaigns" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Content Campaigns</h2>
            <Button size="sm" onClick={() => setShowCreateCampaign(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Campaign
            </Button>
          </div>

          {/* Create Campaign Dialog */}
          <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Content Campaign</DialogTitle>
                <DialogDescription>Set up a multi-platform content campaign with AI strategy</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Campaign Name *</Label>
                  <Input placeholder="e.g. Q1 Filmmaker Acquisition" value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Objective</Label>
                  <Input placeholder="e.g. Drive sign-ups from indie filmmakers" value={newCampaignObjective} onChange={e => setNewCampaignObjective(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">SEO Keywords</Label>
                  <Input placeholder="ai film production, cinematic AI, indie filmmaker tools" value={newCampaignKeywords} onChange={e => setNewCampaignKeywords(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Target Platforms</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PLATFORMS.map(p => (
                      <button
                        key={p}
                        onClick={() => toggleNewCampaignPlatform(p)}
                        className={`text-xs px-2 py-1 rounded-full border transition-colors ${newCampaignPlatforms.includes(p) ? "bg-blue-500/20 border-blue-500/50 text-blue-300" : "border-border/50 text-muted-foreground hover:border-border"}`}
                      >
                        {PLATFORM_META[p]?.label || p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={newCampaignTikTok} onCheckedChange={setNewCampaignTikTok} id="tiktok-link" />
                    <Label htmlFor="tiktok-link" className="text-xs">Link TikTok</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={newCampaignSeo} onCheckedChange={setNewCampaignSeo} id="seo-link" />
                    <Label htmlFor="seo-link" className="text-xs">Link SEO</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={generateStrategy} onCheckedChange={setGenerateStrategy} id="gen-strategy" />
                    <Label htmlFor="gen-strategy" className="text-xs">AI Strategy</Label>
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreateCampaign} disabled={createCampaignMutation.isPending}>
                  {createCampaignMutation.isPending ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Creating...</> : <><Plus className="h-4 w-4 mr-2" />Create Campaign</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Campaigns List */}
          {campaignsQuery.isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Card key={i} className="h-20 animate-pulse bg-card/50 border-border/50" />)}
            </div>
          ) : campaigns.length === 0 ? (
            <Card className="bg-card/50 border-border/50 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Target className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No campaigns yet</p>
                <Button size="sm" className="mt-3" onClick={() => setShowCreateCampaign(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Create First Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign: any) => (
                <Card key={campaign.id} className="bg-card/50 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{campaign.name}</h3>
                          <Badge variant="outline" className="text-xs capitalize">{campaign.status}</Badge>
                        </div>
                        {campaign.objective && <p className="text-xs text-muted-foreground mb-2">{campaign.objective}</p>}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{campaign.totalPieces} pieces</span>
                          <span>{campaign.publishedPieces} published</span>
                          {campaign.tiktokLinked && <span className="text-pink-400">TikTok</span>}
                          {campaign.seoLinked && <span className="text-blue-400">SEO</span>}
                        </div>
                        {Array.isArray(campaign.platforms) && campaign.platforms.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {campaign.platforms.slice(0, 5).map((p: string) => (
                              <PlatformBadge key={p} platform={p} />
                            ))}
                            {campaign.platforms.length > 5 && (
                              <span className="text-xs text-muted-foreground">+{campaign.platforms.length - 5} more</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setBulkCampaignId(campaign.id);
                            if (Array.isArray(campaign.platforms)) setBulkPlatforms(campaign.platforms);
                            setActiveTab("campaigns");
                          }}
                        >
                          <Zap className="h-3 w-3 mr-1" /> Bulk Generate
                        </Button>
                      </div>
                    </div>
                    {campaign.aiStrategy && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-1">AI Strategy</p>
                        <p className="text-xs line-clamp-2">{campaign.aiStrategy}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Bulk Generate Panel */}
          {campaigns.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  Bulk Generate
                </CardTitle>
                <CardDescription className="text-xs">Generate content for multiple platforms in one go</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Campaign</Label>
                  <Select value={bulkCampaignId?.toString() || "none"} onValueChange={v => setBulkCampaignId(v === "none" ? undefined : Number(v))}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Topic (optional)</Label>
                  <Input placeholder="Leave blank to auto-select best angle" value={bulkTopic} onChange={e => setBulkTopic(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Platforms</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PLATFORMS.map(p => (
                      <button
                        key={p}
                        onClick={() => toggleBulkPlatform(p)}
                        className={`text-xs px-2 py-1 rounded-full border transition-colors ${bulkPlatforms.includes(p) ? "bg-blue-500/20 border-blue-500/50 text-blue-300" : "border-border/50 text-muted-foreground hover:border-border"}`}
                      >
                        {PLATFORM_META[p]?.label || p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={bulkIncludeImages} onCheckedChange={setBulkIncludeImages} id="bulk-images" />
                  <Label htmlFor="bulk-images" className="text-xs">Generate cinematic images</Label>
                </div>
                <Button
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                  onClick={handleBulkGenerate}
                  disabled={bulkGenerateMutation.isPending || !bulkCampaignId}
                >
                  {bulkGenerateMutation.isPending ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Generating {bulkPlatforms.length} pieces...</>
                  ) : (
                    <><Zap className="h-4 w-4 mr-2" />Bulk Generate ({bulkPlatforms.length} platforms)</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── TikTok Hub Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="tiktok" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Video className="h-4 w-4 text-pink-400" />
                  TikTok Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${dashboard?.tiktokConfigured ? "bg-pink-500/10 border-pink-500/30" : "bg-muted border-border"}`}>
                  <div className={`h-3 w-3 rounded-full ${dashboard?.tiktokConfigured ? "bg-pink-400" : "bg-gray-500"}`} />
                  <div>
                    <p className="text-sm font-medium">{dashboard?.tiktokConfigured ? "TikTok Content API Connected" : "TikTok Not Configured"}</p>
                    <p className="text-xs text-muted-foreground">
                      {dashboard?.tiktokConfigured
                        ? "Direct posting enabled for carousels and videos"
                        : "Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in environment"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">TikTok-Ready Content</p>
                  {pieces.filter((p: any) => p.platform === "tiktok" && ["approved", "draft"].includes(p.status)).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No TikTok content ready. Generate in Studio tab.</p>
                  ) : (
                    pieces.filter((p: any) => p.platform === "tiktok").slice(0, 5).map((piece: any) => (
                      <div key={piece.id} className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/20">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium line-clamp-1">{piece.title || piece.headline || "Untitled"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StatusBadge status={piece.status} />
                            <span className="text-xs text-muted-foreground">{piece.contentType?.replace(/_/g, " ")}</span>
                          </div>
                        </div>
                        {piece.status === "approved" && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-pink-600 hover:bg-pink-700 ml-2 shrink-0"
                            onClick={() => publishTikTokMutation.mutate({ pieceId: piece.id })}
                            disabled={publishTikTokMutation.isPending}
                          >
                            {publishTikTokMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    setPlatform("tiktok");
                    setContentType("photo_carousel");
                    setActiveTab("studio");
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create TikTok Carousel
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    setPlatform("tiktok");
                    setContentType("video_script");
                    setActiveTab("studio");
                  }}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Create TikTok Video Script
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">TikTok Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboard && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <StatCard label="Impressions" value={dashboard.totalImpressions.toLocaleString()} icon={<Eye className="h-3.5 w-3.5" />} color="text-pink-400" />
                      <StatCard label="Engagements" value={dashboard.totalEngagements.toLocaleString()} icon={<Heart className="h-3.5 w-3.5" />} color="text-pink-400" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Platform Breakdown</p>
                      {Object.entries(dashboard.platformBreakdown || {}).slice(0, 6).map(([platform, count]) => (
                        <div key={platform} className="flex items-center justify-between">
                          <PlatformBadge platform={platform} />
                          <span className="text-xs text-muted-foreground">{count as number} pieces</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Analytics Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          {analytics ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard label="Impressions" value={analytics.totals.impressions.toLocaleString()} icon={<Eye className="h-4 w-4" />} color="text-blue-400" />
                <StatCard label="Clicks" value={analytics.totals.clicks.toLocaleString()} icon={<ArrowUpRight className="h-4 w-4" />} color="text-emerald-400" />
                <StatCard label="Engagements" value={analytics.totals.engagements.toLocaleString()} icon={<Heart className="h-4 w-4" />} color="text-pink-400" />
                <StatCard label="Shares" value={analytics.totals.shares.toLocaleString()} icon={<Share2 className="h-4 w-4" />} color="text-purple-400" />
                <StatCard label="Saves" value={analytics.totals.saves.toLocaleString()} icon={<Bookmark className="h-4 w-4" />} color="text-yellow-400" />
                <StatCard label="Video Views" value={analytics.totals.videoViews.toLocaleString()} icon={<Video className="h-4 w-4" />} color="text-red-400" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-card/50 border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Performance by Platform</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(analytics.byPlatform).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No analytics data yet. Publish content and update metrics.</p>
                    ) : (
                      Object.entries(analytics.byPlatform).map(([platform, data]: [string, any]) => (
                        <div key={platform} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <PlatformBadge platform={platform} />
                            <span className="text-xs text-muted-foreground">{data.impressions.toLocaleString()} impressions</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${Math.min((data.impressions / Math.max(...Object.values(analytics.byPlatform).map((d: any) => d.impressions), 1)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Key Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Avg. Click-Through Rate</span>
                      <span className="font-semibold">{analytics.avgCtr.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Avg. Engagement Rate</span>
                      <span className="font-semibold">{analytics.avgEngagementRate.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Total Content Pieces</span>
                      <span className="font-semibold">{dashboard?.totalPieces || 0}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">Published Rate</span>
                      <span className="font-semibold">
                        {dashboard?.totalPieces ? Math.round((dashboard.publishedPieces / dashboard.totalPieces) * 100) : 0}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Performing */}
              {dashboard?.topPerformingPieces && dashboard.topPerformingPieces.length > 0 && (
                <Card className="bg-card/50 border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-400" />
                      Top Performing Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dashboard.topPerformingPieces.map((piece: any) => (
                      <div key={piece.id} className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/20">
                        <div className="flex items-center gap-2 min-w-0">
                          <PlatformBadge platform={piece.platform} />
                          <p className="text-xs line-clamp-1">{piece.title || piece.headline || "Untitled"}</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                          <span>{piece.impressions.toLocaleString()} imp</span>
                          <span>{piece.engagements} eng</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="bg-card/50 border-border/50 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No analytics data yet</p>
                <p className="text-xs text-muted-foreground mt-1">Publish content and update metrics to see performance</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
