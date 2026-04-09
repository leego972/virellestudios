import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  Crown,
  Sparkles,
  Users,
  ArrowRight,
  Lock,
  ChevronRight,
  Heart,
  Film,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Info,
  Zap,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

// ─── Pricing constants (mirrors server config) ─────────────────────────────
const BASE_PRICE: Record<string, number> = { standard: 15, premium: 39, flagship: 99 };
const COMMERCIAL_ADDON = 79;
const EPISODIC_MULTIPLIER = 4;

function getPrice(tier: string, licenseType: "creator" | "commercial" | "episodic"): number {
  const base = BASE_PRICE[tier] ?? 15;
  if (licenseType === "commercial") return base + COMMERCIAL_ADDON;
  if (licenseType === "episodic") return base * EPISODIC_MULTIPLIER;
  return base;
}

// ─── Actor roster ──────────────────────────────────────────────────────────
const SIGNATURE_CAST = [
  // MALE LEADS
  {
    id: "julian-vance",
    name: "Julian Vance",
    tier: "flagship",
    category: "Male Lead",
    archetype: "The Dangerous Romantic",
    age: "32–42",
    genres: ["Crime Thriller", "Prestige Drama", "Romance"],
    hook: "Sharp, dangerous charisma built for thrillers, prestige drama, and high-stakes romance.",
    whyCast: "Continuity-tuned for close-ups and multi-scene storytelling. Premium fit for trailers, noir, and action.",
    bestFor: ["crime thriller", "prestige drama", "romantic lead", "luxury campaigns"],
    chemistry: ["Elena Rostova", "Sofia Reyes"],
    badges: ["Flagship Star", "Featured in Next Door"],
  },
  {
    id: "kofi-adebayo",
    name: "Kofi Adebayo",
    tier: "flagship",
    category: "Male Lead",
    archetype: "The Immovable Force",
    age: "35–50",
    genres: ["Action", "Prestige Drama", "Crime"],
    hook: "Immediate, undeniable physical authority. The room changes when he enters it.",
    whyCast: "Strong emotional readability under dramatic lighting. Premium fit for authority roles, crime drama, and action leads.",
    bestFor: ["action lead", "crime drama", "prestige drama", "authority roles"],
    chemistry: ["Elena Rostova", "Sofia Reyes"],
    badges: ["Flagship Star"],
  },
  {
    id: "kenji-sato",
    name: "Kenji Sato",
    tier: "premium",
    category: "Male Lead",
    archetype: "The Quiet Predator",
    age: "28–40",
    genres: ["Noir", "Thriller", "Drama"],
    hook: "Neo-noir's perfect face. Stillness that reads as danger under dramatic lighting.",
    whyCast: "Exceptional close-up presence. Best face in the cast for dramatic lighting and psychological tension.",
    bestFor: ["noir", "thriller", "psychological drama", "action"],
    chemistry: ["Elena Rostova", "Yuki Tanaka"],
    badges: ["Premium Cast"],
  },
  {
    id: "marcus-osei",
    name: "Marcus Osei",
    tier: "premium",
    category: "Male Lead",
    archetype: "The Reluctant Hero",
    age: "30–45",
    genres: ["Drama", "Crime", "Action"],
    hook: "Grounded, emotionally complex. The kind of face audiences trust and follow.",
    whyCast: "Exceptional dramatic range. Anchors ensemble casts and carries emotional weight across scenes.",
    bestFor: ["drama lead", "crime ensemble", "action drama", "family drama"],
    chemistry: ["Sofia Reyes", "Amara Diallo"],
    badges: ["Premium Cast"],
  },
  {
    id: "daniel-cross",
    name: "Daniel Cross",
    tier: "standard",
    category: "Male Lead",
    archetype: "The Ordinary Man in Extraordinary Trouble",
    age: "35–48",
    genres: ["Drama", "Thriller", "Crime"],
    hook: "Suburban everyman energy that makes moral compromise feel real and earned.",
    whyCast: "Perfect for prestige drama where the protagonist is not the most dangerous person in the room.",
    bestFor: ["prestige drama", "suburban thriller", "moral drama", "crime adjacent"],
    chemistry: ["Mavis Whitlock", "Celeste Vale"],
    badges: ["Featured in Next Door"],
  },
  // FEMALE LEADS
  {
    id: "elena-rostova",
    name: "Elena Rostova",
    tier: "flagship",
    category: "Female Lead",
    archetype: "The Cold Architect",
    age: "28–42",
    genres: ["Thriller", "Crime", "Prestige Drama"],
    hook: "Precise, composed, and quietly devastating. The most dangerous person in any room.",
    whyCast: "Exceptional for villain-adjacent leads, power dynamics, and psychological tension. Flagship-tier screen presence.",
    bestFor: ["thriller lead", "crime drama", "power dynamics", "prestige villain"],
    chemistry: ["Julian Vance", "Kofi Adebayo"],
    badges: ["Flagship Star", "Featured in Next Door"],
  },
  {
    id: "sofia-reyes",
    name: "Sofia Reyes",
    tier: "flagship",
    category: "Female Lead",
    archetype: "The Warm Weapon",
    age: "25–38",
    genres: ["Romance", "Drama", "Crime"],
    hook: "Warmth that disarms. Intelligence that surprises. The most versatile lead in the cast.",
    whyCast: "Exceptional emotional range. Works across romance, crime, drama, and prestige campaigns.",
    bestFor: ["romantic lead", "drama lead", "crime adjacent", "prestige campaigns"],
    chemistry: ["Julian Vance", "Marcus Osei"],
    badges: ["Flagship Star"],
  },
  {
    id: "amara-diallo",
    name: "Amara Diallo",
    tier: "premium",
    category: "Female Lead",
    archetype: "The Quiet Storm",
    age: "28–40",
    genres: ["Drama", "Thriller", "Action"],
    hook: "Still on the outside. Relentless underneath. Audiences underestimate her exactly once.",
    whyCast: "Exceptional for slow-burn reveals and scenes where the power shifts. Strong in ensemble and lead roles.",
    bestFor: ["drama lead", "thriller", "action drama", "slow-burn narrative"],
    chemistry: ["Marcus Osei", "Kofi Adebayo"],
    badges: ["Premium Cast"],
  },
  {
    id: "yuki-tanaka",
    name: "Yuki Tanaka",
    tier: "premium",
    category: "Female Lead",
    archetype: "The Precise One",
    age: "25–38",
    genres: ["Noir", "Thriller", "Drama"],
    hook: "Controlled, exact, and quietly magnetic. Every gesture is intentional.",
    whyCast: "Exceptional for roles requiring precision and restraint. Strong in noir and psychological drama.",
    bestFor: ["noir", "psychological thriller", "drama", "prestige drama"],
    chemistry: ["Kenji Sato", "Elena Rostova"],
    badges: ["Premium Cast"],
  },
  {
    id: "mavis-whitlock",
    name: "Mavis Whitlock",
    tier: "standard",
    category: "Female Lead",
    archetype: "The Neighbourhood Oracle",
    age: "55–70",
    genres: ["Drama", "Dark Comedy", "Crime"],
    hook: "Sees everything. Says less than she knows. The most dangerous witness in any scene.",
    whyCast: "Exceptional for ensemble anchors, comic relief with depth, and scenes requiring earned authority.",
    bestFor: ["ensemble drama", "dark comedy", "crime adjacent", "neighbourhood drama"],
    chemistry: ["Daniel Cross", "Celeste Vale"],
    badges: ["Featured in Next Door"],
  },
  {
    id: "celeste-vale",
    name: "Celeste Vale",
    tier: "standard",
    category: "Female Lead",
    archetype: "The Perfect Surface",
    age: "35–48",
    genres: ["Thriller", "Drama", "Crime"],
    hook: "Immaculate, composed, and impossible to read. The most unsettling neighbour you'll ever meet.",
    whyCast: "Perfect for roles where the threat is social, not physical. Exceptional in prestige drama and suburban thriller.",
    bestFor: ["prestige drama", "suburban thriller", "social threat", "crime adjacent"],
    chemistry: ["Daniel Cross", "Mavis Whitlock"],
    badges: ["Featured in Next Door"],
  },
  // CHARACTER ACTORS
  {
    id: "viktor-vale",
    name: "Viktor Vale",
    tier: "premium",
    category: "Character Actor",
    archetype: "The Patriarch Who Owns the Room",
    age: "50–65",
    genres: ["Crime", "Prestige Drama", "Thriller"],
    hook: "Quiet authority that doesn't need to announce itself. The most dangerous man at the table.",
    whyCast: "Exceptional for crime patriarch roles, power-broker scenes, and ensemble anchors.",
    bestFor: ["crime patriarch", "power broker", "prestige drama", "ensemble anchor"],
    chemistry: ["Celeste Vale", "Elena Rostova"],
    badges: ["Premium Cast", "Featured in Next Door"],
  },
  {
    id: "tariq-haddad",
    name: "Tariq Haddad",
    tier: "premium",
    category: "Character Actor",
    archetype: "The Charismatic Patriarch",
    age: "50–65",
    genres: ["Crime", "Drama", "Thriller"],
    hook: "Warm, expansive, and unpredictable. The most dangerous man at the dinner table.",
    whyCast: "Exceptional for rival patriarch roles and scenes where hospitality and threat coexist.",
    bestFor: ["crime drama", "rival patriarch", "prestige drama", "family power dynamics"],
    chemistry: ["Viktor Vale", "Tariq Haddad"],
    badges: ["Premium Cast", "Featured in Next Door"],
  },
  {
    id: "big-sasha",
    name: "Big Sasha",
    tier: "standard",
    category: "Character Actor",
    archetype: "The Final Word",
    age: "40–55",
    genres: ["Crime", "Thriller", "Drama"],
    hook: "The harder edge. More silent, more suspicious, more final. His presence does the threatening.",
    whyCast: "Exceptional for security, enforcer, and visible deterrence roles. Strong in ensemble crime drama.",
    bestFor: ["crime drama", "enforcer", "security role", "ensemble thriller"],
    chemistry: ["Little Sasha", "Viktor Vale"],
    badges: ["Featured in Next Door"],
  },
  {
    id: "little-sasha",
    name: "Little Sasha",
    tier: "standard",
    category: "Character Actor",
    archetype: "The Smooth First Contact",
    age: "35–48",
    genres: ["Crime", "Thriller", "Dark Comedy"],
    hook: "More talkative, more disarming, more likely to smile. Warmth as a security function.",
    whyCast: "Exceptional for roles where the threat is social and the danger is underestimated.",
    bestFor: ["crime drama", "social threat", "dark comedy", "ensemble thriller"],
    chemistry: ["Big Sasha", "Viktor Vale"],
    badges: ["Featured in Next Door"],
  },
  // TWIN UNIT
  {
    id: "gallagher-twins",
    name: "The Gallagher Twins",
    tier: "premium",
    category: "Twin Unit",
    archetype: "The Mirror Problem",
    age: "25–35",
    genres: ["Thriller", "Crime", "Dark Comedy"],
    hook: "Two faces, one alibi. The most visually distinctive unit in the cast.",
    whyCast: "Exceptional for identity-swap plots, twin dynamics, and scenes requiring visual doubling.",
    bestFor: ["identity thriller", "dark comedy", "crime drama", "visual gimmick done right"],
    chemistry: ["Elena Rostova", "Kenji Sato"],
    badges: ["Premium Cast"],
  },
];

// ─── Plan → tier access (mirrors server) ──────────────────────────────────
const PLAN_CAST_ACCESS: Record<string, string[]> = {
  none:        [],
  indie:       ["standard"],
  amateur:     ["standard", "premium"],
  independent: ["standard", "premium", "flagship"],
  creator:     ["standard", "premium", "flagship"],
  studio:      ["standard", "premium", "flagship"],
  industry:    ["standard", "premium", "flagship"],
  beta:        ["standard"],
};

const CATEGORIES = ["All", "Male Lead", "Female Lead", "Character Actor", "Twin Unit"];
const GENRES = ["All", "Crime Thriller", "Prestige Drama", "Romance", "Action", "Noir", "Dark Comedy", "Thriller"];

function TierBadge({ tier }: { tier: string }) {
  if (tier === "flagship") {
    return (
      <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 gap-1 text-xs">
        <Crown className="w-3 h-3" />
        Flagship Star
      </Badge>
    );
  }
  if (tier === "premium") {
    return (
      <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 gap-1 text-xs">
        <Sparkles className="w-3 h-3" />
        Premium Cast
      </Badge>
    );
  }
  return (
    <Badge className="bg-zinc-700/50 text-zinc-400 border border-zinc-600/30 text-xs">
      Standard
    </Badge>
  );
}

type Actor = typeof SIGNATURE_CAST[0];
type LicenseType = "creator" | "commercial" | "episodic";

const LICENSE_OPTIONS: { type: LicenseType; label: string; description: string }[] = [
  {
    type: "creator",
    label: "Use in one creator / public project",
    description: "Personal work, indie film, YouTube, festival submission, or public creator release.",
  },
  {
    type: "commercial",
    label: "Use in commercial / client work",
    description: "Ads, branded content, client campaigns, or any monetized commercial project.",
  },
  {
    type: "episodic",
    label: "Use across a series",
    description: "Recurring use across multiple episodes or installments of the same series.",
  },
];

export default function TalentSearch() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [genre, setGenre] = useState("All");
  const [tierFilter, setTierFilter] = useState("All");
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [unlockActor, setUnlockActor] = useState<Actor | null>(null);
  const [selectedLicense, setSelectedLicense] = useState<LicenseType>("creator");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const userTier = (user as any)?.subscriptionTier ?? "none";
  const planAccess: string[] = PLAN_CAST_ACCESS[userTier] ?? [];

  const getEntitlementState = (actor: Actor): "plan_included" | "unlocked" | "locked" => {
    if (planAccess.includes(actor.tier)) return "plan_included";
    // In production this would check real entitlements from the server
    return "locked";
  };

  const filtered = SIGNATURE_CAST.filter((actor) => {
    const matchSearch =
      !search ||
      actor.name.toLowerCase().includes(search.toLowerCase()) ||
      actor.archetype.toLowerCase().includes(search.toLowerCase()) ||
      actor.hook.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "All" || actor.category === category;
    const matchGenre =
      genre === "All" || actor.genres.some((g) => g.toLowerCase().includes(genre.toLowerCase()));
    const matchTier = tierFilter === "All" || actor.tier === tierFilter;
    return matchSearch && matchCategory && matchGenre && matchTier;
  });

  const toggleShortlist = (id: string) => {
    setShortlist((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleCastNow = (actor: Actor) => {
    const state = getEntitlementState(actor);
    if (state === "locked") {
      setUnlockActor(actor);
      setSelectedLicense("creator");
    } else {
      navigate("/projects/new");
    }
  };

  const handleUnlockCheckout = async () => {
    if (!unlockActor) return;
    if (!user) { navigate("/login"); return; }
    setIsCheckingOut(true);
    try {
      // In production: call trpc.signatureCast.createUnlockCheckout.mutate(...)
      // For now, redirect to pricing to upgrade plan
      navigate("/pricing");
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* HEADER */}
      <div className="border-b border-white/5 bg-zinc-950/80 sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-amber-400" />
                <h1 className="text-xl font-bold">Virelle Signature Cast</h1>
              </div>
              <p className="text-sm text-zinc-500">
                {SIGNATURE_CAST.length} premium digital actors · Continuity-tuned · Promo-ready
              </p>
            </div>
            <div className="flex items-center gap-3">
              {shortlist.length > 0 && (
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                  onClick={() => navigate("/projects/new")}
                >
                  Cast {shortlist.length} Selected
                  <ArrowRight className="ml-2 w-3 h-3" />
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 text-zinc-300 hover:bg-white/5"
                onClick={() => navigate("/signature-cast")}
              >
                About Virelle Stars
              </Button>
            </div>
          </div>

          {/* Plan access indicator */}
          {user && (
            <div className="mb-3 flex items-center gap-2 text-xs">
              {planAccess.length > 0 ? (
                <span className="flex items-center gap-1.5 text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Your plan includes{" "}
                  {planAccess.includes("flagship")
                    ? "all Signature Cast tiers"
                    : planAccess.includes("premium")
                    ? "Standard and Premium cast"
                    : "Standard cast"}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-zinc-500">
                  <Lock className="w-3.5 h-3.5" />
                  Upgrade your plan to include cast access, or unlock actors individually from $15
                </span>
              )}
            </div>
          )}

          {/* FILTERS */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search by name, archetype, or vibe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40 bg-white/5 border-white/10 text-zinc-300">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-zinc-300 focus:bg-white/10">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="w-40 bg-white/5 border-white/10 text-zinc-300">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                {GENRES.map((g) => (
                  <SelectItem key={g} value={g} className="text-zinc-300 focus:bg-white/10">{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-36 bg-white/5 border-white/10 text-zinc-300">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                <SelectItem value="All" className="text-zinc-300 focus:bg-white/10">All Tiers</SelectItem>
                <SelectItem value="flagship" className="text-amber-300 focus:bg-white/10">
                  <span className="flex items-center gap-1"><Crown className="w-3 h-3" /> Flagship</span>
                </SelectItem>
                <SelectItem value="premium" className="text-purple-300 focus:bg-white/10">
                  <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> Premium</span>
                </SelectItem>
                <SelectItem value="standard" className="text-zinc-300 focus:bg-white/10">Standard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* RESULTS */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-zinc-500">
            {filtered.length} actor{filtered.length !== 1 ? "s" : ""} found
          </p>
          {shortlist.length > 0 && (
            <p className="text-sm text-amber-400">{shortlist.length} in shortlist</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((actor) => {
            const state = getEntitlementState(actor);
            const basePrice = BASE_PRICE[actor.tier] ?? 15;
            return (
              <Card
                key={actor.id}
                className="bg-zinc-900/50 border border-white/5 hover:border-white/15 transition-all cursor-pointer group"
                onClick={() => setSelectedActor(actor)}
              >
                <CardContent className="p-0">
                  {/* Portrait */}
                  <div className="relative w-full aspect-[3/4] bg-white/5 rounded-t-lg overflow-hidden">
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-2">
                        <Users className="w-8 h-8 text-white/20" />
                      </div>
                      <p className="text-xs text-white/15">Portrait</p>
                    </div>
                    {/* Badges overlay */}
                    <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5">
                      <TierBadge tier={actor.tier} />
                      {actor.badges.includes("Featured in Next Door") && (
                        <Badge className="bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 text-xs">
                          <Film className="w-3 h-3 mr-1" />
                          Next Door
                        </Badge>
                      )}
                    </div>
                    {/* Entitlement state overlay */}
                    {state === "plan_included" && (
                      <div className="absolute bottom-3 left-3">
                        <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          Included
                        </span>
                      </div>
                    )}
                    {state === "locked" && (
                      <div className="absolute bottom-3 left-3">
                        <span className="flex items-center gap-1 text-xs bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 rounded-full px-2 py-0.5">
                          <Lock className="w-3 h-3" />
                          from ${basePrice}
                        </span>
                      </div>
                    )}
                    {/* Shortlist button */}
                    <button
                      className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        shortlist.includes(actor.id)
                          ? "bg-amber-500 text-black"
                          : "bg-zinc-800/80 text-zinc-400 opacity-0 group-hover:opacity-100"
                      }`}
                      onClick={(e) => { e.stopPropagation(); toggleShortlist(actor.id); }}
                    >
                      <Heart className="w-3.5 h-3.5" fill={shortlist.includes(actor.id) ? "currentColor" : "none"} />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <div>
                      <h3 className="font-semibold text-white text-sm">{actor.name}</h3>
                      <p className="text-xs text-zinc-500">{actor.archetype}</p>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{actor.hook}</p>
                    <div className="flex flex-wrap gap-1">
                      {actor.genres.slice(0, 2).map((g) => (
                        <span key={g} className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-500 border border-white/5">
                          {g}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                      {state === "plan_included" || state === "unlocked" ? (
                        <Button
                          size="sm"
                          className="flex-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold h-7"
                          onClick={(e) => { e.stopPropagation(); navigate("/projects/new"); }}
                        >
                          Cast Now
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold h-7 border border-white/10"
                          onClick={(e) => { e.stopPropagation(); setUnlockActor(actor); setSelectedLicense("creator"); }}
                        >
                          <Lock className="w-3 h-3 mr-1" />
                          Unlock Talent — ${basePrice}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 text-zinc-400 hover:bg-white/5 text-xs h-7 px-2"
                        onClick={(e) => { e.stopPropagation(); setSelectedActor(actor); }}
                      >
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 mb-2">No actors match your search</p>
            <p className="text-sm text-zinc-600">Try different filters or browse the full cast</p>
            <Button
              variant="outline"
              className="mt-4 border-white/10 text-zinc-400"
              onClick={() => { setSearch(""); setCategory("All"); setGenre("All"); setTierFilter("All"); }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* ─── UNLOCK MODAL ──────────────────────────────────────────────────── */}
      {unlockActor && (
        <Dialog open={!!unlockActor} onOpenChange={() => setUnlockActor(null)}>
          <DialogContent className="bg-zinc-900 border border-white/10 text-white max-w-lg">
            <DialogHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <DialogTitle className="text-xl font-bold">Unlock Talent</DialogTitle>
                  <DialogDescription className="text-zinc-400 mt-1">
                    License <span className="text-white font-medium">{unlockActor.name}</span> for your project
                  </DialogDescription>
                </div>
                <TierBadge tier={unlockActor.tier} />
              </div>
            </DialogHeader>

            <div className="space-y-5 mt-2">
              {/* Value props */}
              <div className="rounded-lg bg-white/5 border border-white/5 p-4 space-y-1.5">
                {[
                  "Continuity-tuned premium digital talent",
                  "Ready to cast directly into your Virelle project",
                  "Faster than building a character from scratch",
                  "Built for films, trailers, campaigns, and series",
                ].map((prop) => (
                  <div key={prop} className="flex items-start gap-2 text-xs text-zinc-400">
                    <Zap className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    {prop}
                  </div>
                ))}
              </div>

              {/* Plan inclusion notice */}
              {planAccess.length > 0 && !planAccess.includes(unlockActor.tier) && (
                <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3 flex items-start gap-2">
                  <Info className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-purple-300">
                    Your current plan includes Standard cast. Upgrade to access {unlockActor.tier === "flagship" ? "Flagship Stars" : "Premium Cast"} via plan inclusion, or license this actor individually below.
                  </p>
                </div>
              )}

              {/* License type picker */}
              <div>
                <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">Select License Type</p>
                <div className="space-y-2">
                  {LICENSE_OPTIONS.map((opt) => {
                    const price = getPrice(unlockActor.tier, opt.type);
                    const isSelected = selectedLicense === opt.type;
                    return (
                      <button
                        key={opt.type}
                        className={`w-full text-left rounded-lg border p-3 transition-all ${
                          isSelected
                            ? "border-amber-500/50 bg-amber-500/10"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                        onClick={() => setSelectedLicense(opt.type)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${isSelected ? "text-amber-300" : "text-zinc-200"}`}>
                            {opt.label}
                          </span>
                          <span className={`text-sm font-bold ${isSelected ? "text-amber-400" : "text-zinc-300"}`}>
                            A${price}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500">{opt.description}</p>
                        {opt.type === "commercial" && (
                          <p className="text-xs text-zinc-600 mt-1">Base A${BASE_PRICE[unlockActor.tier]} + A$79 commercial add-on</p>
                        )}
                        {opt.type === "episodic" && (
                          <p className="text-xs text-zinc-600 mt-1">4× single-project price</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Usage terms */}
              <div className="rounded-lg border border-white/5 bg-zinc-950/60 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Usage Terms</p>
                <div className="flex items-start gap-2 text-xs text-zinc-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                  Films, trailers, series, campaigns, prestige digital content
                </div>
                <div className="flex items-start gap-2 text-xs text-zinc-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                  Sensual, romantic, and mature dramatic scenes (prestige standard)
                </div>
                <div className="flex items-start gap-2 text-xs text-zinc-500">
                  <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                  Pornography, explicit sex acts, adult-industry use — strictly prohibited
                </div>
              </div>

              {/* CTA */}
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                  onClick={handleUnlockCheckout}
                  disabled={isCheckingOut}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {isCheckingOut ? "Processing..." : `License for Project — A$${getPrice(unlockActor.tier, selectedLicense)}`}
                </Button>
                <Button
                  variant="outline"
                  className="border-white/10 text-zinc-300 hover:bg-white/5"
                  onClick={() => setUnlockActor(null)}
                >
                  Cancel
                </Button>
              </div>

              <p className="text-xs text-zinc-600 text-center">
                Generation credits still apply after unlock. Actor access is project-bound for creator and commercial licenses.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── ACTOR PROFILE DIALOG ──────────────────────────────────────────── */}
      {selectedActor && (
        <Dialog open={!!selectedActor} onOpenChange={() => setSelectedActor(null)}>
          <DialogContent className="bg-zinc-900 border border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-2xl font-bold mb-1">{selectedActor.name}</DialogTitle>
                  <DialogDescription className="text-zinc-400">{selectedActor.archetype}</DialogDescription>
                </div>
                <TierBadge tier={selectedActor.tier} />
              </div>
            </DialogHeader>

            <div className="space-y-6 mt-2">
              {/* Portrait placeholder */}
              <div className="w-full aspect-[16/9] rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                <div className="text-center">
                  <Users className="w-12 h-12 text-white/15 mx-auto mb-2" />
                  <p className="text-xs text-white/15">Portrait</p>
                </div>
              </div>

              {/* Hook */}
              <p className="text-zinc-300 leading-relaxed">{selectedActor.hook}</p>

              {/* Why cast */}
              <div className="rounded-lg bg-white/5 border border-white/5 p-4">
                <h4 className="text-sm font-semibold text-amber-400 mb-2">Why cast {selectedActor.name}?</h4>
                <p className="text-sm text-zinc-400">{selectedActor.whyCast}</p>
              </div>

              {/* Best for */}
              <div>
                <h4 className="text-sm font-semibold text-zinc-300 mb-2">Best for</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedActor.bestFor.map((b) => (
                    <span key={b} className="text-xs px-3 py-1 rounded-full bg-white/5 text-zinc-400 border border-white/5">
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              {/* Chemistry */}
              {selectedActor.chemistry.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-zinc-300 mb-2">Works well with</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedActor.chemistry.map((name) => (
                      <div key={name} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                          <Users className="w-3 h-3 text-white/30" />
                        </div>
                        <span className="text-sm text-zinc-300">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing / entitlement block */}
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="bg-white/5 px-4 py-3 border-b border-white/5">
                  <p className="text-sm font-semibold text-zinc-200">License This Actor</p>
                </div>
                <div className="p-4 space-y-3">
                  {getEntitlementState(selectedActor) === "plan_included" ? (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Included in your current plan
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        {(["creator", "commercial", "episodic"] as LicenseType[]).map((lt) => (
                          <div key={lt} className="rounded-lg bg-zinc-950/60 border border-white/5 p-3 text-center">
                            <p className="text-xs text-zinc-500 mb-1">
                              {lt === "creator" ? "Creator" : lt === "commercial" ? "Commercial" : "Series"}
                            </p>
                            <p className="text-lg font-bold text-white">A${getPrice(selectedActor.tier, lt)}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-600">
                        Base: A${BASE_PRICE[selectedActor.tier]} · Commercial add-on: +A$79 · Episodic: 4× base
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {selectedActor.badges.map((badge) => (
                  <Badge key={badge} className="bg-zinc-800/50 text-zinc-400 border border-zinc-700/30 text-xs">
                    {badge}
                  </Badge>
                ))}
              </div>

              {/* Usage terms */}
              <div className="rounded-lg border border-white/5 bg-zinc-950/60 p-4">
                <p className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Signature Cast — Usage Terms</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Virelle Stars are licensed for professional cinematic use: films, trailers, series, campaigns, and prestige digital content.
                  Sensual, romantic, and mature dramatic scenes are permitted within a prestige-film standard.
                  Pornographic content, explicit sexual acts, and adult-industry use are{" "}
                  <span className="text-zinc-300 font-medium">strictly prohibited</span>.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex gap-3 pt-2">
                {getEntitlementState(selectedActor) === "plan_included" || getEntitlementState(selectedActor) === "unlocked" ? (
                  <Button
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                    onClick={() => { setSelectedActor(null); navigate("/projects/new"); }}
                  >
                    Cast in Project
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold border border-white/10"
                    onClick={() => { setUnlockActor(selectedActor); setSelectedActor(null); setSelectedLicense("creator"); }}
                  >
                    <ShoppingCart className="mr-2 w-4 h-4" />
                    Unlock Talent — from A${BASE_PRICE[selectedActor.tier]}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="border-white/10 text-zinc-300 hover:bg-white/5"
                  onClick={() => toggleShortlist(selectedActor.id)}
                >
                  <Heart
                    className="w-4 h-4"
                    fill={shortlist.includes(selectedActor.id) ? "currentColor" : "none"}
                  />
                  {shortlist.includes(selectedActor.id) ? "Shortlisted" : "Shortlist"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
