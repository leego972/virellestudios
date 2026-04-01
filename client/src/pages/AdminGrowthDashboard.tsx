import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  BarChart3, Film, Users, TrendingUp, Star, Eye, Play, Share2,
  CheckCircle2, XCircle, Clock, AlertTriangle, Loader2, Megaphone,
  Shield, Zap, RefreshCw,
} from "lucide-react";

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-400">{label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
          <Icon className="w-8 h-8 opacity-30" style={{ color }} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Submission Review Panel ──────────────────────────────────────────────────
function SubmissionsPanel() {
  const utils = trpc.useUtils();
  const { data: pending, isLoading } = trpc.submissions.listPending.useQuery();
  const reviewMutation = trpc.submissions.review.useMutation({
    onSuccess: () => {
      utils.submissions.listPending.invalidate();
      toast.success("Submission reviewed");
    },
    onError: (err) => toast.error(err.message || "Failed to review submission"),
  });

  if (isLoading) return <div className="flex items-center gap-2 text-neutral-400 py-8"><Loader2 className="w-4 h-4 animate-spin" /> Loading submissions...</div>;

  if (!pending?.length) return (
    <div className="text-center py-12 text-neutral-500">
      <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p>No pending submissions</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {pending.map((sub: any) => (
        <Card key={sub.id} className="bg-neutral-900 border-neutral-800">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{sub.projectTitle || `Project #${sub.projectId}`}</p>
                <p className="text-sm text-neutral-400 mt-0.5">{sub.creatorName} · {sub.creatorEmail}</p>
                {sub.genre && <Badge variant="outline" className="mt-1 text-xs border-neutral-700 text-neutral-400">{sub.genre}</Badge>}
                <p className="text-xs text-neutral-500 mt-1">Submitted {new Date(sub.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-500 text-white"
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate({ submissionId: sub.id, status: "featured" })}
                >
                  <Star className="w-3 h-3 mr-1" /> Feature
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-700 text-green-400 hover:bg-green-900/20"
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate({ submissionId: sub.id, status: "approved" })}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-800 text-red-400 hover:bg-red-900/20"
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate({ submissionId: sub.id, status: "declined" })}
                >
                  <XCircle className="w-3 h-3 mr-1" /> Decline
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Abuse Flags Panel ────────────────────────────────────────────────────────
function AbuseFlagsPanel() {
  const utils = trpc.useUtils();
  const { data: flags, isLoading } = trpc.abuse.listPending.useQuery();
  const actionMutation = trpc.abuse.action.useMutation({
    onSuccess: () => {
      utils.abuse.listPending.invalidate();
      toast.success("Flag actioned");
    },
    onError: (err) => toast.error(err.message || "Failed to action flag"),
  });

  if (isLoading) return <div className="flex items-center gap-2 text-neutral-400 py-8"><Loader2 className="w-4 h-4 animate-spin" /> Loading flags...</div>;

  if (!flags?.length) return (
    <div className="text-center py-12 text-neutral-500">
      <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p>No pending abuse flags</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {flags.map((flag: any) => (
        <Card key={flag.id} className="bg-neutral-900 border-neutral-800">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-red-800 text-red-400">{flag.entityType}</Badge>
                  <span className="text-sm text-neutral-300">#{flag.entityId}</span>
                </div>
                <p className="text-sm text-neutral-300 mt-1">{flag.reason}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Reported by {flag.reporterName || "Anonymous"} · {new Date(flag.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-800 text-red-400 hover:bg-red-900/20"
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate({ flagId: flag.id, status: "actioned" })}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" /> Action
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-neutral-700 text-neutral-400 hover:bg-neutral-800"
                  disabled={actionMutation.isPending}
                  onClick={() => actionMutation.mutate({ flagId: flag.id, status: "dismissed" })}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Showcase Curation Panel ──────────────────────────────────────────────────
function ShowcaseCurationPanel() {
  const utils = trpc.useUtils();
  const { data: topFilms, isLoading } = trpc.conversion.getTopFilms.useQuery({ limit: 20 });
  const setHeroMutation = trpc.showcase.setHero.useMutation({
    onSuccess: () => {
      utils.conversion.getTopFilms.invalidate();
      toast.success("Homepage hero updated");
    },
    onError: (err) => toast.error(err.message || "Failed to set hero"),
  });
  const setCurationMutation = trpc.analytics.setCurationFlag.useMutation({
    onSuccess: () => {
      utils.conversion.getTopFilms.invalidate();
      toast.success("Curation flag updated");
    },
    onError: (err) => toast.error(err.message || "Failed to update flag"),
  });
  const removeCurationMutation = trpc.analytics.removeCurationFlag.useMutation({
    onSuccess: () => {
      utils.conversion.getTopFilms.invalidate();
      toast.success("Flag removed");
    },
    onError: (err) => toast.error(err.message || "Failed to remove flag"),
  });

  if (isLoading) return <div className="flex items-center gap-2 text-neutral-400 py-8"><Loader2 className="w-4 h-4 animate-spin" /> Loading films...</div>;

  if (!topFilms?.length) return (
    <div className="text-center py-12 text-neutral-500">
      <Film className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p>No public films yet</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {topFilms.map((film: any) => (
        <Card key={film.id} className="bg-neutral-900 border-neutral-800">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {film.thumbnailUrl && (
                <img src={film.thumbnailUrl} alt={film.title} className="w-24 h-14 object-cover rounded" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{film.title || `Film #${film.id}`}</p>
                <p className="text-sm text-neutral-400">{film.creatorName}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{film.viewCount}</span>
                  <span className="flex items-center gap-1"><Play className="w-3 h-3" />{film.playCount}</span>
                  <span className="flex items-center gap-1"><Share2 className="w-3 h-3" />{film.shareCount}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs"
                  disabled={setHeroMutation.isPending}
                  onClick={() => setHeroMutation.mutate({ filmPageId: film.id })}
                >
                  <Star className="w-3 h-3 mr-1" /> Set Hero
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-700 text-blue-400 hover:bg-blue-900/20 text-xs"
                  disabled={setCurationMutation.isPending}
                  onClick={() => setCurationMutation.mutate({ entityType: "project", entityId: film.projectId ?? film.id, flagType: "staff_pick" })}
                >
                  Staff Pick
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-800 text-red-400 hover:bg-red-900/20 text-xs"
                  disabled={removeCurationMutation.isPending}
                  onClick={() => removeCurationMutation.mutate({ entityType: "project", entityId: film.projectId ?? film.id, flagType: "featured" })}
                >
                  Remove Flag
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Conversion Funnel Panel ──────────────────────────────────────────────────
function ConversionFunnelPanel() {
  const { data: funnel, isLoading } = trpc.conversion.getFunnelStats.useQuery({ days: 30 });
  const { data: topCreators } = trpc.conversion.getTopCreators.useQuery({ limit: 10 });

  const eventLabels: Record<string, string> = {
    showcase_to_film: "Showcase → Film Page",
    view_to_watch: "Film Page → Watch",
    watch_to_profile: "Watch → Creator Profile",
    profile_to_signup: "Profile → Sign Up",
    film_to_create: "Film Page → Create Account",
  };

  if (isLoading) return <div className="flex items-center gap-2 text-neutral-400 py-8"><Loader2 className="w-4 h-4 animate-spin" /> Loading funnel data...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-neutral-300 mb-3">Conversion Funnel (Last 30 Days)</h3>
        {!funnel ? (
          <p className="text-neutral-500 text-sm">No conversion data yet. Events will appear as users navigate public pages.</p>
        ) : (
          <div className="space-y-2">
            {([
              { label: "Page Views", value: funnel.views },
              { label: "Video Plays", value: funnel.plays },
              { label: "Share Clicks", value: funnel.shares },
              { label: "Signup CTA Clicks", value: funnel.signupClicks },
              { label: "New Registrations", value: funnel.newUsers },
            ] as { label: string; value: number }[]).map((row) => {
              const maxVal = Math.max(funnel.views, funnel.plays, funnel.shares, funnel.signupClicks, funnel.newUsers, 1);
              return (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-sm text-neutral-400 w-52 shrink-0">{row.label}</span>
                  <div className="flex-1 bg-neutral-800 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, (row.value / maxVal) * 100)}%`,
                        background: "linear-gradient(90deg, #d4af37, #f5e6a3)",
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-white w-12 text-right">{row.value}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-neutral-300 mb-3">Top Creators by Views</h3>
        {!topCreators?.length ? (
          <p className="text-neutral-500 text-sm">No creator data yet.</p>
        ) : (
          <div className="space-y-2">
            {topCreators.map((creator: any, i: number) => (
              <div key={creator.id} className="flex items-center gap-3 py-1.5 border-b border-neutral-800 last:border-0">
                <span className="text-neutral-500 text-sm w-5">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{creator.displayName}</p>
                  <p className="text-xs text-neutral-500">{creator.filmCount} films</p>
                </div>
                <div className="flex items-center gap-1 text-sm text-neutral-300">
                  <Eye className="w-3 h-3" /> {creator.totalViews}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminGrowthDashboard() {
  const { user } = useAuth();

  if (!user || (user as any).role !== "admin") {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center text-neutral-400">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Admin access required</p>
        </div>
      </div>
    );
  }

  const { data: topFilms } = trpc.conversion.getTopFilms.useQuery({ limit: 5 });
  const { data: topCreators } = trpc.conversion.getTopCreators.useQuery({ limit: 5 });
  const { data: pending } = trpc.submissions.listPending.useQuery();
  const { data: abuseFlags } = trpc.abuse.listPending.useQuery();

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-6 h-6" style={{ color: "#d4af37" }} />
            <h1 className="text-2xl font-bold">Growth Dashboard</h1>
          </div>
          <p className="text-neutral-400 text-sm">Showcase curation, submission review, abuse moderation, and conversion analytics.</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Public Films" value={topFilms?.length ?? "—"} icon={Film} color="#d4af37" />
          <StatCard label="Public Creators" value={topCreators?.length ?? "—"} icon={Users} color="#60a5fa" />
          <StatCard label="Pending Submissions" value={pending?.length ?? 0} icon={Clock} color="#f59e0b" />
          <StatCard label="Abuse Flags" value={abuseFlags?.length ?? 0} icon={AlertTriangle} color="#ef4444" />
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="showcase">
          <TabsList className="bg-neutral-900 border border-neutral-800 mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="showcase" className="data-[state=active]:bg-neutral-700 text-xs sm:text-sm">
              <Star className="w-3.5 h-3.5 mr-1.5" /> Showcase Curation
            </TabsTrigger>
            <TabsTrigger value="submissions" className="data-[state=active]:bg-neutral-700 text-xs sm:text-sm">
              <Megaphone className="w-3.5 h-3.5 mr-1.5" /> Submissions
              {(pending?.length ?? 0) > 0 && (
                <Badge className="ml-1.5 bg-amber-600 text-white text-[10px] px-1.5 py-0">{pending!.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="abuse" className="data-[state=active]:bg-neutral-700 text-xs sm:text-sm">
              <Shield className="w-3.5 h-3.5 mr-1.5" /> Abuse Flags
              {(abuseFlags?.length ?? 0) > 0 && (
                <Badge className="ml-1.5 bg-red-600 text-white text-[10px] px-1.5 py-0">{abuseFlags!.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="funnel" className="data-[state=active]:bg-neutral-700 text-xs sm:text-sm">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Conversion Funnel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="showcase">
            <ShowcaseCurationPanel />
          </TabsContent>
          <TabsContent value="submissions">
            <SubmissionsPanel />
          </TabsContent>
          <TabsContent value="abuse">
            <AbuseFlagsPanel />
          </TabsContent>
          <TabsContent value="funnel">
            <ConversionFunnelPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
