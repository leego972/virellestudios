import { useState, useMemo } from "react";
  import { Calculator, Globe, TrendingUp, Info, ExternalLink, Search, ArrowUpDown } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Badge } from "@/components/ui/badge";
  import { Separator } from "@/components/ui/separator";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

  interface Jurisdiction {
    name: string;
    country: string;
    rebate: number;
    maxRebate: string;
    minSpend: string;
    type: "Tax Credit" | "Rebate" | "Grant";
    notes: string;
    url: string;
    category: "US State" | "International" | "US Federal";
  }

  const JURISDICTIONS: Jurisdiction[] = [
    { name: "Georgia", country: "USA", rebate: 30, maxRebate: "Uncapped", minSpend: "$500K", type: "Tax Credit", notes: "30% transferable tax credit. Additional 10% if Georgia peach logo used. No annual cap — most popular US state for production.", url: "https://www.georgia.org/film", category: "US State" },
    { name: "New Mexico", country: "USA", rebate: 35, maxRebate: "Uncapped", minSpend: "$0", type: "Rebate", notes: "25–35% direct rebate. Higher % for qualifying spend in-state. No min spend for shorts.", url: "https://nmfilm.com", category: "US State" },
    { name: "New York", country: "USA", rebate: 30, maxRebate: "$420M/yr", minSpend: "$1M", type: "Tax Credit", notes: "30% refundable tax credit. Additional 10% for upstate NYC production. Strong crew base.", url: "https://esd.ny.gov/nyfilm", category: "US State" },
    { name: "California", country: "USA", rebate: 20, maxRebate: "$330M/yr", minSpend: "$1M", type: "Tax Credit", notes: "20–25% non-refundable. Competitive application process. Strong for TV series.", url: "https://film.ca.gov/tax-credit/", category: "US State" },
    { name: "Louisiana", country: "USA", rebate: 40, maxRebate: "$150M/yr", minSpend: "$300K", type: "Tax Credit", notes: "25–40% transferable credit. Additional 10% for Louisiana-resident payroll.", url: "https://louisianaentertainment.gov", category: "US State" },
    { name: "Massachusetts", country: "USA", rebate: 25, maxRebate: "Uncapped", minSpend: "$50K", type: "Tax Credit", notes: "25% transferable credit on all in-state spend. No annual cap.", url: "https://www.mafilm.org", category: "US State" },
    { name: "North Carolina", country: "USA", rebate: 25, maxRebate: "$31M/yr", minSpend: "$250K", type: "Tax Credit", notes: "25% refundable credit. Strong crew base in Charlotte and Wilmington.", url: "https://www.ncfilm.com", category: "US State" },
    { name: "Texas", country: "USA", rebate: 22, maxRebate: "$95M/yr", minSpend: "$250K", type: "Grant", notes: "5–22.5% grant. Tiered by in-state spend percentage. Austin and Dallas strong production bases.", url: "https://gov.texas.gov/film", category: "US State" },
    { name: "Illinois", country: "USA", rebate: 30, maxRebate: "Uncapped", minSpend: "$100K", type: "Tax Credit", notes: "30% transferable credit. Chicago is a top 3 US production hub.", url: "https://www.illinois.gov/film", category: "US State" },
    { name: "United Kingdom", country: "UK", rebate: 34, maxRebate: "Uncapped", minSpend: "£1M", type: "Tax Credit", notes: "34% AVEC credit for high-end TV and film. 28% for children's TV. 40% for animation. Strong studio infrastructure.", url: "https://www.bfi.org.uk/certification-funding", category: "International" },
    { name: "Canada (Federal)", country: "Canada", rebate: 25, maxRebate: "Uncapped", minSpend: "CAD$1M", type: "Tax Credit", notes: "25% CPTC on qualified labour. Provincial credits stack on top (Ontario + Federal can reach 40%+).", url: "https://www.canada.ca/en/canadian-heritage/services/funding/cptc.html", category: "International" },
    { name: "Ontario", country: "Canada", rebate: 21.5, maxRebate: "Uncapped", minSpend: "CAD$1M", type: "Tax Credit", notes: "21.5% OFTTC on Ontario labour. Stacks with Federal CPTC for ~46% combined on qualifying labour.", url: "https://www.ontario.ca/page/ontario-film-and-television-tax-credit", category: "International" },
    { name: "Australia", country: "Australia", rebate: 20, maxRebate: "Uncapped", minSpend: "AUD$1M", type: "Rebate", notes: "16.5–20% Location Offset for qualifying foreign productions. Additional PDV offset for post-production.", url: "https://www.screenaustralia.gov.au/funding-and-support/co-productions/international-co-productions", category: "International" },
    { name: "Ireland", country: "Ireland", rebate: 32, maxRebate: "€70M/project", minSpend: "€125K", type: "Tax Credit", notes: "32% refundable Section 481 tax credit. No annual cap. Strong crew, lush locations.", url: "https://screenireland.ie/funding/the-section-481-film-relief/", category: "International" },
    { name: "France", country: "France", rebate: 30, maxRebate: "€30M/project", minSpend: "€1M", type: "Tax Credit", notes: "30% TRIP credit. Additional 20% on visual effects. Co-production treaties with 50+ countries.", url: "https://www.cnc.fr/professionnels/aides-et-financements/credit-dimpot-cinema", category: "International" },
    { name: "Germany", country: "Germany", rebate: 25, maxRebate: "€25M/project", minSpend: "€1M", type: "Tax Credit", notes: "25% DFFF incentive on German spend. Berlin, Bavaria, and Hamburg have additional state incentives.", url: "https://www.ffa.de/german-film-fund-dfff.html", category: "International" },
    { name: "New Zealand", country: "New Zealand", rebate: 20, maxRebate: "Uncapped", minSpend: "NZD$15M", type: "Rebate", notes: "20% Large Budget Screen Production Grant. LOTR / Avatar track record. Stunning natural locations.", url: "https://www.nzfilm.co.nz/resources/practical-guides/new-zealand-screen-industry-tax-credits-and-grants", category: "International" },
    { name: "Spain", country: "Spain", rebate: 30, maxRebate: "€10M/project", minSpend: "€1M", type: "Tax Credit", notes: "30% deduction on first €1M spend, 25% on the rest. Canary Islands offers 50%. Strong co-pro network.", url: "https://www.spainfilmcommission.org/en/production-in-spain/incentives", category: "International" },
    { name: "Hungary", country: "Hungary", rebate: 30, maxRebate: "Uncapped", minSpend: "HUF 20M", type: "Tax Credit", notes: "30% transferable tax credit. One of Europe's most competitive incentives. Budapest frequently doubles for period productions.", url: "https://mnf.hu/en", category: "International" },
    { name: "Czech Republic", country: "Czech Republic", rebate: 20, maxRebate: "Uncapped", minSpend: "CZK 4M", type: "Rebate", notes: "20% cash rebate on all qualifying spend. Prague is a top European production hub.", url: "https://www.filmcommission.cz/incentives/", category: "International" },
  ];

  export default function TaxIncentives() {
    const [budget, setBudget] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [sortBy, setSortBy] = useState<"rebate" | "name">("rebate");
    const [selected, setSelected] = useState<Jurisdiction | null>(null);

    const budgetNum = parseFloat(budget.replace(/[^0-9.]/g, "")) || 0;

    const filtered = useMemo(() =>
      JURISDICTIONS
        .filter(j => (filter === "all" || j.category === filter) && (j.name.toLowerCase().includes(search.toLowerCase()) || j.country.toLowerCase().includes(search.toLowerCase())))
        .sort((a, b) => sortBy === "rebate" ? b.rebate - a.rebate : a.name.localeCompare(b.name)),
      [filter, search, sortBy]
    );

    const top3 = useMemo(() => [...JURISDICTIONS].sort((a, b) => b.rebate - a.rebate).slice(0, 3), []);

    return (
      <div className="min-h-screen pb-10" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
    <div className="max-w-5xl mx-auto space-y-6 py-6 px-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gold-shimmer"><Calculator className="h-6 w-6 text-amber-400" />Film Tax Incentive Calculator</h1>
          <p className="text-sm text-muted-foreground mt-1">Compare rebates and tax credits across {JURISDICTIONS.length} global jurisdictions. Enter your budget to see estimated savings.</p>
        </div>

        {/* Budget input + top picks */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow gold-glow">Your Production Budget</CardTitle></CardHeader>
            <CardContent className="space-y-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <div className="space-y-1.5">
                <Label>Total Budget (USD equivalent)</Label>
                <Input placeholder="e.g. 500000" value={budget} onChange={e => setBudget(e.target.value)} type="number" min="0" />
              </div>
              {budgetNum > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-muted-foreground">Estimated savings at top rates:</p>
                  {top3.map(j => (
                    <div key={j.name} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{j.name} ({j.rebate}%)</span>
                      <span className="font-semibold text-green-500">${Math.round(budgetNum * j.rebate / 100).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-amber-400/5 border-primary/20 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <CardContent className="p-4 space-y-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <p className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-amber-400" />Top 3 Incentives Right Now</p>
              {top3.map((j, i) => (
                <div key={j.name} className="flex items-center gap-3 p-2 rounded-lg bg-background/60">
                  <span className="text-lg font-bold text-amber-400 w-5">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{j.name}, {j.country}</p>
                    <p className="text-xs text-muted-foreground">{j.type} · Min: {j.minSpend}</p>
                  </div>
                  <Badge className="shrink-0 text-sm font-bold">{j.rebate}%</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Input placeholder="Search jurisdiction…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All regions</SelectItem><SelectItem value="US State">US States</SelectItem><SelectItem value="International">International</SelectItem></SelectContent></Select>
          <Button variant="outline" size="icon" onClick={() => setSortBy(s => s === "rebate" ? "name" : "rebate")} title="Toggle sort"><ArrowUpDown className="h-4 w-4" /></Button>
        </div>

        {/* Table */}
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">Jurisdiction</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">Rate</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">Type</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">Min Spend</th>
                  {budgetNum > 0 && <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">Est. Saving</th>}
                  <th className="p-3 w-8 border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(j => (
                  <tr key={j.name} className="hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => setSelected(selected?.name === j.name ? null : j)}>
                    <td className="p-3">
                      <p className="font-medium">{j.name}</p>
                      <p className="text-xs text-muted-foreground">{j.country}</p>
                    </td>
                    <td className="p-3"><span className="font-bold text-amber-400 text-base">{j.rebate}%</span></td>
                    <td className="p-3 hidden sm:table-cell"><Badge variant="outline" className="text-xs">{j.type}</Badge></td>
                    <td className="p-3 text-muted-foreground text-xs hidden md:table-cell">{j.minSpend}</td>
                    {budgetNum > 0 && <td className="p-3 text-right font-semibold text-green-500">${Math.round(budgetNum * j.rebate / 100).toLocaleString()}</td>}
                    <td className="p-3"><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <Card className="border-primary/30 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <CardHeader><CardTitle className="text-base flex items-center justify-between gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow"><span>{selected.name}, {selected.country} — {selected.rebate}% {selected.type}</span><a href={selected.url} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="gap-1 text-xs hover:border-amber-500/50 hover:text-amber-400"><ExternalLink className="h-3 w-3" />Official Site</Button></a></CardTitle></CardHeader>
            <CardContent className="space-y-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <p className="text-sm text-muted-foreground">{selected.notes}</p>
              <div className="flex gap-4 text-xs">
                <span><span className="text-muted-foreground">Max Rebate:</span> <span className="font-medium">{selected.maxRebate}</span></span>
                <span><span className="text-muted-foreground">Min Spend:</span> <span className="font-medium">{selected.minSpend}</span></span>
              </div>
              {budgetNum > 0 && <p className="text-sm font-semibold text-green-500">Estimated saving on ${budgetNum.toLocaleString()} budget: ${Math.round(budgetNum * selected.rebate / 100).toLocaleString()}</p>}
            </CardContent>
          </Card>
        )}
        <p className="text-xs text-muted-foreground">Rates are approximate and subject to change. Always verify current terms with the official film commission before making production decisions.</p>
          </div>
  </div>
  );
}
