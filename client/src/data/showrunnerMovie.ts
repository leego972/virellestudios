/**
 * THE SHOWRUNNER — extended film package data.
 *
 * Builds on showrunnerShowcase.ts by adding:
 *  - Locations
 *  - Per-scene generation prompts (ready for Lee's API)
 *  - Voice direction (per character)
 *  - Music direction
 *  - Sound design
 *  - Edit plan
 *  - Asset placeholders
 *  - Film structure
 *
 * IMPORTANT: No media assets are generated here.
 * All media references carry status "ready_for_generation".
 * Lee will generate the actual film later using his own API.
 *
 * Expected asset path: public/showcase/the-showrunner/
 *
 * All characters, names, and the rival "ClipWizard.ai" are fictional.
 * See DISCLAIMER in showrunnerShowcase.ts for the full notice.
 */

// Re-export everything from showrunnerShowcase for single-import convenience
export * from "./showrunnerShowcase";
export { default as SHOWCASE_DATA } from "./showrunnerShowcase";

// ─── Locations ────────────────────────────────────────────────────────────────

export interface Location {
  id: string;
  name: string;
  description: string;
  scenes: number[];
}

export const LOCATIONS: Location[] = [
  {
    id: "leos-apartment",
    name: "Leo's Melbourne Apartment — Night",
    description:
      "Small, messy apartment. Rain on the window. Old scripts stacked on the floor. " +
      "Bills piled on the desk. Coffee cups everywhere. A cheap tripod held together " +
      "with tape. A dying laptop with 47 browser tabs.",
    scenes: [1, 2, 3, 4, 5, 6, 9],
  },
  {
    id: "melbourne-rooftop",
    name: "Melbourne Rooftop — Sunset",
    description:
      "Overlooking the Melbourne skyline. Warm golden hour light. Leo and Mia sharing " +
      "a quiet moment after everything changes.",
    scenes: [8],
  },
  {
    id: "investor-meeting-room",
    name: "Investor Meeting Room — Day",
    description:
      "Polished corporate meeting room. Large presentation screen. Boardroom table. " +
      "Leo walks in with Mia. Uncle Ray accidentally appears huge on a video call.",
    scenes: [7],
  },
  {
    id: "dana-office",
    name: "Dana Cross's Office — Day",
    description:
      "Sleek streaming executive office. Clean lines. Industry awards. Multiple screens.",
    scenes: [6],
  },
  {
    id: "signal-black-melbourne",
    name: "Signal Black: Near-Future Melbourne — Night",
    description:
      "Sci-fi noir Melbourne. Neon-lit rainy streets. Public safety screens on every " +
      "corner. Gold data probability overlays. Underground AI command rooms.",
    scenes: [5],
  },
];

// ─── Generation Prompts ───────────────────────────────────────────────────────

export interface GenerationPrompt {
  sceneId: number;
  heading: string;
  visualPrompt: string;
  styleNotes: string;
  status: "ready_for_generation";
}

export const GENERATION_PROMPTS: GenerationPrompt[] = [
  {
    sceneId: 1,
    heading: "Scene 1 — The Stuck Filmmaker",
    visualPrompt:
      "A tiny messy Melbourne apartment at night, rain on window, coffee cups, old scripts, " +
      "unpaid bills, cheap tripod with tape, tired filmmaker at laptop, best friend eating " +
      "noodles, funny indie filmmaker energy, cinematic commercial style, black and gold " +
      "accents, realistic lighting.",
    styleNotes:
      "Warm but tired tungsten light. Slightly desaturated. Comedy-drama tone. Real, not glossy.",
    status: "ready_for_generation",
  },
  {
    sceneId: 2,
    heading: "Scene 2 — The Email",
    visualPrompt:
      "Close-up of laptop email inbox in a dark apartment, warm screen glow, emotional " +
      "nostalgic email from old friend in Hawaii, Virelle.life link visible, filmmaker " +
      "reacting with surprise and hope, comedic but heartfelt tone, cinematic.",
    styleNotes:
      "Dark room lit only by laptop screen. Warm amber from screen, cool blue from rain outside.",
    status: "ready_for_generation",
  },
  {
    sceneId: 3,
    heading: "Scene 3 — One Link",
    visualPrompt:
      "Premium black and gold AI film production platform interface opening on laptop, " +
      "modules for concept, script, characters, scene cards, visual DNA, voice, score, " +
      "poster, funding targets, production package, filmmaker amazed, friend skeptical, " +
      "uncle suspicious, fast cinematic UI montage.",
    styleNotes:
      "Premium. Black background with gold UI elements. Fast cuts. Product-reveal energy.",
    status: "ready_for_generation",
  },
  {
    sceneId: 4,
    heading: "Scene 4 — The Show Is Born",
    visualPrompt:
      "High-speed cinematic montage of an AI studio workflow generating a sci-fi noir show " +
      "package called SIGNAL BLACK, character cards, scene cards, poster prompt, trailer " +
      "timeline, music direction, funding targets, black and gold interface, premium tech " +
      "commercial look.",
    styleNotes:
      "Fast. Exciting. Montage cuts every 0.5–1 second. Black and gold palette. Tech-commercial energy.",
    status: "ready_for_generation",
  },
  {
    sceneId: 5,
    heading: "Scene 5 — Signal Black Mini-Trailer",
    visualPrompt:
      "Near-future Melbourne sci-fi noir, rainy neon street, female detective in black coat, " +
      "public safety screen glitches with future homicide report, underground AI command room, " +
      "gold probability lines, noir thriller atmosphere, cinematic high contrast.",
    styleNotes:
      "Noir. High contrast. Cyan/gold neon. Rain. Serious tone — this is the show Leo created. " +
      "Should look genuinely cinematic.",
    status: "ready_for_generation",
  },
  {
    sceneId: 6,
    heading: "Scene 6 — Viral Moment + Copycat",
    visualPrompt:
      "Split between: (A) Sunrise in messy apartment, exhausted filmmaker and friends uploading " +
      "a trailer, phone exploding with notifications, viral social media comments, comedic " +
      "excitement, cinematic lighting. (B) Rival creator using fictional generic AI tool " +
      "ClipWizard.ai producing chaotic random clips — cowboy in space, inconsistent detective " +
      "faces, robot dog sunglasses, wrong city skyline, funny failure montage.",
    styleNotes:
      "Part A: warm sunrise, hopeful. Part B: comedic, chaotic, slightly desaturated to contrast " +
      "with Virelle's premium look.",
    status: "ready_for_generation",
  },
  {
    sceneId: 7,
    heading: "Scene 7 — The Pitch",
    visualPrompt:
      "Modern investor meeting room, filmmaker presenting SIGNAL BLACK production package on " +
      "large screen, character cards, scene cards, visual DNA, funding targets, confident " +
      "underdog energy, uncle accidentally on giant video call, comedic but triumphant.",
    styleNotes:
      "Professional setting, underdog energy. Uncle Ray must be funny-huge on the video call screen.",
    status: "ready_for_generation",
  },
  {
    sceneId: 8,
    heading: "Scene 8 — Final Rooftop",
    visualPrompt:
      "Melbourne rooftop at sunset, filmmaker and best friend overlooking skyline, emotional " +
      "success moment, phone notifications for investor meeting and press requests, uncle holding " +
      "cheap Hawaii leis, aspirational ending, cinematic black and gold style.",
    styleNotes:
      "Golden hour. Warm. Aspirational but grounded. Funny uncle with leis. Triumphant but real.",
    status: "ready_for_generation",
  },
  {
    sceneId: 9,
    heading: "Optional End Tag",
    visualPrompt:
      "Uncle Ray alone at laptop, typing into Virelle Studios interface, night, comedic domestic " +
      "setting, warm light.",
    styleNotes: "Simple. Funny. Quick comedic grace note.",
    status: "ready_for_generation",
  },
];

// ─── Voice Direction ──────────────────────────────────────────────────────────

export interface VoiceDirectionEntry {
  character: string;
  voiceType: string;
  delivery: string;
  pace: string;
  notes: string;
}

export const VOICE_DIRECTION: VoiceDirectionEntry[] = [
  {
    character: "Leo Vale",
    voiceType: "Mid-twenties Australian male. Warm baritone.",
    delivery: "Fast, sarcastic, slightly chaotic, emotional underneath.",
    pace: "Fast with sudden pauses for effect.",
    notes:
      "He talks faster when excited. Slows down when genuinely moved. " +
      "His comedy comes from sincerity, not performance.",
  },
  {
    character: "Mia Tran",
    voiceType: "Mid-twenties Australian female. Measured, clear.",
    delivery: "Dry, deadpan, grounded, sharp timing.",
    pace: "Steady and deliberate. Never rushes.",
    notes:
      "Her comedy lives in what she doesn't say. Flat delivery on the funniest lines.",
  },
  {
    character: "Uncle Ray",
    voiceType: "50s–60s Australian male, Pacific Islander warmth.",
    delivery: "Loud, warm, blunt, comic timing.",
    pace: "Confident and slightly too loud, as if always addressing a crowd.",
    notes:
      "Says bold things with complete sincerity. No irony. That is what makes him funny.",
  },
  {
    character: "Sam Kealoha",
    voiceType: "40s–50s Hawaiian-Australian male. Relaxed, warm.",
    delivery: "Warm, nostalgic, sincere.",
    pace: "Unhurried. Retired-in-Hawaii energy.",
    notes:
      "Voice-only (email voiceover). Reads like a genuine old friend. No performance.",
  },
  {
    character: "Dana Cross",
    voiceType: "40s American female. Corporate.",
    delivery: "Smooth, polished, businesslike.",
    pace: "Efficient. Means every word.",
    notes:
      "Not a villain — just business-focused. Treat her like a real executive, not a caricature.",
  },
  {
    character: "Cass Bell",
    voiceType: "Late-twenties influencer type.",
    delivery: "Fake inspirational, overconfident, performative.",
    pace: "Too upbeat. Like every sentence is a pitch.",
    notes:
      "Should come across as trying too hard, not malicious. Parody of influencer energy.",
  },
  {
    character: "Oracle (Signal Black AI)",
    voiceType: "Synthetic. Genderless.",
    delivery: "Soft, emotionless, synthetic.",
    pace: "Measured. Never rushes.",
    notes:
      "Not a scary villain voice. Calm certainty is more unsettling than menace.",
  },
  {
    character: "Mara Vale (Signal Black)",
    voiceType: "30s Australian female. Detective. Weathered.",
    delivery: "Controlled. Determined. Noir.",
    pace: "Direct. No wasted words.",
    notes:
      "Hardboiled but not cliché. She is tired and scared and trying not to show it.",
  },
];

// ─── Music Direction ──────────────────────────────────────────────────────────

export interface MusicDirectionEntry {
  act: string;
  scenes: string;
  tone: string;
  instrumentation: string;
  cue: string;
}

export const MUSIC_DIRECTION: MusicDirectionEntry[] = [
  {
    act: "Act 1 — The Stuck Filmmaker",
    scenes: "Scenes 1–2",
    tone: "Light comedic tension. Slightly melancholy underneath.",
    instrumentation: "Solo piano or acoustic guitar. Simple. Warm but tired.",
    cue:
      "Underscore only — do not overpower dialogue. Emotional support, not statement.",
  },
  {
    act: "Act 2 — The Platform Opens",
    scenes: "Scene 3",
    tone: "Inspiring tech-commercial pulse. Rising energy.",
    instrumentation: "Percussion enters. Electronic undertones. Builds steadily.",
    cue:
      "Shift happens when Leo clicks Generate. Music should feel like a door opening.",
  },
  {
    act: "Act 3 — The Show Is Born",
    scenes: "Scene 4",
    tone: "Full cinematic trailer energy.",
    instrumentation: "Full production. Orchestral hit + electronic pulse. Driving beat.",
    cue:
      "Peaks at SIGNAL BLACK title reveal. This is the film's musical climax.",
  },
  {
    act: "Signal Black Insert",
    scenes: "Scene 5",
    tone: "Sci-fi noir thriller. Cold and electronic.",
    instrumentation: "Cinematic electronic. Low drones. Sharp stabs.",
    cue:
      "Completely different register from the comedy score. This is the show Leo built.",
  },
  {
    act: "Act 4 — Viral + Copycat",
    scenes: "Scene 6",
    tone: "Playful chaos for ClipWizard failure. Rising euphoria for viral moment.",
    instrumentation:
      "Comedic stings for ClipWizard. Euphoric pulse for notifications.",
    cue:
      "Keep ClipWizard music low-budget/funny. Contrast sharply with Virelle's premium feel.",
  },
  {
    act: "Act 5 — Pitch + Finale",
    scenes: "Scenes 7–8",
    tone: "Confident, aspirational, emotional uplift.",
    instrumentation: "Full orchestral resolution. Premium final hit on title card.",
    cue: "End on aspiration — not triumph. The journey is just beginning.",
  },
];

// ─── Sound Design ─────────────────────────────────────────────────────────────

export interface SoundDesignEntry {
  element: string;
  description: string;
  scene: string;
}

export const SOUND_DESIGN: SoundDesignEntry[] = [
  {
    element: "Rain",
    description:
      "Constant soft Melbourne rain on the apartment window. Establishes tone and location.",
    scene: "Scenes 1–2",
  },
  {
    element: "Laptop fan",
    description:
      "Screaming laptop fan when Mia mentions 47 tabs. Should be genuinely loud and funny.",
    scene: "Scene 1",
  },
  {
    element: "Email ding",
    description: "Classic inbox notification. Warm, slightly retro.",
    scene: "Scene 2",
  },
  {
    element: "Keyboard clicks",
    description: "Leo typing the concept into Virelle. Fast, purposeful.",
    scene: "Scene 3",
  },
  {
    element: "UI generation sounds",
    description:
      "Premium audio feedback as Virelle generates each element. Each item gets a distinct soft chime.",
    scene: "Scene 3",
  },
  {
    element: "Cinematic whoosh",
    description:
      "Virelle generation reveal — the moment SIGNAL BLACK title appears.",
    scene: "Scenes 3–4",
  },
  {
    element: "Notification storm",
    description:
      "Phone exploding with likes, comments, calls. Escalating. Comic.",
    scene: "Scene 5",
  },
  {
    element: "Glitch sounds",
    description:
      "ClipWizard.ai output — glitchy, chaotic, inconsistent audio. Contrast with Virelle's clean sound.",
    scene: "Scene 6",
  },
  {
    element: "Investor call tone",
    description: "Professional phone ring. Dana Cross calling.",
    scene: "Scene 6",
  },
  {
    element: "Final title hit",
    description:
      "Single clean cinematic hit on THE SHOWRUNNER title card.",
    scene: "Scene 8",
  },
];

// ─── Edit Plan ────────────────────────────────────────────────────────────────

export interface EditPlanEntry {
  scene: string;
  targetRuntime: string;
  pacingNotes: string;
  cuttingNotes: string;
}

export const EDIT_PLAN: EditPlanEntry[] = [
  {
    scene: "Virelle Opener",
    targetRuntime: "3–5s",
    pacingNotes: "Fast. Brand identity hit.",
    cuttingNotes: "Standard opener, hard cut to disclaimer.",
  },
  {
    scene: "Disclaimer Card",
    targetRuntime: "4s",
    pacingNotes: "Static. White/gold text on black.",
    cuttingNotes: "Hard cut to Scene 1.",
  },
  {
    scene: "Scene 1 — Stuck Filmmaker",
    targetRuntime: "30–40s",
    pacingNotes: "Character establishment. Let jokes breathe.",
    cuttingNotes:
      "Cut slow beats. Keep dialogue rhythm tight. On-screen text as hard cut to Scene 2.",
  },
  {
    scene: "Scene 2 — The Email",
    targetRuntime: "35–45s",
    pacingNotes: "Introduce Sam, the link, Uncle Ray.",
    cuttingNotes:
      "Email read can be voiceover montage. Keep Uncle Ray entrance snappy.",
  },
  {
    scene: "Scene 3 — One Link",
    targetRuntime: "35–45s",
    pacingNotes: "Product reveal. Do not rush it. Let Virelle look impressive.",
    cuttingNotes:
      "UI montage must feel premium, not fast-cut chaos. Let each module land.",
  },
  {
    scene: "Scene 4 — Show Is Born",
    targetRuntime: "30–45s",
    pacingNotes: "Fast montage. Energy peak.",
    cuttingNotes:
      "1-second cuts maximum. Music-driven. SIGNAL BLACK reveal is the visual climax.",
  },
  {
    scene: "Scene 5 — Signal Black Insert",
    targetRuntime: "20–35s",
    pacingNotes: "Completely different register. Genuine sci-fi noir.",
    cuttingNotes:
      "Treat this as a real trailer. Make Signal Black look genuinely cool.",
  },
  {
    scene: "Scene 6 — Viral + Copycat",
    targetRuntime: "45–60s",
    pacingNotes: "Two distinct beats: viral euphoria + ClipWizard failure.",
    cuttingNotes:
      "ClipWizard section should feel comedic and chaotic. Mia's final line is the thesis — give it space.",
  },
  {
    scene: "Scene 7 — The Pitch",
    targetRuntime: "40–60s",
    pacingNotes: "Leo's best moment. Build to 'I finally had a studio.'",
    cuttingNotes:
      "Uncle Ray on video call must be visible for the laugh. Leo's beat before the final line is critical.",
  },
  {
    scene: "Scene 8 — Final Rooftop",
    targetRuntime: "30–45s",
    pacingNotes: "Aspirational. Earned. Funny.",
    cuttingNotes:
      "Let the skyline shot breathe. Uncle Ray with leis is the comedy grace note. Hard cut to black on 'I needed a studio.'",
  },
  {
    scene: "Optional End Tag",
    targetRuntime: "5–10s",
    pacingNotes: "Quick. Funny. Uncle Ray spin-off joke.",
    cuttingNotes: "Comedic punctuation. Optional. Adds warmth.",
  },
  {
    scene: "End Card / CTA",
    targetRuntime: "5s",
    pacingNotes: "Clean. Start your production at Virelle.life",
    cuttingNotes: "Logo + tagline. Single call to action.",
  },
];

// ─── Asset Placeholders ───────────────────────────────────────────────────────

export interface AssetPlaceholder {
  filename: string;
  type: "video" | "image" | "subtitle" | "json";
  description: string;
  path: string;
  status: "ready_for_generation";
  specs: string;
}

export const ASSET_PLACEHOLDERS: AssetPlaceholder[] = [
  {
    filename: "the_showrunner_full.mp4",
    type: "video",
    description: "Full short film — all 9 scenes + opener + disclaimer + end card",
    path: "public/showcase/the-showrunner/the_showrunner_full.mp4",
    status: "ready_for_generation",
    specs: "MP4 · H.264 · 1080p · 3–5 minutes · 24fps",
  },
  {
    filename: "the_showrunner_30s.mp4",
    type: "video",
    description: "30-second trailer cut for landing page and social media",
    path: "public/showcase/the-showrunner/the_showrunner_30s.mp4",
    status: "ready_for_generation",
    specs: "MP4 · H.264 · 1080p · 30 seconds · 24fps",
  },
  {
    filename: "the_showrunner_15s.mp4",
    type: "video",
    description: "15-second hook cut for TikTok, Reels, and short ads",
    path: "public/showcase/the-showrunner/the_showrunner_15s.mp4",
    status: "ready_for_generation",
    specs: "MP4 · H.264 · 1080p · 15 seconds · 24fps",
  },
  {
    filename: "the_showrunner_poster.png",
    type: "image",
    description:
      "THE SHOWRUNNER movie poster — broke Melbourne filmmaker, Virelle UI glow, Signal Black fragments",
    path: "public/showcase/the-showrunner/the_showrunner_poster.png",
    status: "ready_for_generation",
    specs: "PNG · 2:3 portrait · 2000×3000px · Movie poster quality",
  },
  {
    filename: "the_showrunner_thumbnail.png",
    type: "image",
    description:
      "Video thumbnail — Leo at laptop with Virelle.life glowing, Mia skeptical, Uncle Ray suspicious",
    path: "public/showcase/the-showrunner/the_showrunner_thumbnail.png",
    status: "ready_for_generation",
    specs: "PNG · 16:9 · 1920×1080px · YouTube-style thumbnail",
  },
  {
    filename: "the_showrunner_captions.srt",
    type: "subtitle",
    description: "Full subtitle file for the short film — all dialogue timestamped",
    path: "public/showcase/the-showrunner/the_showrunner_captions.srt",
    status: "ready_for_generation",
    specs: "SRT · UTF-8 · Full film captions",
  },
  {
    filename: "the_showrunner_assets.json",
    type: "json",
    description: "Asset manifest — links to all generated files once available",
    path: "public/showcase/the-showrunner/the_showrunner_assets.json",
    status: "ready_for_generation",
    specs: "JSON · Links to all generated media assets",
  },
];

// ─── Film Structure ───────────────────────────────────────────────────────────

export interface FilmStructureItem {
  order: number;
  label: string;
  description: string;
  durationNote: string;
}

export const FILM_STRUCTURE: FilmStructureItem[] = [
  {
    order: 1,
    label: "Virelle Studios Opener",
    description:
      "Brand opener — white dove descends, gold transformation, VS emblem.",
    durationNote: "3–5 seconds",
  },
  {
    order: 2,
    label: "Disclaimer Card",
    description: "Black background, white/gold text. Full fictional disclaimer.",
    durationNote: "4 seconds",
  },
  {
    order: 3,
    label: "THE SHOWRUNNER Short Film",
    description: "All 9 scenes (+ optional end tag) in sequence.",
    durationNote: "3–5 minutes",
  },
  {
    order: 4,
    label: "End Card / CTA",
    description:
      "THE SHOWRUNNER title card. Built as a Virelle Studios showcase. Virelle.life CTA.",
    durationNote: "5 seconds",
  },
];

// ─── Additional Prompts ───────────────────────────────────────────────────────

export const POSTER_PROMPT_FULL =
  "Premium cinematic comedy-drama poster for THE SHOWRUNNER. A broke Melbourne " +
  "filmmaker stands in a messy apartment holding a laptop glowing with a black and " +
  "gold Virelle Studios interface. Behind him, cinematic fragments of the sci-fi show " +
  "SIGNAL BLACK explode into the air: a noir detective, rainy Melbourne streets, an " +
  "AI face made of data, investor meeting screens, social media notifications, and a " +
  "funny uncle holding cheap Hawaii leis. Tone is aspirational, funny, cinematic, " +
  "premium, black and gold color palette, dramatic lighting, clean composition, movie " +
  "poster style. No text, no words, no letters in image.";

export const THUMBNAIL_PROMPT =
  "Leo staring at a glowing Virelle.life link on his laptop, Mia skeptical beside him, " +
  "Uncle Ray suspicious in the background, black and gold cinematic lighting. Space for " +
  "text overlay. No text, no words, no letters in image.";

// ─── Default export ───────────────────────────────────────────────────────────

const SHOWRUNNER_MOVIE = {
  locations: LOCATIONS,
  generationPrompts: GENERATION_PROMPTS,
  voiceDirection: VOICE_DIRECTION,
  musicDirection: MUSIC_DIRECTION,
  soundDesign: SOUND_DESIGN,
  editPlan: EDIT_PLAN,
  assetPlaceholders: ASSET_PLACEHOLDERS,
  filmStructure: FILM_STRUCTURE,
  posterPromptFull: POSTER_PROMPT_FULL,
  thumbnailPrompt: THUMBNAIL_PROMPT,
};

export default SHOWRUNNER_MOVIE;
