import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Star,
  Zap,
  Shield,
  Film,
  Users,
  ArrowRight,
  Play,
  Crown,
  Sparkles,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

// Flagship 6 actors
const FLAGSHIP_STARS = [
  {
    id: "julian-vance",
    name: "Julian Vance",
    tier: "flagship",
    hook: "Sharp, dangerous charisma built for thrillers, prestige drama, and high-stakes romance.",
    tags: ["Crime Thriller", "Prestige Drama", "Romantic Lead"],
    chemistry: ["Elena Rostova", "Sofia Reyes"],
    gradient: "from-amber-900/40 to-zinc-900",
  },
  {
    id: "elena-rostova",
    name: "Elena Rostova",
    tier: "flagship",
    hook: "Cold architectural beauty with the emotional intelligence of a chess grandmaster.",
    tags: ["Prestige Drama", "Thriller", "High Fashion"],
    chemistry: ["Julian Vance", "Kofi Adebayo"],
    gradient: "from-slate-800/60 to-zinc-900",
  },
  {
    id: "sofia-reyes",
    name: "Sofia Reyes",
    tier: "flagship",
    hook: "The most combustible screen presence in the cast. Warmth that can turn to fire in a single cut.",
    tags: ["Drama", "Romance", "Action"],
    chemistry: ["Julian Vance", "Kofi Adebayo"],
    gradient: "from-rose-900/30 to-zinc-900",
  },
  {
    id: "kofi-adebayo",
    name: "Kofi Adebayo",
    tier: "flagship",
    hook: "Immediate, undeniable physical authority. The room changes when he enters it.",
    tags: ["Action", "Prestige Drama", "Crime"],
    chemistry: ["Elena Rostova", "Sofia Reyes"],
    gradient: "from-emerald-900/30 to-zinc-900",
  },
  {
    id: "kenji-sato",
    name: "Kenji Sato",
    tier: "premium",
    hook: "Neo-noir's perfect face. Stillness that reads as danger under dramatic lighting.",
    tags: ["Noir", "Thriller", "Drama"],
    chemistry: ["Elena Rostova"],
    gradient: "from-blue-900/30 to-zinc-900",
  },
  {
    id: "gallagher-twins",
    name: "The Gallagher Twins",
    tier: "premium",
    hook: "The ultimate technical flex. Two identical faces, two completely different people.",
    tags: ["Drama", "Thriller", "Narrative Wildcard"],
    chemistry: ["Julian Vance", "Kofi Adebayo"],
    gradient: "from-purple-900/30 to-zinc-900",
  },
];

const CHEMISTRY_PAIRS = [
  {
    label: "Adversarial Romance",
    actors: ["Julian Vance", "Sofia Reyes"],
    description: "Combustible tension. Every scene is a negotiation.",
  },
  {
    label: "Prestige Power Duo",
    actors: ["Julian Vance", "Elena Rostova"],
    description: "Two people who are equally dangerous and know it.",
  },
  {
    label: "Crime Pair",
    actors: ["Kofi Adebayo", "Kenji Sato"],
    description: "Physical authority meets psychological precision.",
  },
  {
    label: "Twin Unit",
    actors: ["The Gallagher Twins"],
    description: "Same face, opposite souls. The narrative wildcard.",
  },
];

const VALUE_PROPS = [
  {
    icon: Zap,
    title: "Faster",
    description: "Skip character setup and refinement loops. Cast immediately.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: Shield,
    title: "More Consistent",
    description: "Identity continuity across stills, scenes, trailers, and promo assets.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Film,
    title: "More Cinematic",
    description: "Stronger close-ups, better expression handling, premium screen presence.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    icon: Star,
    title: "More Marketable",
    description: "Defined screen personas, premium promo imagery, and chemistry pairings built in.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
  },
  {
    icon: CheckCircle2,
    title: "Commercially Cleaner",
    description: "Platform-owned talent. Designed for public releases and branded work.",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: Users,
    title: "Better for Teams",
    description: "Shared, repeatable cast layer instead of random one-off generations.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
];

function TierBadge({ tier }: { tier: string }) {
  if (tier === "flagship") {
    return (
      <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 gap-1 text-xs">
        <Crown className="w-3 h-3" />
        Flagship Star
      </Badge>
    );
  }
  return (
    <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 gap-1 text-xs">
      <Sparkles className="w-3 h-3" />
      Premium Cast
    </Badge>
  );
}

export default function SignatureCast() {
  const [, navigate] = useLocation();
  const [hoveredActor, setHoveredActor] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/20 via-zinc-950 to-zinc-950" />
        <div className="relative max-w-6xl mx-auto px-6 py-20 text-center">
          <Badge className="mb-6 bg-amber-500/10 text-amber-300 border border-amber-500/20 text-sm px-4 py-1.5">
            Virelle Signature Cast
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Cast a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
              Virelle Star
            </span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-4">
            Premium digital talent built for realism, continuity, and cinematic storytelling.
          </p>
          <p className="text-zinc-500 max-w-xl mx-auto mb-10">
            Cast them directly into your Virelle project in minutes — or build your own cast from scratch. Both lanes are open.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              size="lg"
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8"
              onClick={() => navigate("/talent-search")}
            >
              Browse the Cast
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/5"
              onClick={() => navigate("/projects/new")}
            >
              <Play className="mr-2 w-4 h-4" />
              Cast in Your Project
            </Button>
          </div>
        </div>
      </section>

      {/* WHY VIRELLE STARS */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Why cast a Virelle Star?</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Skip setup. Start casting. Every Virelle Star is continuity-tuned, screen-tested, and promo-ready out of the box.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {VALUE_PROPS.map((prop) => {
            const Icon = prop.icon;
            return (
              <div
                key={prop.title}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-6 hover:border-white/10 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg ${prop.bg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${prop.color}`} />
                </div>
                <h3 className="font-semibold text-white mb-2">{prop.title}</h3>
                <p className="text-sm text-zinc-400">{prop.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CUSTOM VS VIRELLE STARS */}
      <section className="border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl font-bold text-center mb-12">Two lanes. Both open.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-8">
              <h3 className="text-lg font-semibold mb-2 text-zinc-300">Create Your Own Character</h3>
              <p className="text-sm text-zinc-500 mb-6">Full creative freedom for original concepts.</p>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" /> Fully original, one-of-a-kind</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" /> Upload your own face or generate from scratch</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" /> Best for personal and experimental projects</li>
                <li className="flex items-start gap-2 text-zinc-600"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> Requires more manual tuning</li>
                <li className="flex items-start gap-2 text-zinc-600"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> More variable continuity across scenes</li>
              </ul>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-8">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-amber-300">Cast a Virelle Star</h3>
                <Crown className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-sm text-zinc-400 mb-6">Premium talent, ready to cast immediately.</p>
              <ul className="space-y-3 text-sm text-zinc-300">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" /> Continuity-tuned across all scenes</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" /> Screen-tested and promo-ready</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" /> Premium identity and wardrobe out of the box</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" /> Chemistry pairings and family units available</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" /> Commercially clean for public releases</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FLAGSHIP STARS */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Crown className="w-3 h-3 mr-1" />
            Flagship Stars
          </Badge>
          <h2 className="text-3xl font-bold mb-4">Meet the cast</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Six breakout stars ready to anchor your next film, trailer, or series.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FLAGSHIP_STARS.map((actor) => (
            <Card
              key={actor.id}
              className={`bg-gradient-to-b ${actor.gradient} border border-white/5 hover:border-white/15 transition-all cursor-pointer group`}
              onMouseEnter={() => setHoveredActor(actor.id)}
              onMouseLeave={() => setHoveredActor(null)}
              onClick={() => navigate(`/talent-search?actor=${actor.id}`)}
            >
              <CardContent className="p-6">
                {/* Portrait placeholder */}
                <div className="w-full aspect-[3/4] rounded-lg bg-white/5 mb-4 flex items-center justify-center border border-white/5 overflow-hidden">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-white/10 mx-auto mb-2 flex items-center justify-center">
                      <Users className="w-8 h-8 text-white/30" />
                    </div>
                    <p className="text-xs text-white/20">Portrait</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-white">{actor.name}</h3>
                    <TierBadge tier={actor.tier} />
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">{actor.hook}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {actor.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/5">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold"
                      onClick={(e) => { e.stopPropagation(); navigate("/projects/new"); }}
                    >
                      Cast Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 text-zinc-300 hover:bg-white/5 text-xs"
                      onClick={(e) => { e.stopPropagation(); navigate(`/talent-search?actor=${actor.id}`); }}
                    >
                      View Profile
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mt-10">
          <Button
            variant="outline"
            className="border-white/10 text-zinc-300 hover:bg-white/5"
            onClick={() => navigate("/talent-search")}
          >
            Browse the full cast
            <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* CHEMISTRY PAIRS */}
      <section className="border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Ready-made chemistry</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              You're not just picking faces. You're choosing castable chemistry and believable ensembles.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {CHEMISTRY_PAIRS.map((pair) => (
              <div
                key={pair.label}
                className="rounded-xl border border-white/5 bg-zinc-900/30 p-6 hover:border-white/10 transition-colors cursor-pointer"
                onClick={() => navigate("/talent-search")}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">{pair.label}</span>
                </div>
                <p className="font-medium text-white mb-1">{pair.actors.join(" + ")}</p>
                <p className="text-sm text-zinc-500">{pair.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEEN IN VIRELLE ORIGINALS */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="rounded-2xl border border-amber-500/10 bg-gradient-to-br from-amber-950/20 to-zinc-900/50 p-10 text-center">
          <Badge className="mb-4 bg-amber-500/10 text-amber-300 border border-amber-500/20">
            Virelle Originals
          </Badge>
          <h2 className="text-3xl font-bold mb-4">Seen in <em>Next Door</em></h2>
          <p className="text-zinc-400 max-w-2xl mx-auto mb-8">
            The Virelle Signature Cast powers Virelle's own original series. The same actors you cast in your projects are the stars of Virelle Originals — building recognition, familiarity, and cultural weight with every episode.
          </p>
          <Button
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            onClick={() => navigate("/talent-search")}
          >
            Browse the Cast
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* USAGE TERMS */}
      <section className="border-t border-white/5 bg-zinc-950/80">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Signature Cast — Usage Terms</h3>
                <p className="text-sm text-zinc-500">Virelle Stars are premium digital actors for professional cinematic use.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-3">Permitted Use</p>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" /> Films, trailers, series, and campaigns</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" /> Prestige digital content and branded work</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" /> Sensual, romantic, and mature dramatic scenes</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" /> Adult chemistry and seductive tension (prestige standard)</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" /> Provocative wardrobe, adult glamour, implied intimacy</li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">Prohibited Use</p>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-red-400 mt-0.5 shrink-0" /> Pornographic content or explicit sexual acts</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-red-400 mt-0.5 shrink-0" /> Graphic nudity intended for sexual display</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-red-400 mt-0.5 shrink-0" /> Adult-industry or adult-creator platform use</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-red-400 mt-0.5 shrink-0" /> Fetish content or sexual exploitation material</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-red-400 mt-0.5 shrink-0" /> Marketing actors as pornographic performers</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-zinc-600 mt-6 border-t border-white/5 pt-4">
              Virelle Stars are commercially clean, brand-safe premium digital talent. Violations of these terms will result in immediate content removal and account action. See the full <span className="text-zinc-400 underline cursor-pointer">Terms of Service</span> for details.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t border-white/5 bg-zinc-950">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Start casting today</h2>
          <p className="text-zinc-400 mb-10">
            Create your own cast — or cast a Virelle Star. Both lanes are open inside every project.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              size="lg"
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8"
              onClick={() => navigate("/talent-search")}
            >
              Browse the Signature Cast
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/5"
              onClick={() => navigate("/characters")}
            >
              Create Your Own Character
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
