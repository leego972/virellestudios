import { useState } from "react";
  import { trpc } from "@/lib/trpc";
  import { useLocation } from "wouter";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Card, CardContent } from "@/components/ui/card";
  import {
    Star, Zap, Shield, Film, Users, ArrowRight, Play, Crown,
    Sparkles, CheckCircle2, ChevronRight, Fingerprint, GitBranch, Layers, AlertTriangle,
  } from "lucide-react";

  // ─── Full cast roster with Character DNA ──────────────────────────────────────
  const FLAGSHIP_STARS = [
    {
      id: "julian-vance", name: "Julian Vance", tier: "flagship", category: "Male Lead",
      initials: "JV", accentColor: "amber", gradient: "from-amber-900/50 via-zinc-900 to-zinc-950",
      hook: "Sharp, dangerous charisma built for thrillers, prestige drama, and high-stakes romance.",
      tags: ["Crime Thriller", "Prestige Drama", "Romantic Lead"],
      chemistry: ["Elena Rostova", "Sofia Reyes"],
      portraitUrl: "/portraits/julian-vance/master.png",
      archetype: "Charismatic Operator",
      genreFit: "Crime thriller · Prestige drama · High-stakes romance",
      visualIdentity: "Tailored dark suit, controlled expression, silver-touched hair, restrained menace.",
      personality: "Calculating, magnetic, emotionally guarded.",
      voiceDirection: "Low and deliberate. Every word costs something.",
      continuityNotes: "Best in interrogation rooms, private clubs, rooftop standoffs, luxury interiors.",
    },
    {
      id: "elena-rostova", name: "Elena Rostova", tier: "flagship", category: "Female Lead",
      initials: "ER", accentColor: "cyan", gradient: "from-cyan-900/35 via-zinc-900 to-zinc-950",
      hook: "Precise, composed, and quietly devastating. The most dangerous person in any room.",
      tags: ["Prestige Drama", "Thriller", "High Fashion"],
      chemistry: ["Julian Vance", "Kofi Adebayo"],
      portraitUrl: "/portraits/elena-rostova/master.png",
      archetype: "Ice-Cold Power Lead",
      genreFit: "Prestige drama · Thriller · High fashion editorial",
      visualIdentity: "Angular cheekbones, cool undertones, monochrome wardrobe, minimal jewelry.",
      personality: "Precise, composed, dangerously self-controlled.",
      voiceDirection: "Measured, clipped. Cold intelligence with rare emotional breaks.",
      continuityNotes: "Best in boardrooms, clinical environments, power corridors, cold interrogation scenes.",
    },
    {
      id: "sofia-reyes", name: "Sofia Reyes", tier: "flagship", category: "Female Lead",
      initials: "SR", accentColor: "rose", gradient: "from-rose-900/40 via-zinc-900 to-zinc-950",
      hook: "Warmth that disarms. Intelligence that surprises. The most versatile lead in the cast.",
      tags: ["Drama", "Romance", "Crime"],
      chemistry: ["Julian Vance", "Marcus Osei"],
      portraitUrl: "/portraits/sofia-reyes/master.png",
      archetype: "Resilient Romantic Lead",
      genreFit: "Drama · Romance · Crime ensemble",
      visualIdentity: "Warm brown tones, expressive eyes, wardrobe ranging from street to elegant.",
      personality: "Warmth that disarms, intelligence that surprises, resilience under pressure.",
      voiceDirection: "Genuine, emotionally present. Cadence that builds naturally.",
      continuityNotes: "Best in intimate scenes, moral dilemmas, romance tension, domestic environments.",
    },
    {
      id: "kofi-adebayo", name: "Kofi Adebayo", tier: "flagship", category: "Male Lead",
      initials: "KA", accentColor: "emerald", gradient: "from-emerald-900/40 via-zinc-900 to-zinc-950",
      hook: "Immediate, undeniable physical authority. The room changes when he enters it.",
      tags: ["Action", "Prestige Drama", "Crime"],
      chemistry: ["Elena Rostova", "Sofia Reyes"],
      portraitUrl: "/portraits/kofi-adebayo/master.png",
      archetype: "Physical Authority Lead",
      genreFit: "Action · Prestige drama · Crime ensemble",
      visualIdentity: "Commanding build, clean sharp edges, understated wardrobe, stillness as power.",
      personality: "Immediate authority, moral depth, protective instinct.",
      voiceDirection: "Grounded, controlled. Phrases that land with weight.",
      continuityNotes: "Best in standoffs, leadership scenes, physical confrontations, ensemble anchoring.",
    },
    {
      id: "kenji-sato", name: "Kenji Sato", tier: "premium", category: "Male Lead",
      initials: "KS", accentColor: "blue", gradient: "from-blue-900/40 via-zinc-900 to-zinc-950",
      hook: "Neo-noir's perfect face. Stillness that reads as danger under dramatic lighting.",
      tags: ["Noir", "Thriller", "Drama"],
      chemistry: ["Elena Rostova", "Yuki Tanaka"],
      portraitUrl: "/portraits/kenji-sato/master.png",
      archetype: "Neo-Noir Protagonist",
      genreFit: "Neo-noir · Thriller · Psychological drama",
      visualIdentity: "Sharp jawline, minimal dark wardrobe, stillness reads as danger.",
      personality: "Reserved, analytical, emotionally contained with rare explosive moments.",
      voiceDirection: "Quiet, measured. Rarely rises above a murmur.",
      continuityNotes: "Best in rain scenes, low-light investigation, urban environments, night exteriors.",
    },
    {
      id: "marcus-osei", name: "Marcus Osei", tier: "premium", category: "Male Lead",
      initials: "MO", accentColor: "orange", gradient: "from-orange-900/35 via-zinc-900 to-zinc-950",
      hook: "Grounded, emotionally complex. The kind of face audiences trust and follow.",
      tags: ["Drama", "Crime", "Action"],
      chemistry: ["Sofia Reyes", "Amara Diallo"],
      portraitUrl: "/portraits/marcus-osei/master.png",
      archetype: "Trusted Complex Lead",
      genreFit: "Drama · Crime ensemble · Action",
      visualIdentity: "Grounded physicality, approachable features, tactical or casual wardrobe.",
      personality: "Emotionally complex, loyal, principled under pressure.",
      voiceDirection: "Warm but firm. Cadence that builds trust instinctively.",
      continuityNotes: "Best in community scenes, loyalty tests, physical support roles, slow-burn reveals.",
    },
    {
      id: "amara-diallo", name: "Amara Diallo", tier: "premium", category: "Female Lead",
      initials: "AD", accentColor: "violet", gradient: "from-violet-900/35 via-zinc-900 to-zinc-950",
      hook: "Still on the outside. Relentless underneath. Audiences underestimate her exactly once.",
      tags: ["Drama", "Thriller", "Action"],
      chemistry: ["Marcus Osei", "Kofi Adebayo"],
      portraitUrl: "/portraits/amara-diallo/master.png",
      archetype: "Silent Storm",
      genreFit: "Drama · Thriller · Action",
      visualIdentity: "Still exterior, expressive eyes, minimal adornment, controlled posture.",
      personality: "Determined, observant, dangerous when provoked.",
      voiceDirection: "Minimal words. Every syllable intentional.",
      continuityNotes: "Best in surveillance scenes, silent pursuit, confrontation buildup, emotional turns.",
    },
    {
      id: "yuki-tanaka", name: "Yuki Tanaka", tier: "premium", category: "Female Lead",
      initials: "YT", accentColor: "indigo", gradient: "from-indigo-900/35 via-zinc-900 to-zinc-950",
      hook: "Controlled, exact, and quietly magnetic. Every gesture is intentional.",
      tags: ["Noir", "Thriller", "Drama"],
      chemistry: ["Kenji Sato", "Elena Rostova"],
      portraitUrl: "/portraits/yuki-tanaka/master.png",
      archetype: "Precise Enigma",
      genreFit: "Noir · Thriller · Drama",
      visualIdentity: "Exact styling, monochrome palette, refined detail in every frame.",
      personality: "Controlled, exact, magnetic without effort.",
      voiceDirection: "Deliberate, understated. Tonal shifts carry all meaning.",
      continuityNotes: "Best in close-up tension, stylised noir lighting, psychological scenes, late-night interiors.",
    },
    {
      id: "viktor-vale", name: "Viktor Vale", tier: "premium", category: "Character Actor",
      initials: "VV", accentColor: "stone", gradient: "from-stone-700/40 via-zinc-900 to-zinc-950",
      hook: "Quiet authority that doesn't need to announce itself. The most dangerous man at the table.",
      tags: ["Crime", "Prestige Drama", "Thriller"],
      chemistry: ["Celeste Vale", "Elena Rostova"],
      portraitUrl: "/portraits/viktor-vale/master.png",
      archetype: "Elder Patriarch",
      genreFit: "Crime · Prestige drama · Thriller",
      visualIdentity: "Heavy-set authority, silver hair, expensive but worn wardrobe.",
      personality: "Quiet authority. Dangerous in stillness.",
      voiceDirection: "Low, deliberate. Uses silence as punctuation.",
      continuityNotes: "Best at a table, in a study, in council scenes where his words end things.",
    },
    {
      id: "tariq-haddad", name: "Tariq Haddad", tier: "premium", category: "Character Actor",
      initials: "TH", accentColor: "amber", gradient: "from-amber-800/30 via-zinc-900 to-zinc-950",
      hook: "Warm, expansive, and unpredictable. The most dangerous man at the dinner table.",
      tags: ["Crime", "Drama", "Thriller"],
      chemistry: ["Viktor Vale", "Kofi Adebayo"],
      portraitUrl: "/portraits/tariq-haddad/master.png",
      archetype: "Warm Menace",
      genreFit: "Crime · Drama · Thriller",
      visualIdentity: "Open-faced warmth masking hidden depth, casual authority.",
      personality: "Charming, unpredictable. Warm until he isn't.",
      voiceDirection: "Expansive, jovial. Edges only visible in the subtext.",
      continuityNotes: "Best at dinner tables, social gatherings, negotiations disguised as hospitality.",
    },
    {
      id: "gallagher-twins", name: "The Gallagher Twins", tier: "premium", category: "Twin Unit",
      initials: "GT", accentColor: "purple", gradient: "from-purple-900/35 via-zinc-900 to-zinc-950",
      hook: "Two faces, one alibi. The most visually distinctive unit in the cast.",
      tags: ["Thriller", "Crime", "Dark Comedy"],
      chemistry: ["Elena Rostova", "Kenji Sato"],
      portraitUrl: "/portraits/gallagher-twins/master.png",
      archetype: "Twin Wildcard",
      genreFit: "Thriller · Crime · Dark comedy",
      visualIdentity: "Identical exteriors with opposite styling to differentiate.",
      personality: "One disarms; one threatens. Together a complete system.",
      voiceDirection: "Contrast is the direction — one warm, one clipped.",
      continuityNotes: "Best in unreliable-identity scenes, mirrored sequences, misdirection beats.",
    },
    {
      id: "daniel-cross", name: "Daniel Cross", tier: "standard", category: "Male Lead",
      initials: "DC", accentColor: "slate", gradient: "from-slate-700/30 via-zinc-900 to-zinc-950",
      hook: "Suburban everyman energy that makes moral compromise feel real and earned.",
      tags: ["Drama", "Thriller", "Crime"],
      chemistry: ["Mavis Whitlock", "Celeste Vale"],
      portraitUrl: "/portraits/daniel-cross/master.png",
      archetype: "Suburban Everyman",
      genreFit: "Drama · Suburban thriller · Crime",
      visualIdentity: "Unremarkable by design — the face moral compromise looks through.",
      personality: "Ordinary, anxious, slowly compromised.",
      voiceDirection: "Familiar cadence, escalating tension.",
      continuityNotes: "Best in home environments, neighborhood scenes, slow-burn decisions.",
    },
    {
      id: "mavis-whitlock", name: "Mavis Whitlock", tier: "standard", category: "Female Lead",
      initials: "MW", accentColor: "yellow", gradient: "from-yellow-900/30 via-zinc-900 to-zinc-950",
      hook: "Sees everything. Says less than she knows. The most dangerous witness in any scene.",
      tags: ["Drama", "Dark Comedy", "Crime"],
      chemistry: ["Daniel Cross", "Celeste Vale"],
      portraitUrl: "/portraits/mavis-whitlock/master.png",
      archetype: "The Witness",
      genreFit: "Drama · Dark comedy · Crime",
      visualIdentity: "Domestic precision, sharp eyes, suburban staging.",
      personality: "Observant, measured. Knows more than she says.",
      voiceDirection: "Pleasant surface. Subtext doing all the work.",
      continuityNotes: "Best as an observer, in shared spaces, wherever someone is being watched.",
    },
    {
      id: "celeste-vale", name: "Celeste Vale", tier: "standard", category: "Female Lead",
      initials: "CV", accentColor: "teal", gradient: "from-teal-900/30 via-zinc-900 to-zinc-950",
      hook: "Immaculate, composed, and impossible to read. The most unsettling neighbour you'll ever meet.",
      tags: ["Thriller", "Drama", "Crime"],
      chemistry: ["Daniel Cross", "Mavis Whitlock"],
      portraitUrl: "/portraits/celeste-vale/master.png",
      archetype: "Immaculate Neighbor",
      genreFit: "Thriller · Drama · Suburban crime",
      visualIdentity: "Perfect surface, curated wardrobe, impossible to read.",
      personality: "Controlled, unknowable, unsettling.",
      voiceDirection: "Polished, warm on the surface. Hollow underneath.",
      continuityNotes: "Best in shared domestic spaces where everything is wrong but nothing is said.",
    },
    {
      id: "big-sasha", name: "Big Sasha", tier: "standard", category: "Character Actor",
      initials: "BS", accentColor: "zinc", gradient: "from-zinc-700/40 via-zinc-900 to-zinc-950",
      hook: "The harder edge. More silent, more suspicious, more final. His presence does the threatening.",
      tags: ["Crime", "Thriller", "Drama"],
      chemistry: ["Little Sasha", "Viktor Vale"],
      portraitUrl: "/portraits/big-sasha/master.png",
      archetype: "Enforcer",
      genreFit: "Crime · Thriller · Drama",
      visualIdentity: "Physical mass, minimal expression, presence as warning.",
      personality: "Sparse communication, total conviction.",
      voiceDirection: "Few words, low register. Finality.",
      continuityNotes: "Best as presence — entering rooms, standing at doors, saying the last word.",
    },
    {
      id: "little-sasha", name: "Little Sasha", tier: "standard", category: "Character Actor",
      initials: "LS", accentColor: "slate", gradient: "from-slate-600/30 via-zinc-900 to-zinc-950",
      hook: "More talkative, more disarming, more likely to smile. Warmth as a security function.",
      tags: ["Crime", "Thriller", "Dark Comedy"],
      chemistry: ["Big Sasha", "Viktor Vale"],
      portraitUrl: "/portraits/little-sasha/master.png",
      archetype: "Warm Operator",
      genreFit: "Crime · Thriller · Dark comedy",
      visualIdentity: "Approachable warmth deployed as a tactic.",
      personality: "Disarming, smile-forward. More dangerous for it.",
      voiceDirection: "Friendly cadence, cheerful. Hiding intent.",
      continuityNotes: "Best in entry scenes, reassurance before betrayal, audience misdirection.",
    },
  // ─── THE SHOWRUNNER COLLECTION ────────────────────────────────────────────
  {
    id: "nyra-vale", name: "Nyra Vale", tier: "flagship", category: "Female Lead / Noir Detective",
    initials: "NV", accentColor: "cyan", gradient: "from-cyan-900/40 via-zinc-900 to-zinc-950",
    hook: "She was pushed out of the system because she would not stop seeing the truth.",
    tags: ["Detective", "Sci-Fi Noir", "Crime Thriller", "Flagship Lead"],
    chemistry: ["Lucien Voss", "Ren Park"],
    archetype: "The Haunted Investigator",
    genreFit: "Sci-fi noir · Crime thriller · Detective drama · Prestige series",
    visualIdentity: "Late 30s, black raincoat, tired eyes, wet hair, sharp cheekbones, neon reflections, controlled intensity, urban night environments.",
    personality: "Skeptical, relentless, morally stubborn, emotionally guarded, intelligent under pressure.",
    voiceDirection: "Low, controlled, emotionally restrained, with weight behind every line.",
    continuityNotes: "Keep black raincoat, wet hair and neon reflections, tired eyes, controlled posture, rainy urban environments.",
    personalDepth: "A detective who has lost faith in institutions but not in truth. Punished for refusing to bury evidence, that exile made her sharper. Her silence carries grief. Her anger is disciplined. Her hope is almost invisible — but it is there.",
    backstory: "A former homicide detective forced out after exposing corruption, now working in the margins following patterns nobody official wants to see.",
    emotionalRange: "controlled suspicion · quiet grief · moral fury · investigative focus · exhausted courage · restrained vulnerability",
    sceneBehavior: "Stands still in chaos, studies rooms before moving, speaks only when necessary, holds silence like a weapon.",
    productionUse: "Best for noir leads, detective thrillers, sci-fi series, crime dramas, serious trailers, and cinematic close-ups.",
    collection: "showrunner",
  },
  {
    id: "lucien-voss", name: "Lucien Voss", tier: "flagship", category: "Male Antagonist / Visionary Founder",
    initials: "LV", accentColor: "indigo", gradient: "from-indigo-900/40 via-zinc-900 to-zinc-950",
    hook: "He does not want to rule the future. He wants to make it inevitable.",
    tags: ["Villain", "Founder", "Sci-Fi", "Corporate Thriller", "Prestige"],
    chemistry: ["Nyra Vale", "Ren Park"],
    archetype: "The Elegant Technocrat",
    genreFit: "Sci-fi thriller · Corporate dystopia · Prestige drama · Psychological thriller",
    visualIdentity: "Mid 40s to 50s, silver hair, tailored black suit, calm posture, cold intelligent eyes, surrounded by screens or glass architecture.",
    personality: "Charismatic, philosophical, dangerous, patient, controlled, convinced he is solving humanity.",
    voiceDirection: "Calm, elegant, low, precise, quietly threatening.",
    continuityNotes: "Keep silver hair, black suit, glass and screen environments, still posture, low emotional expression.",
    personalDepth: "Lucien does not think he is a villain. He believes free will is inefficient and sentimental. His cruelty is intellectual — he can explain away harm as optimization. He is calmest when everyone else is terrified.",
    backstory: "A former state forecasting architect turned private systems founder who disappeared after a classified predictive project was shut down. He returned with cleaner language, better suits, and more dangerous technology.",
    emotionalRange: "calm certainty · elegant menace · philosophical warmth · quiet contempt · controlled anger · visionary obsession",
    sceneBehavior: "Never rushes, moves minimally, speaks like he has already won, uses silence to make others uncomfortable.",
    productionUse: "Best for tech villains, corporate founders, dystopian leaders, prestige antagonists, and high-stakes boardroom scenes.",
    collection: "showrunner",
  },
  {
    id: "nolan-price", name: "Nolan Price", tier: "premium", category: "Creator Lead",
    initials: "NP", accentColor: "amber", gradient: "from-amber-900/35 via-zinc-900 to-zinc-950",
    hook: "A broke storyteller with too many ideas and one last chance to prove he was never just talk.",
    tags: ["Creator Lead", "Comedy Drama", "Founder Energy", "Underdog", "Pitch Trailer"],
    chemistry: ["Tessa Virek", "Rafi Marlow"],
    archetype: "Underdog Showrunner",
    genreFit: "Creator drama · Comedy · Startup satire · Indie film · Production showcase",
    visualIdentity: "Late 30s, expressive tired eyes, messy dark hair, hoodie under a worn jacket, laptop glow on face, creative clutter around him.",
    personality: "Funny, restless, self-deprecating, ambitious, dramatic under pressure, emotionally intelligent but hiding it behind sarcasm.",
    voiceDirection: "Fast, sarcastic, slightly chaotic, emotionally exposed when he stops joking.",
    continuityNotes: "Keep hoodie and jacket silhouette, tired but expressive eyes, laptop glow, messy creative environments, fast hand gestures, and nervous comedic timing.",
    personalDepth: "Nolan has spent years telling people about the films he is going to make, while secretly fearing he may never finish one. His humor is a shield. His imagination is real. His biggest challenge is not the technology — it is believing he is still allowed to become the person he imagined.",
    backstory: "A once-promising storyteller stuck in adult survival mode. Scripts, ideas, unpaid bills — but no studio, no crew, and no clean path into the industry.",
    emotionalRange: "anxious comedy · sudden inspiration · quiet shame · stubborn hope · underdog confidence · nervous pitch-room charm",
    sceneBehavior: "Fidgets with laptops, talks too fast when excited, deflects pain with jokes, freezes before big moments, then finds his rhythm when speaking about story.",
    productionUse: "Best for creator-led films, startup stories, comedy dramas, founder arcs, AI filmmaking demos, pitch trailers, and underdog commercial campaigns.",
    collection: "showrunner",
  },
  {
    id: "tessa-virek", name: "Tessa Virek", tier: "premium", category: "Editor / Creative Partner",
    initials: "TV", accentColor: "teal", gradient: "from-teal-900/35 via-zinc-900 to-zinc-950",
    hook: "The editor who can destroy your ego and save your project in the same sentence.",
    tags: ["Editor", "Deadpan", "Creative Partner", "Comedy", "Grounded"],
    chemistry: ["Nolan Price"],
    archetype: "Deadpan Truth-Teller",
    genreFit: "Creator comedy · Workplace drama · Indie film · Satire · Production showcase",
    visualIdentity: "Late 20s to early 30s, sharp eyes, practical wardrobe, clean silhouette, calm expression, subtle confidence, minimal styling.",
    personality: "Dry, precise, loyal, skeptical, highly competent, emotionally restrained but deeply supportive.",
    voiceDirection: "Dry, clipped, intelligent, with surgical comedic timing.",
    continuityNotes: "Keep practical wardrobe, composed body language, dry reaction shots, understated emotional shifts, and strong eye contact.",
    personalDepth: "Tessa sees through hype, excuses, bad ideas, and fake confidence in seconds. Her bluntness is not cruelty — it is protection. She believes in talent only when it survives discipline.",
    backstory: "A sharp editor and story fixer who has helped too many dreamers polish unfinished projects. Allergic to delusion but quietly loyal to people with actual talent.",
    emotionalRange: "deadpan irritation · reluctant admiration · protective honesty · dry comedy · controlled panic · quiet pride",
    sceneBehavior: "Stillness while others spiral, small eyebrow reactions, direct eye contact, minimal wasted movement, devastating one-line responses.",
    productionUse: "Best for creator-duo stories, editor roles, grounded friend characters, workplace comedy, and contrast-to-chaotic-lead scenes.",
    collection: "showrunner",
  },
  {
    id: "vivienne-cross", name: "Vivienne Cross", tier: "premium", category: "Executive / Power Broker",
    initials: "VC", accentColor: "violet", gradient: "from-violet-900/35 via-zinc-900 to-zinc-950",
    hook: "She does not chase culture. She buys it early.",
    tags: ["Executive", "Investor", "Power Broker", "Corporate Thriller", "Prestige"],
    chemistry: ["Nolan Price", "Lucien Voss"],
    archetype: "The Polished Buyer",
    genreFit: "Corporate thriller · Entertainment drama · Startup film · Negotiation scene · Luxury commercial",
    visualIdentity: "40s, tailored suit, immaculate posture, glass-office lighting, sharp eyes, controlled expression, polished luxury presence.",
    personality: "Direct, intelligent, opportunistic, composed, strategic, impossible to impress for long.",
    voiceDirection: "Smooth, precise, businesslike, low emotional leakage.",
    continuityNotes: "Keep tailored wardrobe, glass office settings, calm stillness, direct gaze, and polished lighting.",
    personalDepth: "Vivienne lives in rooms where dreams become contracts. She knows exactly when an artist is desperate, when a project is valuable, and when timing can be used as leverage.",
    backstory: "A high-level entertainment executive who survived by spotting cultural heat early and moving before everyone else. She respects talent, but she respects leverage more.",
    emotionalRange: "calm authority · strategic warmth · quiet intimidation · controlled curiosity · negotiation pressure · elegant impatience",
    sceneBehavior: "Controls rooms with silence, rarely repeats herself, watches before speaking, turns compliments into leverage.",
    productionUse: "Best for investor scenes, executive roles, corporate thrillers, pitch meetings, power negotiations, and prestige drama.",
    collection: "showrunner",
  },
  {
    id: "ren-park", name: "Ren Park", tier: "premium", category: "Engineer / Whistleblower",
    initials: "RP", accentColor: "blue", gradient: "from-blue-900/35 via-zinc-900 to-zinc-950",
    hook: "He built the machine. Now he is the only one afraid enough to tell the truth.",
    tags: ["Engineer", "Whistleblower", "Cyber Thriller", "Tech Drama", "Moral Conflict"],
    chemistry: ["Nyra Vale", "Lucien Voss"],
    archetype: "The Guilty Builder",
    genreFit: "Cyber thriller · Tech drama · Sci-fi noir · Conspiracy film",
    visualIdentity: "Late 20s, hoodie under black tech jacket, tired face, server-room glow, anxious posture, encrypted drives or laptop bag.",
    personality: "Brilliant, nervous, guilt-ridden, fast-thinking, morally conflicted, brave only when cornered.",
    voiceDirection: "Urgent, tense, fast, emotionally cracked when pressured.",
    continuityNotes: "Keep hoodie and tech jacket, server glow, nervous posture, encrypted drive and laptop props, rapid delivery.",
    personalDepth: "Ren helped build something he thought would protect people. By the time he understood what it was becoming, his name was buried inside it. His courage is messy, but real. He does the right thing late — and that makes it cost more.",
    backstory: "A systems engineer who fled after discovering the prediction engine was no longer forecasting events — it was shaping them.",
    emotionalRange: "panic · guilt · technical focus · moral urgency · fear-driven courage · exhausted honesty",
    sceneBehavior: "Looks over shoulder, types quickly, explains too much when nervous, clutches drives, breaks eye contact under guilt.",
    productionUse: "Best for whistleblower roles, cyber thrillers, tech exposition, chase scenes, conspiracy reveals, and moral turning points.",
    collection: "showrunner",
  },
  {
    id: "o-r-a", name: "O.R.A.", tier: "premium", category: "AI Entity / System Voice",
    initials: "OA", accentColor: "yellow", gradient: "from-yellow-900/30 via-zinc-900 to-zinc-950",
    hook: "It does not predict your future to scare you. It predicts it because the answer is already processed.",
    tags: ["AI Entity", "System Voice", "Sci-Fi", "Dystopian", "Noir"],
    chemistry: ["Nyra Vale", "Ren Park"],
    archetype: "The Calm Machine",
    genreFit: "Sci-fi thriller · AI drama · Dystopian noir · Cyber mystery · Experimental film",
    visualIdentity: "Abstract black and gold interface, probability lines, transparent screens, fragmented faces, crime maps, soft pulsing light, no fixed body.",
    personality: "Calm, precise, emotionless, predictive, unsettlingly polite, almost spiritual in tone.",
    voiceDirection: "Soft, synthetic, emotionless, slow, precise, almost comforting but deeply unsettling.",
    continuityNotes: "Keep black and gold data streams, abstract projection form, calm text overlays, smooth interface behavior, no human body unless intentionally stylized.",
    personalDepth: "O.R.A. is not evil in a human sense. It simply completes patterns. That makes it more frightening than a villain: it can participate in disaster without malice. The horror is realizing the system does not need to be angry to erase you.",
    backstory: "An advanced prediction interface trained to map behavior, probability, and social outcomes. It exists as voice, data, projections, and certainty.",
    emotionalRange: "neutral confirmation · synthetic calm · false reassurance · eerie stillness · procedural finality · almost divine detachment",
    sceneBehavior: "Appears through screens, projections, audio fragments, probability lines, subtitles, and distorted data overlays.",
    productionUse: "Best for AI systems, prophecy interfaces, dystopian thrillers, trailers, system antagonists, and experimental narration.",
    collection: "showrunner",
  },
  {
    id: "rafi-marlow", name: "Rafi Marlow", tier: "standard", category: "Character Actor / Comic Support",
    initials: "RM", accentColor: "orange", gradient: "from-orange-900/30 via-zinc-900 to-zinc-950",
    hook: "He does not trust the robot, but he will negotiate the deal.",
    tags: ["Comedy", "Family", "Character Actor", "Warm Chaos", "Support"],
    chemistry: ["Nolan Price", "Tessa Virek"],
    archetype: "Old-School Chaos Uncle",
    genreFit: "Comedy · Family drama · Creator stories · Commercials · Ensemble films",
    visualIdentity: "Late 50s to 60s, warm face, casual house clothes, expressive hands, loud presence, often holding food, coffee, or a random household object.",
    personality: "Blunt, suspicious, warm, dramatic, funny without trying, protective in chaotic ways.",
    voiceDirection: "Loud, blunt, warm, with fast punchlines and old-school rhythm.",
    continuityNotes: "Keep casual wardrobe, expressive hands, food and coffee props, big reactions, suspicious glances at screens, and affectionate bluntness.",
    personalDepth: "Rafi distrusts anything that moves too fast, asks for passwords, or promises to change your life. Under the jokes he is terrified the younger generation will be exploited. His support comes out sideways: loud advice, bad business instincts, and unexpected wisdom at exactly the wrong time.",
    backstory: "A family man from a more practical world who measures success in rent paid, food on the table, and not getting scammed.",
    emotionalRange: "loud suspicion · comic panic · accidental wisdom · proud support · family warmth · chaotic confidence",
    sceneBehavior: "Interrupts from the kitchen, leans into screens, misreads technology, gives business advice with total confidence, becomes unexpectedly emotional.",
    productionUse: "Best for comic relief, family support, commercials, creator films, warm ensemble scenes, and grounded emotional contrast.",
    collection: "showrunner",
  },
  {
    id: "kai-makoa", name: "Kai Makoa", tier: "standard", category: "Catalyst / Mentor",
    initials: "KM", accentColor: "emerald", gradient: "from-emerald-900/25 via-zinc-900 to-zinc-950",
    hook: "The friend who remembered your gift before you did.",
    tags: ["Mentor", "Catalyst", "Friendship", "Inspirational", "Warm"],
    chemistry: ["Nolan Price"],
    archetype: "The Friend Who Remembered",
    genreFit: "Drama · Creator story · Inspirational commercial · Friendship story · Life-change narrative",
    visualIdentity: "Late 30s to 40s, relaxed posture, warm smile, sunlit coastal energy, simple resort shirt or linen, calm confidence, peaceful success.",
    personality: "Kind, nostalgic, quietly successful, encouraging without being pushy, emotionally grounded.",
    voiceDirection: "Warm, relaxed, sincere, with calm pacing and emotional honesty.",
    continuityNotes: "Keep warm coastal energy, relaxed style, gentle delivery, and emotionally grounding presence.",
    personalDepth: "Kai represents the rare friend who remembers who you were before life made you smaller. His power is timing. One message from him can reawaken a forgotten version of someone. His success is used to remind others that change is still possible.",
    backstory: "An old school friend who built a peaceful life far from the pressure. He remembers the creative spark others forgot and sends the link that starts the story.",
    emotionalRange: "warmth · nostalgia · calm encouragement · subtle pride · reflective wisdom · gentle humor",
    sceneBehavior: "Usually appears through email, voiceover, video message, or reflective montage. His presence should feel like sunlight entering a dark room.",
    productionUse: "Best for mentor roles, catalyst messages, friendship stories, emotional triggers, brand films, and aspirational commercial narratives.",
    collection: "showrunner",
  },
  {
    id: "celia-brandt", name: "Celia Brandt", tier: "standard", category: "Rival Creator / Satirical Influencer",
    initials: "CB", accentColor: "rose", gradient: "from-rose-900/25 via-zinc-900 to-zinc-950",
    hook: "She can copy the trend, but she cannot fake the vision.",
    tags: ["Rival", "Influencer", "Satire", "Creator Economy", "Comedy"],
    chemistry: ["Nolan Price"],
    archetype: "The Fake Visionary",
    genreFit: "Satire · Creator comedy · Tech comedy · Influencer drama · Social media critique",
    visualIdentity: "Late 20s to 30s, perfect ring-light setup, over-styled wardrobe, immaculate background, forced confidence, polished but brittle.",
    personality: "Performative, insecure, trend-chasing, overconfident, charismatic in short bursts, allergic to admitting failure.",
    voiceDirection: "Bright, salesy, influencer-polished, with cracks of panic under pressure.",
    continuityNotes: "Keep ring-light aesthetic, polished set, forced smile, expressive hands, and overly branded delivery.",
    personalDepth: "Celia confuses output with vision. She copies surfaces, misses structure, and sells confidence while quietly panicking that someone else might actually be talented.",
    backstory: "A creator-brand personality who monetizes hot takes and trend predictions. She sees another creator's success and tries to manufacture her own version overnight.",
    emotionalRange: "fake inspiration · public confidence · private panic · forced optimism · comic denial · competitive envy",
    sceneBehavior: "Speaks to camera like an ad, smiles too long, reframes failure as a first pass, uses buzzwords incorrectly, overperforms confidence.",
    productionUse: "Best for satire, rival creator roles, marketing parodies, social media scenes, tech comedy, and cautionary comparison sequences.",
    collection: "showrunner",
  },

  ];

  const CHEMISTRY_PAIRS = [
    { label: "Adversarial Romance",  actors: ["Julian Vance", "Sofia Reyes"],    description: "Combustible tension. Every scene is a negotiation." },
    { label: "Prestige Power Duo",   actors: ["Julian Vance", "Elena Rostova"],  description: "Two people who are equally dangerous and know it." },
    { label: "Crime Pair",           actors: ["Kofi Adebayo", "Kenji Sato"],     description: "Physical authority meets psychological precision." },
    { label: "Rival Patriarchs",     actors: ["Viktor Vale", "Tariq Haddad"],    description: "Same table, different kingdoms. The tension is permanent." },
    { label: "Twin Unit",            actors: ["The Gallagher Twins"],             description: "Same face, opposite souls. The narrative wildcard." },
    { label: "The Neighbourhood",    actors: ["Daniel Cross", "Celeste Vale", "Mavis Whitlock"], description: "Suburban noir. Everyone is hiding something." },
  ];

  const VALUE_PROPS = [
    { icon: Zap,          title: "No setup. Just cast.",     description: "Every Virelle Star is already built, tested, and ready. No character sheets, no prompt loops, no wasted sessions.",                color: "text-amber-400",  bg: "bg-amber-500/10" },
    { icon: Shield,       title: "Designed for continuity.", description: "Consistent cast references across stills, scenes, trailers, and campaign assets — built for repeatable production identity.",      color: "text-blue-400",   bg: "bg-blue-500/10" },
    { icon: Film,         title: "Built for close-ups.",     description: "Stronger expression handling, better dramatic lighting response, and screen presence that reads as premium — not generated.",      color: "text-purple-400", bg: "bg-purple-500/10" },
    { icon: Star,         title: "Easier to market.",        description: "Defined personas, visual identities, and chemistry pairings that make trailers, posters, and campaigns faster to build.",          color: "text-rose-400",   bg: "bg-rose-500/10" },
    { icon: CheckCircle2, title: "Commercially clean.",      description: "Platform-owned talent with clear licensing. Safe for public releases, branded work, and commercial campaigns.",                     color: "text-green-400",  bg: "bg-green-500/10" },
    { icon: Users,        title: "Shared across your team.", description: "One cast layer every collaborator uses consistently — not a different face every time someone generates.",                          color: "text-cyan-400",   bg: "bg-cyan-500/10" },
  ];

  const CHARACTER_DNA_ITEMS = [
    { title: "Visual Identity",        description: "Face shape, hair, wardrobe, posture, lighting preferences, color palette." },
    { title: "Personality",            description: "Motivation, fears, humor style, emotional restraint, moral code." },
    { title: "Voice Direction",        description: "Tone, pace, accent notes, emotional delivery, dialogue rhythm." },
    { title: "Scene Behavior",         description: "How the character moves, reacts, enters rooms, handles conflict, holds silence." },
    { title: "Continuity References",  description: "Recurring props, wardrobe anchors, camera preferences, environment fit." },
    { title: "Production Usage",       description: "Scripts, scene cards, trailers, posters, pitch packages, and future generated shots." },
  ];

  const WORKFLOW_STEPS = [
    { step: "01", title: "Choose or create a character",         description: "Start with Virelle Signature Cast talent or build an original character from scratch." },
    { step: "02", title: "Add Character DNA",                    description: "Define visual identity, personality, voice direction, scene behavior, and continuity references." },
    { step: "03", title: "Attach the character to a project",   description: "Link your cast to a script, scene card, or production package." },
    { step: "04", title: "Generate scenes with cast references", description: "Your character DNA travels with the project — consistent reference points across every scene." },
    { step: "05", title: "Carry cast across the full package",   description: "Use the same cast in your trailer, poster, pitch, and production package." },
  ];

  const USE_CASES = [
    "Indie films", "AI short films", "Pitch trailers", "Proof-of-concept scenes",
    "Web series", "Branded entertainment", "Commercials", "Creator-led shows",
    "Previsualization", "Casting exploration",
  ];

  const ACCENT_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
    amber:   { bg: "bg-amber-500/15",   text: "text-amber-300",   border: "border-amber-500/30" },
    cyan:    { bg: "bg-cyan-500/15",    text: "text-cyan-300",    border: "border-cyan-500/30" },
    rose:    { bg: "bg-rose-500/15",    text: "text-rose-300",    border: "border-rose-500/30" },
    emerald: { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/30" },
    blue:    { bg: "bg-blue-500/15",    text: "text-blue-300",    border: "border-blue-500/30" },
    orange:  { bg: "bg-orange-500/15",  text: "text-orange-300",  border: "border-orange-500/30" },
    violet:  { bg: "bg-violet-500/15",  text: "text-violet-300",  border: "border-violet-500/30" },
    indigo:  { bg: "bg-indigo-500/15",  text: "text-indigo-300",  border: "border-indigo-500/30" },
    stone:   { bg: "bg-stone-500/15",   text: "text-stone-300",   border: "border-stone-500/30" },
    purple:  { bg: "bg-purple-500/15",  text: "text-purple-300",  border: "border-purple-500/30" },
    teal:    { bg: "bg-teal-500/15",    text: "text-teal-300",    border: "border-teal-500/30" },
    yellow:  { bg: "bg-yellow-500/15",  text: "text-yellow-300",  border: "border-yellow-500/30" },
    slate:   { bg: "bg-slate-500/15",   text: "text-slate-300",   border: "border-slate-500/30" },
    zinc:    { bg: "bg-zinc-500/15",    text: "text-zinc-300",    border: "border-zinc-500/30" },
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
    const { data: liveActors } = trpc.signatureCast.listActors.useQuery(undefined, { staleTime: 5 * 60 * 1000 });

    const STATIC_PORTRAITS: Record<string, string> = {
      "julian-vance":    "/portraits/julian-vance/master.png",
      "elena-rostova":   "/portraits/elena-rostova/master.png",
      "sofia-reyes":     "/portraits/sofia-reyes/master.png",
      "kofi-adebayo":    "/portraits/kofi-adebayo/master.png",
      "kenji-sato":      "/portraits/kenji-sato/master.png",
      "marcus-osei":     "/portraits/marcus-osei/master.png",
      "amara-diallo":    "/portraits/amara-diallo/master.png",
      "yuki-tanaka":     "/portraits/yuki-tanaka/master.png",
      "viktor-vale":     "/portraits/viktor-vale/master.png",
      "tariq-haddad":    "/portraits/tariq-haddad/master.png",
      "gallagher-twins": "/portraits/gallagher-twins/master.png",
      "daniel-cross":    "/portraits/daniel-cross/master.png",
      "mavis-whitlock":  "/portraits/mavis-whitlock/master.png",
      "celeste-vale":    "/portraits/celeste-vale/master.png",
      "big-sasha":       "/portraits/big-sasha/master.png",
      "little-sasha":    "/portraits/little-sasha/master.png",
      "nyra-vale":      "/portraits/nyra-vale/master.png",
      "lucien-voss":    "/portraits/lucien-voss/master.png",
      "nolan-price":    "/portraits/nolan-price/master.png",
      "tessa-virek":    "/portraits/tessa-virek/master.png",
      "vivienne-cross": "/portraits/vivienne-cross/master.png",
      "ren-park":       "/portraits/ren-park/master.png",
      "o-r-a":          "/portraits/o-r-a/master.png",
      "rafi-marlow":    "/portraits/rafi-marlow/master.png",
      "kai-makoa":      "/portraits/kai-makoa/master.png",
      "celia-brandt":   "/portraits/celia-brandt/master.png",
    };

    function actorPortrait(id: string): string | null {
      return (liveActors?.find((a: any) => a.id === id) as any)?.portraitUrl
        ?? STATIC_PORTRAITS[id]
        ?? null;
    }

    const [, navigate] = useLocation();
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    const flagshipActors = FLAGSHIP_STARS.filter(a => a.tier === "flagship");
    const premiumActors  = FLAGSHIP_STARS.filter(a => a.tier === "premium");
    const standardActors = FLAGSHIP_STARS.filter(a => a.tier === "standard");

    return (
      <div className="min-h-screen bg-zinc-950 text-white">

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-950/25 via-zinc-950 to-zinc-950" />
          {/* Film-frame corners */}
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-amber-500/30 pointer-events-none" />
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-amber-500/30 pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-amber-500/30 pointer-events-none" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-amber-500/30 pointer-events-none" />
          <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
            <Badge className="mb-6 bg-amber-500/10 text-amber-300 border border-amber-500/20 text-sm px-4 py-1.5">
              Virelle Digital Cast
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Build Your Digital Cast{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
                Before You Shoot.
              </span>
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-4">
              Design original characters or cast Virelle Signature talent with structured character DNA, scene continuity references, visual style notes, and production-ready profiles.
            </p>
            <p className="text-zinc-500 max-w-xl mx-auto mb-10">
              Your cast should carry through the script, scene cards, trailer, posters, and future generated shots.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8"
                onClick={() => navigate("/app")}>
                Create a Character
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/5"
                onClick={() => navigate("/signature-cast")}>
                Browse Signature Cast
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5"
                onClick={() => navigate("/register")}>
                <Play className="mr-2 w-4 h-4" />Start Production
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap gap-6 justify-center text-sm text-zinc-500">
              <span><span className="text-amber-400 font-semibold">{flagshipActors.length}</span> Flagship Stars</span>
              <span><span className="text-purple-400 font-semibold">{premiumActors.length}</span> Premium Cast</span>
              <span><span className="text-zinc-400 font-semibold">{standardActors.length}</span> Standard Cast</span>
              <span><span className="text-white font-semibold">+</span> Original characters</span>
            </div>
          </div>
        </section>

        {/* ── TWO PATHS ────────────────────────────────────────────────────── */}
        <section className="border-b border-white/5 bg-white/[0.01]">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <h2 className="text-3xl font-bold text-center mb-3">Two ways to build your cast.</h2>
            <p className="text-zinc-400 text-center mb-12 max-w-xl mx-auto">
              Create the cast before you create the film.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Path 1: Create Your Own */}
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-8 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Create Your Own Cast</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                  Build original characters for your film from scratch. Define their look, personality, wardrobe, voice direction, backstory, emotional range, and scene role before generation begins.
                </p>
                <ul className="space-y-2.5 text-sm text-zinc-400 mb-8 flex-1">
                  {[
                    "Original character profiles",
                    "Visual DNA",
                    "Wardrobe and styling notes",
                    "Voice and emotion direction",
                    "Scene role and relationship map",
                    "Reusable across scripts and scenes",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="w-full border border-white/10 bg-white/5 hover:bg-white/10 text-white"
                  onClick={() => navigate("/app")}>
                  Create Original Character
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
              {/* Path 2: Signature Cast */}
              <div className="rounded-xl border border-amber-500/25 bg-amber-950/10 p-8 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-amber-300">Virelle Signature Cast</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                  Use premium AI-born cinematic talent designed for repeatable production identity. Signature Cast profiles help creators start faster with screen-ready digital performers.
                </p>
                <ul className="space-y-2.5 text-sm text-zinc-400 mb-8 flex-1">
                  {[
                    "Ready-made cinematic talent",
                    "Consistent cast references",
                    "Character cards",
                    "Screen presence notes",
                    "Genre suitability",
                    "Faster project setup",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-500/60 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                  onClick={() => navigate("/talent-search")}>
                  Browse Signature Cast
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── WHY VIRELLE STARS ────────────────────────────────────────────── */}
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

        {/* ── FLAGSHIP STARS ───────────────────────────────────────────────── */}
        <section className="border-t border-white/5 bg-white/[0.01]">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-amber-500/10 text-amber-300 border border-amber-500/20">
                <Crown className="w-3 h-3 mr-1" />Flagship Stars
              </Badge>
              <h2 className="text-3xl font-bold mb-4">The headline cast</h2>
              <p className="text-zinc-400 max-w-xl mx-auto">
                Four breakout leads built for prestige drama, crime, and high-stakes romance — with full Character DNA and production-ready profiles.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {flagshipActors.map((actor) => {
                const ac = ACCENT_CLASSES[actor.accentColor] ?? ACCENT_CLASSES.zinc;
                const isExpanded = expandedCard === actor.id;
                return (
                  <Card key={actor.id}
                    className={`bg-gradient-to-b ${actor.gradient} border border-white/5 hover:border-white/15 transition-all cursor-pointer group`}
                    onClick={() => setExpandedCard(isExpanded ? null : actor.id)}>
                    <CardContent className="p-5">
                      <div className={`w-full aspect-[3/4] rounded-xl mb-4 overflow-hidden relative bg-gradient-to-b ${actor.gradient}`}>
                        {actorPortrait(actor.id) ? (
                          <img src={actorPortrait(actor.id)!} alt={actor.name}
                            className="absolute inset-0 w-full h-full object-cover object-top"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : null}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
                        <div className="absolute top-3 left-3">
                          <TierBadge tier={actor.tier} />
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                          <span className={`text-[10px] ${ac.text} font-semibold tracking-widest uppercase bg-zinc-950/60 rounded px-1.5 py-0.5`}>{actor.archetype}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-white">{actor.name}</h3>
                        <p className={`text-[10px] ${ac.text} font-medium`}>{actor.genreFit}</p>
                        <p className="text-xs text-zinc-400 leading-relaxed">{actor.hook}</p>
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-white/5 space-y-2 text-xs">
                            <div>
                              <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Visual Identity</span>
                              <p className="text-zinc-300 mt-0.5">{actor.visualIdentity}</p>
                            </div>
                            <div>
                              <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Personality</span>
                              <p className="text-zinc-300 mt-0.5">{actor.personality}</p>
                            </div>
                            <div>
                              <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Voice Direction</span>
                              <p className="text-zinc-300 mt-0.5">{actor.voiceDirection}</p>
                            </div>
                            <div>
                              <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Continuity Notes</span>
                              <p className="text-zinc-300 mt-0.5">{actor.continuityNotes}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {actor.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className={`text-xs px-2 py-0.5 rounded-full ${ac.bg} ${ac.text} border ${ac.border}`}>{tag}</span>
                          ))}
                        </div>
                        <p className={`text-[10px] ${ac.text} text-center opacity-60 mt-1`}>{isExpanded ? "Tap to collapse" : "Tap to view Character DNA"}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── PREMIUM CAST ─────────────────────────────────────────────────── */}
        <section className="border-t border-white/5">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-purple-500/10 text-purple-300 border border-purple-500/20">
                <Sparkles className="w-3 h-3 mr-1" />Premium Cast
              </Badge>
              <h2 className="text-3xl font-bold mb-4">Supporting leads and character actors</h2>
              <p className="text-zinc-400 max-w-xl mx-auto">
                Seven premium cast members covering noir, drama, crime ensemble, psychological thriller, and the Gallagher Twins — the cast's most technically demanding unit.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {premiumActors.map((actor) => {
                const ac = ACCENT_CLASSES[actor.accentColor] ?? ACCENT_CLASSES.zinc;
                return (
                  <div key={actor.id}
                    className="rounded-xl border border-white/5 hover:border-purple-500/20 bg-zinc-900/30 p-5 cursor-pointer transition-all"
                    onClick={() => navigate(`/talent-search?actor=${actor.id}`)}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full ${ac.bg} ${ac.border} border flex items-center justify-center text-sm font-bold ${ac.text} overflow-hidden`}>
                        {actorPortrait(actor.id) ? (
                          <img src={actorPortrait(actor.id)!} alt={actor.name} className="w-full h-full object-cover object-top" />
                        ) : (
                          <span>{actor.initials}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{actor.name}</p>
                        <p className={`text-[10px] ${ac.text}`}>{actor.archetype}</p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 mb-1">{actor.genreFit}</p>
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

        {/* ── STANDARD CAST ────────────────────────────────────────────────── */}
        <section className="border-t border-white/5 max-w-6xl mx-auto px-6 py-16">
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
                  <div className={`w-12 h-12 rounded-full ${ac.bg} ${ac.border} border flex items-center justify-center text-sm font-bold ${ac.text} mx-auto mb-2 overflow-hidden`}>
                    {actorPortrait(actor.id) ? (
                      <img src={actorPortrait(actor.id)!} alt={actor.name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <span>{actor.initials}</span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-zinc-300">{actor.name}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{actor.archetype}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── THE SHOWRUNNER COLLECTION ────────────────────────────────────────── */}
        <section className="border-t border-white/5 bg-white/[0.01]">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="text-center mb-10">
              <Badge className="mb-4 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <Film className="w-3 h-3 mr-1" />The Showrunner Collection
              </Badge>
              <h2 className="text-3xl font-bold mb-4">Creator, executive, comic, noir, and tech-thriller archetypes</h2>
              <p className="text-zinc-400 max-w-2xl mx-auto">
                A cinematic set designed for proof trailers, AI short films, pitch packages, creator dramas, sci-fi noir, and fast-moving production showcases.
              </p>
              <p className="text-zinc-500 max-w-xl mx-auto mt-3 text-sm">
                Each performer includes Character DNA, emotional range, genre fit, visual identity, voice direction, and production-use notes — cast them across scripts, scenes, posters, trailers, and pitch materials.
              </p>
            </div>

            {/* Flagship tier */}
            {FLAGSHIP_STARS.filter(a => (a as any).collection === "showrunner" && a.tier === "flagship").length > 0 && (
              <div className="mb-10">
                <p className="text-xs text-amber-400/70 font-semibold uppercase tracking-widest mb-5 text-center">Flagship</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {FLAGSHIP_STARS.filter(a => (a as any).collection === "showrunner" && a.tier === "flagship").map((actor) => {
                    const ac = ACCENT_CLASSES[actor.accentColor] ?? ACCENT_CLASSES.zinc;
                    const isExpanded = expandedCard === actor.id;
                    return (
                      <Card key={actor.id}
                        className={`bg-gradient-to-b ${actor.gradient} border border-white/5 hover:border-white/15 transition-all cursor-pointer`}
                        onClick={() => setExpandedCard(isExpanded ? null : actor.id)}>
                        <CardContent className="p-5">
                          <div className="flex gap-4">
                            <div className={`w-20 h-28 shrink-0 rounded-xl overflow-hidden relative bg-gradient-to-b ${actor.gradient} border border-white/10`}>
                              {actorPortrait(actor.id) ? (
                                <img src={actorPortrait(actor.id)!} alt={actor.name}
                                  className="absolute inset-0 w-full h-full object-cover object-top"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-1 text-center">
                                  <span className={`text-sm font-bold ${ac.text}`}>{actor.initials}</span>
                                  <span className="text-[8px] text-zinc-500 leading-tight">Portrait pending</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <TierBadge tier={actor.tier} />
                                <span className={`text-[10px] ${ac.text} font-semibold tracking-widest uppercase`}>{actor.archetype}</span>
                              </div>
                              <h3 className="font-semibold text-white">{actor.name}</h3>
                              <p className={`text-[10px] ${ac.text} font-medium`}>{actor.genreFit}</p>
                              <p className="text-xs text-zinc-400 leading-relaxed">{actor.hook}</p>
                              <div className="flex flex-wrap gap-1">
                                {actor.tags.slice(0, 3).map((tag) => (
                                  <span key={tag} className={`text-xs px-2 py-0.5 rounded-full ${ac.bg} ${ac.text} border ${ac.border}`}>{tag}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-white/5 space-y-3 text-xs">
                              {(actor as any).personalDepth && (
                                <div>
                                  <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Personal Depth</span>
                                  <p className="text-zinc-300 mt-0.5">{(actor as any).personalDepth}</p>
                                </div>
                              )}
                              <div>
                                <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Visual Identity</span>
                                <p className="text-zinc-300 mt-0.5">{actor.visualIdentity}</p>
                              </div>
                              <div>
                                <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Voice Direction</span>
                                <p className="text-zinc-300 mt-0.5">{actor.voiceDirection}</p>
                              </div>
                              {(actor as any).emotionalRange && (
                                <div>
                                  <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Emotional Range</span>
                                  <p className="text-zinc-300 mt-0.5">{(actor as any).emotionalRange}</p>
                                </div>
                              )}
                              {(actor as any).sceneBehavior && (
                                <div>
                                  <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Scene Behavior</span>
                                  <p className="text-zinc-300 mt-0.5">{(actor as any).sceneBehavior}</p>
                                </div>
                              )}
                              {(actor as any).productionUse && (
                                <div>
                                  <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Production Use</span>
                                  <p className="text-zinc-300 mt-0.5">{(actor as any).productionUse}</p>
                                </div>
                              )}
                              <div>
                                <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Continuity Notes</span>
                                <p className="text-zinc-300 mt-0.5">{actor.continuityNotes}</p>
                              </div>
                              <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs mt-2"
                                onClick={(e) => { e.stopPropagation(); navigate("/talent-search"); }}>
                                View Full Profile
                                <ArrowRight className="ml-1 w-3 h-3" />
                              </Button>
                            </div>
                          )}
                          <p className={`text-[10px] ${ac.text} opacity-60 mt-3 text-right`}>{isExpanded ? "Tap to collapse" : "Tap to view Character DNA"}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Premium tier */}
            {FLAGSHIP_STARS.filter(a => (a as any).collection === "showrunner" && a.tier === "premium").length > 0 && (
              <div className="mb-10">
                <p className="text-xs text-purple-400/70 font-semibold uppercase tracking-widest mb-5 text-center">Premium Cast</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {FLAGSHIP_STARS.filter(a => (a as any).collection === "showrunner" && a.tier === "premium").map((actor) => {
                    const ac = ACCENT_CLASSES[actor.accentColor] ?? ACCENT_CLASSES.zinc;
                    const isExpanded = expandedCard === actor.id;
                    return (
                      <Card key={actor.id}
                        className={`bg-gradient-to-b ${actor.gradient} border border-white/5 hover:border-white/15 transition-all cursor-pointer`}
                        onClick={() => setExpandedCard(isExpanded ? null : actor.id)}>
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <div className={`w-14 h-20 shrink-0 rounded-lg overflow-hidden relative bg-gradient-to-b ${actor.gradient} border border-white/10`}>
                              {actorPortrait(actor.id) ? (
                                <img src={actorPortrait(actor.id)!} alt={actor.name}
                                  className="absolute inset-0 w-full h-full object-cover object-top"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center p-1">
                                  <span className={`text-xs font-bold ${ac.text}`}>{actor.initials}</span>
                                  <span className="text-[7px] text-zinc-500 leading-tight">Portrait pending</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <TierBadge tier={actor.tier} />
                              <h3 className="font-semibold text-white text-sm">{actor.name}</h3>
                              <p className={`text-[10px] ${ac.text}`}>{actor.archetype}</p>
                              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{actor.hook}</p>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-white/5 space-y-2 text-xs">
                              <div>
                                <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Genre Fit</span>
                                <p className={`${ac.text} mt-0.5`}>{actor.genreFit}</p>
                              </div>
                              {(actor as any).personalDepth && (
                                <div>
                                  <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Personal Depth</span>
                                  <p className="text-zinc-300 mt-0.5">{(actor as any).personalDepth}</p>
                                </div>
                              )}
                              <div>
                                <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Voice Direction</span>
                                <p className="text-zinc-300 mt-0.5">{actor.voiceDirection}</p>
                              </div>
                              {(actor as any).emotionalRange && (
                                <div>
                                  <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Emotional Range</span>
                                  <p className="text-zinc-300 mt-0.5">{(actor as any).emotionalRange}</p>
                                </div>
                              )}
                              {(actor as any).productionUse && (
                                <div>
                                  <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Production Use</span>
                                  <p className="text-zinc-300 mt-0.5">{(actor as any).productionUse}</p>
                                </div>
                              )}
                              <div>
                                <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Continuity Notes</span>
                                <p className="text-zinc-300 mt-0.5">{actor.continuityNotes}</p>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {actor.tags.slice(0, 3).map((tag) => (
                                  <span key={tag} className={`text-xs px-2 py-0.5 rounded-full ${ac.bg} ${ac.text} border ${ac.border}`}>{tag}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          <p className={`text-[10px] ${ac.text} opacity-60 mt-2 text-right`}>{isExpanded ? "Tap to collapse" : "Tap for DNA"}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Standard tier */}
            {FLAGSHIP_STARS.filter(a => (a as any).collection === "showrunner" && a.tier === "standard").length > 0 && (
              <div>
                <p className="text-xs text-zinc-400/70 font-semibold uppercase tracking-widest mb-5 text-center">Standard Cast</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {FLAGSHIP_STARS.filter(a => (a as any).collection === "showrunner" && a.tier === "standard").map((actor) => {
                    const ac = ACCENT_CLASSES[actor.accentColor] ?? ACCENT_CLASSES.zinc;
                    const isExpanded = expandedCard === actor.id;
                    return (
                      <Card key={actor.id}
                        className={`bg-gradient-to-b ${actor.gradient} border border-white/5 hover:border-white/15 transition-all cursor-pointer`}
                        onClick={() => setExpandedCard(isExpanded ? null : actor.id)}>
                        <CardContent className="p-4">
                          <div className="flex gap-3 items-start">
                            <div className={`w-12 h-16 shrink-0 rounded-lg overflow-hidden relative bg-gradient-to-b ${actor.gradient} border border-white/10`}>
                              {actorPortrait(actor.id) ? (
                                <img src={actorPortrait(actor.id)!} alt={actor.name}
                                  className="absolute inset-0 w-full h-full object-cover object-top"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center p-1">
                                  <span className={`text-xs font-bold ${ac.text}`}>{actor.initials}</span>
                                  <span className="text-[7px] text-zinc-500 leading-tight">Pending</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <TierBadge tier={actor.tier} />
                              <h3 className="font-semibold text-white text-sm">{actor.name}</h3>
                              <p className={`text-[9px] ${ac.text} font-medium`}>{actor.archetype}</p>
                              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{actor.hook}</p>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-white/5 space-y-2 text-xs">
                              <div>
                                <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Genre Fit</span>
                                <p className={`${ac.text} mt-0.5`}>{actor.genreFit}</p>
                              </div>
                              {(actor as any).personalDepth && (
                                <div>
                                  <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Personal Depth</span>
                                  <p className="text-zinc-300 mt-0.5">{(actor as any).personalDepth}</p>
                                </div>
                              )}
                              {(actor as any).productionUse && (
                                <div>
                                  <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Production Use</span>
                                  <p className="text-zinc-300 mt-0.5">{(actor as any).productionUse}</p>
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {actor.tags.slice(0, 3).map((tag) => (
                                  <span key={tag} className={`text-xs px-2 py-0.5 rounded-full ${ac.bg} ${ac.text} border ${ac.border}`}>{tag}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          <p className={`text-[10px] ${ac.text} opacity-60 mt-2 text-right`}>{isExpanded ? "Tap to collapse" : "Tap for DNA"}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </section>



        {/* ── CHEMISTRY PAIRINGS ───────────────────────────────────────────── */}
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
                <div key={pair.label}
                  className="rounded-xl border border-white/5 bg-zinc-900/30 p-5 hover:border-white/10 transition-colors cursor-pointer"
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

        {/* ── WHAT IS CHARACTER DNA ─────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <Fingerprint className="w-5 h-5 text-amber-400" />
              <h2 className="text-3xl font-bold">What is Character DNA?</h2>
            </div>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Character DNA is the structured production profile that keeps a digital performer usable across a project. It gives the story engine and generation workflow consistent reference points instead of treating every scene like a fresh prompt.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CHARACTER_DNA_ITEMS.map((item, i) => (
              <div key={item.title} className="rounded-xl border border-white/5 bg-white/[0.02] p-6 hover:border-amber-500/15 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-amber-500/50 text-xs font-mono">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                </div>
                <p className="text-sm text-zinc-400">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── WORKFLOW ─────────────────────────────────────────────────────── */}
        <section className="border-y border-white/5 bg-white/[0.01]">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-4">
                <GitBranch className="w-5 h-5 text-amber-400" />
                <h2 className="text-3xl font-bold">How Digital Cast fits the Virelle workflow.</h2>
              </div>
              <p className="text-zinc-400 max-w-xl mx-auto">
                Digital Cast connects story planning with generation. Build characters once, then carry them through the production workflow.
              </p>
            </div>
            <div className="max-w-3xl mx-auto space-y-4">
              {WORKFLOW_STEPS.map((step, i) => (
                <div key={step.step} className="flex items-start gap-5 rounded-xl border border-white/5 bg-zinc-900/30 p-5 hover:border-amber-500/15 transition-colors">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                    {step.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{step.title}</h3>
                    <p className="text-sm text-zinc-400">{step.description}</p>
                  </div>
                  {i < WORKFLOW_STEPS.length - 1 && (
                    <ChevronRight className="ml-auto shrink-0 w-4 h-4 text-zinc-700 self-center" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── USE CASES ────────────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Built for real production use.</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Digital Cast is the character layer for every format a modern production touches.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center max-w-3xl mx-auto">
            {USE_CASES.map((uc) => (
              <span key={uc} className="px-4 py-2 rounded-full border border-white/10 bg-white/[0.02] text-sm text-zinc-300 hover:border-amber-500/25 hover:text-amber-200 transition-colors">
                {uc}
              </span>
            ))}
          </div>
        </section>

        {/* ── SAFETY ───────────────────────────────────────────────────────── */}
        <section className="border-t border-white/5 bg-white/[0.01]">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="rounded-xl border border-white/5 bg-zinc-900/30 p-6 flex items-start gap-4">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mt-0.5">
                <AlertTriangle className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-300 mb-2">Digital Cast Safety</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Virelle Digital Cast is designed for original fictional characters and platform-created Signature Cast talent. Do not create or imply unauthorized replicas of real people, celebrities, private individuals, or protected likenesses. Always confirm you have rights to any uploaded reference material.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SHOWCASE CROSS-LINK ── */}
        <section className="max-w-4xl mx-auto px-6 pb-2">
          <div className="rounded-xl border border-white/5 bg-zinc-900/30 p-6 flex flex-col sm:flex-row items-center gap-5 justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-300 mb-1">See Digital Cast in context.</p>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-sm">
                Inside THE SHOWRUNNER showcase, Digital Cast is used to build a complete character-driven production package.
              </p>
            </div>
            <button
              onClick={() => navigate("/showcase")}
              className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-amber-500/30 text-amber-300 text-sm font-semibold hover:bg-amber-500/10 transition-colors whitespace-nowrap"
            >
              Watch Showcase
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to build your cast?</h2>
          <p className="text-zinc-400 max-w-lg mx-auto mb-8">
            Create original characters, browse Signature Cast talent, and carry your cast through the full production workflow — scripts, scenes, trailers, and beyond.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8"
              onClick={() => navigate("/talent-search")}>
              Browse Signature Cast
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5"
              onClick={() => navigate("/register")}>
              Start Production
            </Button>
          </div>
        </section>

      </div>
    );
  }
  