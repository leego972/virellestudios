import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2,
  Shield,
  Play,
  Square,
  RefreshCw,
  Image,
  Video,
  Share2,
  Search,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  Settings,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
} from "lucide-react";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-4 h-4" />,
  tiktok: <Video className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  x_twitter: <Twitter className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  youtube_shorts: <Youtube className="w-4 h-4" />,
  pinterest: <Share2 className="w-4 h-4" />,
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  x_twitter: "X / Twitter",
  linkedin: "LinkedIn",
  youtube_shorts: "YouTube Shorts",
  pinterest: "Pinterest",
};

const ALL_PLATFORMS = ["instagram", "tiktok", "facebook", "x_twitter", "linkedin", "youtube_shorts", "pinterest"];

function StatusBadge({ success, label }: { success: boolean; label?: string }) {
  return (
    <Badge
      variant="outline"
      className={success
        ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
        : "border-red-500/50 text-red-400 bg-red-500/10"
      }
    >
      {success ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
      {label || (success ? "Success" : "Failed")}
    </Badge>
  );
}

function StageCard({ stage }: { stage: { stage: string; success: boolean; durationMs: number; details: Record<string, any>; error?: string } }) {
  const stageLabels: Record<string, string> = {
    content_creation: "Content Creation",
    distribution: "Distribution",
    seo_optimisation: "SEO Optimisation",
  };
  const stageIcons: Record<string, React.ReactNode> = {
    content_creation: <Image className="w-4 h-4" />,
    distribution: <Share2 className="w-4 h-4" />,
    seo_optimisation: <Search className="w-4 h-4" />,
  };

  return (
    <div className="border border-border/50 rounded-lg p-4 bg-card/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">{stageIcons[stage.stage]}</span>
          <span className="font-medium text-sm">{stageLabels[stage.stage] || stage.stage}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge success={stage.success} />
          <span className="text-xs text-muted-foreground">{Math.round(stage.durationMs / 1000)}s</span>
        </div>
      </div>
      {stage.error && (
        <p className="text-xs text-red-400 mt-2 bg-red-500/10 rounded p-2">{stage.error}</p>
      )}
      <div className="grid grid-cols-2 gap-2 mt-2">
        {Object.entries(stage.details || {}).map(([key, value]) => (
          <div key={key} className="text-xs">
            <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}: </span>
            <span className="text-foreground font-medium">
              {Array.isArray(value) ? value.join(", ") || "—" : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminAutonomous() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "tiktok", "facebook", "x_twitter"]);
  const [generateVideos, setGenerateVideos] = useState(false);
  const [runSeo, setRunSeo] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Queries
  const statusQuery = trpc.autonomous.status.useQuery(undefined, { refetchInterval: 10000 });
  const statsQuery = trpc.autonomous.contentCreatorStats.useQuery();
  const historyQuery = trpc.autonomous.runHistory.useQuery({ limit: 20 });
  const activityQuery = trpc.autonomous.activityLog.useQuery({ limit: 30 });
  const pendingContentQuery = trpc.autonomous.listPendingContent.useQuery({ status: "approved", limit: 20 });

  // Mutations
  const runPipelineMutation = trpc.autonomous.runPipeline.useMutation({
    onSuccess: (result) => {
      toast.success(`Pipeline cycle complete! ${result.summary.contentCreated} content pieces created`);
      utils.autonomous.status.invalidate();
      utils.autonomous.runHistory.invalidate();
      utils.autonomous.activityLog.invalidate();
      utils.autonomous.contentCreatorStats.invalidate();
    },
    onError: (err) => toast.error(err.message || "Pipeline run failed"),
  });

  const runContentMutation = trpc.autonomous.runContentCreation.useMutation({
    onSuccess: (result) => {
      toast.success(`Created ${result.created} content pieces!`);
      utils.autonomous.contentCreatorStats.invalidate();
      utils.autonomous.listPendingContent.invalidate();
    },
    onError: (err) => toast.error(err.message || "Content creation failed"),
  });

  const runMarketingMutation = trpc.autonomous.runMarketing.useMutation({
    onSuccess: (result) => {
      toast.success(`Marketing cycle complete! ${result.contentPublished} pieces published`);
      utils.autonomous.activityLog.invalidate();
    },
    onError: (err) => toast.error(err.message || "Marketing cycle failed"),
  });

  const runSeoMutation = trpc.autonomous.runSeo.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`SEO optimisation complete! Score: ${(result as any).score}/100`);
      } else {
        toast.warning((result as any).message || "SEO optimisation skipped");
      }
    },
    onError: (err) => toast.error(err.message || "SEO optimisation failed"),
  });

  const startSchedulerMutation = trpc.autonomous.startScheduler.useMutation({
    onSuccess: () => {
      toast.success("Autonomous scheduler started");
      utils.autonomous.status.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to start scheduler"),
  });

  const stopSchedulerMutation = trpc.autonomous.stopScheduler.useMutation({
    onSuccess: () => {
      toast.success("Autonomous scheduler stopped");
      utils.autonomous.status.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to stop scheduler"),
  });

  const updateConfigMutation = trpc.autonomous.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuration updated");
      utils.autonomous.status.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to update config"),
  });

  const approveContentMutation = trpc.autonomous.approveContent.useMutation({
    onSuccess: () => {
      toast.success("Content approved");
      utils.autonomous.listPendingContent.invalidate();
    },
  });

  const rejectContentMutation = trpc.autonomous.rejectContent.useMutation({
    onSuccess: () => {
      toast.success("Content rejected");
      utils.autonomous.listPendingContent.invalidate();
    },
  });

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Card className="border-border/50 bg-card/80 max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
              <Shield className="w-6 h-6 text-red-500" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Admin privileges required.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const status = statusQuery.data;
  const stats = statsQuery.data;
  const isRunning = status?.isRunning || runPipelineMutation.isPending;
  const isSchedulerActive = status?.isSchedulerActive || false;

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-400" />
            Autonomous Pipeline
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Content Creator → Marketing Engine → SEO Engine — all on autopilot
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={isSchedulerActive
              ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
              : "border-zinc-500/50 text-zinc-400 bg-zinc-500/10"
            }
          >
            <div className={`w-2 h-2 rounded-full mr-2 ${isSchedulerActive ? "bg-emerald-400 animate-pulse" : "bg-zinc-400"}`} />
            {isSchedulerActive ? "Scheduler Active" : "Scheduler Inactive"}
          </Badge>
          {isRunning && (
            <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Running...
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Image className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-muted-foreground">Total Content</span>
            </div>
            <p className="text-2xl font-bold">{stats?.totalPieces || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Share2 className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Platforms</span>
            </div>
            <p className="text-2xl font-bold">{Object.keys((stats as any)?.byPlatform || {}).length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-muted-foreground">Last Run</span>
            </div>
            <p className="text-sm font-medium">
              {status?.lastRunAt
                ? new Date(status.lastRunAt).toLocaleString()
                : "Never"
              }
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-muted-foreground">Last Cycle</span>
            </div>
            {status?.lastRunResult ? (
              <StatusBadge success={status.lastRunResult.success} />
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="content">Content Queue</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Pipeline diagram */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">Pipeline Flow</CardTitle>
              <CardDescription>How the autonomous system works</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { icon: <Image className="w-5 h-5" />, label: "Content Creator", desc: "Generates cinematic images & videos", color: "amber" },
                  { icon: <Share2 className="w-5 h-5" />, label: "Marketing Engine", desc: "Distributes to social & ad platforms", color: "blue" },
                  { icon: <Search className="w-5 h-5" />, label: "SEO Engine", desc: "Optimises web presence & rankings", color: "emerald" },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`flex flex-col items-center p-4 rounded-lg border border-${step.color}-500/30 bg-${step.color}-500/10 min-w-[140px]`}>
                      <span className={`text-${step.color}-400 mb-2`}>{step.icon}</span>
                      <p className="text-sm font-medium text-center">{step.label}</p>
                      <p className="text-xs text-muted-foreground text-center mt-1">{step.desc}</p>
                    </div>
                    {i < 2 && <span className="text-muted-foreground text-xl">→</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Last run result */}
          {status?.lastRunResult && (
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Last Pipeline Run
                  <Badge variant="outline" className="ml-auto text-xs">
                    {Math.round(status.lastRunResult.durationMs / 1000)}s
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-400">{status.lastRunResult.summary.contentCreated}</p>
                    <p className="text-xs text-muted-foreground">Content Created</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-400">{status.lastRunResult.summary.contentPublished}</p>
                    <p className="text-xs text-muted-foreground">Published</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-400">
                      {status.lastRunResult.summary.seoOptimised ? "✓" : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">SEO Run</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {status.lastRunResult.stages.map((stage: any) => (
                    <StageCard key={stage.stage} stage={stage} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Platform breakdown */}
          {stats && Object.keys((stats as any)?.byPlatform || {}).length > 0 && (
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base">Content by Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries((stats as any)?.byPlatform || {}).map(([platform, count]) => (
                    <div key={platform} className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-card/50">
                      <span className="text-amber-400">{PLATFORM_ICONS[platform] || <Share2 className="w-4 h-4" />}</span>
                      <div>
                        <p className="text-sm font-medium">{PLATFORM_LABELS[platform] || platform}</p>
                        <p className="text-xs text-muted-foreground">{count as number} pieces</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Controls Tab ── */}
        <TabsContent value="controls" className="space-y-4 mt-4">
          {/* Scheduler control */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">Scheduler Control</CardTitle>
              <CardDescription>The scheduler runs the full pipeline automatically every 6 hours</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button
                onClick={() => startSchedulerMutation.mutate()}
                disabled={isSchedulerActive || startSchedulerMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {startSchedulerMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Start Scheduler
              </Button>
              <Button
                onClick={() => stopSchedulerMutation.mutate()}
                disabled={!isSchedulerActive || stopSchedulerMutation.isPending}
                variant="destructive"
              >
                {stopSchedulerMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Square className="w-4 h-4 mr-2" />}
                Stop Scheduler
              </Button>
            </CardContent>
          </Card>

          {/* Platform selection */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">Platform Selection</CardTitle>
              <CardDescription>Choose which platforms to generate content for</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {ALL_PLATFORMS.map(platform => (
                  <button
                    key={platform}
                    onClick={() => togglePlatform(platform)}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                      selectedPlatforms.includes(platform)
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                        : "border-border/50 bg-card/50 text-muted-foreground hover:border-border"
                    }`}
                  >
                    {PLATFORM_ICONS[platform]}
                    <span className="text-sm">{PLATFORM_LABELS[platform]}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="generate-videos"
                    checked={generateVideos}
                    onCheckedChange={setGenerateVideos}
                  />
                  <Label htmlFor="generate-videos" className="text-sm">Generate Videos (slower)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="run-seo"
                    checked={runSeo}
                    onCheckedChange={setRunSeo}
                  />
                  <Label htmlFor="run-seo" className="text-sm">Run SEO Optimisation</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual triggers */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">Manual Triggers</CardTitle>
              <CardDescription>Run individual stages or the full pipeline on demand</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Full pipeline */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Full Autonomous Pipeline
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Content Creation → Distribution → SEO ({selectedPlatforms.length} platforms)
                  </p>
                </div>
                <Button
                  onClick={() => runPipelineMutation.mutate({
                    platforms: selectedPlatforms as any,
                    generateVideos,
                    runSeo,
                  })}
                  disabled={isRunning || selectedPlatforms.length === 0}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {runPipelineMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  Run Now
                </Button>
              </div>

              {/* Content creation only */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    <Image className="w-4 h-4 text-purple-400" />
                    Content Creation Only
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generate cinematic images{generateVideos ? " + videos" : ""} for selected platforms
                  </p>
                </div>
                <Button
                  onClick={() => runContentMutation.mutate({
                    platforms: selectedPlatforms as any,
                    generateVideos,
                  })}
                  disabled={runContentMutation.isPending || selectedPlatforms.length === 0}
                  variant="outline"
                  className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                >
                  {runContentMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Image className="w-4 h-4 mr-2" />}
                  Create Content
                </Button>
              </div>

              {/* Marketing only */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-blue-400" />
                    Marketing Distribution Only
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Distribute approved content to connected platforms
                  </p>
                </div>
                <Button
                  onClick={() => runMarketingMutation.mutate()}
                  disabled={runMarketingMutation.isPending}
                  variant="outline"
                  className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                >
                  {runMarketingMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
                  Distribute
                </Button>
              </div>

              {/* SEO only */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    <Search className="w-4 h-4 text-emerald-400" />
                    SEO Optimisation Only
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Run full SEO analysis, update meta tags, submit to IndexNow
                  </p>
                </div>
                <Button
                  onClick={() => runSeoMutation.mutate()}
                  disabled={runSeoMutation.isPending}
                  variant="outline"
                  className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                >
                  {runSeoMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Run SEO
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Content Queue Tab ── */}
        <TabsContent value="content" className="space-y-4 mt-4">
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="w-4 h-4 text-amber-400" />
                Content Queue
              </CardTitle>
              <CardDescription>Review and approve AI-generated content before distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingContentQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                </div>
              ) : (pendingContentQuery.data?.content || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No content in queue</p>
                  <p className="text-xs mt-1">Run the Content Creation stage to generate new content</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(pendingContentQuery.data?.content || []).map((item: any) => (
                    <div key={item.id} className="border border-border/50 rounded-lg p-4 bg-card/50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-amber-400">
                              {PLATFORM_ICONS[item.platform] || <Share2 className="w-4 h-4" />}
                            </span>
                            <span className="text-sm font-medium">{PLATFORM_LABELS[item.platform] || item.platform}</span>
                            <Badge variant="outline" className="text-xs">{item.type}</Badge>
                          </div>
                          {item.headline && (
                            <p className="text-sm font-medium mb-1">{item.headline}</p>
                          )}
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.body}</p>
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt="Generated content"
                              className="mt-2 rounded-lg w-full max-h-48 object-cover"
                            />
                          )}
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => approveContentMutation.mutate({ id: item.id })}
                            disabled={approveContentMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectContentMutation.mutate({ id: item.id })}
                            disabled={rejectContentMutation.isPending}
                            className="text-xs"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── History Tab ── */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                </div>
              ) : (activityQuery.data?.log || []).length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No activity yet</p>
              ) : (
                <div className="space-y-2">
                  {(activityQuery.data?.log || []).map((entry: any) => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card/50">
                      <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{entry.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(entry.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{entry.action}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Settings Tab ── */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                Pipeline Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {status?.config && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Enable Pipeline</p>
                      <p className="text-xs text-muted-foreground">Master switch for all autonomous operations</p>
                    </div>
                    <Switch
                      checked={status.config.enabled}
                      onCheckedChange={(checked) => updateConfigMutation.mutate({ enabled: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Generate Videos</p>
                      <p className="text-xs text-muted-foreground">Generate short video clips (uses Sora/Runway — slower)</p>
                    </div>
                    <Switch
                      checked={status.config.generateVideos}
                      onCheckedChange={(checked) => updateConfigMutation.mutate({ generateVideos: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Auto-Publish</p>
                      <p className="text-xs text-muted-foreground">Automatically push content to social platforms (no review)</p>
                    </div>
                    <Switch
                      checked={status.config.autoPublish}
                      onCheckedChange={(checked) => updateConfigMutation.mutate({ autoPublish: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Run SEO Optimisation</p>
                      <p className="text-xs text-muted-foreground">Include SEO analysis in each pipeline cycle</p>
                    </div>
                    <Switch
                      checked={status.config.runSeoOptimisation}
                      onCheckedChange={(checked) => updateConfigMutation.mutate({ runSeoOptimisation: checked })}
                    />
                  </div>
                  <div className="p-3 rounded-lg border border-border/50 bg-card/50">
                    <p className="text-sm font-medium mb-1">Schedule</p>
                    <p className="text-xs text-muted-foreground font-mono">{status.config.cronSchedule}</p>
                    <p className="text-xs text-muted-foreground mt-1">Currently runs every 6 hours</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border/50 bg-card/50">
                    <p className="text-sm font-medium mb-2">Active Platforms</p>
                    <div className="flex flex-wrap gap-2">
                      {status.config.contentPlatforms.map((p: string) => (
                        <Badge key={p} variant="outline" className="text-xs flex items-center gap-1">
                          {PLATFORM_ICONS[p]}
                          {PLATFORM_LABELS[p] || p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
