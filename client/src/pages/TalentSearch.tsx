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
  Star,
  ArrowRight,
  Lock,
  ChevronRight,
  Heart,
  Film,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

// Full 24-actor roster
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
    unlocked: true,
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
    unlocked: true,
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
    chemistry: ["Elena Rostova", "Camille Dubois"],
    badges: ["Premium Cast"],
    unlocked: true,
  },
  {
    id: "sammy-vance",
    name: "Sammy Vance",
    tier: "standard",
    category: "Male Lead",
    archetype: "The Reluctant Heir",
    age: "22–32",
    genres: ["Drama", "Thriller", "Coming-of-Age"],
    hook: "Julian Vance's younger brother. The same bone structure, less certainty.",
    whyCast: "Built for family-unit storytelling. Shares facial anchors with Julian Vance for believable sibling casting.",
    bestFor: ["family drama", "coming-of-age", "thriller", "crime"],
    chemistry: ["Julian Vance"],
    badges: ["Family Unit — Vance"],
    unlocked: true,
  },
  // FEMALE LEADS
  {
    id: "elena-rostova",
    name: "Elena Rostova",
    tier: "flagship",
    category: "Female Lead",
    archetype: "The Ice Architect",
    age: "30–44",
    genres: ["Prestige Drama", "Thriller", "High Fashion"],
    hook: "Cold architectural beauty with the emotional intelligence of a chess grandmaster.",
    whyCast: "Continuity-tuned for close-ups and multi-scene storytelling. Premium fit for prestige drama, noir, and luxury campaigns.",
    bestFor: ["prestige drama", "thriller", "high fashion", "villain lead"],
    chemistry: ["Julian Vance", "Kofi Adebayo"],
    badges: ["Flagship Star", "Featured in Next Door"],
    unlocked: true,
  },
  {
    id: "sofia-reyes",
    name: "Sofia Reyes",
    tier: "flagship",
    category: "Female Lead",
    archetype: "The Combustible Heart",
    age: "28–42",
    genres: ["Drama", "Romance", "Action"],
    hook: "The most combustible screen presence in the cast. Warmth that can turn to fire in a single cut.",
    whyCast: "Highest viral potential. Exceptional chemistry with Julian Vance and Kofi Adebayo. Best for emotionally complex leads.",
    bestFor: ["romantic lead", "drama", "action", "family matriarch"],
    chemistry: ["Julian Vance", "Kofi Adebayo"],
    badges: ["Flagship Star"],
    unlocked: true,
  },
  {
    id: "nina-cross",
    name: "Nina Cross",
    tier: "premium",
    category: "Female Lead",
    archetype: "The Controlled Observer",
    age: "30–44",
    genres: ["Drama", "Thriller", "Crime"],
    hook: "Perceptive, precise, and sharper than anyone in the room gives her credit for.",
    whyCast: "Premium fit for intelligent female leads in crime drama and prestige series. Strong emotional readability.",
    bestFor: ["crime drama", "prestige drama", "thriller", "domestic tension"],
    chemistry: ["Celeste Vale", "Viktor Saric"],
    badges: ["Premium Cast", "Featured in Next Door"],
    unlocked: true,
  },
  {
    id: "celeste-vale",
    name: "Celeste Vale",
    tier: "premium",
    category: "Female Lead",
    archetype: "The Velvet Hammer",
    age: "35–50",
    genres: ["Drama", "Thriller", "Crime"],
    hook: "Elegant, cutting, soft-spoken, and socially surgical. She says vicious things beautifully.",
    whyCast: "Best in class for sophisticated antagonists and morally complex female leads. Premium fit for prestige crime drama.",
    bestFor: ["crime drama", "prestige drama", "sophisticated antagonist", "domestic thriller"],
    chemistry: ["Nina Cross", "Marcus Vale"],
    badges: ["Premium Cast", "Featured in Next Door"],
    unlocked: true,
  },
  // CHARACTER ACTORS
  {
    id: "marcus-vale",
    name: "Marcus Vale",
    tier: "premium",
    category: "Character Actor",
    archetype: "The Quiet Patriarch",
    age: "42–58",
    genres: ["Crime", "Prestige Drama", "Thriller"],
    hook: "Calm, sparse, precise. He says less than everyone else and means more.",
    whyCast: "Exceptional for authority figures, crime patriarchs, and morally complex antagonists. Understated menace.",
    bestFor: ["crime patriarch", "authority figure", "prestige drama", "antagonist"],
    chemistry: ["Celeste Vale", "Viktor Saric"],
    badges: ["Premium Cast", "Featured in Next Door"],
    unlocked: true,
  },
  {
    id: "viktor-saric",
    name: "Viktor Saric",
    tier: "premium",
    category: "Character Actor",
    archetype: "The Operational Ghost",
    age: "38–52",
    genres: ["Crime", "Thriller", "Action"],
    hook: "The most dangerous man in the room who never raises his voice.",
    whyCast: "Best in class for fixers, enforcers, and consigliere roles. Dry, calm, and operationally precise.",
    bestFor: ["fixer", "enforcer", "crime thriller", "action support"],
    chemistry: ["Marcus Vale", "Nina Cross"],
    badges: ["Premium Cast", "Featured in Next Door"],
    unlocked: true,
  },
  // COMEDIC ACTORS
  {
    id: "mavis-whitlock",
    name: "Mavis Whitlock",
    tier: "standard",
    category: "Character Actor",
    archetype: "The Invasive Oracle",
    age: "65–80",
    genres: ["Drama", "Crime", "Dark Comedy"],
    hook: "Harmless enough that people forget she is always watching. Funny because she is invasive and too observant.",
    whyCast: "Unique comic pressure and witness-risk function. Best for neighborhood surveillance, dark comedy, and ensemble casts.",
    bestFor: ["dark comedy", "crime drama", "ensemble", "comic relief"],
    chemistry: ["Nina Cross", "Daniel Cross"],
    badges: ["Featured in Next Door"],
    unlocked: true,
  },
  {
    id: "adrian-vale",
    name: "Adrian Vale",
    tier: "standard",
    category: "Character Actor",
    archetype: "The Magnetic Disruptor",
    age: "24–36",
    genres: ["Drama", "Crime", "Dark Comedy"],
    hook: "Witty, charming, teasing, and verbally agile. He enjoys destabilizing people.",
    whyCast: "Best for charismatic antagonists, scene-stealers, and morally ambiguous support roles.",
    bestFor: ["dark comedy", "crime support", "charismatic antagonist", "ensemble"],
    chemistry: ["Mia Cross", "Jaden Vale"],
    badges: ["Featured in Next Door"],
    unlocked: true,
  },
  // TWINS
  {
    id: "gallagher-twins",
    name: "The Gallagher Twins",
    tier: "premium",
    category: "Twin Unit",
    archetype: "The Mirror Pair",
    age: "28–40",
    genres: ["Drama", "Thriller", "Narrative Wildcard"],
    hook: "The ultimate technical flex. Two identical faces, two completely different people.",
    whyCast: "Unmatched for twin-narrative storytelling. Same face, opposite souls. Narrative wildcards for any genre.",
    bestFor: ["twin narrative", "thriller", "drama", "identity stories"],
    chemistry: ["Julian Vance", "Kofi Adebayo"],
    badges: ["Premium Cast", "Twin Unit"],
    unlocked: true,
  },
  {
    id: "sato-twins",
    name: "The Sato Twins",
    tier: "premium",
    category: "Twin Unit",
    archetype: "The Precision Pair",
    age: "25–38",
    genres: ["Action", "Thriller", "Crime"],
    hook: "Kenji Sato's identical twin. Same face, different operational role.",
    whyCast: "Best for action and thriller twin narratives. Mirror Lock system prevents identity drift across scenes.",
    bestFor: ["action", "thriller", "twin narrative", "crime"],
    chemistry: ["Kenji Sato"],
    badges: ["Premium Cast", "Twin Unit"],
    unlocked: false,
  },
];

const CATEGORIES = ["All", "Male Lead", "Female Lead", "Character Actor", "Twin Unit"];
const GENRES = ["All", "Crime Thriller", "Prestige Drama", "Romance", "Action", "Noir", "Dark Comedy", "Thriller"];
const TIERS = ["All", "flagship", "premium", "standard"];

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

export default function TalentSearch() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [genre, setGenre] = useState("All");
  const [tierFilter, setTierFilter] = useState("All");
  const [selectedActor, setSelectedActor] = useState<typeof SIGNATURE_CAST[0] | null>(null);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [castConfirmActor, setCastConfirmActor] = useState<typeof SIGNATURE_CAST[0] | null>(null);

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

  const isPremiumUser = user && (user as any).subscriptionTier && (user as any).subscriptionTier !== "free";

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
                  <SelectItem key={c} value={c} className="text-zinc-300 focus:bg-white/10">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="w-40 bg-white/5 border-white/10 text-zinc-300">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                {GENRES.map((g) => (
                  <SelectItem key={g} value={g} className="text-zinc-300 focus:bg-white/10">
                    {g}
                  </SelectItem>
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
            <p className="text-sm text-amber-400">
              {shortlist.length} in shortlist
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((actor) => (
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
                  {/* Shortlist button */}
                  <button
                    className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      shortlist.includes(actor.id)
                        ? "bg-amber-500 text-black"
                        : "bg-zinc-800/80 text-zinc-400 opacity-0 group-hover:opacity-100"
                    }`}
                    onClick={(e) => { e.stopPropagation(); toggleShortlist(actor.id); }}
                  >
                    <Heart className="w-4 h-4" fill={shortlist.includes(actor.id) ? "currentColor" : "none"} />
                  </button>
                  {/* Lock overlay for locked actors */}
                  {!actor.unlocked && (
                    <div className="absolute inset-0 bg-zinc-950/70 flex flex-col items-center justify-center">
                      <Lock className="w-6 h-6 text-zinc-400 mb-2" />
                      <p className="text-xs text-zinc-400">Unlock Premium</p>
                    </div>
                  )}
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
                  {actor.chemistry.length > 0 && (
                    <p className="text-xs text-zinc-600">
                      Chemistry: <span className="text-zinc-500">{actor.chemistry[0]}</span>
                      {actor.chemistry.length > 1 && <span className="text-zinc-600"> +{actor.chemistry.length - 1}</span>}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    {actor.unlocked ? (
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
                        className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold h-7"
                        onClick={(e) => { e.stopPropagation(); navigate("/pricing"); }}
                      >
                        <Lock className="w-3 h-3 mr-1" />
                        Unlock
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
          ))}
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

      {/* CAST CONFIRMATION DIALOG */}
      {castConfirmActor && (
        <Dialog open={!!castConfirmActor} onOpenChange={() => setCastConfirmActor(null)}>
          <DialogContent className="bg-zinc-900 border border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Cast {castConfirmActor.name}?</DialogTitle>
              <DialogDescription className="text-zinc-400">
                You are about to cast a Virelle Signature Star in your project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="rounded-lg border border-white/5 bg-zinc-950/60 p-4 space-y-2">
                <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">License Confirmation</p>
                <ul className="text-xs text-zinc-400 space-y-1.5">
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" /> Permitted: films, trailers, series, campaigns, prestige digital content</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" /> Permitted: sensual, romantic, and mature dramatic scenes (prestige standard)</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" /> Prohibited: pornography, explicit sexual content, adult-industry use</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" /> Prohibited: graphic nudity for sexual display, fetish content, exploitation</li>
                </ul>
              </div>
              <p className="text-xs text-zinc-500">By casting, you confirm you have read and agree to the Virelle Signature Cast usage terms.</p>
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                  onClick={() => { setCastConfirmActor(null); navigate("/projects/new"); }}
                >
                  Confirm &amp; Cast
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  className="border-white/10 text-zinc-300 hover:bg-white/5"
                  onClick={() => setCastConfirmActor(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ACTOR PROFILE DIALOG */}
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
                        <Button
                          size="sm"
                          className="h-5 text-xs px-2 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-0"
                          onClick={() => { setSelectedActor(null); navigate("/projects/new"); }}
                        >
                          Cast Both
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {selectedActor.badges.map((badge) => (
                  <Badge key={badge} className="bg-zinc-800/50 text-zinc-400 border border-zinc-700/30 text-xs">
                    {badge}
                  </Badge>
                ))}
              </div>

              {/* USAGE TERMS NOTICE */}
              <div className="rounded-lg border border-white/5 bg-zinc-950/60 p-4">
                <p className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Signature Cast — Usage Terms</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Virelle Stars are licensed for professional cinematic use: films, trailers, series, campaigns, and prestige digital content.
                  Sensual, romantic, and mature dramatic scenes are permitted within a prestige-film standard.
                  Pornographic content, explicit sexual acts, graphic nudity intended for sexual display, and adult-industry use are
                  <span className="text-zinc-300 font-medium"> strictly prohibited</span> and will result in immediate content removal and account action.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex gap-3 pt-2">
                {selectedActor.unlocked ? (
                  <Button
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                    onClick={() => { setCastConfirmActor(selectedActor); setSelectedActor(null); }}
                  >
                    Cast in Project
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold"
                    onClick={() => { setSelectedActor(null); navigate("/pricing"); }}
                  >
                    <Lock className="mr-2 w-4 h-4" />
                    Unlock Premium Cast
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
                  {shortlist.includes(selectedActor.id) ? "Shortlisted" : "Add to Shortlist"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
