/**
 * SEO Dashboard — VirÉlle Studios
 *
 * Full-featured SEO management interface:
 *  - Live SEO health score and keyword rankings
 *  - Meta tag optimisation controls
 *  - Structured data and Open Graph management
 *  - IndexNow submission
 *  - Web vitals monitoring
 *  - Internal link analysis
 *  - SEO event log
 *  - Kill switch for emergency SEO disabling
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2, Shield, RefreshCw, Search, TrendingUp, BarChart3,
  Globe, Link, FileText, CheckCircle2, XCircle, AlertCircle,
  Zap, Activity, Eye, Target, Settings, AlertTriangle,
  ExternalLink, Copy, Hash, BookOpen, Clock,
} from "lucide-react";

// ─── Score Ring ────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#27272a" strokeWidth={6} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={6} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <span className="absolute text-lg font-bold" style={{ color }}>{score}</span>
    </div>
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

// ─── Keyword Row ───────────────────────────────────────────────────────────
function KeywordRow({ keyword }: { keyword: any }) {
  const difficultyColor = keyword.difficulty <= 30 ? "text-emerald-400" : keyword.difficulty <= 60 ? "text-yellow-400" : "text-red-400";
  const volumeColor = keyword.searchVolume >= 1000 ? "text-emerald-400" : keyword.searchVolume >= 100 ? "text-yellow-400" : "text-zinc-400";

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{keyword.keyword}</p>
        {keyword.intent && (
          <span className="text-xs text-muted-foreground">{keyword.intent}</span>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs flex-shrink-0">
        <div className="text-right">
          <p className={volumeColor}>{keyword.searchVolume?.toLocaleString() ?? "—"}</p>
          <p className="text-muted-foreground">vol/mo</p>
        </div>
        <div className="text-right">
          <p className={difficultyColor}>{keyword.difficulty ?? "—"}/100</p>
          <p className="text-muted-foreground">difficulty</p>
        </div>
        {keyword.currentRank && (
          <div className="text-right">
            <p className="text-blue-400">#{keyword.currentRank}</p>
            <p className="text-muted-foreground">rank</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function SeoDashboard() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState("overview");
  const [killSwitchEnabled, setKillSwitchEnabled] = useState(false);

  // ─── Queries ─────────────────────────────────────────────────────────────
  const healthQuery = trpc.seo.getHealthScore.useQuery(undefined, { refetchInterval: 30000 });
  const keywordsQuery = trpc.seo.getKeywords.useQuery();
  const metaQuery = trpc.seo.getMetaOptimizations.useQuery();
  const reportQuery = trpc.seo.getReport.useQuery();
  const structuredDataQuery = trpc.seo.getStructuredData.useQuery();
  const openGraphQuery = trpc.seo.getOpenGraphTags.useQuery({ path: "/" });
  const publicPagesQuery = trpc.seo.getPublicPages.useQuery();
  const internalLinksQuery = trpc.seo.getInternalLinks.useQuery();
  const webVitalsQuery = trpc.seo.getWebVitals.useQuery();
  const eventLogQuery = trpc.seo.getEventLog.useQuery({ limit: 30 });
  const statusQuery = trpc.seo.getStatus.useQuery();

  // ─── Mutations ────────────────────────────────────────────────────────────
  const runOptimizationMutation = trpc.seo.runOptimization.useMutation({
    onSuccess: () => {
      toast.success("SEO optimisation complete — all meta tags, structured data, and sitemaps updated");
      utils.seo.getHealthScore.invalidate();
      utils.seo.getReport.invalidate();
      utils.seo.getMetaOptimizations.invalidate();
      utils.seo.getEventLog.invalidate();
    },
    onError: (err) => toast.error(err.message || "SEO optimisation failed"),
  });

  const submitIndexNowMutation = trpc.seo.submitIndexNow.useMutation({
    onSuccess: (result) => {
      toast.success(`IndexNow submitted — ${(result as any).urlsSubmitted ?? 0} URLs sent to search engines`);
    },
    onError: (err) => toast.error(err.message || "IndexNow submission failed"),
  });

  const killSwitchMutation = trpc.seo.killSwitch.useMutation({
    onSuccess: (result) => {
      if ((result as any).killed) {
        toast.warning("SEO kill switch activated — all SEO features disabled");
        setKillSwitchEnabled(true);
      } else {
        toast.success("SEO kill switch deactivated — SEO features restored");
        setKillSwitchEnabled(false);
      }
      utils.seo.getStatus.invalidate();
    },
    onError: (err) => toast.error(err.message || "Kill switch operation failed"),
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
            <CardDescription>Admin privileges required to access the SEO Dashboard.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const health = healthQuery.data;
  const report = reportQuery.data;
  const status = statusQuery.data;
  const isKilled = status?.isKilled || killSwitchEnabled;
  const isRunning = runOptimizationMutation.isPending;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Search className="w-6 h-6 text-amber-400" />
            SEO Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Autonomous SEO optimisation, keyword tracking, and search visibility for VirÉlle Studios
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isKilled && (
            <Badge variant="outline" className="border-red-500/50 text-red-400 bg-red-500/10">
              <AlertTriangle className="w-3 h-3 mr-1" />
              SEO Disabled
            </Badge>
          )}
          <Button
            onClick={() => runOptimizationMutation.mutate()}
            disabled={isRunning || isKilled}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isRunning ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Optimising...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" />Run SEO Optimisation</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              utils.seo.getHealthScore.invalidate();
              utils.seo.getReport.invalidate();
              utils.seo.getKeywords.invalidate();
            }}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ─── KPI Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Health Score */}
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4 flex items-center gap-4">
            <ScoreRing score={health?.overall ?? (report?.score as any)?.overall ?? 0} />
            <div>
              <p className="text-xs text-muted-foreground">SEO Health</p>
              <p className="text-sm font-medium mt-0.5">
                {((health?.overall ?? (report?.score as any)?.overall ?? 0)) >= 80 ? "Excellent" :
                 ((health?.overall ?? (report?.score as any)?.overall ?? 0)) >= 60 ? "Good" :
                 ((health?.overall ?? (report?.score as any)?.overall ?? 0)) >= 40 ? "Needs Work" : "Poor"}
              </p>
            </div>
          </CardContent>
        </Card>

        <MetricCard
          icon={<Hash className="w-4 h-4" />}
          label="Keywords Tracked"
          value={(keywordsQuery.data as any)?.primaryKeywords?.length ?? 0}
          sub={`${(keywordsQuery.data as any)?.primaryKeywords?.filter((k: any) => k.currentRank && k.currentRank <= 10).length ?? 0} in top 10`}
          color="text-blue-400"
        />
        <MetricCard
          icon={<Globe className="w-4 h-4" />}
          label="Indexed Pages"
          value={publicPagesQuery.data?.length ?? 0}
          sub="Public pages"
          color="text-green-400"
        />
        <MetricCard
          icon={<Link className="w-4 h-4" />}
          label="Internal Links"
          value={(internalLinksQuery.data as any)?.totalInternalLinks ?? 0}
          sub="Link graph entries"
          color="text-purple-400"
        />
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ──────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SEO Report Summary */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  SEO Report Summary
                </CardTitle>
                {report?.generatedAt && (
                  <CardDescription>
                    Last updated: {new Date(report.generatedAt).toLocaleString()}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {report ? (
                  <>
                    {(report?.score as any)?.categories && Object.entries((report?.score as any)?.categories).map(([cat, data]: [string, any]) => (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm capitalize">{cat.replace(/_/g, " ")}</span>
                          <span className={`text-sm font-medium ${data.score >= 80 ? "text-emerald-400" : data.score >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                            {data.score}/100
                          </span>
                        </div>
                        <Progress value={data.score} className="h-1.5" />
                      </div>
                    ))}
                    {(report?.score as any)?.issues && (report?.score as any)?.issues.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <p className="text-xs text-muted-foreground mb-2">Issues to Address</p>
                        {(report?.score as any)?.issues.slice(0, 3).map((issue: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs mb-1">
                            <AlertCircle className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                            <span className="text-foreground/70">{issue.message || issue}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No SEO report yet.</p>
                    <Button
                      className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={() => runOptimizationMutation.mutate()}
                      disabled={isRunning}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Web Vitals */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  Core Web Vitals
                </CardTitle>
                <CardDescription>Google's page experience signals</CardDescription>
              </CardHeader>
              <CardContent>
                {webVitalsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  </div>
                ) : webVitalsQuery.data ? (
                  <div className="space-y-3">
                    {Object.entries(webVitalsQuery.data).map(([metric, data]: [string, any]) => {
                      const score = typeof data === "object" ? data.score : data;
                      const value = typeof data === "object" ? data.value : null;
                      const rating = typeof data === "object" ? data.rating : null;
                      const color = rating === "good" || score >= 90 ? "text-emerald-400" :
                                    rating === "needs-improvement" || score >= 50 ? "text-yellow-400" : "text-red-400";
                      return (
                        <div key={metric}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm uppercase text-muted-foreground">{metric}</span>
                            <div className="flex items-center gap-2">
                              {value && <span className="text-xs text-muted-foreground">{value}</span>}
                              <span className={`text-sm font-medium ${color}`}>
                                {rating || (score >= 90 ? "Good" : score >= 50 ? "Needs Work" : "Poor")}
                              </span>
                            </div>
                          </div>
                          <Progress value={typeof score === "number" ? score : 50} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Web vitals data unavailable</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="border-border/50 hover:bg-amber-500/10 hover:border-amber-500/30 h-auto py-3 flex-col gap-2"
                  onClick={() => runOptimizationMutation.mutate()}
                  disabled={isRunning || isKilled}
                >
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span className="text-xs">Run Full Optimisation</span>
                </Button>
                <Button
                  variant="outline"
                  className="border-border/50 hover:bg-blue-500/10 hover:border-blue-500/30 h-auto py-3 flex-col gap-2"
                  onClick={() => submitIndexNowMutation.mutate({ urls: [] })}
                  disabled={submitIndexNowMutation.isPending}
                >
                  {submitIndexNowMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                  ) : (
                    <Globe className="w-5 h-5 text-blue-400" />
                  )}
                  <span className="text-xs">Submit IndexNow</span>
                </Button>
                <Button
                  variant="outline"
                  className="border-border/50 hover:bg-green-500/10 hover:border-green-500/30 h-auto py-3 flex-col gap-2"
                  onClick={() => {
                    utils.seo.getHealthScore.invalidate();
                    utils.seo.getReport.invalidate();
                    utils.seo.getKeywords.invalidate();
                    utils.seo.getWebVitals.invalidate();
                    toast.success("SEO data refreshed");
                  }}
                >
                  <RefreshCw className="w-5 h-5 text-green-400" />
                  <span className="text-xs">Refresh All Data</span>
                </Button>
                <Button
                  variant="outline"
                  className="border-border/50 hover:bg-purple-500/10 hover:border-purple-500/30 h-auto py-3 flex-col gap-2"
                  onClick={() => setActiveTab("settings")}
                >
                  <Settings className="w-5 h-5 text-purple-400" />
                  <span className="text-xs">SEO Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Keywords Tab ──────────────────────────────────────────────── */}
        <TabsContent value="keywords" className="space-y-4 mt-4">
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Hash className="w-4 h-4 text-amber-400" />
                Keyword Rankings
              </CardTitle>
              <CardDescription>
                Target keywords for VirÉlle Studios — AI filmmaking and cinematic production
              </CardDescription>
            </CardHeader>
            <CardContent>
              {keywordsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                </div>
              ) : (keywordsQuery.data as any)?.primaryKeywords && (keywordsQuery.data as any)?.primaryKeywords.length > 0 ? (
                <div className="space-y-0">
                  {(keywordsQuery.data as any)?.primaryKeywords.map((keyword: any, i: number) => (
                    <KeywordRow key={i} keyword={keyword} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Hash className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No keyword data yet. Run SEO optimisation to generate keyword analysis.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meta Optimisations */}
          {metaQuery.data && metaQuery.data.length > 0 && (
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  Meta Tag Optimisations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metaQuery.data.slice(0, 10).map((meta: any, i: number) => (
                    <div key={i} className="border border-border/50 rounded-lg p-3 bg-background/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{meta.path || meta.url || "/"}</span>
                        <Badge
                          variant="outline"
                          className={meta.optimised
                            ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                            : "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                          }
                        >
                          {meta.optimised ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                          {meta.optimised ? "Optimised" : "Needs Update"}
                        </Badge>
                      </div>
                      {meta.title && (
                        <p className="text-xs text-muted-foreground">
                          <span className="text-foreground/60">Title:</span> {meta.title}
                        </p>
                      )}
                      {meta.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="text-foreground/60">Description:</span> {meta.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Technical Tab ─────────────────────────────────────────────── */}
        <TabsContent value="technical" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Structured Data */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  Structured Data (JSON-LD)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {structuredDataQuery.isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  </div>
                ) : structuredDataQuery.data ? (
                  <div className="space-y-2">
                    {Array.isArray(structuredDataQuery.data) ? (
                      structuredDataQuery.data.map((schema: any, i: number) => (
                        <div key={i} className="bg-background/50 rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-amber-400">{schema["@type"] || "Schema"}</span>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          </div>
                          {schema.name && <p className="text-xs text-muted-foreground">{schema.name}</p>}
                        </div>
                      ))
                    ) : (
                      <div className="bg-background/50 rounded p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-amber-400">
                            {(structuredDataQuery.data as any)["@type"] || "Schema"}
                          </span>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No structured data configured</p>
                )}
              </CardContent>
            </Card>

            {/* Open Graph */}
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-amber-400" />
                  Open Graph Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                {openGraphQuery.isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  </div>
                ) : openGraphQuery.data ? (
                  <div className="space-y-2">
                    {Object.entries(openGraphQuery.data).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex items-start gap-2 text-xs">
                        <span className="text-muted-foreground min-w-[80px] flex-shrink-0">{key}:</span>
                        <span className="text-foreground/80 break-all">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No Open Graph data</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Internal Links */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Link className="w-4 h-4 text-amber-400" />
                Internal Link Graph
              </CardTitle>
              <CardDescription>Internal linking structure for SEO authority flow</CardDescription>
            </CardHeader>
            <CardContent>
              {internalLinksQuery.isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                </div>
              ) : internalLinksQuery.data && (internalLinksQuery.data as any)?.suggestedLinks?.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(internalLinksQuery.data as any)?.suggestedLinks?.map((link: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-border/20 last:border-0">
                      <span className="text-blue-400 truncate flex-1">{link.from || link.source}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-emerald-400 truncate flex-1">{link.to || link.target}</span>
                      {link.anchorText && (
                        <span className="text-zinc-500 truncate max-w-[120px]">"{link.anchorText}"</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No internal link data available</p>
              )}
            </CardContent>
          </Card>

          {/* Public Pages */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-400" />
                Indexed Public Pages
              </CardTitle>
            </CardHeader>
            <CardContent>
              {publicPagesQuery.isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                </div>
              ) : publicPagesQuery.data && publicPagesQuery.data.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {publicPagesQuery.data.map((page: any, i: number) => (
                    <div key={i} className="bg-background/50 rounded p-2 text-xs">
                      <p className="text-blue-400 truncate">{page.path || page.url || page}</p>
                      {page.priority && (
                        <p className="text-muted-foreground mt-0.5">Priority: {page.priority}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No public pages configured</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Content Tab ───────────────────────────────────────────────── */}
        <TabsContent value="content" className="space-y-4 mt-4">
          {/* SEO Event Log */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                SEO Event Log
              </CardTitle>
              <CardDescription>History of SEO optimisation runs and events</CardDescription>
            </CardHeader>
            <CardContent>
              {eventLogQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                </div>
              ) : (keywordsQuery.data as any)?.primaryKeywords && (keywordsQuery.data as any)?.primaryKeywords.length > 0 ? (
                <div className="space-y-2">
                  {(eventLogQuery.data ?? []).map((event: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        event.type === "error" ? "bg-red-400" :
                        event.type === "warning" ? "bg-yellow-400" :
                        event.type === "success" ? "bg-emerald-400" : "bg-amber-400"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{event.message || event.description || event.action}</p>
                        {event.details && (
                          <p className="text-xs text-muted-foreground mt-0.5">{
                            typeof event.details === "object" ? JSON.stringify(event.details) : event.details
                          }</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {event.timestamp || event.createdAt
                          ? new Date(event.timestamp || event.createdAt).toLocaleString()
                          : "—"
                        }
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No SEO events yet. Run optimisation to start logging.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* IndexNow */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-400" />
                IndexNow — Instant Search Engine Notification
              </CardTitle>
              <CardDescription>
                Submit all VirÉlle pages to Bing, Yandex, and other IndexNow-compatible search engines instantly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-background/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p>IndexNow allows instant notification to search engines when content is updated. VirÉlle Studios uses this to ensure new film features, blog posts, and landing pages are indexed within hours rather than weeks.</p>
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => submitIndexNowMutation.mutate({ urls: [] })}
                disabled={submitIndexNowMutation.isPending}
              >
                {submitIndexNowMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
                ) : (
                  <><Globe className="w-4 h-4 mr-2" />Submit All Pages to IndexNow</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Settings Tab ──────────────────────────────────────────────── */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          {/* SEO Engine Status */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                SEO Engine Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {status && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Version</p>
                    <p className="text-sm font-medium">{status.version || "3.0"}</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Badge
                      variant="outline"
                      className={isKilled
                        ? "border-red-500/50 text-red-400 bg-red-500/10"
                        : "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                      }
                    >
                      {isKilled ? "Disabled" : "Active"}
                    </Badge>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Last Run</p>
                    <p className="text-sm font-medium">
                      {status.lastRun ? new Date(status.lastRun).toLocaleString() : "Never"}
                    </p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Cached Report</p>
                    <p className="text-sm font-medium">
                      {status.hasCachedReport
                        ? `${status.cachedReportAge ? Math.round(status.cachedReportAge / 60) + "m old" : "Available"}`
                        : "None"
                      }
                    </p>
                  </div>
                </div>
              )}

              {status?.features && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Active Features</p>
                  <div className="flex flex-wrap gap-2">
                    {status.features.map((feature: string) => (
                      <Badge key={feature} variant="outline" className="border-amber-500/30 text-amber-400 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Kill Switch */}
          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                Emergency Kill Switch
              </CardTitle>
              <CardDescription>
                Immediately disable all SEO features. Use only in emergency situations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">SEO Engine</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isKilled ? "SEO is currently DISABLED" : "SEO is currently ACTIVE"}
                  </p>
                </div>
                <Switch
                  checked={!isKilled}
                  onCheckedChange={(checked) => {
                    killSwitchMutation.mutate({ action: checked ? "activate" : "deactivate" });
                  }}
                  disabled={killSwitchMutation.isPending}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>
              {isKilled && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-xs text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" />
                    SEO is disabled. All meta tags, sitemaps, and structured data are inactive. Toggle above to re-enable.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Missing imports ───────────────────────────────────────────────────────
function Share2({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
