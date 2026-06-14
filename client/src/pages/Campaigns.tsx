import { useLocation } from "wouter";
  import { trpc } from "@/lib/trpc";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent } from "@/components/ui/card";
  import { Progress } from "@/components/ui/progress";
  import { Skeleton } from "@/components/ui/skeleton";
  import { Input } from "@/components/ui/input";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Film, Users, CalendarDays, Target, Search, Zap, Plus } from "lucide-react";
  import { useState } from "react";
  import { useAuth } from "../_core/hooks/useAuth";

  function fmtAud(cents: number) {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0 }).format(cents / 100);
  }
  function daysLeft(deadline: Date | string | null): number {
    if (!deadline) return 0;
    const ms = new Date(deadline).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86400000));
  }

  const GENRES = ["Action", "Comedy", "Drama", "Documentary", "Horror", "Sci-Fi", "Thriller", "Romance", "Animation", "Other"];
  const FORMATS = ["Feature", "Short", "Series", "Documentary", "Other"];

  export default function Campaigns() {
    const [, navigate] = useLocation();
    const { user } = useAuth();
    const [search, setSearch] = useState("");
    const [genreFilter, setGenreFilter] = useState("all");
    const [formatFilter, setFormatFilter] = useState("all");
    const [modelFilter, setModelFilter] = useState("all");

    const { data: campaigns, isLoading } = trpc.crowdfund.campaign.listPublic.useQuery({
      limit: 50,
      offset: 0,
    });

    const filtered = (campaigns ?? []).filter((c) => {
      if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !(c.tagline ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (genreFilter !== "all" && c.genre !== genreFilter) return false;
      if (formatFilter !== "all" && c.format !== formatFilter) return false;
      if (modelFilter !== "all" && c.fundingModel !== modelFilter) return false;
      return true;
    });

    return (
      <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        {/* Hero header */}
        <div className="bg-gradient-to-b from-amber-500/10 via-background to-background border-b border-border/40 py-12 px-6">
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Film className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gold-shimmer">Film Campaigns</h1>
                <p className="text-muted-foreground text-sm">Back independent films directly. Every pledge matters.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              {user && (
                <Button
                  className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                  onClick={() => navigate("/crowdfunding")}
                >
                  <Plus className="w-4 h-4 mr-2" />Start a Campaign
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search campaignsÃ¢ÂÂ¦"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger className="w-36 focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger className="w-36 focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                {FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger className="w-44 focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40">
                <SelectValue placeholder="Funding model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                <SelectItem value="all_or_nothing">All-or-Nothing</SelectItem>
                <SelectItem value="keep_it_all">Keep-it-All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          {!isLoading && (
            <p className="text-sm text-muted-foreground">
              {filtered.length === 0 ? "No campaigns found" : `${filtered.length} active campaign${filtered.length !== 1 ? "s" : ""}`}
            </p>
          )}

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}><CardContent className="p-0 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 hover:shadow-lg transition-shadow gold-glow">
                  <Skeleton className="h-44 rounded-t-lg" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                </CardContent></Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
              <Film className="w-16 h-16 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold gradient-text-gold">No active campaigns yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm">Be the first to launch a campaign and fund your film through the Virelle community.</p>
              {user && (
                <Button className="bg-amber-500 hover:bg-amber-400 text-black font-semibold" onClick={() => navigate("/crowdfunding")}>
                  <Plus className="w-4 h-4 mr-2" />Create Campaign
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((campaign) => {
                const progress = Math.min(100, Math.round((campaign.raisedAmountCents / campaign.goalAmountCents) * 100));
                const days = daysLeft(campaign.deadline);
                return (
                  <Card
                    key={campaign.id}
                    className="overflow-hidden cursor-pointer hover:border-amber-500/40 hover:shadow-md hover:shadow-amber-500/10 transition-all group glass-card"
                    onClick={() => navigate(`/crowdfund/c/${campaign.slug}`)}
                  >
                    <div className="relative h-44 overflow-hidden bg-black/40">
                      {campaign.posterUrl ? (
                        <img
                          src={campaign.posterUrl}
                          alt={campaign.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/30 to-black/60">
                          <Film className="w-10 h-10 text-amber-500/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 left-2 flex gap-1.5 flex-wrap">
                        {campaign.genre && <Badge variant="secondary" className="text-xs bg-black/60 border-0">{campaign.genre}</Badge>}
                        {campaign.format && <Badge variant="outline" className="text-xs border-white/20 bg-black/40 text-white">{campaign.format}</Badge>}
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge
                          className={`text-xs ${campaign.fundingModel === "all_or_nothing" ? "bg-red-500/80" : "bg-emerald-600/80"} border-0`}
                        >
                          {campaign.fundingModel === "all_or_nothing" ? (
                            <><Target className="w-3 h-3 mr-1 inline" />All-or-Nothing</>
                          ) : (
                            <><Zap className="w-3 h-3 mr-1 inline" />Keep-it-All</>
                          )}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 hover:shadow-lg transition-shadow">
                      <div>
                        <h3 className="font-bold text-sm leading-snug line-clamp-2 group-hover:text-amber-400 transition-colors">{campaign.title}</h3>
                        {campaign.tagline && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{campaign.tagline}</p>}
                      </div>
                      <Progress value={progress} className="h-1.5 rounded-full [&>div]:bg-amber-500" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{fmtAud(campaign.raisedAmountCents)}</span>
                        <span>{progress}% of {fmtAud(campaign.goalAmountCents)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{campaign.backerCount}</span>
                        <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{days}d left</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }
  