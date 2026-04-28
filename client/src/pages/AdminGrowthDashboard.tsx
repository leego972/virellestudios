/**
   * AdminGrowthDashboard — Virelle Studios Zero-Budget Growth Engine v1
   *
   * Tabs: Overview | Campaigns | Assets | Audiences | Analytics | Report
   * Routes: /admin/growth  +  /admin/growth/{campaigns,audiences,assets,analytics,report}
   */
  import { useState, useCallback } from "react";
  import { trpc } from "@/lib/trpc";
  import { toast } from "sonner";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Badge } from "@/components/ui/badge";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Textarea } from "@/components/ui/textarea";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import {
    Megaphone, Users, Star, Clock, Activity, TrendingUp, CheckCircle2, XCircle,
    Globe, Mail, Calendar, RefreshCw, Download, Plus, Copy, Loader2, Zap,
    BarChart2, BookOpen, AlertCircle, ChevronRight, Eye, ExternalLink,
  } from "lucide-react";

  // ─── Constants ────────────────────────────────────────────────────────────────

  const SEGMENTS = [
    { value: "artists",        label: "Music Artists & Visual Artists" },
    { value: "filmmakers",     label: "Indie Filmmakers" },
    { value: "agencies",       label: "Creative Agencies" },
    { value: "small_business", label: "Small Businesses" },
    { value: "creators",       label: "Creators & YouTubers" },
    { value: "game_dev",       label: "Game Developers" },
  ];

  const CHANNELS = [
    "tiktok","youtube_shorts","instagram","x","linkedin",
    "reddit","product_hunt","indie_hackers","email","discord",
  ];

  const STATUS_COLORS: Record<string, string> = {
    draft:       "bg-neutral-700 text-neutral-300",
    active:      "bg-amber-900/60 text-amber-300",
    paused:      "bg-neutral-700 text-neutral-400",
    completed:   "bg-green-900/60 text-green-300",
    approved:    "bg-green-900/60 text-green-300",
    rejected:    "bg-red-900/60 text-red-400",
    published:   "bg-blue-900/60 text-blue-300",
    archived:    "bg-neutral-700 text-neutral-500",
    discovered:  "bg-neutral-700 text-neutral-300",
    reviewed:    "bg-sky-900/60 text-sky-300",
    queued:      "bg-amber-900/60 text-amber-300",
    engaged:     "bg-purple-900/60 text-purple-300",
    converted:   "bg-green-900/60 text-green-300",
  };

  const PLATFORM_LABELS: Record<string, string> = {
    tiktok:"TikTok", youtube_shorts:"YouTube Shorts", instagram:"Instagram",
    x:"X / Twitter", linkedin:"LinkedIn", reddit:"Reddit", email:"Email",
    product_hunt:"Product Hunt", indie_hackers:"Indie Hackers", discord:"Discord",
    blog:"Blog", landing_page:"Landing Page",
  };

  function statusBadge(status: string) {
    const cls = STATUS_COLORS[status] ?? "bg-neutral-700 text-neutral-400";
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{status}</span>;
  }

  // ─── Shared helpers ───────────────────────────────────────────────────────────

  function StatCard({ label, value, icon: Icon, color, sub }: {
    label: string; value: number | string; icon: any; color: string; sub?: string;
  }) {
    return (
      <Card className="bg-neutral-900 border-neutral-800">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-neutral-500 mb-1">{label}</p>
              <p className="text-2xl font-bold text-white">{value}</p>
              {sub && <p className="text-xs text-neutral-500 mt-0.5">{sub}</p>}
            </div>
            <Icon className="w-5 h-5 mt-0.5" style={{ color }} />
          </div>
        </CardContent>
      </Card>
    );
  }

  function WoWBadge({ pct }: { pct: number | null }) {
    if (pct === null) return null;
    const up = pct >= 0;
    return (
      <span className={`text-xs font-semibold ${up ? "text-green-400" : "text-red-400"}`}>
        {up ? "▲" : "▼"}{Math.abs(pct)}%
      </span>
    );
  }

  function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    };
    return (
      <Button size="sm" variant="outline" onClick={copy}
        className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs h-7">
        <Copy className="w-3 h-3 mr-1" />
        {copied ? "Copied!" : "Copy"}
      </Button>
    );
  }

  // ─── Overview Tab ─────────────────────────────────────────────────────────────

  function OverviewTab() {
    const { data, isLoading, refetch } = trpc.growth.getDashboard.useQuery();
    const { data: report } = trpc.growth.getWeeklyReport.useQuery();

    if (isLoading) return (
      <div className="flex items-center gap-2 text-neutral-400 py-12 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading dashboard...
      </div>
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Growth Overview</h2>
          <div className="flex items-center gap-2">
            <Badge className="bg-neutral-800 text-green-400 border-0 text-xs">$0 ad spend</Badge>
            <Button size="sm" variant="outline"
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              onClick={() => refetch()}>
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {/* Stats — Row 1: Asset pipeline */}
        <div>
          <p className="text-xs text-neutral-500 mb-2 font-medium uppercase tracking-wider">Content Pipeline</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Total Assets"     value={data?.assets ?? 0}          icon={Star}       color="#60a5fa" />
            <StatCard label="Draft / Review"   value={data?.draftAssets ?? 0}     icon={Clock}      color="#fbbf24" sub="need approval" />
            <StatCard label="Approved"         value={data?.approvedAssets ?? 0}  icon={CheckCircle2} color="#34d399" sub="ready to post" />
            <StatCard label="Published"        value={data?.publishedAssets ?? 0} icon={Globe}      color="#a78bfa" />
            <StatCard label="Campaigns"        value={data?.campaigns ?? 0}       icon={Megaphone}  color="#f59e0b" />
            <StatCard label="Audiences"        value={data?.audiences ?? 0}       icon={Users}      color="#fb923c" />
          </div>
        </div>

        {/* Stats — Row 2: Inbound signals */}
        <div>
          <p className="text-xs text-neutral-500 mb-2 font-medium uppercase tracking-wider">Inbound Signals (30d)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Page Views"       value={data?.events30d ?? 0}         icon={Eye}        color="#60a5fa" />
            <StatCard label="Email Captures"   value={data?.emailCaptures30d ?? 0}  icon={Mail}       color="#34d399" />
            <StatCard label="Demo Requests"    value={data?.demoRequests30d ?? 0}   icon={Zap}        color="#fbbf24" />
            <StatCard label="Signup Clicks"    value={data?.signupClicks30d ?? 0}   icon={TrendingUp} color="#f87171" />
            <StatCard label="Signups"          value={data?.signups30d ?? 0}        icon={CheckCircle2} color="#a78bfa" />
          </div>
        </div>

        {/* Best performers + recommended action */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs text-neutral-500 font-medium">Best Segment (30d)</p>
              {data?.bestSegment
                ? <p className="text-white font-semibold capitalize">{data.bestSegment.replace(/_/g, " ")}</p>
                : <p className="text-neutral-500 text-sm">No data yet</p>}
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs text-neutral-500 font-medium">Best Source (30d)</p>
              {data?.bestSource
                ? <p className="text-white font-semibold capitalize">{PLATFORM_LABELS[data.bestSource] ?? data.bestSource}</p>
                : <p className="text-neutral-500 text-sm">No data yet</p>}
            </CardContent>
          </Card>
          <Card className="bg-amber-900/20 border-amber-800/40">
            <CardContent className="p-4">
              <p className="text-xs text-amber-500 font-medium mb-1">Recommended Next Action</p>
              <p className="text-sm text-amber-100 leading-relaxed">
                {data?.recommendedAction ?? "Loading..."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Mini weekly report on overview */}
        {report && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-neutral-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" /> This Week
                  <span className="text-xs text-neutral-500 font-normal ml-auto">
                    {report.period.from} → {report.period.to}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Events", tw: report.events.thisWeek, wow: report.events.wow },
                  { label: "Signups", tw: report.signups.thisWeek, wow: report.signups.wow },
                  { label: "Email captures", tw: report.emailCaptures },
                  { label: "Demo requests", tw: report.demoRequests },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400">{row.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{row.tw}</span>
                      {'wow' in row && <WoWBadge pct={(row as any).wow} />}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm pt-1 border-t border-neutral-800">
                  <span className="text-neutral-400">Draft assets</span>
                  <span className="text-yellow-400 font-semibold">{report.assets.draft}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">Published</span>
                  <span className="text-blue-400 font-semibold">{report.assets.published}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-neutral-300 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-amber-500" /> Top Sources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.topSources.length === 0 && (
                  <p className="text-xs text-neutral-500">No events tracked yet — share landing pages to start.</p>
                )}
                {report.topSources.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400 capitalize">{PLATFORM_LABELS[s.source] ?? s.source ?? "direct"}</span>
                    <span className="text-white font-semibold">{Number(s.total)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ─── Campaigns Tab ────────────────────────────────────────────────────────────

  function CampaignsTab() {
    const utils = trpc.useUtils();
    const [showCreate, setShowCreate] = useState(false);
    const [selectedChannels, setSelectedChannels] = useState<string[]>(["tiktok","linkedin","instagram"]);
    const [form, setForm] = useState({
      name: "", segment: "", objective: "", offer: "", cta: "", startDate: "", endDate: "",
    });
    const [generatingId, setGeneratingId] = useState<number | null>(null);
    const [packDialog, setPackDialog] = useState<{ campaignId: number; name: string; objective: string; offer: string; cta: string; channels: string[] } | null>(null);
    const [packOverride, setPackOverride] = useState({ goal: "", offer: "", cta: "" });
    const [packChannels, setPackChannels] = useState<string[]>([]);

    const { data: campaigns, isLoading, refetch } = trpc.growth.listCampaigns.useQuery({});
    const createMutation = trpc.growth.createCampaign.useMutation({
      onSuccess: () => {
        utils.growth.listCampaigns.invalidate();
        utils.growth.getDashboard.invalidate();
        setShowCreate(false);
        setForm({ name: "", segment: "", objective: "", offer: "", cta: "", startDate: "", endDate: "" });
        setSelectedChannels(["tiktok","linkedin","instagram"]);
        toast.success("Campaign created");
      },
      onError: (e) => toast.error(e.message),
    });
    const generatePackMutation = trpc.growth.generateCampaignPack.useMutation({
      onSuccess: (d) => {
        utils.growth.listCampaigns.invalidate();
        utils.growth.listAssets.invalidate();
        utils.growth.getDashboard.invalidate();
        setGeneratingId(null);
        setPackDialog(null);
        toast.success(`Generated ${d.generated} draft content pieces — review in Assets tab`);
      },
      onError: (e) => { setGeneratingId(null); toast.error(e.message); },
    });

    const toggleChannel = (ch: string) =>
      setSelectedChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);

    const openPackDialog = (c: any) => {
      const ch = (c.channels as string[]) ?? ["tiktok","linkedin","instagram"];
      setPackDialog({ campaignId: c.id, name: c.name, objective: c.objective, offer: c.offer ?? "", cta: c.cta ?? "", channels: ch });
      setPackOverride({ goal: c.objective ?? "", offer: c.offer ?? "", cta: c.cta ?? "" });
      setPackChannels(ch);
    };

    const handleGenerate = () => {
      if (!packDialog) return;
      setGeneratingId(packDialog.campaignId);
      generatePackMutation.mutate({
        campaignId: packDialog.campaignId,
        goal:       packOverride.goal  || undefined,
        offer:      packOverride.offer || undefined,
        cta:        packOverride.cta   || undefined,
        platforms:  packChannels.length > 0 ? packChannels as any : undefined,
      });
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Campaigns</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800" onClick={() => refetch()}>
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white" onClick={() => setShowCreate(!showCreate)}>
              <Plus className="w-3 h-3 mr-1" /> New Campaign
            </Button>
          </div>
        </div>

        {/* Create campaign form */}
        {showCreate && (
          <Card className="bg-neutral-900 border-amber-800/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-amber-400">Create Campaign</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-neutral-400 text-xs mb-1 block">Campaign Name *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Artists Q3 Beta Launch" className="bg-neutral-800 border-neutral-700 text-white" />
                </div>
                <div>
                  <Label className="text-neutral-400 text-xs mb-1 block">Target Segment *</Label>
                  <Select value={form.segment} onValueChange={v => setForm({ ...form, segment: v })}>
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                      <SelectValue placeholder="Select segment" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      {SEGMENTS.map(s => (
                        <SelectItem key={s.value} value={s.value} className="text-neutral-200">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-neutral-400 text-xs mb-1 block">Campaign Goal / Objective *</Label>
                  <Input value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })}
                    placeholder="e.g. Awareness + beta signups among indie filmmakers" className="bg-neutral-800 border-neutral-700 text-white" />
                </div>
                <div>
                  <Label className="text-neutral-400 text-xs mb-1 block">Offer</Label>
                  <Input value={form.offer} onChange={e => setForm({ ...form, offer: e.target.value })}
                    placeholder="e.g. Free beta access, no credit card" className="bg-neutral-800 border-neutral-700 text-white" />
                </div>
                <div>
                  <Label className="text-neutral-400 text-xs mb-1 block">CTA</Label>
                  <Input value={form.cta} onChange={e => setForm({ ...form, cta: e.target.value })}
                    placeholder="e.g. Join the beta at virelle.life" className="bg-neutral-800 border-neutral-700 text-white" />
                </div>
              </div>
              <div>
                <Label className="text-neutral-400 text-xs mb-2 block">Target Platforms *</Label>
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map(ch => (
                    <button key={ch} onClick={() => toggleChannel(ch)}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                        selectedChannels.includes(ch)
                          ? "bg-amber-600 border-amber-500 text-white"
                          : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                      }`}>
                      {PLATFORM_LABELS[ch] ?? ch}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => createMutation.mutate({ name: form.name, segment: form.segment as any, objective: form.objective, offer: form.offer || undefined, cta: form.cta || undefined, channels: selectedChannels as any })}
                  disabled={!form.name || !form.segment || !form.objective || selectedChannels.length === 0 || createMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-500 text-white">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Create Campaign
                </Button>
                <Button variant="outline" className="border-neutral-700 text-neutral-300" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campaign list */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-neutral-400 py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : campaigns?.length === 0 ? (
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="py-12 text-center">
              <p className="text-neutral-500 mb-3">No campaigns yet.</p>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white" onClick={() => setShowCreate(true)}>
                <Plus className="w-3 h-3 mr-1" /> Create First Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(campaigns ?? []).map((c: any) => (
              <Card key={c.id} className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate">{c.name}</h3>
                        {statusBadge(c.status)}
                      </div>
                      <p className="text-sm text-neutral-400 mb-1">
                        <span className="capitalize">{c.segment?.replace(/_/g," ")}</span>
                        {c.objective && <> · {c.objective}</>}
                      </p>
                      {c.offer && <p className="text-xs text-neutral-500">Offer: {c.offer}</p>}
                      {c.cta   && <p className="text-xs text-neutral-500">CTA: {c.cta}</p>}
                      {c.channels && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(c.channels as string[]).map(ch => (
                            <span key={ch} className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded">
                              {PLATFORM_LABELS[ch] ?? ch}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-500 text-white shrink-0"
                      disabled={generatingId === c.id}
                      onClick={() => openPackDialog(c)}>
                      {generatingId === c.id
                        ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Generating...</>
                        : <><Zap className="w-3 h-3 mr-1" /> Generate Pack</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Generate Pack Dialog */}
        <Dialog open={!!packDialog} onOpenChange={open => !open && setPackDialog(null)}>
          <DialogContent className="bg-neutral-950 border-neutral-800 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-amber-400">Configure Campaign Pack</DialogTitle>
            </DialogHeader>
            {packDialog && (
              <div className="space-y-4">
                <p className="text-sm text-neutral-400">
                  Generating 30 draft content pieces for <strong className="text-white">{packDialog.name}</strong>.
                  Adjust before generating or leave as-is.
                </p>
                <div>
                  <Label className="text-neutral-400 text-xs mb-1 block">Goal / Objective</Label>
                  <Input value={packOverride.goal} onChange={e => setPackOverride(p => ({ ...p, goal: e.target.value }))}
                    className="bg-neutral-800 border-neutral-700 text-white" />
                </div>
                <div>
                  <Label className="text-neutral-400 text-xs mb-1 block">Offer</Label>
                  <Input value={packOverride.offer} onChange={e => setPackOverride(p => ({ ...p, offer: e.target.value }))}
                    placeholder="e.g. Free beta access" className="bg-neutral-800 border-neutral-700 text-white" />
                </div>
                <div>
                  <Label className="text-neutral-400 text-xs mb-1 block">CTA</Label>
                  <Input value={packOverride.cta} onChange={e => setPackOverride(p => ({ ...p, cta: e.target.value }))}
                    placeholder="e.g. Join the beta at virelle.life" className="bg-neutral-800 border-neutral-700 text-white" />
                </div>
                <div>
                  <Label className="text-neutral-400 text-xs mb-2 block">Platforms to include</Label>
                  <div className="flex flex-wrap gap-2">
                    {CHANNELS.map(ch => (
                      <button key={ch}
                        onClick={() => setPackChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])}
                        className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                          packChannels.includes(ch) ? "bg-amber-600 border-amber-500 text-white" : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                        }`}>
                        {PLATFORM_LABELS[ch] ?? ch}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleGenerate}
                    disabled={generatePackMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-500 text-white flex-1">
                    {generatePackMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Generating 30 pieces...</> : <><Zap className="w-4 h-4 mr-1" /> Generate Pack</>}
                  </Button>
                  <Button variant="outline" className="border-neutral-700 text-neutral-300" onClick={() => setPackDialog(null)}>Cancel</Button>
                </div>
                <p className="text-xs text-neutral-500">
                  ⚠ All pieces are saved as DRAFT. Review and approve before publishing.
                  Community posts (Reddit, Discord) require human review.
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── Assets Tab ───────────────────────────────────────────────────────────────

  function AssetsTab() {
    const utils = trpc.useUtils();
    const [statusFilter, setStatusFilter] = useState("draft");
    const [platformFilter, setPlatformFilter] = useState("");
    const [publishDialog, setPublishDialog] = useState<{ id: number; title: string } | null>(null);
    const [publishedUrl, setPublishedUrl] = useState("");
    const [rejectDialog, setRejectDialog] = useState<{ id: number; title: string } | null>(null);
    const [rejectNote, setRejectNote] = useState("");
    const [viewDialog, setViewDialog] = useState<any | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const { data, isLoading, refetch } = trpc.growth.listAssets.useQuery({
      status:   statusFilter || undefined,
      platform: platformFilter || undefined,
      limit:    80,
    });

    const approveMutation = trpc.growth.approveAsset.useMutation({
      onSuccess: () => { utils.growth.listAssets.invalidate(); utils.growth.getDashboard.invalidate(); toast.success("Asset updated"); },
      onError: e => toast.error(e.message),
    });
    const bulkMutation = trpc.growth.bulkApprove.useMutation({
      onSuccess: d => { utils.growth.listAssets.invalidate(); utils.growth.getDashboard.invalidate(); setSelectedIds([]); toast.success(`${d.updated} assets updated`); },
      onError: e => toast.error(e.message),
    });
    const publishMutation = trpc.growth.markPublished.useMutation({
      onSuccess: () => { utils.growth.listAssets.invalidate(); utils.growth.getDashboard.invalidate(); setPublishDialog(null); setPublishedUrl(""); toast.success("Marked as published"); },
      onError: e => toast.error(e.message),
    });

    const toggleSelect = (id: number) =>
      setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const bodyPreview = (body: string) => body.length > 150 ? body.slice(0, 150) + "…" : body;

    return (
      <div className="space-y-4">
        {/* Filters + bulk actions */}
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-white mr-auto">Content Assets</h2>
          <Button size="sm" variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800" onClick={() => refetch()}>
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white w-36 h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-neutral-700">
              {["","draft","approved","rejected","published"].map(s => (
                <SelectItem key={s} value={s} className="text-neutral-200 text-xs">{s || "All statuses"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white w-36 h-8 text-xs">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-neutral-700">
              <SelectItem value="" className="text-neutral-200 text-xs">All platforms</SelectItem>
              {Object.entries(PLATFORM_LABELS).map(([k,v]) => (
                <SelectItem key={k} value={k} className="text-neutral-200 text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk actions bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-amber-900/20 border border-amber-800/40 rounded-lg">
            <span className="text-sm text-amber-300 font-medium">{selectedIds.length} selected</span>
            <Button size="sm" className="bg-green-700 hover:bg-green-600 text-white h-7 text-xs"
              onClick={() => bulkMutation.mutate({ ids: selectedIds, decision: "approved" })}>
              Bulk Approve
            </Button>
            <Button size="sm" className="bg-red-800 hover:bg-red-700 text-white h-7 text-xs"
              onClick={() => bulkMutation.mutate({ ids: selectedIds, decision: "rejected" })}>
              Bulk Reject
            </Button>
            <Button size="sm" variant="outline" className="border-neutral-700 text-neutral-300 h-7 text-xs"
              onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        )}

        {/* Platform export */}
        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-3">
            <p className="text-xs text-neutral-500 mb-2">
              <Download className="w-3 h-3 inline mr-1" />
              Export approved assets formatted for each platform:
            </p>
            <div className="flex flex-wrap gap-2">
              {["tiktok","youtube_shorts","instagram","x","linkedin","reddit","email","product_hunt","indie_hackers"].map(pl => (
                <ExportButton key={pl} platform={pl} />
              ))}
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="flex items-center gap-2 text-neutral-400 py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading assets...
          </div>
        )}

        {!isLoading && data?.rows.length === 0 && (
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="py-12 text-center">
              <p className="text-neutral-500 mb-2">No assets with status "{statusFilter || "any"}".</p>
              <p className="text-xs text-neutral-600">Generate a campaign pack from the Campaigns tab to create draft assets.</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {(data?.rows ?? []).map((a: any) => (
            <Card key={a.id} className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input type="checkbox" checked={selectedIds.includes(a.id)}
                    onChange={() => toggleSelect(a.id)}
                    className="mt-1 accent-amber-500 cursor-pointer" />
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {statusBadge(a.status)}
                      <span className="text-xs text-blue-400 font-medium">{PLATFORM_LABELS[a.platform] ?? a.platform}</span>
                      <span className="text-xs text-neutral-500">{a.assetType?.replace(/_/g," ")}</span>
                      {a.campaignId && <span className="text-xs text-neutral-600">Campaign #{a.campaignId}</span>}
                      <span className="text-xs text-neutral-600 ml-auto">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Title + headline */}
                    {a.title && <p className="text-sm font-medium text-white mb-1">{a.title}</p>}
                    {a.headline && <p className="text-sm text-amber-300 mb-1">{a.headline}</p>}
                    <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-line">{bodyPreview(a.body ?? "")}</p>

                    {/* Published URL */}
                    {a.publishedUrl && (
                      <a href={a.publishedUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline mt-1 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> {a.publishedUrl.slice(0, 60)}
                      </a>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => setViewDialog(a)}
                        className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs h-7">
                        <Eye className="w-3 h-3 mr-1" /> View
                      </Button>
                      <CopyButton text={[a.headline, a.body].filter(Boolean).join("\n\n")} />
                      {a.status === "draft" && (
                        <Button size="sm" onClick={() => approveMutation.mutate({ id: a.id, decision: "approved" })}
                          className="bg-green-800 hover:bg-green-700 text-white text-xs h-7">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                        </Button>
                      )}
                      {(a.status === "draft" || a.status === "approved") && (
                        <Button size="sm" onClick={() => { setRejectDialog({ id: a.id, title: a.title }); setRejectNote(""); }}
                          className="bg-red-900 hover:bg-red-800 text-white text-xs h-7">
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      )}
                      {a.status === "approved" && (
                        <Button size="sm" onClick={() => { setPublishDialog({ id: a.id, title: a.title }); setPublishedUrl(""); }}
                          className="bg-blue-800 hover:bg-blue-700 text-white text-xs h-7">
                          <Globe className="w-3 h-3 mr-1" /> Mark Published
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* View full content dialog */}
        <Dialog open={!!viewDialog} onOpenChange={open => !open && setViewDialog(null)}>
          <DialogContent className="bg-neutral-950 border-neutral-800 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-amber-400 flex items-center gap-2">
                <span>{PLATFORM_LABELS[viewDialog?.platform] ?? viewDialog?.platform}</span>
                {statusBadge(viewDialog?.status ?? "")}
              </DialogTitle>
            </DialogHeader>
            {viewDialog && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CopyButton text={[viewDialog.headline, viewDialog.body].filter(Boolean).join("\n\n")} />
                </div>
                {viewDialog.title    && <div><p className="text-xs text-neutral-500 mb-1">Title (internal)</p><p className="text-sm text-neutral-300">{viewDialog.title}</p></div>}
                {viewDialog.headline && <div><p className="text-xs text-neutral-500 mb-1">Headline</p><p className="text-amber-300 font-medium">{viewDialog.headline}</p></div>}
                {viewDialog.body     && <div><p className="text-xs text-neutral-500 mb-1">Body</p><pre className="text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed">{viewDialog.body}</pre></div>}
                {viewDialog.visualPrompt && <div><p className="text-xs text-neutral-500 mb-1">Visual Prompt</p><p className="text-xs text-neutral-400 italic">{viewDialog.visualPrompt}</p></div>}
                {viewDialog.utmUrl   && <div><p className="text-xs text-neutral-500 mb-1">CTA URL</p><a href={viewDialog.utmUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-sm hover:underline break-all">{viewDialog.utmUrl}</a></div>}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Mark as published dialog */}
        <Dialog open={!!publishDialog} onOpenChange={open => !open && setPublishDialog(null)}>
          <DialogContent className="bg-neutral-950 border-neutral-800 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-blue-400">Mark as Published</DialogTitle>
            </DialogHeader>
            {publishDialog && (
              <div className="space-y-4">
                <p className="text-sm text-neutral-400">{publishDialog.title}</p>
                <div>
                  <Label className="text-neutral-400 text-xs mb-1 block">Published URL (optional)</Label>
                  <Input value={publishedUrl} onChange={e => setPublishedUrl(e.target.value)}
                    placeholder="https://reddit.com/r/... or https://www.tiktok.com/..."
                    className="bg-neutral-800 border-neutral-700 text-white" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => publishMutation.mutate({ id: publishDialog.id, publishedUrl: publishedUrl || undefined })}
                    disabled={publishMutation.isPending}
                    className="bg-blue-700 hover:bg-blue-600 text-white flex-1">
                    {publishMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Confirm Published
                  </Button>
                  <Button variant="outline" className="border-neutral-700 text-neutral-300" onClick={() => setPublishDialog(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject dialog */}
        <Dialog open={!!rejectDialog} onOpenChange={open => !open && setRejectDialog(null)}>
          <DialogContent className="bg-neutral-950 border-neutral-800 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-400">Reject Asset</DialogTitle>
            </DialogHeader>
            {rejectDialog && (
              <div className="space-y-4">
                <p className="text-sm text-neutral-400">{rejectDialog.title}</p>
                <div>
                  <Label className="text-neutral-400 text-xs mb-1 block">Rejection reason (optional)</Label>
                  <Textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                    placeholder="e.g. Too promotional, rewrite with value-first angle..."
                    className="bg-neutral-800 border-neutral-700 text-white" rows={3} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => { approveMutation.mutate({ id: rejectDialog.id, decision: "rejected", rejectionNote: rejectNote || undefined }); setRejectDialog(null); }}
                    className="bg-red-800 hover:bg-red-700 text-white flex-1">
                    Confirm Reject
                  </Button>
                  <Button variant="outline" className="border-neutral-700 text-neutral-300" onClick={() => setRejectDialog(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── ExportButton ─────────────────────────────────────────────────────────────

  function ExportButton({ platform }: { platform: string }) {
    const { isLoading, refetch } = trpc.growth.exportPlatformAssets.useQuery(
      { platform, status: "approved", format: "text" }, { enabled: false }
    );
    return (
      <Button size="sm" variant="outline"
        className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs h-7"
        disabled={isLoading}
        onClick={async () => {
          const result = await refetch();
          if (!result.data?.data) return toast.error("No approved assets for this platform");
          const blob = new Blob([String(result.data.data)], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = `virelle-${platform}-assets.txt`; a.click();
          URL.revokeObjectURL(url);
          toast.success(`Exported ${result.data.count} ${PLATFORM_LABELS[platform] ?? platform} assets`);
        }}>
        <Download className="w-3 h-3 mr-1" /> {PLATFORM_LABELS[platform] ?? platform}
      </Button>
    );
  }

  // ─── Audiences Tab ────────────────────────────────────────────────────────────

  function AudiencesTab() {
    const [search, setSearch] = useState("");
    const [segFilter, setSegFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [showImport, setShowImport] = useState(false);
    const [csvContent, setCsvContent] = useState("");
    const [csvSegment, setCsvSegment] = useState("");
    const utils = trpc.useUtils();

    const { data, isLoading, refetch } = trpc.growth.listAudiences.useQuery({
      search:  search || undefined,
      segment: segFilter || undefined,
      status:  statusFilter || undefined,
      limit:   100,
    });
    const importMutation = trpc.growth.importAudienceCsv.useMutation({
      onSuccess: d => { utils.growth.listAudiences.invalidate(); setShowImport(false); setCsvContent(""); toast.success(`Imported ${d.imported} contacts`); },
      onError: e => toast.error(e.message),
    });
    const updateMutation = trpc.growth.updateAudienceStatus.useMutation({
      onSuccess: () => { utils.growth.listAudiences.invalidate(); toast.success("Updated"); },
      onError: e => toast.error(e.message),
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Audiences</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800" onClick={() => refetch()}>
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white" onClick={() => setShowImport(!showImport)}>
              <Plus className="w-3 h-3 mr-1" /> Import CSV
            </Button>
          </div>
        </div>

        {showImport && (
          <Card className="bg-neutral-900 border-amber-800/40">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-neutral-400">Paste CSV with columns: name, organisation, email, website, country, public_profile_url</p>
              <Select value={csvSegment} onValueChange={setCsvSegment}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white"><SelectValue placeholder="Select segment" /></SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  {SEGMENTS.map(s => <SelectItem key={s.value} value={s.value} className="text-neutral-200">{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea value={csvContent} onChange={e => setCsvContent(e.target.value)}
                placeholder={"name,organisation,email,website\nJohn Doe,Indie Films Co,john@example.com,https://example.com"}
                className="bg-neutral-800 border-neutral-700 text-white font-mono text-xs" rows={5} />
              <div className="flex gap-2">
                <Button onClick={() => importMutation.mutate({ csvContent, segment: csvSegment as any, source: "csv" })}
                  disabled={!csvContent || !csvSegment || importMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-500 text-white">
                  {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Import
                </Button>
                <Button variant="outline" className="border-neutral-700 text-neutral-300" onClick={() => setShowImport(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search + filter bar */}
        <div className="flex gap-2 flex-wrap">
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, org, email..." className="bg-neutral-800 border-neutral-700 text-white flex-1" />
          <Select value={segFilter} onValueChange={setSegFilter}>
            <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white w-40 text-xs">
              <SelectValue placeholder="All segments" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-neutral-700">
              <SelectItem value="" className="text-neutral-200 text-xs">All segments</SelectItem>
              {SEGMENTS.map(s => <SelectItem key={s.value} value={s.value} className="text-neutral-200 text-xs">{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white w-36 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-neutral-700">
              {["","discovered","reviewed","queued","engaged","converted","archived"].map(s => (
                <SelectItem key={s} value={s} className="text-neutral-200 text-xs">{s || "All statuses"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-neutral-400 py-8 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
        ) : (
          <div className="space-y-2">
            {(data?.rows ?? []).map((a: any) => (
              <Card key={a.id} className="bg-neutral-900 border-neutral-800">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {a.name && <span className="text-sm text-white font-medium">{a.name}</span>}
                        {a.organisation && <span className="text-xs text-neutral-500">{a.organisation}</span>}
                        {statusBadge(a.status)}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
                        {a.email   && <span><Mail className="w-3 h-3 inline mr-0.5" />{a.email}</span>}
                        {a.website && <a href={a.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{a.website}</a>}
                        {a.source  && <span>via {a.source}</span>}
                        {a.score > 0 && <span className="text-amber-400">Score: {a.score}</span>}
                      </div>
                    </div>
                    <Select
                      value={a.status}
                      onValueChange={v => updateMutation.mutate({ id: a.id, status: v as any })}>
                      <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white w-32 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-800 border-neutral-700">
                        {["discovered","reviewed","queued","engaged","converted","archived"].map(s => (
                          <SelectItem key={s} value={s} className="text-neutral-200 text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
            {data?.total !== undefined && (
              <p className="text-xs text-neutral-600 text-center pt-2">Showing {data.rows.length} of {data.total}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Analytics Tab ────────────────────────────────────────────────────────────

  function AnalyticsTab() {
    const [days, setDays] = useState(30);
    const { data, isLoading } = trpc.growth.getAnalytics.useQuery({ days });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Analytics</h2>
          <Select value={String(days)} onValueChange={v => setDays(Number(v))}>
            <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-neutral-700">
              {[7,14,30,90].map(d => <SelectItem key={d} value={String(d)} className="text-neutral-200 text-xs">Last {d}d</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-neutral-400 py-8 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Events by type */}
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-neutral-300">Events by Type</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(data?.eventsByType ?? []).sort((a:any,b:any) => Number(b.total)-Number(a.total)).map((e: any) => (
                  <div key={e.eventType} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400 capitalize">{e.eventType?.replace(/_/g," ")}</span>
                    <span className="text-white font-semibold">{Number(e.total)}</span>
                  </div>
                ))}
                {(data?.eventsByType ?? []).length === 0 && <p className="text-xs text-neutral-500">No events tracked yet.</p>}
              </CardContent>
            </Card>

            {/* Events by source */}
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-neutral-300">Events by Source</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(data?.eventsBySource ?? []).sort((a:any,b:any) => Number(b.total)-Number(a.total)).map((e: any) => (
                  <div key={e.source} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400 capitalize">{PLATFORM_LABELS[e.source] ?? e.source ?? "direct"}</span>
                    <span className="text-white font-semibold">{Number(e.total)}</span>
                  </div>
                ))}
                {(data?.eventsBySource ?? []).length === 0 && <p className="text-xs text-neutral-500">No sources tracked yet.</p>}
              </CardContent>
            </Card>

            {/* Events by segment */}
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-neutral-300">Events by Segment</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(data?.eventsBySegment ?? []).sort((a:any,b:any) => Number(b.total)-Number(a.total)).map((e: any) => (
                  <div key={e.segment} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400 capitalize">{e.segment?.replace(/_/g," ") ?? "unknown"}</span>
                    <span className="text-white font-semibold">{Number(e.total)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Assets by status */}
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-neutral-300">Assets by Status</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(data?.assetsByStatus ?? []).map((e: any) => (
                  <div key={e.status} className="flex items-center justify-between text-sm">
                    {statusBadge(e.status)}
                    <span className="text-white font-semibold">{Number(e.total)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ─── Weekly Report Tab ────────────────────────────────────────────────────────

  function ReportTab() {
    const { data: report, isLoading, refetch } = trpc.growth.getWeeklyReport.useQuery();

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Weekly Report</h2>
          <Button size="sm" variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800" onClick={() => refetch()}>
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-neutral-400 py-8 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Generating report...</div>
        ) : report ? (
          <>
            <p className="text-xs text-neutral-500">
              Period: {report.period.from} → {report.period.to} · Ad spend: <span className="text-green-400 font-semibold">$0</span>
            </p>

            {/* Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Events this week"   value={report.events.thisWeek}  icon={Activity} color="#60a5fa" />
              <StatCard label="Signups this week"  value={report.signups.thisWeek} icon={TrendingUp} color="#34d399" />
              <StatCard label="Email captures"     value={report.emailCaptures}    icon={Mail}     color="#a78bfa" />
              <StatCard label="Demo requests"      value={report.demoRequests}     icon={Zap}      color="#fbbf24" />
            </div>

            {/* Asset pipeline */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Draft (awaiting)"   value={report.assets.draft}     icon={Clock}       color="#fbbf24" />
              <StatCard label="Approved (ready)"   value={report.assets.approved}  icon={CheckCircle2} color="#34d399" />
              <StatCard label="Published"          value={report.assets.published} icon={Globe}       color="#60a5fa" />
            </div>

            {/* Top sources / segments / platforms */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-neutral-300">Top Sources</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {report.topSources.length === 0 && <p className="text-xs text-neutral-500">No data yet</p>}
                  {report.topSources.map((s: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-neutral-400 capitalize">{PLATFORM_LABELS[s.source] ?? s.source ?? "direct"}</span>
                      <span className="text-white font-semibold">{Number(s.total)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-neutral-300">Top Segments</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {report.topSegments.length === 0 && <p className="text-xs text-neutral-500">No data yet</p>}
                  {report.topSegments.map((s: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-neutral-400 capitalize">{s.segment?.replace(/_/g," ") ?? "unknown"}</span>
                      <span className="text-white font-semibold">{Number(s.total)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-neutral-300">Top Published Platforms</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {report.topPlatforms.length === 0 && <p className="text-xs text-neutral-500">No published assets yet</p>}
                  {report.topPlatforms.map((s: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-neutral-400">{PLATFORM_LABELS[s.platform] ?? s.platform}</span>
                      <span className="text-white font-semibold">{Number(s.total)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Recommended next actions */}
            <Card className="bg-amber-900/20 border-amber-800/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Recommended Next Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.recommendedActions.map((action: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-500 font-bold shrink-0 mt-0.5">{i + 1}.</span>
                    <span className="text-amber-100">{action}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* WoW comparison */}
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-neutral-300">Week-over-Week</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">Events</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{report.events.thisWeek}</span>
                    <WoWBadge pct={report.events.wow} />
                    <span className="text-neutral-600 text-xs">vs {report.events.lastWeek} last wk</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">Signups</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{report.signups.thisWeek}</span>
                    <WoWBadge pct={report.signups.wow} />
                    <span className="text-neutral-600 text-xs">vs {report.signups.lastWeek} last wk</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <p className="text-neutral-500">No report data yet.</p>
        )}
      </div>
    );
  }

  // ─── Main Dashboard ───────────────────────────────────────────────────────────

  export default function AdminGrowthDashboard({ defaultTab = "overview" }: { defaultTab?: string }) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Megaphone className="w-6 h-6 text-amber-500" /> Growth Engine
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                Zero-budget · $0 ad spend · All community content requires human approval
              </p>
            </div>
            <div className="flex gap-2 text-xs text-neutral-500 flex-wrap justify-end">
              <a href="/artists"    className="hover:text-neutral-300 transition-colors">/artists</a>
              <a href="/filmmakers" className="hover:text-neutral-300 transition-colors">/filmmakers</a>
              <a href="/agencies"   className="hover:text-neutral-300 transition-colors">/agencies</a>
              <a href="/creators"   className="hover:text-neutral-300 transition-colors">/creators</a>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue={defaultTab}>
            <TabsList className="bg-neutral-900 border border-neutral-800 mb-6 flex flex-wrap h-auto gap-1 p-1">
              {[
                { value: "overview",   label: "Overview",   icon: BarChart2 },
                { value: "campaigns",  label: "Campaigns",  icon: Megaphone },
                { value: "assets",     label: "Assets",     icon: Star },
                { value: "audiences",  label: "Audiences",  icon: Users },
                { value: "analytics",  label: "Analytics",  icon: Activity },
                { value: "report",     label: "Report",     icon: BookOpen },
              ].map(t => (
                <TabsTrigger key={t.value} value={t.value}
                  className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-neutral-400 text-xs px-3 py-1.5 flex items-center gap-1.5">
                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview">  <OverviewTab />   </TabsContent>
            <TabsContent value="campaigns"> <CampaignsTab />  </TabsContent>
            <TabsContent value="assets">    <AssetsTab />     </TabsContent>
            <TabsContent value="audiences"> <AudiencesTab />  </TabsContent>
            <TabsContent value="analytics"> <AnalyticsTab />  </TabsContent>
            <TabsContent value="report">    <ReportTab />     </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
  