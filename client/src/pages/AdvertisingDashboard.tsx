/**
 * Advertising Dashboard — VirÉlle Studios
 *
 * Full-featured advertising management interface:
 *  - Live campaign performance overview
 *  - Autonomous ad cycle controls
 *  - Content queue with approve/reject workflow
 *  - TikTok integration status and manual trigger
 *  - Video and image ad generation
 *  - Platform strategy overview
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Loader2, Shield, Play, RefreshCw, Video, Share2, Zap, Clock,
  CheckCircle2, XCircle, AlertCircle, BarChart3, TrendingUp,
  Instagram, Twitter, Facebook, Linkedin, Youtube, Image,
  Target, DollarSign, Eye, MousePointer, Activity, Megaphone,
  Film, Sparkles, ExternalLink, Copy, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Platform Meta ─────────────────────────────────────────────────────────
const PLATFORM_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  instagram: { label: "Instagram", color: "text-purple-400", icon: <Instagram className="w-4 h-4" /> },
  tiktok: { label: "TikTok", color: "text-pink-400", icon: <Video className="w-4 h-4" /> },
  facebook: { label: "Facebook", color: "text-blue-400", icon: <Facebook className="w-4 h-4" /> },
  x_twitter: { label: "X / Twitter", color: "text-sky-400", icon: <Twitter className="w-4 h-4" /> },
  linkedin: { label: "LinkedIn", color: "text-blue-500", icon: <Linkedin className="w-4 h-4" /> },
  youtube_shorts: { label: "YouTube Shorts", color: "text-red-400", icon: <Youtube className="w-4 h-4" /> },
  pinterest: { label: "Pinterest", color: "text-rose-400", icon: <Share2 className="w-4 h-4" /> },
};

// ─── Status Badge ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "border-zinc-500/50 text-zinc-400 bg-zinc-500/10" },
    approved: { label: "Approved", className: "border-green-500/50 text-green-400 bg-green-500/10" },
    published: { label: "Published", className: "border-emerald-500/50 text-emerald-400 bg-emerald-500/10" },
    rejected: { label: "Rejected", className: "border-red-500/50 text-red-400 bg-red-500/10" },
    active: { label: "Active", className: "border-amber-500/50 text-amber-400 bg-amber-500/10" },
    paused: { label: "Paused", className: "border-yellow-500/50 text-yellow-400 bg-yellow-500/10" },
    completed: { label: "Completed", className: "border-blue-500/50 text-blue-400 bg-blue-500/10" },
  };
  const meta = map[status] || { label: status, className: "border-zinc-500/50 text-zinc-400 bg-zinc-500/10" };
  return (
    <Badge variant="outline" className={meta.className}>
      {meta.label}
    </Badge>
  );
}

// ─── Metric Card ───────────────────────────────────────────────────────────
function MetricCard({ icon, label, value, sub, color = "text-amber-400" }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className={color}>{icon}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Content Queue Item ────────────────────────────────────────────────────
function ContentQueueItem({ item, onApprove, onReject, isApproving, isRejecting }: {
  item: any;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const platformMeta = PLATFORM_META[item.platform] || { label: item.platform, color: "text-zinc-400", icon: <Share2 className="w-4 h-4" /> };

  return (
    <div className="border border-border/50 rounded-lg p-4 bg-card/50 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={platformMeta.color}>{platformMeta.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{item.title || item.headline || "Untitled"}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs ${platformMeta.color}`}>{platformMeta.label}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{item.contentType || "post"}</span>
              {item.qualityScore != null && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className={`text-xs font-medium ${item.qualityScore >= 75 ? "text-emerald-400" : item.qualityScore >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                    Quality: {item.qualityScore}/100
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={item.status} />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 pt-2 border-t border-border/30">
          {item.headline && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Headline</p>
              <p className="text-sm font-medium">{item.headline}</p>
            </div>
          )}
          {item.body && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Body</p>
              <p className="text-xs text-foreground/80 line-clamp-4 whitespace-pre-wrap">{item.body}</p>
            </div>
          )}
          {item.callToAction && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Call to Action</p>
              <p className="text-xs text-amber-400">{item.callToAction}</p>
            </div>
          )}
          {item.hashtags && item.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.hashtags.slice(0, 8).map((tag: string) => (
                <span key={tag} className="text-xs bg-zinc-800/50 text-zinc-400 px-2 py-0.5 rounded">#{tag}</span>
              ))}
            </div>
          )}
          {item.mediaUrl && (
            <div>
              <img src={item.mediaUrl} alt="Content preview" className="rounded-lg max-h-40 object-cover" />
            </div>
          )}
        </div>
      )}

      {item.status === "draft" && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8"
            onClick={() => onApprove(item.id)}
            disabled={isApproving}
          >
            {isApproving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-8"
            onClick={() => onReject(item.id)}
            disabled={isRejecting}
          >
            {isRejecting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function AdvertisingDashboard() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState("overview");
  const [queueFilter, setQueueFilter] = useState<"all" | "draft" | "approved" | "published">("draft");
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  // ─── Queries ─────────────────────────────────────────────────────────────
  const dashboardQuery = trpc.advertising.getDashboard.useQuery(undefined, { refetchInterval: 15000 });
  const performanceQuery = trpc.advertising.getPerformance.useQuery({ days: 30 });
  const activityQuery = trpc.advertising.getActivity.useQuery({ limit: 20 });
  const contentQueueQuery = trpc.advertising.getContentQueue.useQuery({
    status: queueFilter,
    limit: 30,
  });
  const tiktokStatsQuery = trpc.advertising.getTikTokStats.useQuery();
  const strategiesQuery = trpc.advertising.getStrategies.useQuery();

  // ─── Mutations ────────────────────────────────────────────────────────────
  const runCycleMutation = trpc.advertising.runCycle.useMutation({
    onSuccess: () => {
      toast.success("Advertising cycle complete — new content generated and queued");
      utils.advertising.getDashboard.invalidate();
      utils.advertising.getContentQueue.invalidate();
      utils.advertising.getActivity.invalidate();
    },
    onError: (err) => toast.error(err.message || "Advertising cycle failed"),
  });

  const updateStatusMutation = trpc.advertising.updateContentStatus.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`Content ${vars.status}`);
      utils.advertising.getContentQueue.invalidate();
      utils.advertising.getDashboard.invalidate();
      setApprovingId(null);
      setRejectingId(null);
    },
    onError: (err) => {
      toast.error(err.message || "Status update failed");
      setApprovingId(null);
      setRejectingId(null);
    },
  });

  const triggerTikTokMutation = trpc.advertising.triggerTikTokPost.useMutation({
    onSuccess: () => {
      toast.success("TikTok post triggered successfully");
      utils.advertising.getTikTokStats.invalidate();
    },
    onError: (err) => toast.error(err.message || "TikTok post failed"),
  });

  const generateVideoMutation = trpc.advertising.generateAdVideo.useMutation({
    onSuccess: (result) => {
      toast.success("Ad video generated successfully");
      if ((result as any).videoUrl) {
        window.open((result as any).videoUrl, "_blank");
      }
    },
    onError: (err) => toast.error(err.message || "Video generation failed"),
  });

  // ─── Access Guard ─────────────────────────────────────────────────────────
  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Card className="border-border/50 bg-card/80 max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
              <Shield className="w-6 h-6 text-red-500" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Admin privileges required to access the Advertising Dashboard.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const dashboard = dashboardQuery.data;
  const performance = performanceQuery.data;
  const tiktok = tiktokStatsQuery.data;
  const strategies = strategiesQuery.data;
  const isRunning = runCycleMutation.isPending;

  const handleApprove = (id: number) => {
    setApprovingId(id);
    updateStatusMutation.mutate({ id, status: "approved" });
  };

  const handleReject = (id: number) => {
    setRejectingId(id);
    updateStatusMutation.mutate({ id, status: "rejected" });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-amber-400" />
            Advertising Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Autonomous ad generation, distribution, and performance tracking for VirÉlle Studios
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => runCycleMutation.mutate()}
            disabled={isRunning}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isRunning ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" />Run Ad Cycle</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              utils.advertising.getDashboard.invalidate();
              utils.advertising.getPerformance.invalidate();
            }}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ─── KPI Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<BarChart3 className="w-4 h-4" />}
          label="Total Impressions"
          value={performance?.totalImpressions?.toLocaleString() ?? dashboard?.performance?.impressions?.toLocaleString() ?? "—"}
          sub="Last 30 days"
          color="text-amber-400"
        />
        <MetricCard
          icon={<MousePointer className="w-4 h-4" />}
          label="Total Clicks"
          value={performance?.totalClicks?.toLocaleString() ?? dashboard?.performance?.clicks?.toLocaleString() ?? "—"}
          sub={`CTR: ${performance?.ctr ?? dashboard?.performance?.ctr ?? "—"}`}
          color="text-blue-400"
        />
        <MetricCard
          icon={<Activity className="w-4 h-4" />}
          label="Engagements"
          value={performance?.totalEngagements?.toLocaleString() ?? "—"}
          sub={`Rate: ${performance?.engagementRate ?? "—"}`}
          color="text-purple-400"
        />
        <MetricCard
          icon={<Film className="w-4 h-4" />}
          label="Content Queue"
          value={`${dashboard?.contentQueue?.draft ?? 0} draft / ${dashboard?.contentQueue?.approved ?? 0} approved`}
          sub={`${dashboard?.contentQueue?.published ?? 0} published`}
          color="text-emerald-400"
        />
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queue">Content Queue</TabsTrigger>
          <TabsTrigger value="tiktok">TikTok</TabsTrigger>
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ──────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Platform Performance */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  Platform Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {performance?.organic?.contentByPlatform && Object.entries(performance.organic.contentByPlatform).length > 0 ? (
                  Object.entries(performance.organic.contentByPlatform).map(([platform, data]: [string, any]) => {
                    const meta = PLATFORM_META[platform] || { label: platform, color: "text-zinc-400", icon: <Share2 className="w-4 h-4" /> };
                    const maxImpressions = Math.max(...Object.values(performance.organic.contentByPlatform).map((d: any) => (typeof d === 'number' ? d : d.impressions) || 0), 1);
                    const pct = Math.round(((typeof data === 'number' ? data : data.impressions || 0) / maxImpressions) * 100);
                    return (
                      <div key={platform}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={meta.color}>{meta.icon}</span>
                            <span className="text-sm">{meta.label}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{(data.impressions || 0).toLocaleString()} impr.</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No performance data yet. Run an ad cycle to generate content.</p>
                )}
              </CardContent>
            </Card>

            {/* Autonomous Status */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Autonomous Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Draft", value: dashboard?.contentQueue?.draft ?? 0, color: "text-zinc-400" },
                    { label: "Approved", value: dashboard?.contentQueue?.approved ?? 0, color: "text-green-400" },
                    { label: "Published", value: dashboard?.contentQueue?.published ?? 0, color: "text-emerald-400" },
                    { label: "Rejected", value: dashboard?.contentQueue?.rejected ?? 0, color: "text-red-400" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-background/50 rounded-lg p-3 text-center">
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30"
                  variant="outline"
                  onClick={() => runCycleMutation.mutate()}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating content...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />Generate New Ad Content</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Summary */}
          {activityQuery.data && activityQuery.data.length > 0 && (
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activityQuery.data.slice(0, 5).map((item: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                      <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm">{item.description || item.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Content Queue Tab ─────────────────────────────────────────── */}
        <TabsContent value="queue" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-amber-400" />
              <span className="font-medium">Content Queue</span>
              <Badge variant="outline" className="border-zinc-500/50 text-zinc-400">
                {contentQueueQuery.data?.total ?? 0} items
              </Badge>
            </div>
            <Select value={queueFilter} onValueChange={(v) => setQueueFilter(v as any)}>
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {contentQueueQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            </div>
          ) : contentQueueQuery.data?.items?.length === 0 ? (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="py-12 text-center">
                <Film className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No {queueFilter === "all" ? "" : queueFilter} content in queue</p>
                <Button
                  className="mt-4 bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => runCycleMutation.mutate()}
                  disabled={isRunning}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Content
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {contentQueueQuery.data?.items?.map((item: any) => (
                <ContentQueueItem
                  key={item.id}
                  item={item}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isApproving={approvingId === item.id && updateStatusMutation.isPending}
                  isRejecting={rejectingId === item.id && updateStatusMutation.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── TikTok Tab ────────────────────────────────────────────────── */}
        <TabsContent value="tiktok" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TikTok Status */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Video className="w-4 h-4 text-pink-400" />
                  TikTok Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    variant="outline"
                    className={tiktok?.isConfigured
                      ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                      : "border-red-500/50 text-red-400 bg-red-500/10"
                    }
                  >
                    {tiktok?.isConfigured ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1" />Connected</>
                    ) : (
                      <><XCircle className="w-3 h-3 mr-1" />Not Configured</>
                    )}
                  </Badge>
                </div>
                {tiktok?.creatorInfo && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Account</span>
                      <span className="text-sm font-medium">@{tiktok.creatorInfo.creatorNickname || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Followers</span>
                      <span className="text-sm font-medium">{(tiktok.creatorInfo as any).followerCount?.toLocaleString() ?? "—"}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Posts</span>
                  <span className="text-sm font-medium">{tiktok?.totalPosts ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Views</span>
                  <span className="text-sm font-medium">{(tiktok as any)?.totalViews?.toLocaleString() ?? 0}</span>
                </div>
                <Button
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white"
                  onClick={() => triggerTikTokMutation.mutate()}
                  disabled={triggerTikTokMutation.isPending || !tiktok?.isConfigured}
                >
                  {triggerTikTokMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Posting...</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" />Post to TikTok Now</>
                  )}
                </Button>
                {!tiktok?.isConfigured && (
                  <p className="text-xs text-muted-foreground text-center">
                    Configure TikTok API credentials in environment variables to enable posting.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Generate Ad Video */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Generate Ad Video
                </CardTitle>
                <CardDescription>Create a cinematic AI video ad for VirÉlle Studios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {[
                    { topic: "AI filmmaking revolution 2026", label: "AI Revolution" },
                    { topic: "Cinematic scene generation with VirÉlle", label: "Scene Generation" },
                    { topic: "From script to screen in minutes with AI", label: "Script to Screen" },
                    { topic: "Hollywood quality films without a Hollywood budget", label: "Hollywood Quality" },
                  ].map(({ topic, label }) => (
                    <Button
                      key={topic}
                      variant="outline"
                      className="w-full justify-start border-border/50 hover:bg-amber-500/10 hover:border-amber-500/30 text-sm h-9"
                      onClick={() => generateVideoMutation.mutate({ topic, cta: "Try VirÉlle Studios free" })}
                      disabled={generateVideoMutation.isPending}
                    >
                      {generateVideoMutation.isPending ? (
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      ) : (
                        <Video className="w-3 h-3 mr-2 text-amber-400" />
                      )}
                      {label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent TikTok Posts */}
          {tiktok?.recentPosts && tiktok.recentPosts.length > 0 && (
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent TikTok Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tiktok.recentPosts.slice(0, 5).map((post: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{post.caption || post.description || "TikTok post"}</p>
                        <p className="text-xs text-muted-foreground">{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "—"}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.viewCount?.toLocaleString() ?? 0}</span>
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.likeCount?.toLocaleString() ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Strategy Tab ──────────────────────────────────────────────── */}
        <TabsContent value="strategy" className="space-y-4 mt-4">
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                Platform Strategy Overview
              </CardTitle>
              <CardDescription>
                Autonomous advertising strategy for VirÉlle Studios across all channels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {strategiesQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                </div>
              ) : strategies && strategies.length > 0 ? (
                <div className="space-y-3">
                  {strategies.map((strategy: any, i: number) => {
                    const meta = PLATFORM_META[strategy.platform] || { label: strategy.platform, color: "text-zinc-400", icon: <Share2 className="w-4 h-4" /> };
                    return (
                      <div key={i} className="border border-border/50 rounded-lg p-4 bg-background/30">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={meta.color}>{meta.icon}</span>
                          <span className="font-medium text-sm">{meta.label}</span>
                          {strategy.priority && (
                            <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">
                              Priority {strategy.priority}
                            </Badge>
                          )}
                        </div>
                        {strategy.objective && (
                          <p className="text-xs text-muted-foreground mb-1">
                            <span className="text-foreground/70">Objective:</span> {strategy.objective}
                          </p>
                        )}
                        {strategy.contentTypes && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(Array.isArray(strategy.contentTypes) ? strategy.contentTypes : [strategy.contentTypes]).map((ct: string) => (
                              <span key={ct} className="text-xs bg-zinc-800/50 text-zinc-400 px-2 py-0.5 rounded">{ct}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Strategy data will appear after running an ad cycle.</p>
                  <Button
                    className="mt-4 bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => runCycleMutation.mutate()}
                    disabled={isRunning}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Run Ad Cycle
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Strategy Overview from Advertising Orchestrator */}
          {dashboard?.strategy && (
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Current Campaign Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(dashboard.strategy).map(([key, value]: [string, any]) => (
                    <div key={key} className="bg-background/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground capitalize mb-1">{key.replace(/_/g, " ")}</p>
                      <p className="text-sm font-medium">{typeof value === "object" ? JSON.stringify(value) : String(value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Activity Tab ──────────────────────────────────────────────── */}
        <TabsContent value="activity" className="space-y-4 mt-4">
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                Advertising Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                </div>
              ) : activityQuery.data && activityQuery.data.length > 0 ? (
                <div className="space-y-2">
                  {activityQuery.data.map((item: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 py-3 border-b border-border/30 last:border-0">
                      <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.action?.replace(/_/g, " ") || "Activity"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        {item.metadata && Object.keys(item.metadata).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {Object.entries(item.metadata).slice(0, 4).map(([k, v]) => (
                              <span key={k} className="text-xs text-zinc-500">
                                {k}: <span className="text-zinc-400">{String(v)}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No activity yet. Run an ad cycle to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Missing import ────────────────────────────────────────────────────────
function Heart({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
    </svg>
  );
}
