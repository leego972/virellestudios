import { useState, useMemo } from "react";
  import { BarChart3, TrendingUp, Film, DollarSign, Calendar, Globe, Star, Search, Filter, ExternalLink, Info } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Badge } from "@/components/ui/badge";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Separator } from "@/components/ui/separator";
  import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

  interface CompFilm {
    title: string;
    year: number;
    genre: string;
    budget: string;
    budgetUSD: number;
    domestic: string;
    worldwide: string;
    worldwideUSD: number;
    distribution: string;
    festivalRun: string;
    tone: string;
    budgetTier: "micro" | "low" | "mid" | "high";
    roi: number;
    notableFor: string;
  }

  const COMP_DATA: CompFilm[] = [
    { title: "Tangerine", year: 2015, genre: "Drama", budget: "$100K", budgetUSD: 100000, domestic: "$700K", worldwide: "$1.1M", worldwideUSD: 1100000, distribution: "Magnolia Pictures", festivalRun: "Sundance, SXSW", tone: "Raw / Comedic", budgetTier: "micro", roi: 11, notableFor: "Shot on iPhone. Sundance breakout. Streaming pick-up." },
    { title: "Paranormal Activity", year: 2007, genre: "Horror", budget: "$15K", budgetUSD: 15000, domestic: "$107M", worldwide: "$194M", worldwideUSD: 194000000, distribution: "Paramount (acquired)", festivalRun: "Screamfest", tone: "Found Footage / Horror", budgetTier: "micro", roi: 12933, notableFor: "All-time highest ROI horror film. Word-of-mouth viral marketing." },
    { title: "The Florida Project", year: 2017, genre: "Drama", budget: "$2M", budgetUSD: 2000000, domestic: "$6.2M", worldwide: "$10.8M", worldwideUSD: 10800000, distribution: "A24", festivalRun: "Cannes (Un Certain Regard)", tone: "Social Realist", budgetTier: "low", roi: 5.4, notableFor: "A24 sleeper hit. Strong awards run on micro budget." },
    { title: "Get Out", year: 2017, genre: "Horror/Thriller", budget: "$4.5M", budgetUSD: 4500000, domestic: "$176M", worldwide: "$255M", worldwideUSD: 255000000, distribution: "Universal Pictures", festivalRun: "Sundance", tone: "Social Horror", budgetTier: "low", roi: 56.7, notableFor: "Genre subversion. Oscar winner. Proof of concept for social horror." },
    { title: "Lady Bird", year: 2017, genre: "Drama/Coming-of-Age", budget: "$10M", budgetUSD: 10000000, domestic: "$48M", worldwide: "$78M", worldwideUSD: 78000000, distribution: "A24", festivalRun: "Telluride, Toronto", tone: "Intimate / Comedic", budgetTier: "mid", roi: 7.8, notableFor: "100% Rotten Tomatoes. Strong female-led indie blueprint." },
    { title: "Moonlight", year: 2016, genre: "Drama", budget: "$1.5M", budgetUSD: 1500000, domestic: "$27M", worldwide: "$65M", worldwideUSD: 65000000, distribution: "A24", festivalRun: "Telluride, Toronto, NYFF", tone: "Lyrical / Intimate", budgetTier: "low", roi: 43.3, notableFor: "Best Picture winner. Proof A24 can win big on tiny budgets." },
    { title: "Whiplash", year: 2014, genre: "Drama/Music", budget: "$3.3M", budgetUSD: 3300000, domestic: "$13M", worldwide: "$49M", worldwideUSD: 49000000, distribution: "Sony Classics", festivalRun: "Sundance Grand Jury Prize", tone: "Intense / Psychological", budgetTier: "low", roi: 14.8, notableFor: "Sundance winner. Three Oscars. Master-class in escalating tension." },
    { title: "Hereditary", year: 2018, genre: "Horror", budget: "$10M", budgetUSD: 10000000, domestic: "$44M", worldwide: "$80M", worldwideUSD: 80000000, distribution: "A24", festivalRun: "Sundance", tone: "Elevated Horror", budgetTier: "mid", roi: 8, notableFor: "A24 elevated horror template. Strong critical consensus driving VOD." },
    { title: "The Witch", year: 2015, genre: "Horror", budget: "$3.5M", budgetUSD: 3500000, domestic: "$25M", worldwide: "$40M", worldwideUSD: 40000000, distribution: "A24", festivalRun: "Sundance Directing Prize", tone: "Slow Burn / Folk Horror", budgetTier: "low", roi: 11.4, notableFor: "Slow burn horror. Film festival to theatrical pipeline." },
    { title: "Minari", year: 2020, genre: "Drama", budget: "$2M", budgetUSD: 2000000, domestic: "$2.2M", worldwide: "$4M", worldwideUSD: 4000000, distribution: "A24", festivalRun: "Sundance Grand Jury Prize", tone: "Quiet / Family", budgetTier: "low", roi: 2, notableFor: "Golden Globe, Oscar nominations. Niche-to-mainstream crossover." },
    { title: "Napoleon Dynamite", year: 2004, genre: "Comedy", budget: "$400K", budgetUSD: 400000, domestic: "$46M", worldwide: "$46M", worldwideUSD: 46000000, distribution: "Fox Searchlight", festivalRun: "Sundance Audience Award", tone: "Deadpan / Quirky", budgetTier: "micro", roi: 115, notableFor: "Sundance cult classic. Word-of-mouth marketing masterclass." },
    { title: "Beasts of the Southern Wild", year: 2012, genre: "Drama/Fantasy", budget: "$1.8M", budgetUSD: 1800000, domestic: "$12.8M", worldwide: "$21M", worldwideUSD: 21000000, distribution: "Fox Searchlight", festivalRun: "Sundance Camera d'Or, Cannes", tone: "Magical Realist", budgetTier: "low", roi: 11.7, notableFor: "Cannes & Sundance double. Non-professional cast. Oscar nominations." },
    { title: "Searching", year: 2018, genre: "Thriller", budget: "$880K", budgetUSD: 880000, domestic: "$26M", worldwide: "$75M", worldwideUSD: 75000000, distribution: "Sony (acquired from Sundance)", festivalRun: "Sundance Audience Award", tone: "Tech-Thriller / Screen Life", budgetTier: "micro", roi: 85.2, notableFor: "Screen-life format. Asian-American lead. Huge Sundance pick-up." },
    { title: "Eighth Grade", year: 2018, genre: "Drama/Comedy", budget: "$2M", budgetUSD: 2000000, domestic: "$13.6M", worldwide: "$14.3M", worldwideUSD: 14300000, distribution: "A24", festivalRun: "Sundance", tone: "Relatable / Awkward", budgetTier: "low", roi: 7.2, notableFor: "A24 coming-of-age. Digital marketing resonance. Strong SVOD performance." },
    { title: "A Quiet Place", year: 2018, genre: "Horror", budget: "$17M", budgetUSD: 17000000, domestic: "$188M", worldwide: "$340M", worldwideUSD: 340000000, distribution: "Paramount", festivalRun: "South by Southwest", tone: "Concept-Led Thriller", budgetTier: "mid", roi: 20, notableFor: "High-concept single-location horror at studio scale." },
  ];

  const BUDGET_TIERS = [
    { value: "micro", label: "Micro (< $500K)" },
    { value: "low", label: "Low ($500K–$5M)" },
    { value: "mid", label: "Mid ($5M–$20M)" },
    { value: "high", label: "High ($20M+)" },
  ];

  export default function FilmComps() {
    const [genreFilter, setGenreFilter] = useState("all");
    const [tierFilter, setTierFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<CompFilm | null>(null);

    const genres = useMemo(() => Array.from(new Set(COMP_DATA.map(f => f.genre.split("/")[0]))), []);

    const filtered = useMemo(() =>
      COMP_DATA.filter(f =>
        (genreFilter === "all" || f.genre.includes(genreFilter)) &&
        (tierFilter === "all" || f.budgetTier === tierFilter) &&
        (f.title.toLowerCase().includes(search.toLowerCase()) || f.genre.toLowerCase().includes(search.toLowerCase()) || f.distribution.toLowerCase().includes(search.toLowerCase()))
      ).sort((a, b) => b.roi - a.roi),
      [genreFilter, tierFilter, search]
    );

    const avgROI = filtered.length ? Math.round(filtered.reduce((t, f) => t + f.roi, 0) / filtered.length) : 0;
    const avgWorldwide = filtered.length ? Math.round(filtered.reduce((t, f) => t + f.worldwideUSD, 0) / filtered.length) : 0;

    const fmt = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;

    return (
      <div className="min-h-screen pb-10" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <div className="max-w-5xl mx-auto space-y-6 py-6 px-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gold-shimmer"><BarChart3 className="h-6 w-6 text-amber-400" />Film Comps & Market Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Comparable films to benchmark your project's commercial potential and find your distribution path.</p>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Input placeholder="Search title, genre, distributor…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={genreFilter} onValueChange={setGenreFilter}><SelectTrigger className="w-36 focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40"><SelectValue placeholder="Genre" /></SelectTrigger><SelectContent><SelectItem value="all">All genres</SelectItem>{genres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
          <Select value={tierFilter} onValueChange={setTierFilter}><SelectTrigger className="w-44 focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40"><SelectValue placeholder="Budget tier" /></SelectTrigger><SelectContent><SelectItem value="all">All budgets</SelectItem>{BUDGET_TIERS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Comps shown", value: filtered.length.toString(), icon: <Film className="text-amber-400/80 h-4 w-4" /> },
            { label: "Avg ROI", value: `${avgROI}x`, icon: <TrendingUp className="h-4 w-4" /> },
            { label: "Avg worldwide", value: fmt(avgWorldwide), icon: <Globe className="h-4 w-4" /> },
            { label: "Top distributor", value: filtered[0]?.distribution.split(" ")[0] ?? "—", icon: <Star className="h-4 w-4" /> },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3 flex items-center gap-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow gold-glow">
                <div className="h-8 w-8 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400 shrink-0">{s.icon}</div>
                <div className="min-w-0"><p className="font-bold text-base truncate">{s.value}</p><p className="text-[10px] text-muted-foreground truncate">{s.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>{["Film","Year","Genre","Budget","Worldwide","ROI","Distributor"].map(h => <th key={h} className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap text-amber-400/70 border-b border-amber-500/20">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(film => (
                  <tr key={film.title} className={`hover:bg-muted/20 cursor-pointer transition-colors ${selected?.title === film.title ? "bg-amber-400/5" : ""}`} onClick={() => setSelected(selected?.title === film.title ? null : film)}>
                    <td className="p-3 font-medium max-w-[160px] truncate">{film.title}</td>
                    <td className="p-3 text-muted-foreground text-xs">{film.year}</td>
                    <td className="p-3"><Badge variant="outline" className="text-[10px]">{film.genre.split("/")[0]}</Badge></td>
                    <td className="p-3 font-mono text-xs">{film.budget}</td>
                    <td className="p-3 font-mono text-xs font-medium">{film.worldwide}</td>
                    <td className="p-3"><span className={`font-bold ${film.roi >= 20 ? "text-green-500" : film.roi >= 5 ? "text-amber-400" : "text-muted-foreground"}`}>{film.roi}x</span></td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[120px] truncate">{film.distribution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <Card className="border-primary/30 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <CardHeader><CardTitle className="text-base flex items-center justify-between gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow"><span>{selected.title} ({selected.year})</span><div className="flex gap-2"><Badge variant="outline">{selected.budgetTier} budget</Badge><Badge className="text-sm font-bold">{selected.roi}x ROI</Badge></div></CardTitle></CardHeader>
            <CardContent className="space-y-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {[["Budget", selected.budget],["Domestic", selected.domestic],["Worldwide", selected.worldwide],["Distributor", selected.distribution],["Festival", selected.festivalRun],["Tone", selected.tone]].map(([k, v]) => (
                  <div key={k}><p className="text-xs text-muted-foreground">{k}</p><p className="font-medium text-xs mt-0.5">{v}</p></div>
                ))}
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Notable for: </span>{selected.notableFor}</p>
            </CardContent>
          </Card>
        )}
        <p className="text-xs text-muted-foreground">Box office data is approximate. ROI = worldwide gross ÷ production budget (does not include P&A, distribution, or backend costs). Use as directional benchmarks only.</p>
          </div>
  </div>
  );
}
