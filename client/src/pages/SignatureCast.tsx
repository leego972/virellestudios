import { useState } from "react";
  import { useLocation } from "wouter";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Card, CardContent } from "@/components/ui/card";
  import {
    Star, Zap, Shield, Film, Users, ArrowRight, Play, Crown,
    Sparkles, CheckCircle2, ChevronRight,
  } from "lucide-react";

  // ─── Full cast roster (flagship + premium featured on marketing page) ─────
  const FLAGSHIP_STARS = [
    { id: "julian-vance",    name: "Julian Vance",        tier: "flagship", category: "Male Lead",       initials: "JV", accentColor: "amber",  gradient: "from-amber-900/50 via-zinc-900 to-zinc-950",  hook: "Sharp, dangerous charisma built for thrillers, prestige drama, and high-stakes romance.", tags: ["Crime Thriller", "Prestige Drama", "Romantic Lead"], chemistry: ["Elena Rostova", "Sofia Reyes"] },
    { id: "elena-rostova",   name: "Elena Rostova",       tier: "flagship", category: "Female Lead",     initials: "ER", accentColor: "cyan",   gradient: "from-cyan-900/35 via-zinc-900 to-zinc-950",   hook: "Precise, composed, and quietly devastating. The most dangerous person in any room.", tags: ["Prestige Drama", "Thriller", "High Fashion"], chemistry: ["Julian Vance", "Kofi Adebayo"] },
    { id: "sofia-reyes",     name: "Sofia Reyes",         tier: "flagship", category: "Female Lead",     initials: "SR", accentColor: "rose",   gradient: "from-rose-900/40 via-zinc-900 to-zinc-950",   hook: "Warmth that disarms. Intelligence that surprises. The most versatile lead in the cast.", tags: ["Drama", "Romance", "Crime"], chemistry: ["Julian Vance", "Marcus Osei"] },
    { id: "kofi-adebayo",    name: "Kofi Adebayo",        tier: "flagship", category: "Male Lead",       initials: "KA", accentColor: "emerald",gradient: "from-emerald-900/40 via-zinc-900 to-zinc-950", hook: "Immediate, undeniable physical authority. The room changes when he enters it.", tags: ["Action", "Prestige Drama", "Crime"], chemistry: ["Elena Rostova", "Sofia Reyes"] },
    { id: "kenji-sato",      name: "Kenji Sato",          tier: "premium",  category: "Male Lead",       initials: "KS", accentColor: "blue",   gradient: "from-blue-900/40 via-zinc-900 to-zinc-950",   hook: "Neo-noir's perfect face. Stillness that reads as danger under dramatic lighting.", tags: ["Noir", "Thriller", "Drama"], chemistry: ["Elena Rostova", "Yuki Tanaka"] },
    { id: "marcus-osei",     name: "Marcus Osei",         tier: "premium",  category: "Male Lead",       initials: "MO", accentColor: "orange", gradient: "from-orange-900/35 via-zinc-900 to-zinc-950", hook: "Grounded, emotionally complex. The kind of face audiences trust and follow.", tags: ["Drama", "Crime", "Action"], chemistry: ["Sofia Reyes", "Amara Diallo"] },
    { id: "amara-diallo",    name: "Amara Diallo",        tier: "premium",  category: "Female Lead",     initials: "AD", accentColor: "violet", gradient: "from-violet-900/35 via-zinc-900 to-zinc-950", hook: "Still on the outside. Relentless underneath. Audiences underestimate her exactly once.", tags: ["Drama", "Thriller", "Action"], chemistry: ["Marcus Osei", "Kofi Adebayo"] },
    { id: "yuki-tanaka",     name: "Yuki Tanaka",         tier: "premium",  category: "Female Lead",     initials: "YT", accentColor: "indigo", gradient: "from-indigo-900/35 via-zinc-900 to-zinc-950", hook: "Controlled, exact, and quietly magnetic. Every gesture is intentional.", tags: ["Noir", "Thriller", "Drama"], chemistry: ["Kenji Sato", "Elena Rostova"] },
    { id: "viktor-vale",     name: "Viktor Vale",         tier: "premium",  category: "Character Actor", initials: "VV", accentColor: "stone",  gradient: "from-stone-700/40 via-zinc-900 to-zinc-950",  hook: "Quiet authority that doesn't need to announce itself. The most dangerous man at the table.", tags: ["Crime", "Prestige Drama", "Thriller"], chemistry: ["Celeste Vale", "Elena Rostova"] },
    { id: "tariq-haddad",    name: "Tariq Haddad",        tier: "premium",  category: "Character Actor", initials: "TH", accentColor: "amber",  gradient: "from-amber-800/30 via-zinc-900 to-zinc-950",  hook: "Warm, expansive, and unpredictable. The most dangerous man at the dinner table.", tags: ["Crime", "Drama", "Thriller"], chemistry: ["Viktor Vale", "Kofi Adebayo"] },
    { id: "gallagher-twins", name: "The Gallagher Twins", tier: "premium",  category: "Twin Unit",       initials: "GT", accentColor: "purple", gradient: "from-purple-900/35 via-zinc-900 to-zinc-950", hook: "Two faces, one alibi. The most visually distinctive unit in the cast.", tags: ["Thriller", "Crime", "Dark Comedy"], chemistry: ["Elena Rostova", "Kenji Sato"] },
    { id: "daniel-cross",    name: "Daniel Cross",        tier: "standard", category: "Male Lead",       initials: "DC", accentColor: "slate",  gradient: "from-slate-700/30 via-zinc-900 to-zinc-950",  hook: "Suburban everyman energy that makes moral compromise feel real and earned.", tags: ["Drama", "Thriller", "Crime"], chemistry: ["Mavis Whitlock", "Celeste Vale"] },
    { id: "mavis-whitlock",  name: "Mavis Whitlock",      tier: "standard", category: "Female Lead",     initials: "MW", accentColor: "yellow", gradient: "from-yellow-900/30 via-zinc-900 to-zinc-950", hook: "Sees everything. Says less than she knows. The most dangerous witness in any scene.", tags: ["Drama", "Dark Comedy", "Crime"], chemistry: ["Daniel Cross", "Celeste Vale"] },
    { id: "celeste-vale",    name: "Celeste Vale",        tier: "standard", category: "Female Lead",     initials: "CV", accentColor: "teal",   gradient: "from-teal-900/30 via-zinc-900 to-zinc-950",   hook: "Immaculate, composed, and impossible to read. The most unsettling neighbour you'll ever meet.", tags: ["Thriller", "Drama", "Crime"], chemistry: ["Daniel Cross", "Mavis Whitlock"] },
    { id: "big-sasha",       name: "Big Sasha",           tier: "standard", category: "Character Actor", initials: "BS", accentColor: "zinc",   gradient: "from-zinc-700/40 via-zinc-900 to-zinc-950",   hook: "The harder edge. More silent, more suspicious, more final. His presence does the threatening.", tags: ["Crime", "Thriller", "Drama"], chemistry: ["Little Sasha", "Viktor Vale"] },
    { id: "little-sasha",    name: "Little Sasha",        tier: "standard", category: "Character Actor", initials: "LS", accentColor: "slate",  gradient: "from-slate-600/30 via-zinc-900 to-zinc-950",  hook: "More talkative, more disarming, more likely to smile. Warmth as a security function.", tags: ["Crime", "Thriller", "Dark Comedy"], chemistry: ["Big Sasha", "Viktor Vale"] },
  ];

  const CHEMISTRY_PAIRS = [
    { label: "Adversarial Romance",    actors: ["Julian Vance", "Sofia Reyes"],    description: "Combustible tension. Every scene is a negotiation." },
    { label: "Prestige Power Duo",     actors: ["Julian Vance", "Elena Rostova"],  description: "Two people who are equally dangerous and know it." },
    { label: "Crime Pair",             actors: ["Kofi Adebayo", "Kenji Sato"],     description: "Physical authority meets psychological precision." },
    { label: "Rival Patriarchs",       actors: ["Viktor Vale", "Tariq Haddad"],    description: "Same table, different kingdoms. The tension is permanent." },
    { label: "Twin Unit",              actors: ["The Gallagher Twins"],             description: "Same face, opposite souls. The narrative wildcard." },
    { label: "The Neighbourhood",      actors: ["Daniel Cross", "Celeste Vale", "Mavis Whitlock"], description: "Suburban noir. Everyone is hiding something." },
  ];

  const VALUE_PROPS = [
    { icon: Zap,          title: "No setup. Just cast.",        description: "Every Virelle Star is already built, tested, and ready. No character sheets, no prompt refinement loops, no wasted sessions.", color: "text-amber-400",  bg: "bg-amber-500/10" },
    { icon: Shield,       title: "Continuity that holds.",      description: "The same face, expression range, and identity across stills, scenes, trailers, and campaign assets — without drift.",           color: "text-blue-400",   bg: "bg-blue-500/10" },
    { icon: Film,         title: "Built for close-ups.",        description: "Stronger expression handling, better dramatic lighting response, and screen presence that reads as premium — not generated.",   color: "text-purple-400", bg: "bg-purple-500/10" },
    { icon: Star,         title: "Easier to market.",           description: "Defined personas, established visual identities, and chemistry pairings that make trailers, posters, and campaigns easier to build.", color: "text-rose-400", bg: "bg-rose-500/10" },
    { icon: CheckCircle2, title: "Commercially clean.",         description: "Platform-owned talent with clear licensing. Safe for public releases, branded work, and commercial campaigns without legal ambiguity.", color: "text-green-400", bg: "bg-green-500/10" },
    { icon: Users,        title: "Shared across your team.",    description: "One cast layer that every collaborator on your project can use consistently — not a different face every time someone generates.", color: "text-cyan-400",  bg: "bg-cyan-500/10" },
  ];

  const ACCENT_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
    amber:  { bg: "bg-amber-500/15",  text: "text-amber-300",  border: "border-amber-500/30" },
    cyan:   { bg: "bg-cyan-500/15",   text: "text-cyan-300",   border: "border-cyan-500/30" },
    rose:   { bg: "bg-rose-500/15",   text: "text-rose-300",   border: "border-rose-500/30" },
    emerald:{ bg: "bg-emerald-500/15",text: "text-emerald-300",border: "border-emerald-500/30" },
    blue:   { bg: "bg-blue-500/15",   text: "text-blue-300",   border: "border-blue-500/30" },
    orange: { bg: "bg-orange-500/15", text: "text-orange-300", border: "border-orange-500/30" },
    violet: { bg: "bg-violet-500/15", text: "text-violet-300", border: "border-violet-500/30" },
    indigo: { bg: "bg-indigo-500/15", text: "text-indigo-300", border: "border-indigo-500/30" },
    stone:  { bg: "bg-stone-500/15",  text: "text-stone-300",  border: "border-stone-500/30" },
    purple: { bg: "bg-purple-500/15", text: "text-purple-300", border: "border-purple-500/30" },
    teal:   { bg: "bg-teal-500/15",   text: "text-teal-300",   border: "border-teal-500/30" },
    yellow: { bg: "bg-yellow-500/15", text: "text-yellow-300", border: "border-yellow-500/30" },
    slate:  { bg: "bg-slate-500/15",  text: "text-slate-300",  border: "border-slate-500/30" },
    zinc:   { bg: "bg-zinc-500/15",   text: "text-zinc-300",   border: "border-zinc-500/30" },
  };

  function TierBadge({ tier }: { tier: string }) {
    if (tier === "flagship") return (
      <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 gap-1 text-xs">
        <Crown className="w-3 h-3" />Flagship Star
      </Badge>
    );
    if (tier === "premium") return (
      <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 gap-1 text-xs">
        <Sparkles className="w-3 h-3" />Premium Cast
      </Badge>
    );
    return <Badge className="bg-zinc-700/50 text-zinc-400 border border-zinc-600/30 text-xs">Standard</Badge>;
  }

  export default function SignatureCast() {
    const [, navigate] = useLocation();
    const [hoveredActor, setHoveredActor] = useState<string | null>(null);

    const flagshipActors = FLAGSHIP_STARS.filter(a => a.tier === "flagship");
    const premiumActors = FLAGSHIP_STARS.filter(a => a.tier === "premium");
    const standardActors = FLAGSHIP_STARS.filter(a => a.tier === "standard");

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
              Your next film needs a{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
                real cast.
              </span>
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-4">
              {FLAGSHIP_STARS.length} premium digital actors — continuity-tuned, screen-tested, and ready to cast into any project without setup.
            </p>
            <p className="text-zinc-500 max-w-xl mx-auto mb-10">
              Use them in films, trailers, campaigns, and series. Or build your own cast from scratch. Both lanes are open inside every project.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8"
                onClick={() => navigate("/talent-search")}>
                Browse the Full Cast
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5"
                onClick={() => navigate("/projects/new")}>
                <Play className="mr-2 w-4 h-4" />Cast in Your Project
              </Button>
            </div>
            {/* Tier count summary */}
            <div className="mt-12 flex flex-wrap gap-6 justify-center text-sm text-zinc-500">
              <span><span className="text-amber-400 font-semibold">{flagshipActors.length}</span> Flagship Stars</span>
              <span><span className="text-purple-400 font-semibold">{premiumActors.length}</span> Premium Cast</span>
              <span><span className="text-zinc-400 font-semibold">{standardActors.length}</span> Standard Cast</span>
            </div>
          </div>
        </section>

        {/* WHY VIRELLE STARS */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why cast a Virelle Star?</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Building a character from scratch takes time, prompt refinement, and still produces inconsistent results. Virelle Stars are already built — and they hold.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUE_PROPS.map((prop) => {
              const Icon = prop.icon;
              return (
                <div key={prop.title} className="rounded-xl border border-white/5 bg-white/[0.02] p-6 hover:border-white/10 transition-colors">
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

        {/* TWO WAYS TO CAST */}
        <section className="border-y border-white/5 bg-white/[0.01]">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <h2 className="text-3xl font-bold text-center mb-12">Two ways to cast. Both fully supported.</h2>
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
              <Crown className="w-3 h-3 mr-1" />Flagship Stars
            </Badge>
            <h2 className="text-3xl font-bold mb-4">The headline cast</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Four breakout leads built for prestige drama, crime, and high-stakes romance. Every franchise-level production needs at least one.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {flagshipActors.map((actor) => {
              const ac = ACCENT_CLASSES[actor.accentColor] ?? ACCENT_CLASSES.zinc;
              return (
                <Card key={actor.id}
                  className={`bg-gradient-to-b ${actor.gradient} border border-white/5 hover:border-white/15 transition-all cursor-pointer group`}
                  onMouseEnter={() => setHoveredActor(actor.id)}
                  onMouseLeave={() => setHoveredActor(null)}
                  onClick={() => navigate(`/talent-search?actor=${actor.id}`)}>
                  <CardContent className="p-5">
                    {/* Actor identity avatar */}
                    <div className={`w-full aspect-[3/4] rounded-lg ${ac.bg} ${ac.border} border mb-4 flex flex-col items-center justify-center gap-2 overflow-hidden relative`}>
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.05),transparent_70%)]" />
                      <div className={`relative z-10 w-16 h-16 rounded-full ${ac.bg} ${ac.border} border-2 flex items-center justify-center text-xl font-bold ${ac.text}`}>
                        {actor.initials}
                      </div>
                      <p className={`relative z-10 text-[10px] ${ac.text} font-semibold tracking-widest uppercase opacity-60`}>{actor.category}</p>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-white">{actor.name}</h3>
                        <TierBadge tier={actor.tier} />
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{actor.hook}</p>
                      <div className="flex flex-wrap gap-1">
                        {actor.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className={`text-xs px-2 py-0.5 rounded-full ${ac.bg} ${ac.text} border ${ac.border}`}>{tag}</span>
                        ))}
                      </div>
                      <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold"
                        onClick={(e) => { e.stopPropagation(); navigate("/talent-search"); }}>
                        View Full Profile
                        <ChevronRight className="ml-1 w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* PREMIUM CAST */}
        <section className="border-t border-white/5 bg-white/[0.01]">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-purple-500/10 text-purple-300 border border-purple-500/20">
                <Sparkles className="w-3 h-3 mr-1" />Premium Cast
              </Badge>
              <h2 className="text-3xl font-bold mb-4">Supporting leads and character actors</h2>
              <p className="text-zinc-400 max-w-xl mx-auto">
                Seven premium actors covering noir, drama, crime ensemble, psychological thriller, and the Gallagher Twins — the cast's most technically demanding unit.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {premiumActors.map((actor) => {
                const ac = ACCENT_CLASSES[actor.accentColor] ?? ACCENT_CLASSES.zinc;
                return (
                  <div key={actor.id}
                    className="rounded-xl border border-white/5 hover:border-purple-500/20 bg-zinc-900/30 p-5 cursor-pointer transition-all group"
                    onClick={() => navigate(`/talent-search?actor=${actor.id}`)}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full ${ac.bg} ${ac.border} border flex items-center justify-center text-sm font-bold ${ac.text}`}>
                        {actor.initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{actor.name}</p>
                        <p className="text-xs text-zinc-500">{actor.category}</p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-3">{actor.hook}</p>
                    <div className="flex flex-wrap gap-1">
                      {actor.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-500 border border-white/5">{tag}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* STANDARD CAST (Next Door ensemble) */}
        <section className="max-w-6xl mx-auto px-6 py-16 border-t border-white/5">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Film className="w-4 h-4 text-zinc-400" />
                <h2 className="text-xl font-bold">Featured in Next Door</h2>
              </div>
              <p className="text-sm text-zinc-500">The standard-tier ensemble from Virelle's debut suburban-noir series.</p>
            </div>
            <Button size="sm" variant="outline" className="border-white/10 text-zinc-400"
              onClick={() => navigate("/talent-search?tier=standard")}>
              Browse All <ChevronRight className="ml-1 w-3 h-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {standardActors.map((actor) => {
              const ac = ACCENT_CLASSES[actor.accentColor] ?? ACCENT_CLASSES.zinc;
              return (
                <div key={actor.id}
                  className="rounded-lg border border-white/5 hover:border-white/10 bg-zinc-900/20 p-4 cursor-pointer transition-all text-center"
                  onClick={() => navigate(`/talent-search?actor=${actor.id}`)}>
                  <div className={`w-12 h-12 rounded-full ${ac.bg} ${ac.border} border flex items-center justify-center text-sm font-bold ${ac.text} mx-auto mb-2`}>
                    {actor.initials}
                  </div>
                  <p className="text-xs font-semibold text-zinc-300">{actor.name}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{actor.category}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CHEMISTRY PAIRINGS */}
        <section className="border-y border-white/5 bg-white/[0.01]">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Chemistry pairings</h2>
              <p className="text-zinc-400 max-w-xl mx-auto">
                Not just individual actors — screen-tested combinations. Cast these pairs together to unlock the full dynamic.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {CHEMISTRY_PAIRS.map((pair) => (
                <div key={pair.label} className="rounded-xl border border-white/5 bg-zinc-900/30 p-5 hover:border-white/10 transition-colors cursor-pointer"
                  onClick={() => navigate("/talent-search")}>
                  <h3 className="font-semibold text-white mb-1">{pair.label}</h3>
                  <p className="text-xs text-zinc-500 mb-3">{pair.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pair.actors.map((name) => (
                      <span key={name} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/5">{name}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to cast?</h2>
          <p className="text-zinc-400 max-w-lg mx-auto mb-8">
            Browse the full cast, build your shortlist, and cast your first Virelle Star into a project — in minutes.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8"
              onClick={() => navigate("/talent-search")}>
              Browse the Cast
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5"
              onClick={() => navigate("/pricing")}>
              View Pricing
            </Button>
          </div>
        </section>
      </div>
    );
  }
  