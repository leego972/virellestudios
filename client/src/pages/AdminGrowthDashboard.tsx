import { useState, useRef } from "react";
  import { trpc } from "@/lib/trpc";
  import { useAuth } from "@/_core/hooks/useAuth";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
  import { toast } from "sonner";
  import {
    BarChart3, Users, TrendingUp, Star, CheckCircle2, XCircle,
    Clock, Loader2, Megaphone, Zap, RefreshCw, Globe, Download,
    Upload, Plus, Eye, ExternalLink, Target, Activity, Calendar,
    ChevronUp, ChevronDown, Minus,
  } from "lucide-react";

  // ─── Constants ────────────────────────────────────────────────────────────────

  const SEGMENTS = [
    { value: "artists",       label: "Visual Artists & Illustrators" },
    { value: "filmmakers",    label: "Independent Filmmakers" },
    { value: "agencies",      label: "Creative Agencies" },
    { value: "small_business",label: "Small Business Video" },
    { value: "creators",      label: "Content Creators" },
    { value: "game_dev",      label: "Game Developers" },
  ];

  const CHANNELS = [
    "reddit", "discord", "facebook", "linkedin",
    "youtube_comments", "tiktok", "instagram", "email",
  ];

  const STATUS_COLORS: Record<string, string> = {
    draft:     "bg-neutral-700 text-neutral-300",
    active:    "bg-amber-900/60 text-amber-300",
    paused:    "bg-neutral-700 text-neutral-400",
    completed: "bg-green-900/60 text-green-300",
    pending:   "bg-yellow-900/60 text-yellow-300",
    approved:  "bg-green-900/60 text-green-300",
    rejected:  "bg-red-900/60 text-red-400",
    published: "bg-blue-900/60 text-blue-300",
    archived:  "bg-neutral-700 text-neutral-500",
    new:       "bg-neutral-700 text-neutral-300",
    contacted: "bg-amber-900/60 text-amber-300",
    converted: "bg-green-900/60 text-green-300",
  };

  // ─── Stat card ────────────────────────────────────────────────────────────────

  function StatCard({ label, value, icon: Icon, color, sub }: {
    label: string; value: number | string; icon: any; color: string; sub?: string;
  }) {
    return (
      <Card className="bg-neutral-900 border-neutral-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-400">{label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
              {sub && <p className="text-xs text-neutral-500 mt-1">{sub}</p>}
            </div>
            <Icon className="w-8 h-8 opacity-30" style={{ color }} />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── WoW badge ────────────────────────────────────────────────────────────────

  function WoWBadge({ pct }: { pct: number | null }) {
    if (pct === null) return <span className="text-neutral-500 text-xs">—</span>;
    if (pct > 0)  return <span className="flex items-center gap-1 text-green-400 text-xs"><ChevronUp className="w-3 h-3" />{pct}%</span>;
    if (pct < 0)  return <span className="flex items-center gap-1 text-red-400 text-xs"><ChevronDown className="w-3 h-3" />{Math.abs(pct)}%</span>;
    return <span className="flex items-center gap-1 text-neutral-500 text-xs"><Minus className="w-3 h-3" />0%</span>;
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
            <Badge className="bg-neutral-800 text-green-400 border-0 text-xs">
              $0 ad spend
            </Badge>
            <Button size="sm" variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800" onClick={() => refetch()}>
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Campaigns"      value={data?.campaigns ?? 0}     icon={Megaphone}  color="#f59e0b" />
          <StatCard label="Audiences"      value={data?.audiences ?? 0}     icon={Users}      color="#a78bfa" />
          <StatCard label="Assets"         value={data?.assets ?? 0}        icon={Star}       color="#60a5fa" />
          <StatCard label="Pending Review" value={data?.pendingAssets ?? 0} icon={Clock}      color="#fbbf24" sub="need approval" />
          <StatCard label="Events (30d)"   value={data?.events30d ?? 0}     icon={Activity}   color="#34d399" />
          <StatCard label="Signups (30d)"  value={data?.signups30d ?? 0}    icon={TrendingUp} color="#f87171" />
        </div>

        {/* Weekly report */}
        {report && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-neutral-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" /> Weekly Report
                  <span className="text-xs text-neutral-500 font-normal ml-auto">{report.period.from} → {report.period.to}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">Events this week</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{report.events.thisWeek}</span>
                    <WoWBadge pct={report.events.wow} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">Signups this week</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{report.signups.thisWeek}</span>
                    <WoWBadge pct={report.signups.wow} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">Published assets</span>
                  <span className="text-white font-semibold">{report.assets.published}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">Awaiting approval</span>
                  <span className="text-yellow-400 font-semibold">{report.assets.pending}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">Ad spend</span>
                  <span className="text-green-400 font-semibold">$0</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-neutral-300 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" /> Top Traffic Sources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.topSources.length === 0 && (
                  <p className="text-neutral-500 text-sm">No data yet — share UTM links to start tracking</p>
                )}
                {report.topSources.map((s: any) => (
                  <div key={s.source} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400 capitalize">{s.source || "direct"}</span>
                    <span className="text-white font-semibold">{Number(s.total)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Assets by segment */}
        {data?.assetsBySegment && data.assetsBySegment.length > 0 && (
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-neutral-300">Assets by Segment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {data.assetsBySegment.map((s: any) => (
                  <div key={s.segment} className="flex items-center gap-1.5 bg-neutral-800 rounded-full px-3 py-1 text-xs">
                    <span className="text-neutral-400 capitalize">{s.segment}</span>
                    <span className="text-amber-400 font-semibold">{Number(s.total)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ─── Campaigns Tab ────────────────────────────────────────────────────────────

  function CampaignsTab() {
    const utils = trpc.useUtils();
    const [showCreate, setShowCreate] = useState(false);
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
    const [form, setForm] = useState({ name: "", segment: "", objective: "", startDate: "", endDate: "" });
    const [generatingId, setGeneratingId] = useState<number | null>(null);

    const { data, isLoading, refetch } = trpc.growth.listCampaigns.useQuery({});
    const createMutation = trpc.growth.createCampaign.useMutation({
      onSuccess: () => {
        utils.growth.listCampaigns.invalidate();
        utils.growth.getDashboard.invalidate();
        setShowCreate(false);
        setForm({ name: "", segment: "", objective: "", startDate: "", endDate: "" });
        setSelectedChannels([]);
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
        toast.success(`Generated ${d.generated} draft content pieces — review in Assets tab`);
      },
      onError: (e) => { setGeneratingId(null); toast.error(e.message); },
    });

    const toggleChannel = (ch: string) =>
      setSelectedChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Campaigns</h2>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-3 h-3 mr-1" /> New Campaign
          </Button>
        </div>

        {showCreate && (
          <Card className="bg-neutral-900 border-amber-800/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-amber-400">Create Campaign</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-neutral-400 text-xs mb-1 block">Campaign Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Artists Q3 2025" className="bg-neutral-800 border-neutral-700 text-white" />
                </div>
                <div>
                  <Label className="text-neutral-400 text-xs mb-1 block">Target Segment</Label>
                  <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v })}>
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                      <SelectValue placeholder="Select segment" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      {SEGMENTS.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="text-neutral-200">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-neutral-400 text-xs mb-1 block">Objective</Label>
                <Input value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })}
                  placeholder="e.g. Awareness + beta signups" className="bg-neutral-800 border-neutral-700 text-white" />
              </div>
              <div>
                <Label className="text-neutral-400 text-xs mb-2 block">Channels (select all that apply)</Label>
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map((ch) => (
                    <button key={ch} onClick={() => toggleChannel(ch)}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                        selectedChannels.includes(ch)
                          ? "bg-amber-600 border-amber-500 text-white"
                          : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500"
                      }`}>
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white"
                  disabled={createMutation.isPending || !form.name || !form.segment || !form.objective || selectedChannels.length === 0}
                  onClick={() => createMutation.mutate({ ...form, channels: selectedChannels as any[] })}>
                  {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                  Create
                </Button>
                <Button size="sm" variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                  onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-neutral-400 py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading campaigns...
          </div>
        )}

        {!isLoading && (!data || data.length === 0) && (
          <div className="text-center py-12 text-neutral-500">
            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No campaigns yet — create one above</p>
          </div>
        )}

        <div className="space-y-3">
          {(data ?? []).map((c: any) => (
            <Card key={c.id} className="bg-neutral-900 border-neutral-800">
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white">{c.name}</p>
                      <Badge className={`text-xs border-0 ${STATUS_COLORS[c.status] ?? "bg-neutral-700 text-neutral-400"}`}>{c.status}</Badge>
                      <Badge className="text-xs border-0 bg-neutral-800 text-neutral-400">{c.segment}</Badge>
                      <Badge className="text-xs border-0 bg-green-900/40 text-green-400">$0 spend</Badge>
                    </div>
                    <p className="text-sm text-neutral-400 mt-1">{c.objective}</p>
                    {c.channels && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(c.channels as string[]).map((ch: string) => (
                          <span key={ch} className="text-xs bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded">{ch}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-500 text-white shrink-0"
                    disabled={generatePackMutation.isPending && generatingId === c.id}
                    onClick={() => { setGeneratingId(c.id); generatePackMutation.mutate({ campaignId: c.id }); }}>
                    {generatePackMutation.isPending && generatingId === c.id
                      ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Generating...</>
                      : <><Zap className="w-3 h-3 mr-1" /> Generate Pack</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Assets Tab ───────────────────────────────────────────────────────────────

  function AssetsTab() {
    const utils = trpc.useUtils();
    const [statusFilter, setStatusFilter] = useState("pending");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const { data, isLoading, refetch } = trpc.growth.listAssets.useQuery({ status: statusFilter || undefined });
    const approveMutation = trpc.growth.approveAsset.useMutation({
      onSuccess: () => { utils.growth.listAssets.invalidate(); utils.growth.getDashboard.invalidate(); refetch(); },
      onError: (e) => toast.error(e.message),
    });
    const bulkMutation = trpc.growth.bulkApprove.useMutation({
      onSuccess: (d) => {
        utils.growth.listAssets.invalidate();
        utils.growth.getDashboard.invalidate();
        setSelectedIds([]);
        toast.success(`${d.updated} assets updated`);
      },
      onError: (e) => toast.error(e.message),
    });
    const publishMutation = trpc.growth.markPublished.useMutation({
      onSuccess: () => { utils.growth.listAssets.invalidate(); toast.success("Marked as published"); },
      onError: (e) => toast.error(e.message),
    });

    const toggleSelect = (id: number) =>
      setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-white">Content Assets</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedIds.length > 0 && (
              <>
                <Button size="sm" className="bg-green-700 hover:bg-green-600 text-white"
                  onClick={() => bulkMutation.mutate({ ids: selectedIds, decision: "approved" })}
                  disabled={bulkMutation.isPending}>
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Approve {selectedIds.length}
                </Button>
                <Button size="sm" variant="outline" className="border-red-800 text-red-400 hover:bg-red-900/20"
                  onClick={() => bulkMutation.mutate({ ids: selectedIds, decision: "rejected" })}
                  disabled={bulkMutation.isPending}>
                  <XCircle className="w-3 h-3 mr-1" /> Reject {selectedIds.length}
                </Button>
              </>
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-neutral-700">
                <SelectItem value="" className="text-neutral-200 text-xs">All statuses</SelectItem>
                {["pending","approved","rejected","published"].map((s) => (
                  <SelectItem key={s} value={s} className="text-neutral-200 text-xs capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-neutral-400 py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading assets...
          </div>
        )}

        {!isLoading && data?.rows.length === 0 && (
          <div className="text-center py-12 text-neutral-500">
            <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No assets with status "{statusFilter || "any"}"</p>
            <p className="text-xs mt-1">Generate a campaign pack to create content pieces</p>
          </div>
        )}

        <div className="space-y-3">
          {(data?.rows ?? []).map((a: any) => (
            <Card key={a.id} className={`bg-neutral-900 border-neutral-800 ${selectedIds.includes(a.id) ? "ring-1 ring-amber-500" : ""}`}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 accent-amber-500"
                    checked={selectedIds.includes(a.id)}
                    onChange={() => toggleSelect(a.id)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={`text-xs border-0 ${STATUS_COLORS[a.status] ?? "bg-neutral-700 text-neutral-400"}`}>{a.status}</Badge>
                      <Badge className="text-xs border-0 bg-neutral-800 text-neutral-500">{a.platform}</Badge>
                      <Badge className="text-xs border-0 bg-neutral-800 text-neutral-500">{a.assetType}</Badge>
                      <span className="text-xs text-neutral-600 ml-auto">Q: {a.qualityScore}</span>
                    </div>
                    {a.headline && <p className="text-sm font-semibold text-white mb-1">{a.headline}</p>}
                    <p className="text-sm text-neutral-400 line-clamp-3 whitespace-pre-wrap">{a.body}</p>
                    {a.utmUrl && (
                      <p className="text-xs text-blue-500 mt-1 truncate">{a.utmUrl}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {a.status === "pending" && (
                      <>
                        <Button size="sm" className="bg-green-800 hover:bg-green-700 text-green-100 h-7 text-xs"
                          onClick={() => { approveMutation.mutate({ id: a.id, decision: "approved" }); toast.success("Approved"); }}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-800 text-red-400 hover:bg-red-900/20 h-7 text-xs"
                          onClick={() => { approveMutation.mutate({ id: a.id, decision: "rejected" }); toast.success("Rejected"); }}>
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    {a.status === "approved" && (
                      <Button size="sm" className="bg-blue-700 hover:bg-blue-600 text-white h-7 text-xs"
                        onClick={() => publishMutation.mutate({ id: a.id })}>
                        <ExternalLink className="w-3 h-3 mr-1" /> Mark Published
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {data && <p className="text-xs text-neutral-600 text-right">{data.total} total</p>}
      </div>
    );
  }

  // ─── Audiences Tab ────────────────────────────────────────────────────────────

  function AudiencesTab() {
    const utils = trpc.useUtils();
    const [csvText, setCsvText] = useState("");
    const [csvSegment, setCsvSegment] = useState("filmmakers");
    const [showImport, setShowImport] = useState(false);
    const [search, setSearch] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    const { data, isLoading } = trpc.growth.listAudiences.useQuery({ search: search || undefined, limit: 100 });
    const importMutation = trpc.growth.importAudienceCsv.useMutation({
      onSuccess: (d) => {
        utils.growth.listAudiences.invalidate();
        utils.growth.getDashboard.invalidate();
        setCsvText("");
        setShowImport(false);
        toast.success(`Imported ${d.imported} contacts`);
      },
      onError: (e) => toast.error(e.message),
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => setCsvText(ev.target?.result as string ?? "");
      reader.readAsText(file);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-white">Audiences</h2>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white" onClick={() => setShowImport(!showImport)}>
            <Upload className="w-3 h-3 mr-1" /> Import CSV
          </Button>
        </div>

        {showImport && (
          <Card className="bg-neutral-900 border-amber-800/40">
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label className="text-neutral-400 text-xs mb-1 block">Segment</Label>
                <Select value={csvSegment} onValueChange={setCsvSegment}>
                  <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    {SEGMENTS.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-neutral-200">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-neutral-400 text-xs mb-1 block">CSV file (columns: name, email, company, utm_source)</Label>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                <Button size="sm" variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 mb-2"
                  onClick={() => fileRef.current?.click()}>
                  <Upload className="w-3 h-3 mr-1" /> Choose file
                </Button>
                <Textarea value={csvText} onChange={(e) => setCsvText(e.target.value)}
                  placeholder="name,email,company\nJane Doe,jane@example.com,Indie Films Co"
                  className="bg-neutral-800 border-neutral-700 text-white text-xs font-mono h-24" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white"
                  disabled={importMutation.isPending || !csvText.trim()}
                  onClick={() => importMutation.mutate({ csvContent: csvText, segment: csvSegment as any, source: "csv" })}>
                  {importMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                  Import
                </Button>
                <Button size="sm" variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                  onClick={() => setShowImport(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex">
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or company..."
            className="bg-neutral-800 border-neutral-700 text-white" />
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-neutral-400 py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading audiences...
          </div>
        )}

        {!isLoading && data?.rows.length === 0 && (
          <div className="text-center py-12 text-neutral-500">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No audience records yet</p>
            <p className="text-xs mt-1">Import a CSV or contacts will appear when users visit landing pages</p>
          </div>
        )}

        <div className="space-y-2">
          {(data?.rows ?? []).map((a: any) => (
            <Card key={a.id} className="bg-neutral-900 border-neutral-800">
              <CardContent className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{a.name || a.email || "Unknown"}</p>
                    <Badge className={`text-xs border-0 ${STATUS_COLORS[a.status] ?? "bg-neutral-700 text-neutral-400"}`}>{a.status}</Badge>
                    <Badge className="text-xs border-0 bg-neutral-800 text-neutral-500">{a.segment}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {a.email && <span className="text-xs text-neutral-500">{a.email}</span>}
                    {a.company && <span className="text-xs text-neutral-500">{a.company}</span>}
                    {a.utmSource && <span className="text-xs text-blue-500">via {a.utmSource}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-neutral-500">Score:</span>
                  <span className="text-xs font-semibold text-amber-400">{a.score}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {data && <p className="text-xs text-neutral-600 text-right">{data.total} total</p>}
      </div>
    );
  }

  // ─── Analytics Tab ────────────────────────────────────────────────────────────

  function AnalyticsTab() {
    const [days, setDays] = useState(30);
    const { data, isLoading } = trpc.growth.getAnalytics.useQuery({ days });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Analytics</h2>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-neutral-700">
              {[7, 14, 30, 60, 90].map((d) => (
                <SelectItem key={d} value={String(d)} className="text-neutral-200 text-xs">Last {d} days</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-neutral-400 py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading analytics...
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-neutral-300">Events by Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.eventsByType.length === 0 && <p className="text-neutral-500 text-sm">No events yet</p>}
                {data.eventsByType.map((e: any) => (
                  <div key={e.eventType} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400 capitalize">{e.eventType?.replace(/_/g, " ") || "unknown"}</span>
                    <span className="text-white font-semibold">{Number(e.total)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-neutral-300">Events by Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.eventsBySource.length === 0 && <p className="text-neutral-500 text-sm">No data yet</p>}
                {data.eventsBySource.map((e: any) => (
                  <div key={e.utmSource ?? "direct"} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400 capitalize">{e.utmSource || "direct"}</span>
                    <span className="text-white font-semibold">{Number(e.total)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-neutral-300">Events by Segment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.eventsBySegment.length === 0 && <p className="text-neutral-500 text-sm">No segment data yet</p>}
                {data.eventsBySegment.map((e: any) => (
                  <div key={e.segment ?? "unknown"} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400 capitalize">{e.segment || "unknown"}</span>
                    <span className="text-white font-semibold">{Number(e.total)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-neutral-300">Assets by Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.assetsByStatus.map((e: any) => (
                  <div key={e.status} className="flex items-center justify-between text-sm">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[e.status] ?? "bg-neutral-700 text-neutral-400"}`}>{e.status}</span>
                    <span className="text-white font-semibold">{Number(e.total)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {data.eventsByDay.length > 0 && (
              <Card className="bg-neutral-900 border-neutral-800 md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-neutral-300">Daily Events (last {days} days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1 h-24">
                    {data.eventsByDay.map((e: any) => {
                      const max = Math.max(...data.eventsByDay.map((x: any) => Number(x.total)));
                      const h = max > 0 ? Math.round((Number(e.total) / max) * 96) : 2;
                      return (
                        <div key={e.day} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="bg-amber-600 rounded-sm w-full transition-all" style={{ height: `${h}px` }} />
                          <div className="absolute bottom-full mb-1 hidden group-hover:block bg-neutral-800 text-xs text-white rounded px-1.5 py-0.5 whitespace-nowrap">
                            {e.day}: {e.total}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Main page ────────────────────────────────────────────────────────────────

  export default function AdminGrowthDashboard() {
    const { user, isLoading: authLoading } = useAuth();

    if (authLoading) return (
      <div className="flex items-center justify-center h-screen bg-neutral-950">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );

    if (!user || user.role !== "admin") return (
      <div className="flex items-center justify-center h-screen bg-neutral-950">
        <p className="text-neutral-400">Access denied</p>
      </div>
    );

    return (
      <div className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Target className="w-6 h-6 text-amber-500" />
              Growth Engine
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Zero-budget organic growth — all community posts require human approval before publishing
            </p>
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="bg-neutral-900 border border-neutral-800 mb-6">
              <TabsTrigger value="overview"   className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-neutral-400">Overview</TabsTrigger>
              <TabsTrigger value="campaigns"  className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-neutral-400">Campaigns</TabsTrigger>
              <TabsTrigger value="assets"     className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-neutral-400">Assets</TabsTrigger>
              <TabsTrigger value="audiences"  className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-neutral-400">Audiences</TabsTrigger>
              <TabsTrigger value="analytics"  className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-neutral-400">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">  <OverviewTab /></TabsContent>
            <TabsContent value="campaigns"> <CampaignsTab /></TabsContent>
            <TabsContent value="assets">    <AssetsTab /></TabsContent>
            <TabsContent value="audiences"> <AudiencesTab /></TabsContent>
            <TabsContent value="analytics"> <AnalyticsTab /></TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
  