import { useEffect, useMemo, useState } from "react";
  import { Link } from "wouter";
  import { trpc } from "@/lib/trpc";
  import { useAuth } from "@/_core/hooks/useAuth";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Badge } from "@/components/ui/badge";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Textarea } from "@/components/ui/textarea";
  import {
    ArrowLeft, Calendar, ExternalLink, Search, Trophy, Globe2,
    FilmIcon, Edit3, CheckCircle2, Clock, DollarSign, Star,
    AlertCircle, Plus, Trash2, RefreshCw,
  } from "lucide-react";

  type FestivalStatus = "interested" | "preparing" | "submitted" | "selected" | "passed" | "won";

  interface Festival {
    name: string; city: string; country: string;
    tier: "A" | "Premiere" | "Genre" | "Regional" | "Doc" | "Short";
    formats: string[]; earlyDeadline: string; regularDeadline: string;
    notificationWindow: string; feeUSD: string; premiereRule: string; url: string;
  }

  interface TrackEntry {
    status: FestivalStatus;
    projectId?: number;
    projectTitle?: string;
    notes?: string;
    submittedDate?: string;
    submissionFee?: number;
    trackedAt: string;
  }

  const FESTIVALS: Festival[] = [
    { name: "Sundance Film Festival", city: "Park City", country: "USA", tier: "A", formats: ["Feature","Short","Doc"], earlyDeadline: "Aug", regularDeadline: "Sep", notificationWindow: "Late Nov", feeUSD: "$60–$120", premiereRule: "World/US Premiere", url: "https://festival.sundance.org" },
    { name: "Cannes Film Festival", city: "Cannes", country: "France", tier: "A", formats: ["Feature","Short"], earlyDeadline: "Jan", regularDeadline: "Mar", notificationWindow: "Mid-Apr", feeUSD: "Free (selective)", premiereRule: "World Premiere", url: "https://www.festival-cannes.com" },
    { name: "Berlin International Film Festival", city: "Berlin", country: "Germany", tier: "A", formats: ["Feature","Short","Doc"], earlyDeadline: "Sep", regularDeadline: "Nov", notificationWindow: "Mid-Jan", feeUSD: "Free (selective)", premiereRule: "World/Intl Premiere", url: "https://www.berlinale.de" },
    { name: "Venice Film Festival", city: "Venice", country: "Italy", tier: "A", formats: ["Feature","Short","VR"], earlyDeadline: "May", regularDeadline: "Jun", notificationWindow: "Late Jul", feeUSD: "Free (selective)", premiereRule: "World Premiere", url: "https://www.labiennale.org/en/cinema" },
    { name: "Toronto International Film Festival (TIFF)", city: "Toronto", country: "Canada", tier: "A", formats: ["Feature","Short","Doc"], earlyDeadline: "Apr", regularDeadline: "Jul", notificationWindow: "Late Jul", feeUSD: "$60–$100", premiereRule: "World/N.A. Premiere", url: "https://tiff.net" },
    { name: "SXSW Film & TV Festival", city: "Austin", country: "USA", tier: "Premiere", formats: ["Feature","Short","Episodic","XR"], earlyDeadline: "Sep", regularDeadline: "Nov", notificationWindow: "Mid-Feb", feeUSD: "$45–$95", premiereRule: "Flexible", url: "https://www.sxsw.com/festivals/film" },
    { name: "Tribeca Film Festival", city: "New York", country: "USA", tier: "Premiere", formats: ["Feature","Short","Doc","Episodic"], earlyDeadline: "Sep", regularDeadline: "Dec", notificationWindow: "Mid-Apr", feeUSD: "$50–$110", premiereRule: "World/US Premiere", url: "https://tribecafilm.com/festival" },
    { name: "Telluride Film Festival", city: "Telluride", country: "USA", tier: "Premiere", formats: ["Feature","Short"], earlyDeadline: "Jun", regularDeadline: "Jul", notificationWindow: "Late Aug", feeUSD: "Free (selective)", premiereRule: "Flexible", url: "https://telluridefilmfestival.org" },
    { name: "New York Film Festival", city: "New York", country: "USA", tier: "Premiere", formats: ["Feature","Short","Doc"], earlyDeadline: "May", regularDeadline: "Jun", notificationWindow: "Late Jul", feeUSD: "Free (selective)", premiereRule: "Flexible", url: "https://www.filmlinc.org/nyff" },
    { name: "Locarno Film Festival", city: "Locarno", country: "Switzerland", tier: "A", formats: ["Feature","Short"], earlyDeadline: "Mar", regularDeadline: "Apr", notificationWindow: "Late Jun", feeUSD: "Free", premiereRule: "World/Intl Premiere", url: "https://www.locarnofestival.ch" },
    { name: "BFI London Film Festival", city: "London", country: "UK", tier: "Premiere", formats: ["Feature","Short","Doc"], earlyDeadline: "May", regularDeadline: "Jun", notificationWindow: "Late Aug", feeUSD: "£35–£70", premiereRule: "UK Premiere", url: "https://www.bfi.org.uk/london-film-festival" },
    { name: "Busan International Film Festival", city: "Busan", country: "South Korea", tier: "A", formats: ["Feature","Short","Doc"], earlyDeadline: "Apr", regularDeadline: "Jul", notificationWindow: "Mid-Sep", feeUSD: "Free", premiereRule: "Asian Premiere", url: "https://www.biff.kr" },
    { name: "Tokyo International Film Festival", city: "Tokyo", country: "Japan", tier: "A", formats: ["Feature","Short"], earlyDeadline: "Jun", regularDeadline: "Aug", notificationWindow: "Late Sep", feeUSD: "Free", premiereRule: "Asian Premiere", url: "https://www.tiff-jp.net" },
    { name: "Sitges International Fantastic Film Festival", city: "Sitges", country: "Spain", tier: "Genre", formats: ["Feature","Short"], earlyDeadline: "Apr", regularDeadline: "Jun", notificationWindow: "Late Aug", feeUSD: "€25–€60", premiereRule: "Flexible", url: "https://sitgesfilmfestival.com" },
    { name: "Fantasia International Film Festival", city: "Montreal", country: "Canada", tier: "Genre", formats: ["Feature","Short"], earlyDeadline: "Mar", regularDeadline: "Apr", notificationWindow: "Mid-Jun", feeUSD: "$30–$60", premiereRule: "Flexible", url: "https://fantasiafestival.com" },
    { name: "IDFA - International Documentary Festival Amsterdam", city: "Amsterdam", country: "Netherlands", tier: "Doc", formats: ["Doc"], earlyDeadline: "Jun", regularDeadline: "Aug", notificationWindow: "Late Oct", feeUSD: "Free", premiereRule: "Intl Premiere", url: "https://www.idfa.nl" },
    { name: "Hot Docs", city: "Toronto", country: "Canada", tier: "Doc", formats: ["Doc"], earlyDeadline: "Sep", regularDeadline: "Nov", notificationWindow: "Mid-Mar", feeUSD: "$50–$95", premiereRule: "Flexible", url: "https://www.hotdocs.ca" },
    { name: "DOC NYC", city: "New York", country: "USA", tier: "Doc", formats: ["Doc"], earlyDeadline: "May", regularDeadline: "Jul", notificationWindow: "Mid-Sep", feeUSD: "$50–$95", premiereRule: "NY Premiere", url: "https://www.docnyc.net" },
    { name: "Sheffield DocFest", city: "Sheffield", country: "UK", tier: "Doc", formats: ["Doc"], earlyDeadline: "Dec", regularDeadline: "Feb", notificationWindow: "Mid-Apr", feeUSD: "£40–£80", premiereRule: "Flexible", url: "https://www.sheffdocfest.com" },
    { name: "Clermont-Ferrand Short Film Festival", city: "Clermont-Ferrand", country: "France", tier: "Short", formats: ["Short"], earlyDeadline: "Aug", regularDeadline: "Sep", notificationWindow: "Mid-Dec", feeUSD: "Free", premiereRule: "Flexible", url: "https://clermont-filmfest.org" },
    { name: "Palm Springs International ShortFest", city: "Palm Springs", country: "USA", tier: "Short", formats: ["Short"], earlyDeadline: "Feb", regularDeadline: "Apr", notificationWindow: "Late May", feeUSD: "$45–$90", premiereRule: "Oscar-qualifying", url: "https://www.psfilmfest.org/shortfest" },
    { name: "Aspen Shortsfest", city: "Aspen", country: "USA", tier: "Short", formats: ["Short"], earlyDeadline: "Sep", regularDeadline: "Nov", notificationWindow: "Mid-Feb", feeUSD: "$45–$75", premiereRule: "Oscar-qualifying", url: "https://www.aspenfilm.org" },
    { name: "AFI Fest", city: "Los Angeles", country: "USA", tier: "Premiere", formats: ["Feature","Short","Doc"], earlyDeadline: "Jun", regularDeadline: "Aug", notificationWindow: "Mid-Oct", feeUSD: "$45–$95", premiereRule: "LA Premiere", url: "https://fest.afi.com" },
    { name: "Annecy International Animation Festival", city: "Annecy", country: "France", tier: "Genre", formats: ["Animation"], earlyDeadline: "Jan", regularDeadline: "Mar", notificationWindow: "Late Apr", feeUSD: "Free", premiereRule: "Flexible", url: "https://www.annecyfestival.com" },
    { name: "Beyond Fest", city: "Los Angeles", country: "USA", tier: "Genre", formats: ["Feature","Short"], earlyDeadline: "Jun", regularDeadline: "Jul", notificationWindow: "Late Aug", feeUSD: "$30–$50", premiereRule: "Flexible", url: "https://beyondfest.com" },
    { name: "CPH:DOX", city: "Copenhagen", country: "Denmark", tier: "Doc", formats: ["Doc"], earlyDeadline: "Oct", regularDeadline: "Dec", notificationWindow: "Mid-Feb", feeUSD: "Free", premiereRule: "Flexible", url: "https://cphdox.dk" },
    { name: "True/False Film Fest", city: "Columbia, MO", country: "USA", tier: "Doc", formats: ["Doc"], earlyDeadline: "Sep", regularDeadline: "Nov", notificationWindow: "Late Dec", feeUSD: "$30–$50", premiereRule: "Flexible", url: "https://truefalse.org" },
    { name: "Visions du Réel", city: "Nyon", country: "Switzerland", tier: "Doc", formats: ["Doc"], earlyDeadline: "Oct", regularDeadline: "Dec", notificationWindow: "Mid-Feb", feeUSD: "Free", premiereRule: "Intl Premiere", url: "https://www.visionsdureel.ch" },
    { name: "Mar del Plata International Film Festival", city: "Mar del Plata", country: "Argentina", tier: "A", formats: ["Feature","Short"], earlyDeadline: "Aug", regularDeadline: "Sep", notificationWindow: "Mid-Oct", feeUSD: "Free", premiereRule: "Latin American Premiere", url: "https://www.mardelplatafilmfest.com" },
    { name: "San Sebastián Film Festival", city: "San Sebastián", country: "Spain", tier: "A", formats: ["Feature","Short"], earlyDeadline: "Apr", regularDeadline: "Jun", notificationWindow: "Late Jul", feeUSD: "Free", premiereRule: "World Premiere", url: "https://www.sansebastianfestival.com" },
    { name: "Karlovy Vary International Film Festival", city: "Karlovy Vary", country: "Czechia", tier: "A", formats: ["Feature","Short"], earlyDeadline: "Mar", regularDeadline: "Apr", notificationWindow: "Mid-Jun", feeUSD: "Free", premiereRule: "Intl Premiere", url: "https://www.kviff.com" },
    { name: "International Film Festival Rotterdam (IFFR)", city: "Rotterdam", country: "Netherlands", tier: "Premiere", formats: ["Feature","Short"], earlyDeadline: "Aug", regularDeadline: "Oct", notificationWindow: "Mid-Dec", feeUSD: "Free", premiereRule: "World/Intl Premiere", url: "https://iffr.com" },
    { name: "FIDMarseille", city: "Marseille", country: "France", tier: "Premiere", formats: ["Feature","Short","Doc"], earlyDeadline: "Jan", regularDeadline: "Mar", notificationWindow: "Late May", feeUSD: "Free", premiereRule: "Flexible", url: "https://fidmarseille.org" },
    { name: "South by Southwest Sydney", city: "Sydney", country: "Australia", tier: "Premiere", formats: ["Feature","Short"], earlyDeadline: "Apr", regularDeadline: "Jun", notificationWindow: "Late Aug", feeUSD: "$45–$95", premiereRule: "Flexible", url: "https://sxswsydney.com" },
  ];

  const STATUS_CONFIG: Record<FestivalStatus, { label: string; color: string; bg: string }> = {
    interested:  { label: "Interested",  color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
    preparing:   { label: "Preparing",   color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
    submitted:   { label: "Submitted",   color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
    selected:    { label: "Selected",    color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
    passed:      { label: "Passed",      color: "#f87171", bg: "rgba(248,113,113,0.1)" },
    won:         { label: "Won! 🏆",    color: "#D4AF37", bg: "rgba(212,175,55,0.15)" },
  };

  const STATUSES = Object.keys(STATUS_CONFIG) as FestivalStatus[];
  const STORAGE_KEY = "virelle.festivals.tracker.v2";

  function loadTracking(): Record<string, TrackEntry> {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  }
  function saveTracking(data: Record<string, TrackEntry>) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }

  function FilmFreewayLink({ festival, projectTitle }: { festival: Festival; projectTitle?: string }) {
    const query = encodeURIComponent(festival.name);
    const url = `https://filmfreeway.com/search?q=${query}`;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-md transition-colors hover:bg-white/10"
        style={{ background:"rgba(255,99,71,0.1)", color:"#ff6347", border:"1px solid rgba(255,99,71,0.2)" }}
        onClick={e => e.stopPropagation()}>
        <FilmIcon className="h-3 w-3" />FilmFreeway
        <ExternalLink className="h-2.5 w-2.5" />
      </a>
    );
  }

  function SubmissionDialog({ festival, entry, projects, onSave, onClose }: {
    festival: Festival; entry?: TrackEntry;
    projects: any[]; onSave: (e: TrackEntry) => void; onClose: () => void;
  }) {
    const [status, setStatus]   = useState<FestivalStatus>(entry?.status || "interested");
    const [projectId, setProjectId] = useState(entry?.projectId?.toString() || "");
    const [notes, setNotes]     = useState(entry?.notes || "");
    const [fee, setFee]         = useState(entry?.submissionFee?.toString() || "");
    const [date, setDate]       = useState(entry?.submittedDate || "");

    function save() {
      const selProject = projects.find(p => p.id.toString() === projectId);
      onSave({
        status,
        projectId:    selProject ? selProject.id : undefined,
        projectTitle: selProject ? selProject.title : undefined,
        notes,
        submissionFee: fee ? Number(fee) : undefined,
        submittedDate: date || undefined,
        trackedAt:    entry?.trackedAt || new Date().toISOString(),
      });
      onClose();
    }

    return (
      <DialogContent className="max-w-md" style={{ background:"#0c0b18", borderColor:"rgba(255,255,255,0.1)" }}>
        <DialogHeader>
          <DialogTitle className="font-serif text-base" style={{ color:"#D4AF37" }}>Track: {festival.name}</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{festival.city}, {festival.country}</p>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Status</label>
            <div className="grid grid-cols-3 gap-1.5">
              {STATUSES.map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className="rounded-lg px-2 py-2 text-[10px] font-semibold border transition-all text-center"
                  style={{
                    borderColor: status===s ? STATUS_CONFIG[s].color + "80" : "rgba(255,255,255,0.08)",
                    background:  status===s ? STATUS_CONFIG[s].bg : "transparent",
                    color:       status===s ? STATUS_CONFIG[s].color : "rgba(255,255,255,0.4)",
                  }}>
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
          {projects.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Project</label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-9 text-xs bg-white/5 border-white/10"><SelectValue placeholder="Link to project…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">— No project —</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id.toString()} className="text-xs">{p.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Submission Date</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="h-9 text-xs bg-white/5 border-white/10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Fee Paid (USD)</label>
              <Input type="number" value={fee} onChange={e => setFee(e.target.value)}
                placeholder="0" className="h-9 text-xs bg-white/5 border-white/10" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Notes</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Screener link, contact, waiver code…"
              className="text-xs min-h-[72px] bg-white/5 border-white/10 resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 h-9 text-xs border-white/10" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 h-9 text-xs gap-2" onClick={save}
              style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000" }}>
              <CheckCircle2 className="h-3.5 w-3.5" />Save
            </Button>
          </div>
        </div>
      </DialogContent>
    );
  }

  export default function FestivalTracker() {
    const { user } = useAuth();
    const { data: projects } = trpc.project.list.useQuery(undefined, { enabled: !!user });

    const [tracking, setTracking] = useState<Record<string, TrackEntry>>(() => loadTracking());
    const [search, setSearch] = useState("");
    const [tierFilter, setTierFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [editFestival, setEditFestival] = useState<Festival | null>(null);

    function saveEntry(name: string, entry: TrackEntry | null) {
      setTracking(prev => {
        const next = { ...prev };
        if (entry) next[name] = entry;
        else delete next[name];
        saveTracking(next);
        return next;
      });
    }

    const visible = useMemo(() => {
      const q = search.toLowerCase();
      return FESTIVALS.filter(f => {
        if (tierFilter !== "all" && f.tier !== tierFilter) return false;
        if (statusFilter !== "all") {
          if (statusFilter === "tracked") {
            if (!tracking[f.name]) return false;
          } else {
            if (tracking[f.name]?.status !== statusFilter) return false;
          }
        }
        if (!q) return true;
        return [f.name, f.city, f.country, ...f.formats].some(x => x.toLowerCase().includes(q));
      });
    }, [search, tierFilter, statusFilter, tracking]);

    const stats = useMemo(() => {
      const out: Partial<Record<FestivalStatus, number>> = {};
      const totalFee = Object.values(tracking).reduce((s, e) => s + (e.submissionFee || 0), 0);
      for (const e of Object.values(tracking)) out[e.status] = (out[e.status] ?? 0) + 1;
      return { ...out, totalFee };
    }, [tracking]);

    const tiers = ["all", "A", "Premiere", "Genre", "Doc", "Short"];

    return (
      <div className="min-h-screen pb-10" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        <div className="container mx-auto p-4 max-w-6xl space-y-5">
          {/* Header */}
          <div className="flex items-start gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="min-h-[44px] gap-2"><ArrowLeft className="h-4 w-4" />Dashboard</Button>
            </Link>
            <div>
              <div className="text-xs uppercase tracking-widest text-amber-500/80">Stage 8 · Release & Promote</div>
              <h1 className="font-serif text-3xl flex items-center gap-2">
                <Trophy className="h-6 w-6 text-amber-400" />Festival Tracker
              </h1>
              <p className="text-sm text-muted-foreground">{FESTIVALS.length} festivals worldwide · Project-linked tracking · FilmFreeway quick-submit</p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatusFilter(statusFilter===s ? "all" : s)}
                className="rounded-xl border px-3 py-2.5 text-left transition-all"
                style={{
                  borderColor: statusFilter===s ? STATUS_CONFIG[s].color + "60" : "rgba(255,255,255,0.07)",
                  background:  statusFilter===s ? STATUS_CONFIG[s].bg : "rgba(255,255,255,0.02)",
                }}>
                <div className="text-[10px] text-muted-foreground">{STATUS_CONFIG[s].label}</div>
                <div className="text-lg font-bold mt-0.5" style={{ color: STATUS_CONFIG[s].color }}>{stats[s] ?? 0}</div>
              </button>
            ))}
            <div className="rounded-xl border px-3 py-2.5" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" />Total Fees</div>
              <div className="text-lg font-bold mt-0.5" style={{ color:"#D4AF37" }}>${(stats as any).totalFee?.toLocaleString() || 0}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search festivals, cities, formats…"
                className="pl-9 min-h-[38px] bg-white/5 border-white/10" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {tiers.map(t => (
                <button key={t} onClick={() => setTierFilter(t)}
                  className="px-3 py-1.5 rounded-lg text-xs border transition-all"
                  style={{
                    borderColor: tierFilter===t ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.1)",
                    background:  tierFilter===t ? "rgba(212,175,55,0.1)" : "transparent",
                    color:       tierFilter===t ? "#D4AF37" : "rgba(255,255,255,0.5)",
                  }}>
                  {t === "all" ? "All" : t}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">{visible.length} shown</p>
          </div>

          {/* Festival table */}
          <div className="space-y-1.5">
            {visible.map(f => {
              const entry = tracking[f.name];
              const cfg = entry ? STATUS_CONFIG[entry.status] : null;
              return (
                <div key={f.name}
                  className="rounded-xl border px-4 py-3 transition-all hover:bg-white/[0.02]"
                  style={{ borderColor: cfg ? cfg.color + "30" : "rgba(255,255,255,0.07)", background: cfg ? cfg.bg + "40" : "rgba(255,255,255,0.01)" }}>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Left: festival info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{f.name}</span>
                        <Badge className="text-[9px] border-0 px-1.5 py-0 shrink-0"
                          style={{ background:"rgba(212,175,55,0.1)", color:"#D4AF37" }}>{f.tier}</Badge>
                        {entry?.status === "won" && <Star className="h-3.5 w-3.5 text-amber-400" />}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Globe2 className="h-3 w-3" />{f.city}, {f.country}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />Reg. deadline: {f.regularDeadline}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />{f.feeUSD}
                        </span>
                        {f.formats.map(fmt => (
                          <Badge key={fmt} className="text-[9px] border-0 px-1.5 py-0"
                            style={{ background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.4)" }}>{fmt}</Badge>
                        ))}
                      </div>
                      {entry && (
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge className="text-[10px] border-0 px-2 py-0.5"
                            style={{ background: cfg!.bg, color: cfg!.color }}>{cfg!.label}</Badge>
                          {entry.projectTitle && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <FilmIcon className="h-3 w-3" />{entry.projectTitle}
                            </span>
                          )}
                          {entry.notes && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={entry.notes}>
                              "{entry.notes}"
                            </span>
                          )}
                          {entry.submittedDate && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />Submitted {entry.submittedDate}
                            </span>
                          )}
                          {entry.submissionFee != null && entry.submissionFee > 0 && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />${entry.submissionFee} paid
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <FilmFreewayLink festival={f} />
                      <a href={f.url} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md hover:bg-white/10 transition-colors"
                        style={{ color:"rgba(255,255,255,0.4)", border:"1px solid rgba(255,255,255,0.1)" }}>
                        <Globe2 className="h-3 w-3" />Site<ExternalLink className="h-2.5 w-2.5" />
                      </a>
                      <Button size="sm" variant="ghost" className="h-8 px-3 gap-1.5 text-xs"
                        style={{ background: entry ? "rgba(212,175,55,0.07)" : "rgba(255,255,255,0.05)" }}
                        onClick={() => setEditFestival(f)}>
                        {entry ? <Edit3 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        {entry ? "Edit" : "Track"}
                      </Button>
                      {entry && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-500/10"
                          onClick={() => saveEntry(f.name, null)}>
                          <Trash2 className="h-3.5 w-3.5" style={{ color:"#f87171" }} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submission dialog */}
        <Dialog open={!!editFestival} onOpenChange={open => !open && setEditFestival(null)}>
          {editFestival && (
            <SubmissionDialog
              festival={editFestival}
              entry={tracking[editFestival.name]}
              projects={projects ?? []}
              onSave={e => saveEntry(editFestival.name, e)}
              onClose={() => setEditFestival(null)}
            />
          )}
        </Dialog>
      </div>
    );
  }
  