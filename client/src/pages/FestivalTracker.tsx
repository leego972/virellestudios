import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, ExternalLink, Search, Trophy, Globe2 } from "lucide-react";

type FestivalStatus = "interested" | "preparing" | "submitted" | "selected" | "passed" | "won";

interface Festival {
  name: string;
  city: string;
  country: string;
  tier: "A" | "Premiere" | "Genre" | "Regional" | "Doc" | "Short";
  formats: string[];
  earlyDeadline: string;
  regularDeadline: string;
  notificationWindow: string;
  feeUSD: string;
  premiereRule: string;
  url: string;
}

const FESTIVALS: Festival[] = [
  { name: "Sundance Film Festival", city: "Park City", country: "USA", tier: "A", formats: ["Feature", "Short", "Doc"], earlyDeadline: "Aug", regularDeadline: "Sep", notificationWindow: "Late Nov", feeUSD: "$60-$120", premiereRule: "World/US Premiere", url: "https://festival.sundance.org" },
  { name: "Cannes Film Festival", city: "Cannes", country: "France", tier: "A", formats: ["Feature", "Short"], earlyDeadline: "Jan", regularDeadline: "Mar", notificationWindow: "Mid-Apr", feeUSD: "Free (selective)", premiereRule: "World Premiere", url: "https://www.festival-cannes.com" },
  { name: "Berlin International Film Festival", city: "Berlin", country: "Germany", tier: "A", formats: ["Feature", "Short", "Doc"], earlyDeadline: "Sep", regularDeadline: "Nov", notificationWindow: "Mid-Jan", feeUSD: "Free (selective)", premiereRule: "World/Intl Premiere", url: "https://www.berlinale.de" },
  { name: "Venice Film Festival", city: "Venice", country: "Italy", tier: "A", formats: ["Feature", "Short", "VR"], earlyDeadline: "May", regularDeadline: "Jun", notificationWindow: "Late Jul", feeUSD: "Free (selective)", premiereRule: "World Premiere", url: "https://www.labiennale.org/en/cinema" },
  { name: "Toronto International Film Festival (TIFF)", city: "Toronto", country: "Canada", tier: "A", formats: ["Feature", "Short", "Doc"], earlyDeadline: "Apr", regularDeadline: "Jul", notificationWindow: "Late Jul", feeUSD: "$60-$100", premiereRule: "World/N.A. Premiere", url: "https://tiff.net" },
  { name: "SXSW Film & TV Festival", city: "Austin", country: "USA", tier: "Premiere", formats: ["Feature", "Short", "Episodic", "XR"], earlyDeadline: "Sep", regularDeadline: "Nov", notificationWindow: "Mid-Feb", feeUSD: "$45-$95", premiereRule: "Flexible", url: "https://www.sxsw.com/festivals/film" },
  { name: "Tribeca Film Festival", city: "New York", country: "USA", tier: "Premiere", formats: ["Feature", "Short", "Doc", "Episodic"], earlyDeadline: "Sep", regularDeadline: "Dec", notificationWindow: "Mid-Apr", feeUSD: "$50-$110", premiereRule: "World/US Premiere", url: "https://tribecafilm.com/festival" },
  { name: "Telluride Film Festival", city: "Telluride", country: "USA", tier: "Premiere", formats: ["Feature", "Short"], earlyDeadline: "Jun", regularDeadline: "Jul", notificationWindow: "Late Aug", feeUSD: "Free (selective)", premiereRule: "Flexible", url: "https://telluridefilmfestival.org" },
  { name: "New York Film Festival", city: "New York", country: "USA", tier: "Premiere", formats: ["Feature", "Short", "Doc"], earlyDeadline: "May", regularDeadline: "Jun", notificationWindow: "Late Jul", feeUSD: "Free (selective)", premiereRule: "Flexible", url: "https://www.filmlinc.org/nyff" },
  { name: "Locarno Film Festival", city: "Locarno", country: "Switzerland", tier: "A", formats: ["Feature", "Short"], earlyDeadline: "Mar", regularDeadline: "Apr", notificationWindow: "Late Jun", feeUSD: "Free", premiereRule: "World/Intl Premiere", url: "https://www.locarnofestival.ch" },
  { name: "International Film Festival Rotterdam (IFFR)", city: "Rotterdam", country: "Netherlands", tier: "Premiere", formats: ["Feature", "Short"], earlyDeadline: "Aug", regularDeadline: "Oct", notificationWindow: "Mid-Dec", feeUSD: "Free", premiereRule: "World/Intl Premiere", url: "https://iffr.com" },
  { name: "San SebastiÃÂ¡n Film Festival", city: "San SebastiÃÂ¡n", country: "Spain", tier: "A", formats: ["Feature", "Short"], earlyDeadline: "Apr", regularDeadline: "Jun", notificationWindow: "Late Jul", feeUSD: "Free", premiereRule: "World Premiere", url: "https://www.sansebastianfestival.com" },
  { name: "Karlovy Vary International Film Festival", city: "Karlovy Vary", country: "Czechia", tier: "A", formats: ["Feature", "Short"], earlyDeadline: "Mar", regularDeadline: "Apr", notificationWindow: "Mid-Jun", feeUSD: "Free", premiereRule: "Intl Premiere", url: "https://www.kviff.com" },
  { name: "BFI London Film Festival", city: "London", country: "UK", tier: "Premiere", formats: ["Feature", "Short", "Doc"], earlyDeadline: "May", regularDeadline: "Jun", notificationWindow: "Late Aug", feeUSD: "ÃÂ£35-ÃÂ£70", premiereRule: "UK Premiere", url: "https://www.bfi.org.uk/london-film-festival" },
  { name: "Busan International Film Festival", city: "Busan", country: "South Korea", tier: "A", formats: ["Feature", "Short", "Doc"], earlyDeadline: "Apr", regularDeadline: "Jul", notificationWindow: "Mid-Sep", feeUSD: "Free", premiereRule: "Asian Premiere", url: "https://www.biff.kr" },
  { name: "Tokyo International Film Festival", city: "Tokyo", country: "Japan", tier: "A", formats: ["Feature", "Short"], earlyDeadline: "Jun", regularDeadline: "Aug", notificationWindow: "Late Sep", feeUSD: "Free", premiereRule: "Asian Premiere", url: "https://www.tiff-jp.net" },
  { name: "Sitges - International Fantastic Film Festival", city: "Sitges", country: "Spain", tier: "Genre", formats: ["Feature", "Short"], earlyDeadline: "Apr", regularDeadline: "Jun", notificationWindow: "Late Aug", feeUSD: "Ã¢ÂÂ¬25-Ã¢ÂÂ¬60", premiereRule: "Flexible", url: "https://sitgesfilmfestival.com" },
  { name: "Fantasia International Film Festival", city: "Montreal", country: "Canada", tier: "Genre", formats: ["Feature", "Short"], earlyDeadline: "Mar", regularDeadline: "Apr", notificationWindow: "Mid-Jun", feeUSD: "$30-$60", premiereRule: "Flexible", url: "https://fantasiafestival.com" },
  { name: "Beyond Fest", city: "Los Angeles", country: "USA", tier: "Genre", formats: ["Feature", "Short"], earlyDeadline: "Jun", regularDeadline: "Jul", notificationWindow: "Late Aug", feeUSD: "$30-$50", premiereRule: "Flexible", url: "https://beyondfest.com" },
  { name: "IDFA - International Documentary Festival Amsterdam", city: "Amsterdam", country: "Netherlands", tier: "Doc", formats: ["Doc"], earlyDeadline: "Jun", regularDeadline: "Aug", notificationWindow: "Late Oct", feeUSD: "Free", premiereRule: "Intl Premiere", url: "https://www.idfa.nl" },
  { name: "Hot Docs", city: "Toronto", country: "Canada", tier: "Doc", formats: ["Doc"], earlyDeadline: "Sep", regularDeadline: "Nov", notificationWindow: "Mid-Mar", feeUSD: "$50-$95", premiereRule: "Flexible", url: "https://www.hotdocs.ca" },
  { name: "DOC NYC", city: "New York", country: "USA", tier: "Doc", formats: ["Doc"], earlyDeadline: "May", regularDeadline: "Jul", notificationWindow: "Mid-Sep", feeUSD: "$50-$95", premiereRule: "NY Premiere", url: "https://www.docnyc.net" },
  { name: "Sheffield DocFest", city: "Sheffield", country: "UK", tier: "Doc", formats: ["Doc"], earlyDeadline: "Dec", regularDeadline: "Feb", notificationWindow: "Mid-Apr", feeUSD: "ÃÂ£40-ÃÂ£80", premiereRule: "Flexible", url: "https://www.sheffdocfest.com" },
  { name: "CPH:DOX", city: "Copenhagen", country: "Denmark", tier: "Doc", formats: ["Doc"], earlyDeadline: "Oct", regularDeadline: "Dec", notificationWindow: "Mid-Feb", feeUSD: "Free", premiereRule: "Flexible", url: "https://cphdox.dk" },
  { name: "True/False Film Fest", city: "Columbia, MO", country: "USA", tier: "Doc", formats: ["Doc"], earlyDeadline: "Sep", regularDeadline: "Nov", notificationWindow: "Late Dec", feeUSD: "$30-$50", premiereRule: "Flexible", url: "https://truefalse.org" },
  { name: "Visions du RÃÂ©el", city: "Nyon", country: "Switzerland", tier: "Doc", formats: ["Doc"], earlyDeadline: "Oct", regularDeadline: "Dec", notificationWindow: "Mid-Feb", feeUSD: "Free", premiereRule: "Intl Premiere", url: "https://www.visionsdureel.ch" },
  { name: "Clermont-Ferrand Short Film Festival", city: "Clermont-Ferrand", country: "France", tier: "Short", formats: ["Short"], earlyDeadline: "Aug", regularDeadline: "Sep", notificationWindow: "Mid-Dec", feeUSD: "Free", premiereRule: "Flexible", url: "https://clermont-filmfest.org" },
  { name: "Palm Springs International ShortFest", city: "Palm Springs", country: "USA", tier: "Short", formats: ["Short"], earlyDeadline: "Feb", regularDeadline: "Apr", notificationWindow: "Late May", feeUSD: "$45-$90", premiereRule: "Flexible (Oscar-qualifying)", url: "https://www.psfilmfest.org/shortfest" },
  { name: "Aspen Shortsfest", city: "Aspen", country: "USA", tier: "Short", formats: ["Short"], earlyDeadline: "Sep", regularDeadline: "Nov", notificationWindow: "Mid-Feb", feeUSD: "$45-$75", premiereRule: "Flexible (Oscar-qualifying)", url: "https://www.aspenfilm.org" },
  { name: "Annecy International Animation Festival", city: "Annecy", country: "France", tier: "Genre", formats: ["Animation"], earlyDeadline: "Jan", regularDeadline: "Mar", notificationWindow: "Late Apr", feeUSD: "Free", premiereRule: "Flexible", url: "https://www.annecyfestival.com" },
  { name: "AFI Fest", city: "Los Angeles", country: "USA", tier: "Premiere", formats: ["Feature", "Short", "Doc"], earlyDeadline: "Jun", regularDeadline: "Aug", notificationWindow: "Mid-Oct", feeUSD: "$45-$95", premiereRule: "LA Premiere", url: "https://fest.afi.com" },
  { name: "South by Southwest (SXSW) Sydney", city: "Sydney", country: "Australia", tier: "Premiere", formats: ["Feature", "Short"], earlyDeadline: "Apr", regularDeadline: "Jun", notificationWindow: "Late Aug", feeUSD: "$45-$95", premiereRule: "Flexible", url: "https://sxswsydney.com" },
  { name: "Mar del Plata International Film Festival", city: "Mar del Plata", country: "Argentina", tier: "A", formats: ["Feature", "Short"], earlyDeadline: "Aug", regularDeadline: "Sep", notificationWindow: "Mid-Oct", feeUSD: "Free", premiereRule: "Latin American Premiere", url: "https://www.mardelplatafilmfest.com" },
  { name: "FIDMarseille", city: "Marseille", country: "France", tier: "Premiere", formats: ["Feature", "Short", "Doc"], earlyDeadline: "Jan", regularDeadline: "Mar", notificationWindow: "Late May", feeUSD: "Free", premiereRule: "Flexible", url: "https://fidmarseille.org" },
];

const STATUS_LABELS: Record<FestivalStatus, string> = {
  interested: "Interested",
  preparing: "Preparing",
  submitted: "Submitted",
  selected: "Selected",
  passed: "Passed",
  won: "Won",
};

const STATUS_COLORS: Record<FestivalStatus, string> = {
  interested: "bg-slate-500/20 text-slate-300",
  preparing: "bg-blue-500/20 text-blue-300",
  submitted: "bg-amber-500/20 text-amber-300",
  selected: "bg-emerald-500/20 text-emerald-300",
  passed: "bg-rose-500/20 text-rose-300",
  won: "bg-yellow-500/20 text-yellow-300",
};

const STORAGE_KEY = "virelle.festivals.tracker.v1";

export default function FestivalTracker() {
  const [tracking, setTracking] = useState<Record<string, FestivalStatus>>({});
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTracking(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  function setStatus(name: string, status: FestivalStatus | null) {
    setTracking((prev) => {
      const next = { ...prev };
      if (status) next[name] = status;
      else delete next[name];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return FESTIVALS.filter((f) => {
      if (tierFilter !== "all" && f.tier !== tierFilter) return false;
      if (!q) return true;
      return [f.name, f.city, f.country, f.formats.join(" ")].some((x) => x.toLowerCase().includes(q));
    });
  }, [search, tierFilter]);

  const tiers = ["all", "A", "Premiere", "Genre", "Doc", "Short", "Regional"];
  const stats = useMemo(() => {
    const out: Partial<Record<FestivalStatus, number>> = {};
    for (const s of Object.values(tracking)) out[s] = (out[s] ?? 0) + 1;
    return out;
  }, [tracking]);

  return (
    <div className="min-h-screen pb-10" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="min-h-[44px]"><ArrowLeft className="h-4 w-4 mr-2" />Dashboard</Button>
        </Link>
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-500/80">Stage 8 ÃÂ· Release & Promote</div>
          <h1 className="font-serif text-3xl flex items-center gap-2 gradient-text-gold"><Trophy className="h-6 w-6 text-amber-400" /> Festival Tracker</h1>
          <p className="text-sm text-muted-foreground">Curated directory of {FESTIVALS.length} festivals worldwide. Tracking saved on this device.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {(Object.keys(STATUS_LABELS) as FestivalStatus[]).map((s) => (
          <Badge key={s} className={STATUS_COLORS[s] + " border-0"}>{STATUS_LABELS[s]}: {stats[s] ?? 0}</Badge>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search festivals, cities, formatsÃ¢ÂÂ¦" className="pl-9 min-h-[44px]" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {tiers.map((t) => (
            <Button key={t} size="sm" variant={tierFilter === t ? "default" : "outline"} onClick={() => setTierFilter(t)} className="min-h-[44px]">
              {t === "all" ? "All tiers" : t}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visible.map((f) => {
          const status = tracking[f.name];
          return (
            <Card key={f.name} className={status ? "border-amber-500/30" : ""}>
              <CardHeader className="pb-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base leading-snug gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">{f.name}</CardTitle>
                    <CardDescription className="text-xs flex items-center gap-1 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow"><Globe2 className="h-3 w-3" />{f.city}, {f.country} ÃÂ· Tier {f.tier}</CardDescription>
                  </div>
                  {status && <Badge className={STATUS_COLORS[status] + " border-0 whitespace-nowrap"}>{STATUS_LABELS[status]}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs pb-4 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <div className="flex flex-wrap gap-1">
                  {f.formats.map((x) => <Badge key={x} variant="outline" className="text-[10px]">{x}</Badge>)}
                </div>
                <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                  <span><Calendar className="h-3 w-3 inline mr-1" />Early: {f.earlyDeadline}</span>
                  <span><Calendar className="h-3 w-3 inline mr-1" />Regular: {f.regularDeadline}</span>
                  <span>Notification: {f.notificationWindow}</span>
                  <span>Fee: {f.feeUSD}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">Premiere: {f.premiereRule}</div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {(Object.keys(STATUS_LABELS) as FestivalStatus[]).map((s) => (
                    <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(f.name, status === s ? null : s)} className="text-[10px] h-7 px-2 min-h-[44px] sm:min-h-[28px]">
                      {STATUS_LABELS[s]}
                    </Button>
                  ))}
                  <a href={f.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center text-amber-400 hover:underline text-[11px]">
                    Site <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
        </div>
  );
}
