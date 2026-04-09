import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Users, Search, Star, CheckCircle2,
  Loader2, Mic, Sparkles, Filter, Crown, Lock,
  Heart, Film, Zap,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { AI_PERFORMANCE_STYLE_OPTIONS, AI_PERFORMANCE_STYLE_LABELS } from "@shared/types";

// ─── VIRELLE SIGNATURE CAST ────────────────────────────────────────────────
const SIGNATURE_CAST = [
  // FLAGSHIP STARS
  {
    id: "sig-julian-vance",
    name: "Julian Vance",
    tier: "flagship" as const,
    archetype: "The Dangerous Romantic",
    age: "32–42",
    specialty: "Crime Thriller / Prestige Drama",
    description: "Sharp, dangerous charisma built for thrillers, prestige drama, and high-stakes romance. Continuity-tuned for close-ups and multi-scene storytelling.",
    chemistry: ["Elena Rostova", "Sofia Reyes"],
    badges: ["Flagship Star", "Featured in Next Door"],
    unlocked: true,
  },
  {
    id: "sig-elena-rostova",
    name: "Elena Rostova",
    tier: "flagship" as const,
    archetype: "The Ice Architect",
    age: "30–44",
    specialty: "Prestige Drama / Thriller",
    description: "Cold architectural beauty with the emotional intelligence of a chess grandmaster. Premium fit for prestige drama, noir, and luxury campaigns.",
    chemistry: ["Julian Vance", "Kofi Adebayo"],
    badges: ["Flagship Star", "Featured in Next Door"],
    unlocked: true,
  },
  {
    id: "sig-sofia-reyes",
    name: "Sofia Reyes",
    tier: "flagship" as const,
    archetype: "The Combustible Heart",
    age: "28–42",
    specialty: "Drama / Romance / Action",
    description: "The most combustible screen presence in the cast. Warmth that can turn to fire in a single cut. Highest viral potential.",
    chemistry: ["Julian Vance", "Kofi Adebayo"],
    badges: ["Flagship Star"],
    unlocked: true,
  },
  {
    id: "sig-kofi-adebayo",
    name: "Kofi Adebayo",
    tier: "flagship" as const,
    archetype: "The Immovable Force",
    age: "35–50",
    specialty: "Action / Prestige Drama / Crime",
    description: "Immediate, undeniable physical authority. The room changes when he enters it. Premium fit for authority roles, crime drama, and action leads.",
    chemistry: ["Elena Rostova", "Sofia Reyes"],
    badges: ["Flagship Star"],
    unlocked: true,
  },
  // PREMIUM CAST
  {
    id: "sig-kenji-sato",
    name: "Kenji Sato",
    tier: "premium" as const,
    archetype: "The Quiet Predator",
    age: "28–40",
    specialty: "Noir / Thriller / Drama",
    description: "Neo-noir's perfect face. Stillness that reads as danger under dramatic lighting. Exceptional close-up presence.",
    chemistry: ["Elena Rostova", "Camille Dubois"],
    badges: ["Premium Cast"],
    unlocked: true,
  },
  {
    id: "sig-nina-cross",
    name: "Nina Cross",
    tier: "premium" as const,
    archetype: "The Controlled Observer",
    age: "30–44",
    specialty: "Drama / Thriller / Crime",
    description: "Perceptive, precise, and sharper than anyone in the room gives her credit for. Premium fit for intelligent female leads in crime drama.",
    chemistry: ["Celeste Vale", "Viktor Saric"],
    badges: ["Premium Cast", "Featured in Next Door"],
    unlocked: true,
  },
  {
    id: "sig-celeste-vale",
    name: "Celeste Vale",
    tier: "premium" as const,
    archetype: "The Velvet Hammer",
    age: "35–50",
    specialty: "Drama / Thriller / Crime",
    description: "Elegant, cutting, soft-spoken, and socially surgical. She says vicious things beautifully. Best in class for sophisticated antagonists.",
    chemistry: ["Nina Cross", "Marcus Vale"],
    badges: ["Premium Cast", "Featured in Next Door"],
    unlocked: true,
  },
  {
    id: "sig-marcus-vale",
    name: "Marcus Vale",
    tier: "premium" as const,
    archetype: "The Quiet Patriarch",
    age: "42–58",
    specialty: "Crime / Prestige Drama / Thriller",
    description: "Calm, sparse, precise. He says less than everyone else and means more. Exceptional for authority figures and crime patriarchs.",
    chemistry: ["Celeste Vale", "Viktor Saric"],
    badges: ["Premium Cast", "Featured in Next Door"],
    unlocked: true,
  },
  {
    id: "sig-viktor-saric",
    name: "Viktor Saric",
    tier: "premium" as const,
    archetype: "The Operational Ghost",
    age: "38–52",
    specialty: "Crime / Thriller / Action",
    description: "The most dangerous man in the room who never raises his voice. Best in class for fixers, enforcers, and consigliere roles.",
    chemistry: ["Marcus Vale", "Nina Cross"],
    badges: ["Premium Cast", "Featured in Next Door"],
    unlocked: true,
  },
  {
    id: "sig-gallagher-twins",
    name: "The Gallagher Twins",
    tier: "premium" as const,
    archetype: "The Mirror Pair",
    age: "28–40",
    specialty: "Drama / Thriller / Narrative Wildcard",
    description: "The ultimate technical flex. Two identical faces, two completely different people. Unmatched for twin-narrative storytelling.",
    chemistry: ["Julian Vance", "Kofi Adebayo"],
    badges: ["Premium Cast", "Twin Unit"],
    unlocked: true,
  },
  // STANDARD CAST
  {
    id: "sig-mavis-whitlock",
    name: "Mavis Whitlock",
    tier: "standard" as const,
    archetype: "The Invasive Oracle",
    age: "65–80",
    specialty: "Drama / Crime / Dark Comedy",
    description: "Harmless enough that people forget she is always watching. Funny because she is invasive and too observant.",
    chemistry: ["Nina Cross", "Daniel Cross"],
    badges: ["Featured in Next Door"],
    unlocked: true,
  },
  {
    id: "sig-adrian-vale",
    name: "Adrian Vale",
    tier: "standard" as const,
    archetype: "The Magnetic Disruptor",
    age: "24–36",
    specialty: "Drama / Crime / Dark Comedy",
    description: "Witty, charming, teasing, and verbally agile. He enjoys destabilizing people. Best for charismatic antagonists and scene-stealers.",
    chemistry: ["Mia Cross", "Jaden Vale"],
    badges: ["Featured in Next Door"],
    unlocked: true,
  },
  {
    id: "sig-sammy-vance",
    name: "Sammy Vance",
    tier: "standard" as const,
    archetype: "The Reluctant Heir",
    age: "22–32",
    specialty: "Drama / Thriller / Coming-of-Age",
    description: "Julian Vance's younger brother. The same bone structure, less certainty. Built for family-unit storytelling.",
    chemistry: ["Julian Vance"],
    badges: ["Family Unit — Vance"],
    unlocked: true,
  },
];

// ─── GENERIC ARCHETYPE LIBRARY (secondary) ────────────────────────────────
const AI_ACTOR_LIBRARY = [
  { id: "actor-001", name: "Marcus Vane", archetype: "Brooding Anti-Hero", age: "35-45", ethnicity: "Mixed", specialty: "Drama / Thriller", rating: 4.9, uses: 12840, description: "A morally conflicted man driven by past trauma. Intense, guarded, and capable of both great violence and unexpected tenderness." },
  { id: "actor-002", name: "Elara Solis", archetype: "Fierce Protagonist", age: "25-35", ethnicity: "Latina", specialty: "Action / Sci-Fi", rating: 4.8, uses: 9320, description: "Relentlessly determined and physically formidable. Leads from the front, earns loyalty through action, not words." },
  { id: "actor-003", name: "Jin Harlow", archetype: "Charming Rogue", age: "28-38", ethnicity: "East Asian", specialty: "Comedy / Romance", rating: 4.7, uses: 7650, description: "Disarmingly charismatic with a quick wit and flexible moral compass. Hides real depth behind a mask of levity." },
  { id: "actor-004", name: "Nadia Voss", archetype: "Cold Intellectual", age: "30-40", ethnicity: "Eastern European", specialty: "Thriller / Sci-Fi", rating: 4.9, uses: 11200, description: "Brilliant, precise, and emotionally detached. Every action is calculated. Vulnerability is a liability she refuses to show." },
  { id: "actor-005", name: "Darius Cole", archetype: "Charismatic Leader", age: "40-55", ethnicity: "African American", specialty: "Drama / Action", rating: 4.8, uses: 8900, description: "Commands rooms without raising his voice. Inspires fierce loyalty. Carries the weight of others' lives with quiet dignity." },
  { id: "actor-006", name: "Yuki Tanaka", archetype: "Quiet Intensity", age: "20-30", ethnicity: "Japanese", specialty: "Drama / Horror", rating: 4.6, uses: 5430, description: "Says little but observes everything. Still waters run deep — when she acts, it is decisive and irreversible." },
  { id: "actor-007", name: "Aleksei Morin", archetype: "Menacing Villain", age: "38-55", ethnicity: "Russian", specialty: "Thriller / Action", rating: 4.9, uses: 14200, description: "Calm, methodical, and utterly without remorse. His politeness is the most frightening thing about him." },
  { id: "actor-008", name: "Priya Anand", archetype: "Idealistic Rebel", age: "22-32", ethnicity: "South Asian", specialty: "Drama / Sci-Fi", rating: 4.7, uses: 6100, description: "Passionate about justice, impatient with compromise. Her idealism is both her greatest strength and her fatal flaw." },
  { id: "actor-009", name: "Tobias Wren", archetype: "Reluctant Hero", age: "30-42", ethnicity: "British", specialty: "Action / Drama", rating: 4.8, uses: 7800, description: "Never wanted to be the one who had to save anything. Does it anyway, every time, because no one else will." },
  { id: "actor-010", name: "Camille Dubois", archetype: "Femme Fatale", age: "28-40", ethnicity: "French", specialty: "Thriller / Romance", rating: 4.9, uses: 10500, description: "Devastatingly beautiful and twice as dangerous. Every interaction is a performance, every smile a calculation." },
  { id: "actor-011", name: "Omar Khalil", archetype: "Wise Mentor", age: "55-70", ethnicity: "Middle Eastern", specialty: "Drama / Fantasy", rating: 4.8, uses: 9200, description: "Has seen enough of the world to know its patterns. Teaches through questions, not answers." },
];

type SignatureActor = typeof SIGNATURE_CAST[0];
type GenericActor = typeof AI_ACTOR_LIBRARY[0];
type CastMode = "signature" | "generic";

function TierBadge({ tier }: { tier: "flagship" | "premium" | "standard" }) {
  if (tier === "flagship") return (
    <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 gap-1 text-xs h-5">
      <Crown className="w-3 h-3" /> Flagship Star
    </Badge>
  );
  if (tier === "premium") return (
    <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 gap-1 text-xs h-5">
      <Sparkles className="w-3 h-3" /> Premium Cast
    </Badge>
  );
  return (
    <Badge className="bg-zinc-700/50 text-zinc-400 border border-zinc-600/30 text-xs h-5">Standard</Badge>
  );
}

export default function AICasting() {
  const [, navigate] = useLocation();
  const params = useParams<{ projectId: string }>();
  const projectId = parseInt(params.projectId || "0");

  const [castMode, setCastMode] = useState<CastMode>("signature");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedActors, setSelectedActors] = useState<string[]>([]);
  const [performanceStyle, setPerformanceStyle] = useState("method-naturalistic");
  const [castingNotes, setCastingNotes] = useState("");
  const [voiceDescription, setVoiceDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterSpecialty, setFilterSpecialty] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [castSuccess, setCastSuccess] = useState(false);

  const createCharacterMutation = trpc.character.create.useMutation();

  const specialties = ["all", "Drama", "Action", "Thriller", "Sci-Fi", "Comedy", "Romance", "Horror", "Crime"];

  // Filter signature cast
  const filteredSignature = SIGNATURE_CAST.filter((actor) => {
    const matchSearch =
      !searchQuery ||
      actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      actor.archetype.toLowerCase().includes(searchQuery.toLowerCase()) ||
      actor.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTier = tierFilter === "all" || actor.tier === tierFilter;
    const matchSpecialty = filterSpecialty === "all" || actor.specialty.toLowerCase().includes(filterSpecialty.toLowerCase());
    return matchSearch && matchTier && matchSpecialty;
  });

  // Filter generic actors
  const filteredGeneric = AI_ACTOR_LIBRARY.filter((actor) => {
    const matchesSearch =
      !searchQuery ||
      actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      actor.archetype.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = filterSpecialty === "all" || actor.specialty.includes(filterSpecialty);
    return matchesSearch && matchesSpecialty;
  });

  const toggleActor = (id: string) => {
    setSelectedActors((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const getActorById = (id: string) => {
    const sig = SIGNATURE_CAST.find((a) => a.id === id);
    if (sig) return { name: sig.name, archetype: sig.archetype, description: sig.description, specialty: sig.specialty, isSignature: true, tier: sig.tier };
    const gen = AI_ACTOR_LIBRARY.find((a) => a.id === id);
    if (gen) return { name: gen.name, archetype: gen.archetype, description: gen.description, specialty: gen.specialty, isSignature: false, tier: "standard" };
    return null;
  };

  const handleCast = async () => {
    if (selectedActors.length === 0) {
      toast.error("Select at least one actor to cast");
      return;
    }
    setIsGenerating(true);
    setCastSuccess(false);
    try {
      const results = await Promise.allSettled(
        selectedActors.map((id) => {
          const actor = getActorById(id);
          if (!actor) return Promise.reject("Actor not found");
          const sigNote = actor.isSignature
            ? `[Virelle Signature Cast — ${actor.tier === "flagship" ? "Flagship Star" : actor.tier === "premium" ? "Premium Cast" : "Standard"} — Archetype: ${actor.archetype}]`
            : `[Cast from AI Actor Library — Archetype: ${actor.archetype}, Specialty: ${actor.specialty}]`;
          return createCharacterMutation.mutateAsync({
            projectId,
            name: actor.name,
            description: actor.description,
            role: actor.archetype,
            arcType: actor.archetype,
            performanceStyle,
            castingNotes: castingNotes ? `${castingNotes}\n\n${sigNote}` : sigNote,
            voiceDescription: voiceDescription || undefined,
            isAiActor: true,
            aiActorId: id,
          });
        })
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      if (succeeded > 0) {
        setCastSuccess(true);
        toast.success(
          `${succeeded} actor${succeeded > 1 ? "s" : ""} added to your project. View and edit them in the Characters tab.`
        );
        setSelectedActors([]);
        setCastingNotes("");
        setVoiceDescription("");
      }
      if (failed > 0) {
        toast.error(`${failed} actor${failed > 1 ? "s" : ""} could not be cast. Please try again.`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Casting failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <div className="border-b border-border/40 bg-black/20 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                Cast a Virelle Star
              </h1>
              <p className="text-xs text-muted-foreground">
                {selectedActors.length > 0
                  ? `${selectedActors.length} actor${selectedActors.length > 1 ? "s" : ""} selected — set performance direction, then cast`
                  : "Browse the Signature Cast or build your own archetype"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {castSuccess && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/40 text-amber-400 text-xs"
                onClick={() => navigate(`/projects/${projectId}`)}
              >
                View Characters
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="border-white/10 text-zinc-400 text-xs hidden md:flex"
              onClick={() => navigate("/signature-cast")}
            >
              <Film className="w-3 h-3 mr-1" />
              About Virelle Stars
            </Button>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
              onClick={handleCast}
              disabled={isGenerating || selectedActors.length === 0}
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Casting...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-1" /> Cast to Project ({selectedActors.length})</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* MODE TABS */}
      <div className="border-b border-border/40 bg-black/10">
        <div className="max-w-6xl mx-auto px-4 flex gap-1 pt-2">
          <button
            onClick={() => setCastMode("signature")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
              castMode === "signature"
                ? "bg-amber-500/10 text-amber-400 border-b-2 border-amber-500"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            Virelle Signature Cast
            <Badge className="bg-amber-500/20 text-amber-300 border-0 text-xs h-4 ml-1">
              {SIGNATURE_CAST.length}
            </Badge>
          </button>
          <button
            onClick={() => setCastMode("generic")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
              castMode === "generic"
                ? "bg-white/5 text-white border-b-2 border-white/30"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Custom Archetypes
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-3 md:p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Actor Library */}
        <div className="col-span-2 space-y-3">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={castMode === "signature" ? "Search by name, archetype, or vibe..." : "Search actors..."}
                className="pl-8 h-9 text-sm"
                inputMode="search"
                autoCapitalize="off"
                enterKeyHint="search"
              />
            </div>
            {castMode === "signature" && (
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="w-36 h-9 text-sm">
                  <Crown className="w-3 h-3 mr-1 text-amber-400" />
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">All Tiers</SelectItem>
                  <SelectItem value="flagship" className="text-sm text-amber-300">Flagship Stars</SelectItem>
                  <SelectItem value="premium" className="text-sm text-purple-300">Premium Cast</SelectItem>
                  <SelectItem value="standard" className="text-sm">Standard</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((s) => (
                  <SelectItem key={s} value={s} className="text-sm">
                    {s === "all" ? "All Genres" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[calc(100vh-260px)]">
            {castMode === "signature" ? (
              <div className="space-y-2 pr-2">
                {/* Flagship Stars section header */}
                {filteredSignature.some((a) => a.tier === "flagship") && (
                  <div className="flex items-center gap-2 mb-1 mt-1">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Flagship Stars</span>
                  </div>
                )}
                {filteredSignature.filter((a) => a.tier === "flagship").map((actor) => (
                  <SignatureActorCard
                    key={actor.id}
                    actor={actor}
                    selected={selectedActors.includes(actor.id)}
                    onToggle={() => toggleActor(actor.id)}
                  />
                ))}

                {filteredSignature.some((a) => a.tier === "premium") && (
                  <div className="flex items-center gap-2 mb-1 mt-4">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Premium Cast</span>
                  </div>
                )}
                {filteredSignature.filter((a) => a.tier === "premium").map((actor) => (
                  <SignatureActorCard
                    key={actor.id}
                    actor={actor}
                    selected={selectedActors.includes(actor.id)}
                    onToggle={() => toggleActor(actor.id)}
                  />
                ))}

                {filteredSignature.some((a) => a.tier === "standard") && (
                  <div className="flex items-center gap-2 mb-1 mt-4">
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Standard Cast</span>
                  </div>
                )}
                {filteredSignature.filter((a) => a.tier === "standard").map((actor) => (
                  <SignatureActorCard
                    key={actor.id}
                    actor={actor}
                    selected={selectedActors.includes(actor.id)}
                    onToggle={() => toggleActor(actor.id)}
                  />
                ))}

                {filteredSignature.length === 0 && (
                  <div className="text-center py-16 text-zinc-500">
                    <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No actors match your search.</p>
                    <p className="text-xs mt-1">Try searching by name, archetype, or vibe.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-2">
                {filteredGeneric.map((actor) => (
                  <button
                    key={actor.id}
                    onClick={() => toggleActor(actor.id)}
                    className={`text-left p-4 rounded-lg border transition-all ${
                      selectedActors.includes(actor.id)
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-border/40 bg-black/20 hover:border-amber-500/40"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">{actor.name}</p>
                        <p className="text-xs text-amber-400">{actor.archetype}</p>
                      </div>
                      {selectedActors.includes(actor.id) && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{actor.description}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge variant="outline" className="text-xs h-4 border-border/40">{actor.age}</Badge>
                      <Badge variant="outline" className="text-xs h-4 border-border/40">{actor.ethnicity}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{actor.specialty}</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs text-amber-400">{actor.rating}</span>
                        <span className="text-xs text-muted-foreground">({(actor.uses / 1000).toFixed(1)}k)</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Performance Settings Sidebar */}
        <div className="space-y-4">
          {/* Chemistry Pairs (Signature mode only) */}
          {castMode === "signature" && (
            <Card className="border-amber-500/10 bg-amber-950/10">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs flex items-center gap-2 text-amber-300
">
                  <Heart className="w-3 h-3" />
                  Ready-made chemistry
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                {[
                  { pair: ["sig-julian-vance", "sig-elena-rostova"], label: "Dangerous Tension", desc: "Ice meets fire" },
                  { pair: ["sig-julian-vance", "sig-sofia-reyes"], label: "Combustible Romance", desc: "Highest viral potential" },
                  { pair: ["sig-nina-cross", "sig-celeste-vale"], label: "The Duel", desc: "Two intelligent women, one room" },
                  { pair: ["sig-marcus-vale", "sig-viktor-saric"], label: "The Operation", desc: "Patriarch + fixer" },
                ].map((cp) => (
                  <button
                    key={cp.label}
                    className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                    onClick={() => {
                      cp.pair.forEach((id) => {
                        if (!selectedActors.includes(id)) toggleActor(id);
                      });
                    }}
                  >
                    <p className="text-xs font-medium text-amber-300">{cp.label}</p>
                    <p className="text-xs text-zinc-500">{cp.desc}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {cp.pair.map((id) => SIGNATURE_CAST.find((a) => a.id === id)?.name).join(" + ")}
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Performance Direction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Performance Style</Label>
                <Select value={performanceStyle} onValueChange={setPerformanceStyle}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_PERFORMANCE_STYLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">
                        {AI_PERFORMANCE_STYLE_LABELS[opt] || opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Casting Notes</Label>
                <Textarea
                  value={castingNotes}
                  onChange={(e) => setCastingNotes(e.target.value)}
                  placeholder="Director's notes for this actor's performance..."
                  className="text-xs min-h-[80px] resize-none"
                  autoCapitalize="sentences"
                  autoCorrect="on"
                  enterKeyHint="done"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                  <Mic className="w-3 h-3" /> Voice Description
                </Label>
                <Textarea
                  value={voiceDescription}
                  onChange={(e) => setVoiceDescription(e.target.value)}
                  placeholder="Describe the character's voice..."
                  className="text-xs min-h-[60px] resize-none"
                  autoCapitalize="sentences"
                  autoCorrect="on"
                  enterKeyHint="done"
                />
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                These settings apply to all selected actors when cast. You can edit each character individually after casting.
              </p>
            </CardContent>
          </Card>

          {selectedActors.length > 0 && (
            <Card className="border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Selected Cast ({selectedActors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {selectedActors.map((id) => {
                    const actor = getActorById(id);
                    return actor ? (
                      <div key={id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{actor.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{actor.archetype}</p>
                        </div>
                        <button onClick={() => toggleActor(id)}>
                          <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400 cursor-pointer hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 whitespace-nowrap">
                            Remove
                          </Badge>
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
                <Button
                  className="w-full mt-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm"
                  onClick={handleCast}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Casting...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Cast to Project</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SIGNATURE ACTOR CARD ──────────────────────────────────────────────────
function SignatureActorCard({
  actor,
  selected,
  onToggle,
}: {
  actor: SignatureActor;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        selected
          ? "border-amber-500 bg-amber-500/10"
          : "border-border/40 bg-black/20 hover:border-amber-500/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold text-white">{actor.name}</p>
            <TierBadge tier={actor.tier} />
            {actor.badges.includes("Featured in Next Door") && (
              <Badge className="bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 text-xs h-4">
                <Film className="w-2.5 h-2.5 mr-1" />
                Next Door
              </Badge>
            )}
          </div>
          <p className="text-xs text-amber-400/80">{actor.archetype}</p>
        </div>
        {selected && <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />}
      </div>
      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{actor.description}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-zinc-600">{actor.specialty}</span>
        {actor.chemistry.length > 0 && (
          <span className="text-xs text-zinc-600">
            Chemistry: <span className="text-zinc-500">{actor.chemistry[0]}</span>
            {actor.chemistry.length > 1 && <span className="text-zinc-600"> +{actor.chemistry.length - 1}</span>}
          </span>
        )}
      </div>
    </button>
  );
}
