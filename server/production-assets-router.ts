/**
 * Production Assets Router — Director's Pre-Production Control Panel
 *
 * Full-stack pre-production toolkit. Every AI call applies:
 *   1. Historical/geographic accuracy (era + country enforce correct architecture & costume)
 *   2. Visual uniqueness (no two locations of the same type ever look identical)
 *   3. Visual DNA injection (project-level cinematographic style feeds every generation)
 *
 * Sub-routers:
 *   vision          — project-wide cinematic style guide + Visual DNA generation
 *   locationScout   — location library with AI cinematographic enrichment
 *   vehicleRegistry — vehicle asset library with AI visual prompts
 *   atmosphere      — standalone AI atmosphere generator (time/weather/season/era)
 */
import { z } from "zod";
import { router, protectedProcedure, creationProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { directorVision, productionVehicles, wardrobeItems, shotListItems, shootingDays } from "../drizzle/schema_additions";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { locations } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { TRPCError } from "@trpc/server";

// ─── Constants exposed to clients via type inference ─────────────────────────

export const PRODUCTION_ERAS = [
  "ancient-world",           // Before 500 CE — Roman, Greek, Egyptian, Persian
  "early-medieval",          // 500–1000 CE — Dark Ages, Byzantine, Viking
  "high-medieval",           // 1000–1400 — Crusades, Gothic cathedrals, castles
  "renaissance",             // 1400–1600 — Italian, Northern European renaissance
  "baroque-1600s",           // 1600s — Baroque opulence, colonialism begins
  "enlightenment-1700s",     // 1700s — Georgian, French Revolution, colonial expansion
  "regency-1810s",           // 1810–1830 — Jane Austen era, Napoleonic aftermath
  "victorian-1840s-1860s",   // Early Victorian — industrial revolution, reform era
  "victorian-1870s-1890s",   // High Victorian — empire at peak, gaslight era
  "edwardian-1900s",         // 1900–1914 — Belle Époque, Titanic era
  "world-war-i-1914s",       // 1914–1918 — trenches, home front
  "roaring-1920s",           // 1920s — Jazz Age, Art Deco, prohibition
  "great-depression-1930s",  // 1930s — Art Deco/Streamline Moderne, poverty/glamour
  "world-war-ii-1940s",      // 1939–1945 — wartime, noir, rationing
  "post-war-late-1940s",     // 1945–1949 — reconstruction, new hope, film noir peak
  "atomic-age-1950s",        // 1950s — suburbia, chrome, Cold War optimism
  "swinging-1960s",          // 1960s — Mod, counterculture, space age
  "new-hollywood-1970s",     // 1970s — gritty realism, polyester, oil crisis
  "neon-1980s",              // 1980s — shoulder pads, synth, excess, Cold War end
  "grunge-1990s",            // 1990s — flannel, grunge, tech boom beginning
  "digital-2000s",           // 2000s — post-9/11, reality TV, DVD era
  "social-media-2010s",      // 2010s — smartphones dominate, Instagram aesthetic
  "contemporary-2020s",      // 2020s — pandemic world, remote work, TikTok
  "near-future",             // 2030–2060 — speculative near-future
  "far-future",              // 2100+ — advanced civilisation or decline
  "post-apocalyptic",        // Undefined future — collapse of society
  "alternate-history",       // History diverged at a specific point
] as const;

export const PRODUCTION_COUNTRIES = [
  // Europe
  "France", "United Kingdom", "Germany", "Italy", "Spain", "Portugal",
  "Netherlands", "Belgium", "Switzerland", "Austria", "Poland", "Czech Republic",
  "Hungary", "Romania", "Greece", "Turkey", "Russia", "Ukraine", "Scandinavia",
  "Ireland", "Scotland",
  // Americas
  "USA — New York", "USA — Los Angeles", "USA — Chicago", "USA — Deep South",
  "USA — Pacific Northwest", "USA — Texas", "USA — Midwest",
  "Canada", "Mexico", "Brazil", "Argentina", "Colombia", "Cuba", "Caribbean",
  // Asia
  "Japan", "South Korea", "China", "Hong Kong", "Taiwan",
  "India — Mumbai", "India — Delhi", "India — Rajasthan",
  "Thailand", "Vietnam", "Indonesia", "Philippines", "Singapore", "Malaysia",
  // Middle East & Africa
  "Egypt", "Morocco", "Tunisia", "South Africa", "Nigeria", "Kenya", "Ethiopia",
  "Israel", "UAE — Dubai", "Saudi Arabia", "Iran", "Iraq",
  // Oceania
  "Australia", "New Zealand",
  // Special
  "Fictional / Unspecified",
] as const;

export const CAMERA_SYSTEMS = [
  // ARRI
  "ARRI ALEXA 35",
  "ARRI ALEXA Mini LF",
  "ARRI ALEXA Mini",
  "ARRI ALEXA Classic",
  "ARRI ALEXA LF",
  // RED
  "RED V-Raptor [X] 8K VV",
  "RED Komodo-X 6K",
  "RED Komodo 6K",
  "RED Monstro 8K VV",
  // Sony
  "Sony Venice 2 (8.6K)",
  "Sony Venice (6K)",
  "Sony BURANO",
  "Sony FX9 (6K)",
  "Sony FX6",
  "Sony FX3",
  // Blackmagic
  "Blackmagic URSA Mini Pro 12K",
  "Blackmagic Pocket 6K Pro",
  "Blackmagic Cinema Camera 6K",
  // Canon
  "Canon EOS C70",
  "Canon EOS C300 Mark III",
  "Canon EOS C500 Mark II",
  // Panavision
  "Panavision DXL2 (8K)",
  // Film
  "35mm Film — Kodak Vision3 500T",
  "35mm Film — Kodak Vision3 250D",
  "16mm Film — Kodak Double-X",
  "16mm Film — Kodak Vision3 200T",
  "Super 8mm Film",
  // Specialist
  "Phantom Flex4K (ultra slow-motion)",
  "DJI Ronin 4D (integrated gimbal)",
  "iPhone 15 Pro (ProRes RAW, 4K)",
  "GoPro HERO 12 (action/POV)",
] as const;

export const LENS_SETS = [
  // Cooke
  "Cooke S4/i Spherical Primes",
  "Cooke Anamorphic/i SF",
  "Cooke SP3 Panchro/i Classic",
  "Cooke Varotal/i Zoom",
  // Zeiss
  "Zeiss Master Anamorphic",
  "Zeiss Supreme Prime",
  "Zeiss Standard Speed MKII",
  // ARRI
  "ARRI Signature Prime",
  "ARRI Signature Zoom (15-30 / 45-135)",
  "ARRI Master Prime",
  // Leica
  "Leica Summilux-C",
  "Leica Thalia",
  // Panavision
  "Panavision G-Series Anamorphic",
  "Panavision Primo Spherical",
  "Panavision Ultra Primo",
  // Vintage / Character
  "Kowa Anamorphic Vintage (oval bokeh)",
  "Canon K-35 Vintage Primes",
  "Super Baltar Vintage Primes",
  "Leica R (adapted vintage, warm+soft)",
  "Mamiya Anamorphic (blue/gold streak)",
  "Lomo Square Front Anamorphic",
  // Modern Indie
  "Atlas Orion Anamorphic A Series",
  "Sigma Cine FF Classic Primes",
  "Tokina Vista Anamorphic",
  "DZO Vespid Primes",
  // Specialty
  "Macro Lens (100mm 1:1)",
  "Tilt-Shift (perspective correction)",
  "Lensbaby Composer (creative distortion)",
  "Fisheye (8mm extreme wide)",
  "Anamorphic 1.3x (mild squeeze)",
  "Anamorphic 2x (full scope squeeze)",
] as const;

export const ASPECT_RATIOS = [
  "2.76:1 — Ultra Panavision 70 (Ben-Hur, Hateful Eight)",
  "2.39:1 — Anamorphic Scope (standard widescreen cinema)",
  "2.35:1 — Classic Cinemascope",
  "2.20:1 — 70mm (Lawrence of Arabia)",
  "2.00:1 — Univisium (Fincher's preferred)",
  "1.90:1 — IMAX Digital (laser)",
  "1.85:1 — Flat (most American films)",
  "1.78:1 — 16:9 (streaming / TV standard)",
  "1.66:1 — European Flat (Bergman, Godard)",
  "1.37:1 — Academy Ratio (pre-1953 classic)",
  "1.33:1 — 4:3 (silent era, nostalgia)",
  "1.00:1 — Square (social media, Mommy)",
  "0.75:1 — Vertical Portrait (mobile-first)",
] as const;

export const FRAME_RATES = [
  "16fps — Silent film aesthetic",
  "18fps — Super 8 home-movie aesthetic",
  "23.976fps — Film sync (broadcast)",
  "24fps — Cinematic standard (most films)",
  "25fps — European/PAL broadcast",
  "29.97fps — NTSC broadcast (USA)",
  "30fps — Documentary / digital news",
  "48fps — HFR (The Hobbit effect)",
  "60fps — Action / sports (10% slow-mo at 24)",
  "96fps — Slow-motion 4x at 24fps playback",
  "120fps — Slow-motion 5x at 24fps",
  "240fps — High-speed ultra slow-motion",
  "1000fps+ — Phantom super slow-motion",
] as const;

export const SHOOTING_FORMATS = [
  // ARRI
  "ARRIRAW LF (Large Format)",
  "ARRIRAW 4.5K (Open Gate)",
  "ProRes 4444 XQ (4K LF)",
  "ProRes 422 HQ (4K)",
  // RED
  "REDCODE RAW 8K VV",
  "REDCODE RAW 6K FF",
  // Blackmagic
  "Blackmagic RAW 12K",
  "Blackmagic RAW 6K",
  // Sony
  "X-OCN XT (Sony Venice 2)",
  "S-Cinetone (Sony LUT baked)",
  // Log Formats
  "Log-C4 (ARRI ALEXA 35)",
  "Log-C3 (ARRI ALEXA Mini LF)",
  "S-Log3 / S-Gamut3.Cine (Sony)",
  "V-Log / V-Gamut (Panasonic)",
  "C-Log3 (Canon)",
  "FLog2 (Fujifilm)",
  // Film
  "35mm Photochemical (Film print)",
  "16mm Photochemical (Film print)",
  "8mm Film Scan (DIY aesthetic)",
  // Digital acquisition
  "4K UHD RAW (generic)",
  "6K RAW (generic)",
  "8K RAW (generic)",
] as const;

export const COLOR_GRADE_STYLES = [
  // Cool / Desaturated
  "Cool Desaturated — Nordic Noir (cold blues, minimal saturation)",
  "Steel Blue — Clinical (cold, modern, detached)",
  "Silver Retention — Se7en/Road to Perdition (desaturated + high contrast)",
  "Bleach Bypass — gritty, silver halide feel",
  // Warm
  "Warm Golden — Period drama (ambers, soft highlights)",
  "Sepia Nostalgic — Amber/brown nostalgic tones",
  "Ember Warm — Intimate indie drama",
  // High Contrast
  "Teal & Orange — Hollywood blockbuster (complementary)",
  "High Contrast Punchy — commercial action",
  "Hard Noir — deep blacks, bright highlights",
  "Neo-Noir — neon + deep shadow",
  // Soft / Pastel
  "Soft Pastel — Wes Anderson (muted primary, symmetrical)",
  "Faded Nostalgic — Lomo / lomography film simulation",
  "Vintage Kodachrome — warm, saturated, slight fade",
  "Vintage Ektachrome — cool, punchy, slight cross-process",
  // Monochrome
  "High Contrast B&W — Schindler's List, Roma",
  "Soft Grain B&W — Silver gelatin print feel",
  "Warm B&W — Sepia-toned monochrome",
  "Infrared B&W — surreal bright foliage",
  // Neon / Stylised
  "Neon Fluorescent — Nicolas Winding Refn style",
  "Candy Neon — hyper-saturated nightlife",
  "Cyberpunk Magenta/Cyan",
  "Retro Synth-Wave — 80s purple/pink grid",
  // Natural
  "True-to-Life / Natural — minimal grade",
  "Warm Naturalistic — indie drama, Terrence Malick",
  "Day-for-Night — crushed shadows, blue tint",
  // Commercial
  "High-Key Clean — bright, commercial, advertising",
  "Vibrant Tropical — travel / lifestyle",
  "Military Olive — desaturated + green-brown push",
  "Technicolor Emulation — 3-strip vibrant period",
] as const;

export const MOVEMENT_STYLES = [
  // Static
  "Static Locked-Off Master — controlled, theatrical",
  "Static + Rack Focus — depth shift, no camera move",
  "Dutch Angle / Canted — psychological unease",
  // Handheld
  "Handheld Vérité — naturalistic, invisible technique",
  "Handheld Aggressive — intense, destabilising",
  "Handheld Intimate — close, personal, breathing",
  // Stabilised
  "Steadicam Float — fluid, dreamlike following",
  "Gimbal Glide — smooth modern follow",
  // Mechanical / Dolly
  "Dolly Push-In (motivated) — tension build",
  "Dolly Pull-Back (reveal) — world expanding",
  "Dolly Track (lateral) — parallel to action",
  "Dolly + Zoom (Vertigo effect) — simultaneous opposing",
  // Crane / Jib
  "Crane Sweep — grand establishing sweep",
  "Jib Arm (low-to-high) — hopeful reveal",
  "Jib Arm (high-to-low) — foreboding descent",
  // Aerial
  "Drone Wide Aerial — establishing geography",
  "Drone Low-Level Chase — kinetic, ground-hugging",
  "Helicopter Mount — sweeping landscape",
  // Specialty
  "Whip Pan — dynamic momentum cut",
  "Snap Zoom — Kurosawa tension/comedy",
  "360° Pan — world-building, discovery",
  "Oner / Long Take — theatrical uncut",
  "Crash Cam — extreme low angle, ground level",
  "POV / First-Person — subjective immersion",
  "Phantom Slow-Motion — beauty / impact emphasis",
  "Time-Lapse — passage of time",
  "Hyperlapse — moving time-lapse",
  "Split-Screen — parallel narrative",
] as const;

export const LIGHTING_STYLES = [
  // Natural
  "Available Light — pure naturalistic, no supplements",
  "Window Light — Vermeer/Malick natural interior",
  "Golden Hour Natural — magic hour, warm backlight",
  "Overcast Diffused — flat, even, melancholy",
  "Moonlit Night — cool blue, deep shadow",
  // Practicals-led
  "Practicals Only — period-correct fixture sources",
  "Motivated Naturalistic — supplements practicals subtly",
  "Candlelight / Firelight — warm flicker, intimate",
  "Gaslight Emulation — amber, period 1800s",
  // Studio / Classical
  "Cinematic 3-Point — classic key/fill/back",
  "Single-Source Dramatic — Rembrandt lighting ratio",
  "High-Key Studio — flat commercial, bright",
  "Soft Box Wrap — beauty, soft interview",
  "Ring Light — editorial beauty closeup",
  // Dark / Noir
  "Low-Key Chiaroscuro — deep shadow, narrow beam",
  "Hard Directional — harsh noon sun, crime realism",
  "Silhouette / Contre-Jour — subject against source",
  "No-Light / Near-Darkness — extreme horror/dread",
  // Urban / Artificial
  "Street Lamp Night — sodium amber cast",
  "Fluorescent Urban — green-cast institutional",
  "Neon Urban — coloured practical, saturated",
  "LED Signage — modern city, cool mixed sources",
  // Specialist
  "Underwater — caustics, diffuse blue-green",
  "Strobe / Club — rhythmic flash pattern",
  "Backlight / Rim — halo effect, separation",
  "Bounce / Reflected — soft, large source",
  "Day-for-Night — filmed day, graded night",
] as const;

export const SOUND_DESIGN_DIRECTIONS = [
  "Hyper-Real Naturalistic — every ambient sound amplified and textured",
  "Selective Silence — sparse, impactful; silence as tension",
  "Stylised Foley — designed sound effects, exaggerated for effect",
  "Diegetic Only — only world sound; no non-diegetic score",
  "Score Dominant — music overwhelms; sparse dialogue/ambient",
  "ASMR Intimate — micro-recorded, whisper-close texture",
  "Dolby Atmos Immersive — full spatial 7.1.4 surround",
  "Mono Nostalgic — period-correct single-channel, slight crackle",
  "Bass-Heavy Visceral — low-end physicality (action/horror)",
  "High-Frequency Tension — piercing strings, anxiety-inducing (horror)",
  "Underwater Muffle — POV submerged, pressure distortion",
  "Internal Psychological — character's inner world bleeds into sound",
  "Score-Less Silent — no music, ambient only",
  "Natural World — field recording dominant, no music",
  "Industrial / Mechanical — machinery, metal, industrial rhythm",
  "Electronic Synthesis — pure synthesiser sound design",
  "Layered Texture — complex tapestry of ambient elements",
] as const;

export const MUSIC_GENRES = [
  "Orchestral Drama — full orchestra, emotional swell",
  "Orchestral Action — Hans Zimmer / Junkie XL percussive",
  "Orchestral Tension — Bernard Herrmann-style strings",
  "Chamber Music — intimate strings quartet, delicate",
  "Minimal Piano — sparse, emotional, solo instrument",
  "Jazz — Cool jazz, smoky noir, Miles Davis",
  "Bebop Jazz — energetic, fast, Charlie Parker",
  "Blues — Delta blues, grit, Southern USA",
  "Soul / R&B Underscore — warm, emotive",
  "Gospel / Spiritual — choral, transcendent",
  "Funk — 70s groove, brass section, percussive",
  "Synth-Wave / Retrowave — 80s electronic, Kavinsky",
  "New Age / Ambient — Brian Eno, meditative",
  "Dark Ambient — industrial drone, Lustmord",
  "Electronic / IDM — Aphex Twin, cerebral",
  "Electronic Dance — EDM, kinetic energy",
  "Hip-Hop Instrumental — beats, sample-based",
  "Folk / Acoustic — singer-songwriter, intimate",
  "World Music — regional specific (specify country)",
  "Opera / Classical Aria — dramatic, soprano",
  "Choral / Sacred — medieval church, hauntingly spiritual",
  "Punk / Rock — raw energy, distortion",
  "Metal — heavy, intense (industrial or orchestral metal)",
  "Country — Americana, steel guitar, Southern",
  "Sound Design as Score — no traditional music, designed",
  "Score-less — no score, silence and diegetic only",
  "Temp Track Reference — director provides reference piece",
] as const;

export const TIME_OF_DAY_OPTIONS = [
  "pre-dawn",           // 3–5am, astronomical twilight, deep darkness
  "dawn-break",         // First light, horizon glows
  "golden-hour-morning",// 6–7am, low sun, warm amber light
  "morning",            // 8–10am, clear rising light
  "midmorning",         // 10–11am, established daylight
  "midday",             // 11am–1pm, overhead harsh sun
  "early-afternoon",    // 1–3pm, full daylight, slight drop
  "late-afternoon",     // 3–5pm, light beginning to warm
  "golden-hour-evening",// 5–7pm (varies by season), golden magic hour
  "blue-hour",          // Just after sunset, deep blue twilight
  "dusk",               // Last light fading, artificial lights starting
  "night-early",        // 8–10pm, full dark, city lights active
  "night",              // 10pm–2am, deep night, ambient artificial
  "deep-night",         // 2–4am, quietest hour, near-abandoned
] as const;

export const WEATHER_OPTIONS = [
  "clear-harsh",         // Pure clear sky, harsh directional sun
  "clear-soft",          // Clear but hazy, softened sun
  "partly-cloudy",       // Mixed clouds, dappled light
  "overcast-thin",       // Thin cloud cover, diffused natural light
  "overcast-heavy",      // Dense grey cloud, flat and moody
  "light-fog",           // Morning mist, visible depth
  "heavy-fog",           // Thick fog, visibility under 50m
  "sea-fog",             // Coastal haar, cold and clammy
  "drizzle",             // Fine rain, wet surfaces, muted colour
  "light-rain",          // Steady rain, visible streaks, puddles
  "heavy-rain",          // Downpour, reduced visibility, noise
  "thunderstorm",        // Lightning, dramatic sky, vertical rain
  "after-rain",          // Post-storm, glistening surfaces, steam
  "snow-light",          // Dusting of snow, peaceful
  "snow-heavy",          // Blizzard conditions, white-out
  "snow-settled",        // Deep lying snow, cold still air
  "dry-heat-haze",       // Desert shimmer, heat distortion
  "humid-tropical",      // Hot, saturated, oppressive
  "dust-storm",          // Saharan dust, orange diffusion
  "wildfire-smoke",      // Thick orange-brown haze, apocalyptic
  "industrial-smog",     // Period pollution, yellow-brown cast
  "wind-gusting",        // Strong wind, movement in environment
] as const;

export const ARCHITECTURAL_STYLES = [
  "ancient-classical",   // Greek, Roman columns and marble
  "byzantine",           // Gold mosaics, domed, richly decorated
  "romanesque",          // Heavy stone arches, fortress-like
  "gothic",              // Pointed arches, flying buttresses, cathedrals
  "tudor",               // Half-timbered, steep roofs, England
  "baroque",             // Ornate, dramatic, theatrical curves
  "georgian",            // Symmetrical, brick, sash windows
  "haussmannian",        // Paris, cream stone, iron balconies
  "neo-classical",       // Grand columns, pediments, civic authority
  "victorian-gothic",    // Pointed details on domestic/civic buildings
  "victorian-industrial",// Red brick factories, chimney stacks
  "art-nouveau",         // Organic curves, floral motif, Mucha
  "edwardian-baroque",   // Grand Edwardian civic buildings
  "art-deco",            // Geometric, metallic, stepped forms
  "streamline-moderne",  // 1930s-40s rounded aerodynamic
  "bauhaus",             // Functional, minimal, geometric
  "international-style", // Glass box modernism, Mies van der Rohe
  "mid-century-modern",  // 1950s-60s clean lines, open plan
  "brutalist",           // Raw concrete, imposing, socialist
  "metabolist",          // 1960s-70s Japanese modular megastructure
  "postmodern",          // Ironic references, colour, ornament
  "deconstructivist",    // Fragmented, non-linear, Gehry/Zaha
  "minimalist",          // White, unadorned, pure form
  "japandi",             // Japanese-Scandinavian, natural + sparse
  "scandinavian",        // Hygge, natural materials, functional warmth
  "mediterranean",       // Terracotta, plaster, arches, courtyards
  "colonial-tropical",   // Verandas, jalousies, tropical adaptation
  "favela-informal",     // Improvised, layered, dense organic
  "soviet-bloc",         // Prefab panel construction, Khrushchyovka
  "industrial-loft",     // Exposed brick/duct/beam, converted factory
  "organic-modern",      // Curved, biophilic, Frank Lloyd Wright line
  "high-tech",           // Exposed steel/glass structure, Pompidou
  "cyberpunk",           // Neon, decay, dense vertical layering
  "retrofuturist",       // 1950s-70s vision of the future
  "custom",              // Director specifies unique style
] as const;

export const VEHICLE_ROLES = [
  "hero",           // Protagonist's primary vehicle, on-screen featured
  "character",      // Vehicle that defines/reveals character personality
  "background",     // Ambient vehicles populating the environment
  "stunt",          // Purpose-built or modified for stunts
  "camera-car",     // Vehicle used to mount camera rigs
  "chase",          // Primary vehicle in chase sequence
  "period",         // Historical/era-specific vehicle for period accuracy
  "aerial",         // Aircraft, helicopter, drone (visible in scene)
  "watercraft",     // Boat, yacht, submarine
  "military",       // Armoured vehicle, tank, Jeep
  "emergency",      // Police car, ambulance, fire truck
  "commercial",     // Bus, lorry, delivery truck
  "luxury",         // High-end featuring of vehicle itself
  "wreck",          // Crashed or derelict vehicle as prop
] as const;

export const VEHICLE_CONDITIONS = [
  "showroom-pristine",   // Perfect, just delivered
  "well-maintained",     // Used but cared for
  "daily-driver-worn",   // Normal wear and tear
  "neglected",           // Dirty, minor damage, peeling
  "battle-damaged",      // Shot up, dented, crash damage
  "fire-damaged",        // Burned, charred body panels
  "water-damaged",       // Flood or submerged
  "heavily-modified",    // Custom build, non-factory
  "period-restored",     // Classic restored to original
  "field-stripped",      // Military utilitarian, no extras
  "abandoned",           // Derelict, plant growth, decay
  "post-apocalyptic",    // Mad Max style, welded armour
] as const;

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const VisionInput = z.object({
  projectId: z.number(),
  // Production World
  productionEra: z.string().max(64).optional(),
  productionCountry: z.string().max(128).optional(),
  productionSetting: z.string().optional(),      // Brief description: "1940s occupied Paris, mostly exteriors"
  // Camera Package
  cameraSystem: z.string().max(128).optional(),
  lensSet: z.string().max(128).optional(),
  aspectRatio: z.string().max(64).optional(),
  frameRate: z.string().max(64).optional(),
  shootingFormat: z.string().max(128).optional(),
  // Color & Look
  colorGradeStyle: z.string().max(256).optional(),
  referenceFilms: z.array(z.string()).optional(),
  colorPalette: z.array(z.string()).optional(),
  lutName: z.string().max(128).optional(),
  // Camera Movement
  movementStyle: z.string().max(256).optional(),
  coverageNotes: z.string().optional(),
  // Lighting
  lightingStyle: z.string().max(256).optional(),
  // Sound Design
  soundDesignDirection: z.string().max(256).optional(),
  musicGenre: z.string().max(256).optional(),
});

const LocationScoutInput = z.object({
  projectId: z.number(),
  name: z.string().min(1).max(255),
  address: z.string().max(512).optional(),
  locationType: z.string().max(128).optional(),
  description: z.string().optional(),
  architecturalStyle: z.string().max(128).optional(),  // override per-location style
  eraOverride: z.string().max(64).optional(),           // override if flashback/flash-forward
  countryOverride: z.string().max(128).optional(),      // override if multi-country production
  socialClass: z.string().max(64).optional(),           // "working class", "upper class", "derelict" etc.
  // Director's pre-production variables
  bestTimeOfDay: z.string().max(64).optional(),
  weatherPreferences: z.array(z.string()).optional(),
  permitStatus: z.enum(["not_required","pending","obtained","denied"]).optional(),
  permitNotes: z.string().optional(),
  powerAccess: z.boolean().optional(),
  parkingNotes: z.string().optional(),
  crewCapacity: z.string().max(64).optional(),
  shootingConstraints: z.string().optional(),
  seasonalNotes: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const VehicleInput = z.object({
  projectId: z.number(),
  name: z.string().min(1).max(255),
  make: z.string().max(128).optional(),
  model: z.string().max(128).optional(),
  year: z.number().int().min(1885).max(2150).optional(),
  color: z.string().max(128).optional(),
  condition: z.string().max(64).optional(),
  vehicleRole: z.string().max(64).optional(),
  vehicleType: z.string().max(64).optional(),
  period: z.string().max(64).optional(),
  specialFeatures: z.string().optional(),
  sceneIds: z.array(z.number()).optional(),
  notes: z.string().optional(),
});

const AtmosphereInput = z.object({
  sceneDescription: z.string().optional(),
  genre: z.string().optional(),
  timeOfDay: z.string().max(64),
  weather: z.string().max(64),
  season: z.enum(["spring","summer","autumn","winter"]),
  visibility: z.enum(["crystal-clear","normal","reduced","low","near-zero"]).optional(),
  windCondition: z.enum(["still","gentle-breeze","moderate-wind","strong-wind","gale"]).optional(),
  lightingIntent: z.string().max(256).optional(),
  locationContext: z.string().optional(),
  era: z.string().max(64).optional(),            // inject era for period-accurate atmosphere
  country: z.string().max(128).optional(),       // inject country for cultural accuracy
  visualDna: z.string().optional(),
});

const WardrobeUploadInput = z.object({
    projectId:       z.number(),
    name:            z.string().min(1).max(255),
    imageBase64:     z.string(),
    mimeType:        z.string(), // e.g. "image/jpeg" | "image/png" | "image/webp"
    category:        z.string().max(64).optional(),
    color:           z.string().max(128).optional(),
    secondaryColor:  z.string().max(128).optional(),
    fabric:          z.string().max(128).optional(),
    condition:       z.string().max(64).optional(),
    brand:           z.string().max(128).optional(),
    description:     z.string().optional(),
  });

  // ─── Router ──────────────────────────────────────────────────────────────────

export const productionAssetsRouter = router({

  // ──────────────────────────────────────────────────────────────────────────
  // 1. DIRECTOR'S VISION
  // ──────────────────────────────────────────────────────────────────────────
  vision: router({

    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const [row] = await db.select().from(directorVision)
          .where(and(eq(directorVision.projectId, input.projectId), eq(directorVision.userId, ctx.user.id)));
        return row ?? null;
      }),

    set: protectedProcedure
      .input(VisionInput)
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const { projectId, ...fields } = input;
        const [existing] = await db.select({ id: directorVision.id }).from(directorVision)
          .where(and(eq(directorVision.projectId, projectId), eq(directorVision.userId, ctx.user.id)));
        if (existing) {
          await db.update(directorVision).set({ ...fields, updatedAt: new Date() }).where(eq(directorVision.id, existing.id));
          return { success: true, action: "updated" as const };
        }
        await db.insert(directorVision).values({ projectId, userId: ctx.user.id, ...fields, createdAt: new Date(), updatedAt: new Date() });
        return { success: true, action: "created" as const };
      }),

    generateDNA: creationProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const [vision] = await db.select().from(directorVision)
          .where(and(eq(directorVision.projectId, input.projectId), eq(directorVision.userId, ctx.user.id)));
        if (!vision) throw new TRPCError({ code: "NOT_FOUND", message: "Set your Director's Vision before generating DNA" });

        const visionSummary = [
          (vision as any).productionEra      && `Production era: ${(vision as any).productionEra}`,
          (vision as any).productionCountry  && `Country/region: ${(vision as any).productionCountry}`,
          (vision as any).productionSetting  && `Setting: ${(vision as any).productionSetting}`,
          vision.cameraSystem    && `Camera: ${vision.cameraSystem}`,
          vision.lensSet         && `Lenses: ${vision.lensSet}`,
          vision.aspectRatio     && `Aspect ratio: ${vision.aspectRatio}`,
          vision.frameRate       && `Frame rate: ${vision.frameRate}`,
          vision.shootingFormat  && `Format: ${vision.shootingFormat}`,
          vision.colorGradeStyle && `Colour grade: ${vision.colorGradeStyle}`,
          vision.referenceFilms  && `Reference films: ${(vision.referenceFilms as string[]).join(", ")}`,
          vision.colorPalette    && `Colour palette: ${(vision.colorPalette as string[]).join(", ")}`,
          vision.lutName         && `LUT: ${vision.lutName}`,
          vision.movementStyle   && `Camera movement: ${vision.movementStyle}`,
          vision.coverageNotes   && `Coverage: ${vision.coverageNotes}`,
          vision.lightingStyle   && `Lighting: ${vision.lightingStyle}`,
          vision.soundDesignDirection && `Sound design: ${vision.soundDesignDirection}`,
          vision.musicGenre      && `Music: ${vision.musicGenre}`,
        ].filter(Boolean).join("\n");

        const resp = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a master cinematographer, colorist, production designer, and historian. Translate a director's full production vision — including its era and geographic world — into a single dense 'Visual DNA' prompt string that can be appended to any AI image or video generation prompt to enforce consistent cinematographic style throughout the entire film. Be technically specific, historically accurate, and evocative. Write as if briefing an AI generator on the exact visual fingerprint of this production.",
            },
            {
              role: "user",
              content: `Generate a Visual DNA prompt from these director's choices:\n\n${visionSummary}\n\nReturn JSON: { "visualDnaPrompt": "...", "summary": "...", "eraSignature": "..." }\n\n- visualDnaPrompt: one dense paragraph (100-160 words) encoding ALL choices — camera, glass, format, colour science, movement, lighting, sound, era, geography — into one generation-ready prompt string\n- summary: 2 sentences explaining the overall visual identity of this production to the director\n- eraSignature: one sentence describing what era-specific visual elements should appear in every frame (architecture, costume, props, signage)`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "visual_dna",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  visualDnaPrompt: { type: "string" },
                  summary: { type: "string" },
                  eraSignature: { type: "string" },
                },
                required: ["visualDnaPrompt","summary","eraSignature"],
                additionalProperties: false,
              },
            },
          },
        });

        const parsed = JSON.parse((resp.choices[0].message.content as string) || "{}");
        await db.update(directorVision)
          .set({ visualDnaPrompt: parsed.visualDnaPrompt || "", updatedAt: new Date() })
          .where(eq(directorVision.id, vision.id));
        return {
          visualDnaPrompt: parsed.visualDnaPrompt || "",
          summary: parsed.summary || "",
          eraSignature: parsed.eraSignature || "",
        };
      }),

    getConstants: protectedProcedure.query(() => ({
      eras: PRODUCTION_ERAS,
      countries: PRODUCTION_COUNTRIES,
      cameras: CAMERA_SYSTEMS,
      lenses: LENS_SETS,
      aspectRatios: ASPECT_RATIOS,
      frameRates: FRAME_RATES,
      shootingFormats: SHOOTING_FORMATS,
      colorGradeStyles: COLOR_GRADE_STYLES,
      movementStyles: MOVEMENT_STYLES,
      lightingStyles: LIGHTING_STYLES,
      soundDesignDirections: SOUND_DESIGN_DIRECTIONS,
      musicGenres: MUSIC_GENRES,
      architecturalStyles: ARCHITECTURAL_STYLES,
      vehicleRoles: VEHICLE_ROLES,
      vehicleConditions: VEHICLE_CONDITIONS,
      timeOfDayOptions: TIME_OF_DAY_OPTIONS,
      weatherOptions: WEATHER_OPTIONS,
    })),
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // 2. LOCATION SCOUT
  // ──────────────────────────────────────────────────────────────────────────
  locationScout: router({

    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        return db.select().from(locations)
          .where(and(eq(locations.projectId, input.projectId), eq(locations.userId, ctx.user.id)));
      }),

    create: protectedProcedure
      .input(LocationScoutInput)
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const result = await db.insert(locations).values({ ...input, userId: ctx.user.id, createdAt: new Date(), updatedAt: new Date() } as any);
        return { success: true, id: Number((result as any).insertId) };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number() }).merge(LocationScoutInput.omit({ projectId: true }).partial()).extend({ projectId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const { id, ...fields } = input;
        await db.update(locations).set({ ...fields, updatedAt: new Date() } as any)
          .where(and(eq(locations.id, id), eq(locations.userId, ctx.user.id)));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await db.delete(locations).where(and(eq(locations.id, input.id), eq(locations.userId, ctx.user.id)));
        return { success: true };
      }),

    // AI enrichment — applies era, country, uniqueness, and costume logic
    enrich: creationProcedure
      .input(z.object({ locationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const [loc] = await db.select().from(locations)
          .where(and(eq(locations.id, input.locationId), eq(locations.userId, ctx.user.id)));
        if (!loc) throw new TRPCError({ code: "NOT_FOUND", message: "Location not found" });

        // Fetch project's director vision for era/country context
        const [vision] = await db.select().from(directorVision)
          .where(eq(directorVision.projectId, loc.projectId)).limit(1);

        const l = loc as any;
        const eraContext    = l.eraOverride    || (vision as any)?.productionEra     || null;
        const countryCtx    = l.countryOverride|| (vision as any)?.productionCountry  || null;
        const settingCtx    = (vision as any)?.productionSetting || null;
        const archStyle     = l.architecturalStyle || null;
        const socialClass   = l.socialClass || null;

        const locationDetails = [
          `Location name: ${loc.name}`,
          loc.locationType  && `Location type: ${loc.locationType}`,
          loc.address       && `Address/area: ${loc.address}`,
          loc.description   && `Director's description: ${loc.description}`,
          eraContext        && `Production era: ${eraContext}`,
          countryCtx        && `Country/region: ${countryCtx}`,
          settingCtx        && `Production world setting: ${settingCtx}`,
          archStyle         && `Architectural style directive: ${archStyle}`,
          socialClass       && `Social class/economic context: ${socialClass}`,
          l.bestTimeOfDay   && `Preferred shooting window: ${l.bestTimeOfDay}`,
          l.weatherPreferences?.length && `Weather preferences: ${(l.weatherPreferences as string[]).join(", ")}`,
          l.seasonalNotes   && `Seasonal notes: ${l.seasonalNotes}`,
          l.shootingConstraints && `Constraints: ${l.shootingConstraints}`,
          typeof l.powerAccess !== "undefined" && `Power access: ${l.powerAccess ? "yes" : "no"}`,
        ].filter(Boolean).join("\n");

        const resp = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a master production designer, location manager, director of photography, costume designer, and historical consultant with encyclopaedic knowledge of global architecture, interior design, urban planning, material culture, fashion, and atmospheric conditions across ALL historical periods and geographic regions.

Your job is to produce a cinematographic location dossier satisfying FOUR non-negotiable requirements:

1. HISTORICALLY AND GEOGRAPHICALLY ACCURATE — every architectural detail, material, fixture, and design element MUST be period-correct and culturally authentic for the specified era and country. Examples of correct application:
   - 1920s France (Paris apartment lobby): Haussmann-era mouldings, ornate cast-iron letterboxes, hydraulic lift with wrought-iron grille, herringbone parquet, gas-converted amber wall sconces, heavy carved wooden doors with bevelled glass
   - 1940s USA (wartime New York tenement): linoleum floors, steam radiators, handwritten name cards in brass slots, single-bulb ceiling fixture, Victory Garden poster on wall, blackout-curtain hooks at window
   - 1980s UK (council estate corridor): painted breeze-block, fluorescent strip lighting, metal fire doors with push-bar, Artex ceiling, institutional grey carpet
   - Contemporary Japan (apartment lobby): shoe locker area (getabako), video intercom panel, LED ambient lighting, package delivery locker system, polished concrete floor, minimalist signage in kanji
   - Post-Apocalyptic (unspecified): improvisational salvage, improvised lighting (lanterns, generator-fed bulbs), rust, plant overgrowth, broken signage
   Never mix eras. Never impose modern fixtures on period settings. Never impose period elements on contemporary settings.

2. VISUALLY UNIQUE AND DISTINCTIVE — even two locations of the same type in the same era/country MUST feel like completely different places. You are FORBIDDEN from producing generic descriptions. Always invent specific concrete details that give this location its own fingerprint:
   - Exact wall surface, material, and finish condition
   - Specific practical light source type, colour temperature, and coverage
   - Unique decorative details, period-correct signage, incidental props
   - The condition and patina (pristine vs. faded vs. decaying vs. newly renovated)
   - A distinctive character detail (a particular crack in the plaster, a specific stain, an unusual colour choice, an unexpected object)

3. COSTUME-AWARE — based on the era, country, and social class implied by this location, describe with precision what characters would logically be wearing when moving through this space. Include: silhouette, key garments, specific fabrics, colour palette, footwear, hair, accessories, and status indicators. This is critical for maintaining costume-to-location continuity.

4. CINEMATOGRAPHICALLY ACTIONABLE — translate all of the above into specific guidance for the director, DP, and gaffer.`,
            },
            {
              role: "user",
              content: `Produce a complete cinematographic dossier for this filming location:\n\n${locationDetails}\n\nReturn JSON:\n{\n  "architecturalCharacter": "...",\n  "visualDescription": "...",\n  "uniqueFingerprint": "...",\n  "lightingAnalysis": "...",\n  "weatherImpact": "...",\n  "timeOfDayGuide": "...",\n  "bestAngles": "...",\n  "costumeContext": "...",\n  "aiPromptSuffix": "..."\n}\n\n- architecturalCharacter: the specific era/style/condition identity of this location (2 sentences)\n- visualDescription: 3-4 vivid, unique sentences describing EXACTLY how this specific location looks (not a generic description of the type)\n- uniqueFingerprint: 1-2 sentences describing the ONE distinctive detail that makes this location instantly recognisable and unlike any other of its type\n- lightingAnalysis: how natural and practical light behaves at pre-dawn / golden hour / midday / dusk / night, referencing the specific period-correct light sources\n- weatherImpact: how clear, overcast, rain, fog, snow, and heat haze each transform this specific location\n- timeOfDayGuide: which time of day reveals this location's best cinematic quality and why\n- bestAngles: 3 specific camera setups — wide establishing, intimate mid, and telling detail — with lens recommendations\n- costumeContext: detailed costume guidance for characters passing through this space — silhouette, garments, fabric, colour, accessories, status markers, era-correct details\n- aiPromptSuffix: 50-70 word generation-ready prompt suffix that encodes this location's complete visual identity`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "location_enrichment",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  architecturalCharacter: { type: "string" },
                  visualDescription:      { type: "string" },
                  uniqueFingerprint:      { type: "string" },
                  lightingAnalysis:       { type: "string" },
                  weatherImpact:          { type: "string" },
                  timeOfDayGuide:         { type: "string" },
                  bestAngles:             { type: "string" },
                  costumeContext:         { type: "string" },
                  aiPromptSuffix:         { type: "string" },
                },
                required: ["architecturalCharacter","visualDescription","uniqueFingerprint","lightingAnalysis","weatherImpact","timeOfDayGuide","bestAngles","costumeContext","aiPromptSuffix"],
                additionalProperties: false,
              },
            },
          },
        });

        const parsed = JSON.parse((resp.choices[0].message.content as string) || "{}");
        await db.update(locations)
          .set({ aiVisualPrompt: parsed.aiPromptSuffix || "", updatedAt: new Date() } as any)
          .where(eq(locations.id, input.locationId));

        return {
          architecturalCharacter: parsed.architecturalCharacter || "",
          visualDescription:      parsed.visualDescription      || "",
          uniqueFingerprint:      parsed.uniqueFingerprint      || "",
          lightingAnalysis:       parsed.lightingAnalysis       || "",
          weatherImpact:          parsed.weatherImpact          || "",
          timeOfDayGuide:         parsed.timeOfDayGuide         || "",
          bestAngles:             parsed.bestAngles             || "",
          costumeContext:         parsed.costumeContext         || "",
          aiPromptSuffix:         parsed.aiPromptSuffix        || "",
        };
      }),
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // 3. VEHICLE REGISTRY
  // ──────────────────────────────────────────────────────────────────────────
  vehicleRegistry: router({

    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        return db.select().from(productionVehicles)
          .where(and(eq(productionVehicles.projectId, input.projectId), eq(productionVehicles.userId, ctx.user.id)));
      }),

    create: protectedProcedure
      .input(VehicleInput)
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const result = await db.insert(productionVehicles).values({ ...input, userId: ctx.user.id, createdAt: new Date(), updatedAt: new Date() });
        return { success: true, id: Number((result as any).insertId) };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number() }).merge(VehicleInput.omit({ projectId: true }).partial()).extend({ projectId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const { id, ...fields } = input;
        await db.update(productionVehicles).set({ ...fields, updatedAt: new Date() })
          .where(and(eq(productionVehicles.id, id), eq(productionVehicles.userId, ctx.user.id)));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await db.delete(productionVehicles).where(and(eq(productionVehicles.id, input.id), eq(productionVehicles.userId, ctx.user.id)));
        return { success: true };
      }),

    generatePrompt: creationProcedure
      .input(z.object({ vehicleId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const [vehicle] = await db.select().from(productionVehicles)
          .where(and(eq(productionVehicles.id, input.vehicleId), eq(productionVehicles.userId, ctx.user.id)));
        if (!vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found" });

        // Get project vision for era context
        const [vision] = await db.select().from(directorVision)
          .where(eq(directorVision.projectId, vehicle.projectId)).limit(1);

        const vehicleDetails = [
          `Label: ${vehicle.name}`,
          vehicle.make            && `Make: ${vehicle.make}`,
          vehicle.model           && `Model: ${vehicle.model}`,
          vehicle.year            && `Year: ${vehicle.year}`,
          vehicle.color           && `Colour/finish: ${vehicle.color}`,
          vehicle.condition       && `Condition: ${vehicle.condition}`,
          vehicle.vehicleRole     && `Production role: ${vehicle.vehicleRole}`,
          vehicle.vehicleType     && `Type: ${vehicle.vehicleType}`,
          vehicle.period          && `Period/era context: ${vehicle.period}`,
          vehicle.specialFeatures && `Special features/dressings: ${vehicle.specialFeatures}`,
          (vision as any)?.productionEra     && `Film era: ${(vision as any).productionEra}`,
          (vision as any)?.productionCountry && `Film country: ${(vision as any).productionCountry}`,
          vehicle.notes           && `Notes: ${vehicle.notes}`,
        ].filter(Boolean).join("\n");

        const resp = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an automotive specialist, production designer, and cinematographic consultant with deep knowledge of vehicles across all eras, countries, and production contexts. Generate technically accurate, physically precise visual descriptions so that AI image generators can reproduce the exact same vehicle consistently across every scene in the production. Include period-correct details, era-appropriate modifications, and cinematic lighting behaviour.",
            },
            {
              role: "user",
              content: `Generate a full cinematographic vehicle profile:\n\n${vehicleDetails}\n\nReturn JSON:\n{\n  "visualDescription": "...",\n  "periodAccuracy": "...",\n  "cinematicNotes": "...",\n  "lightingBehavior": "...",\n  "conditionDetails": "...",\n  "aiPromptSuffix": "..."\n}\n\n- visualDescription: 3-4 sentences of precise physical description (body, paint, chrome, glass, wheels, stance, distinguishing marks)\n- periodAccuracy: how this vehicle is era-correct or what period modifications have been made (if applicable)\n- cinematicNotes: best angles, focal lengths, and movement styles for featuring this vehicle\n- lightingBehavior: how the paint/finish responds to golden hour, overcast, night practicals, studio, noon sun, rain reflections\n- conditionDetails: specific weathering, damage, or patina details that make this vehicle unique on camera\n- aiPromptSuffix: 25-40 word generation-ready prompt suffix for consistent rendering`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "vehicle_prompt",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  visualDescription: { type: "string" },
                  periodAccuracy:    { type: "string" },
                  cinematicNotes:    { type: "string" },
                  lightingBehavior:  { type: "string" },
                  conditionDetails:  { type: "string" },
                  aiPromptSuffix:    { type: "string" },
                },
                required: ["visualDescription","periodAccuracy","cinematicNotes","lightingBehavior","conditionDetails","aiPromptSuffix"],
                additionalProperties: false,
              },
            },
          },
        });

        const parsed = JSON.parse((resp.choices[0].message.content as string) || "{}");
        await db.update(productionVehicles)
          .set({ aiVisualPrompt: parsed.aiPromptSuffix || "", updatedAt: new Date() })
          .where(eq(productionVehicles.id, input.vehicleId));

        return {
          visualDescription: parsed.visualDescription || "",
          periodAccuracy:    parsed.periodAccuracy    || "",
          cinematicNotes:    parsed.cinematicNotes    || "",
          lightingBehavior:  parsed.lightingBehavior  || "",
          conditionDetails:  parsed.conditionDetails  || "",
          aiPromptSuffix:    parsed.aiPromptSuffix    || "",
        };
      }),
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // 4. ATMOSPHERE GENERATOR
  // ──────────────────────────────────────────────────────────────────────────
  atmosphere: router({

    generate: creationProcedure
      .input(AtmosphereInput)
      .mutation(async ({ ctx, input }) => {
        const context = [
          `Time of day: ${input.timeOfDay.replace(/-/g," ")}`,
          `Weather/conditions: ${input.weather.replace(/-/g," ")}`,
          `Season: ${input.season}`,
          input.visibility      && `Visibility: ${input.visibility.replace(/-/g," ")}`,
          input.windCondition   && `Wind: ${input.windCondition.replace(/-/g," ")}`,
          input.era             && `Production era: ${input.era}`,
          input.country         && `Country/region: ${input.country}`,
          input.lightingIntent  && `Lighting intent: ${input.lightingIntent}`,
          input.locationContext && `Location context: ${input.locationContext}`,
          input.genre           && `Genre/tone: ${input.genre}`,
          input.sceneDescription&& `Scene: ${input.sceneDescription}`,
          input.visualDna       && `Director's Visual DNA: ${input.visualDna}`,
        ].filter(Boolean).join("\n");

        const resp = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a director of photography, gaffer, and atmospheric scientist with 30 years of experience across feature films, commercials, and documentaries. You translate environmental conditions — combined with historical period and geographic location — into technically precise cinematographic atmosphere descriptions that AI generators can use to produce photorealistic scenes.

CRITICAL REQUIREMENTS:
1. ERA ACCURACY — if a period era is specified, all atmospheric elements must be period-correct: 1940s cities have coal-fire smog and sodium street lamps, not LED; 1970s cities have heavier air pollution; pre-industrial eras have lanterns and candles. Never use modern light sources in period settings.
2. GEOGRAPHIC ACCURACY — if a country is specified, atmospheric qualities must reflect that region's specific light quality: Mediterranean light is warm gold with hard shadows; Scandinavian light is cool and flat even in summer; Tokyo night has specific neon colours (red, cyan, green); Paris has warm stone reflections.
3. UNIQUE VARIATION — each generate call must produce subtly different atmospheric fingerprints. Even 'night + rain + city street' should have specific unique characteristics (exact Kelvin temperature, specific rain density, particular surface reflections, specific ambient colour cast from the era-correct light sources).`,
            },
            {
              role: "user",
              content: `Generate a complete cinematographic atmosphere profile from these director's pre-production choices:\n\n${context}\n\nReturn JSON:\n{\n  "atmosphereDescription": "...",\n  "lightingConditions": "...",\n  "colorScience": "...",\n  "shadowBehavior": "...",\n  "atmosphericElements": "...",\n  "eraAccurateDetails": "...",\n  "geographicCharacter": "...",\n  "moodImpact": "...",\n  "cameraRecommendations": "...",\n  "aiPromptSuffix": "..."\n}\n\n- atmosphereDescription: 3 sentences capturing the complete visual atmosphere with physical accuracy\n- lightingConditions: light source (period-correct), direction, quality, colour temperature in Kelvin, intensity, shadow-to-highlight ratio\n- colorScience: dominant colour palette including specific shadow and highlight tones, overall contrast character, any colour casts from period-correct sources\n- shadowBehavior: hardness/softness, direction, length (reference sun angle if applicable), fill ratio\n- atmosphericElements: specific particles — era-correct smog, sea spray, dust type, rain density, lens flare type for period-correct light source, heat shimmer, steam\n- eraAccurateDetails: what period-correct environmental details should appear (gaslit signs, horse droppings, TV light through windows, LED scrolling ads, etc.)\n- geographicCharacter: unique atmospheric quality of this specific region (Mediterranean gold, Nordic flat, Japanese neon, etc.)\n- moodImpact: how this atmosphere affects emotional and narrative tone\n- cameraRecommendations: exposure (T-stop / ISO range), ND filter recommendation, white balance point, any lens choice implication\n- aiPromptSuffix: 50-70 word generation-ready prompt suffix that fully encodes this unique atmospheric moment`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "atmosphere_profile",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  atmosphereDescription:  { type: "string" },
                  lightingConditions:     { type: "string" },
                  colorScience:           { type: "string" },
                  shadowBehavior:         { type: "string" },
                  atmosphericElements:    { type: "string" },
                  eraAccurateDetails:     { type: "string" },
                  geographicCharacter:    { type: "string" },
                  moodImpact:             { type: "string" },
                  cameraRecommendations:  { type: "string" },
                  aiPromptSuffix:         { type: "string" },
                },
                required: ["atmosphereDescription","lightingConditions","colorScience","shadowBehavior","atmosphericElements","eraAccurateDetails","geographicCharacter","moodImpact","cameraRecommendations","aiPromptSuffix"],
                additionalProperties: false,
              },
            },
          },
        });

        const parsed = JSON.parse((resp.choices[0].message.content as string) || "{}");
        return {
          atmosphereDescription:  parsed.atmosphereDescription  || "",
          lightingConditions:     parsed.lightingConditions     || "",
          colorScience:           parsed.colorScience           || "",
          shadowBehavior:         parsed.shadowBehavior         || "",
          atmosphericElements:    parsed.atmosphericElements     || "",
          eraAccurateDetails:     parsed.eraAccurateDetails     || "",
          geographicCharacter:    parsed.geographicCharacter    || "",
          moodImpact:             parsed.moodImpact             || "",
          cameraRecommendations:  parsed.cameraRecommendations  || "",
          aiPromptSuffix:         parsed.aiPromptSuffix         || "",
        };
      }),
  }),


  wardrobeUpload: router({

  list: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      return db.select().from(wardrobeItems)
        .where(and(eq(wardrobeItems.projectId, input.projectId), eq(wardrobeItems.userId, ctx.user.id)))
        .orderBy(wardrobeItems.createdAt);
    }),

  upload: creationProcedure
    .input(WardrobeUploadInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Decode and upload image to S3
      let imageUrl: string;
      let storageKey: string | undefined;
      try {
        const imageBuffer = Buffer.from(input.imageBase64, "base64");
        const ext = input.mimeType === "image/png" ? "png"
          : input.mimeType === "image/webp" ? "webp"
          : "jpg";
        const key = `wardrobe/${ctx.user.id}/${input.projectId}/${nanoid()}.${ext}`;
        const result = await storagePut(key, imageBuffer, input.mimeType);
        imageUrl = result.url;
        storageKey = result.key;
      } catch (e: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Storage upload failed: ${e.message}. Ensure storage credentials are configured.`,
        });
      }

      const ins = await db.insert(wardrobeItems).values({
        projectId:      input.projectId,
        userId:         ctx.user.id,
        name:           input.name,
        imageUrl,
        storageKey,
        category:       input.category,
        color:          input.color,
        secondaryColor: input.secondaryColor,
        fabric:         input.fabric,
        condition:      input.condition,
        brand:          input.brand,
        description:    input.description,
        createdAt:      new Date(),
        updatedAt:      new Date(),
      });
      return { success: true, id: Number((ins as any).insertId), imageUrl };
    }),

  analyseGarment: creationProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [item] = await db.select().from(wardrobeItems)
        .where(and(eq(wardrobeItems.id, input.itemId), eq(wardrobeItems.userId, ctx.user.id)));
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Wardrobe item not found" });

      // Get project vision for era/country context
      const [vision] = await db.select().from(directorVision)
        .where(eq(directorVision.projectId, item.projectId)).limit(1);

      const contextLines = [
        item.name           && `Garment name: ${item.name}`,
        item.category       && `Category: ${item.category}`,
        item.color          && `Primary colour (user-tagged): ${item.color}`,
        item.secondaryColor && `Secondary colour (user-tagged): ${item.secondaryColor}`,
        item.fabric         && `Fabric (user-tagged): ${item.fabric}`,
        item.condition      && `Condition (user-tagged): ${item.condition}`,
        item.brand          && `Brand: ${item.brand}`,
        item.description    && `Notes: ${item.description}`,
        (vision as any)?.productionEra     && `Production era: ${(vision as any).productionEra}`,
        (vision as any)?.productionCountry && `Production country: ${(vision as any).productionCountry}`,
        (vision as any)?.visualDnaPrompt   && `Visual DNA: ${(vision as any).visualDnaPrompt}`,
      ].filter(Boolean).join("\n");

      const resp = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert Costume Designer and Film Historian specialising in professional cinema production. You have deep knowledge of:

1. HISTORICAL ACCURACY — garment construction, fabrics available per era/region, social class indicators through clothing, correct terminology
2. CINEMATOGRAPHIC EXPERTISE — how different fabrics, colours, and textures behave under film lighting (satin sheen, velvet absorption, linen texture, metal reflection)
3. CHARACTER STORYTELLING — how costume communicates psychology, social class, narrative arc, and relationship dynamics
4. COLOUR SCIENCE — how garment colours interact with different colour grades, what reads on camera vs what bleeds or blows out

Analyse the provided garment photo with expert precision. Return only valid JSON.`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: item.imageUrl, detail: "high" },
              },
              {
                type: "text",
                text: `Analyse this garment photo and return a complete cinematographic costume profile.\n\nContext provided by costume department:\n${contextLines}\n\nReturn JSON with exactly these fields:\n{\n  "garmentName": "specific descriptive name",\n  "detectedCategory": "top|bottom|dress|outerwear|footwear|headwear|accessory|underwear|full-outfit",\n  "primaryColor": "precise colour name with tone",\n  "secondaryColor": "secondary colours/trim",\n  "fabricType": "fabric with texture description",\n  "condition": "condition descriptor",\n  "silhouette": "silhouette description",\n  "estimatedEra": "era range this garment belongs to",\n  "socialClassIndicator": "what class/status this garment signals",\n  "cinematicNotes": "how this garment reads on camera — sheen, texture, lighting behaviour, exposure risk",\n  "characterSuggestion": "what character type, role, and narrative position this costume fits",\n  "stylingTips": "complementary garments, accessories, hair, makeup to complete the look",\n  "continuityNotes": "practical costume department notes — multiples needed, aging sequence, fragility",\n  "aiPromptSuffix": "60-80 word cinematic prompt describing this exact garment for consistent AI generation"\n}`,
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "garment_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                garmentName:          { type: "string" },
                detectedCategory:     { type: "string" },
                primaryColor:         { type: "string" },
                secondaryColor:       { type: "string" },
                fabricType:           { type: "string" },
                condition:            { type: "string" },
                silhouette:           { type: "string" },
                estimatedEra:         { type: "string" },
                socialClassIndicator: { type: "string" },
                cinematicNotes:       { type: "string" },
                characterSuggestion:  { type: "string" },
                stylingTips:          { type: "string" },
                continuityNotes:      { type: "string" },
                aiPromptSuffix:       { type: "string" },
              },
              required: [
                "garmentName","detectedCategory","primaryColor","secondaryColor",
                "fabricType","condition","silhouette","estimatedEra","socialClassIndicator",
                "cinematicNotes","characterSuggestion","stylingTips","continuityNotes","aiPromptSuffix",
              ],
              additionalProperties: false,
            },
          },
        },
      });

      const parsed = JSON.parse((resp.choices[0].message.content as string) || "{}");

      // Save AI results to DB
      await db.update(wardrobeItems).set({
        aiGarmentName:  parsed.garmentName  || undefined,
        aiCategory:     parsed.detectedCategory || undefined,
        aiStyleProfile: JSON.stringify(parsed),
        aiPromptSuffix: parsed.aiPromptSuffix || undefined,
        updatedAt:      new Date(),
      }).where(eq(wardrobeItems.id, item.id));

      return {
        garmentName:          parsed.garmentName          || "",
        detectedCategory:     parsed.detectedCategory     || "",
        primaryColor:         parsed.primaryColor         || "",
        secondaryColor:       parsed.secondaryColor       || "",
        fabricType:           parsed.fabricType           || "",
        condition:            parsed.condition            || "",
        silhouette:           parsed.silhouette           || "",
        estimatedEra:         parsed.estimatedEra         || "",
        socialClassIndicator: parsed.socialClassIndicator || "",
        cinematicNotes:       parsed.cinematicNotes       || "",
        characterSuggestion:  parsed.characterSuggestion  || "",
        stylingTips:          parsed.stylingTips          || "",
        continuityNotes:      parsed.continuityNotes      || "",
        aiPromptSuffix:       parsed.aiPromptSuffix       || "",
      };
    }),

  setCharacterLink: protectedProcedure
    .input(z.object({ itemId: z.number(), characterName: z.string(), sceneRef: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.update(wardrobeItems).set({
        ...(input.characterName !== undefined && { characterName: input.characterName } as any),
        ...(input.sceneRef     !== undefined && { sceneRef:     input.sceneRef     } as any),
        updatedAt: new Date(),
      }).where(and(eq(wardrobeItems.id, input.itemId), eq(wardrobeItems.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(wardrobeItems)
        .where(and(eq(wardrobeItems.id, input.id), eq(wardrobeItems.userId, ctx.user.id)));
      return { success: true };
    }),
  }),

// ─── IMPROVEMENT 1: Shot List Auto-Generator ─────────────────────────────────
  shotList: router({

    generate: creationProcedure
      .input(z.object({
        projectId:   z.number(),
        sceneName:   z.string().min(1),
        sceneNumber: z.string().optional(),
        scriptText:  z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const [vision] = await db.select().from(directorVision)
          .where(eq(directorVision.projectId, input.projectId)).limit(1);
        const vCtx = [
          (vision as any)?.productionEra      && "Era: "      + (vision as any).productionEra,
          (vision as any)?.productionCountry  && "Country: "  + (vision as any).productionCountry,
          (vision as any)?.cameraFormat       && "Camera: "   + (vision as any).cameraFormat,
          (vision as any)?.lensProfile        && "Lens: "     + (vision as any).lensProfile,
          (vision as any)?.cameraMovement     && "Movement: " + (vision as any).cameraMovement,
          (vision as any)?.lightingStyle      && "Lighting: " + (vision as any).lightingStyle,
          (vision as any)?.colorGrade         && "Grade: "    + (vision as any).colorGrade,
          (vision as any)?.visualDnaPrompt    && "Visual DNA: "+ (vision as any).visualDnaPrompt,
        ].filter(Boolean).join("\n");
        const resp = await invokeLLM({
          messages: [
            { role: "system", content: `You are an experienced DP and First AD. Generate a detailed professional shot list from the provided scene. Each shot must be cinematically motivated and technically precise. Match the director's visual style exactly.` },
            { role: "user", content: `Generate a complete shot list.\n\nDIRECTOR'S VISION:\n${vCtx || "Standard cinematic"}\n\nSCENE ${input.sceneNumber || ""}${input.sceneName ? ": " + input.sceneName : ""}:\n${input.scriptText}\n\nReturn JSON {"shots": [{shotNumber,shotType,lensLength,cameraMovement,frameDescription,action,dialogue,estimatedDuration,lightingNote,directorNote}]}` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "shot_list_gen",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  shots: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        shotNumber:       { type: "string" },
                        shotType:         { type: "string" },
                        lensLength:       { type: "string" },
                        cameraMovement:   { type: "string" },
                        frameDescription: { type: "string" },
                        action:           { type: "string" },
                        dialogue:         { type: "string" },
                        estimatedDuration:{ type: "number" },
                        lightingNote:     { type: "string" },
                        directorNote:     { type: "string" },
                      },
                      required: ["shotNumber","shotType","lensLength","cameraMovement","frameDescription","action","dialogue","estimatedDuration","lightingNote","directorNote"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["shots"],
                additionalProperties: false,
              },
            },
          },
        });
        const parsed = JSON.parse((resp.choices[0].message.content as string) || '{"shots":[]}');
        return { shots: (parsed.shots || []) as any[] };
      }),

    save: protectedProcedure
      .input(z.object({
        projectId:   z.number(),
        sceneName:   z.string(),
        sceneNumber: z.string().optional(),
        shots: z.array(z.object({
          shotNumber: z.string(), shotType: z.string(), lensLength: z.string(),
          cameraMovement: z.string(), frameDescription: z.string(), action: z.string(),
          dialogue: z.string(), estimatedDuration: z.number(),
          lightingNote: z.string(), directorNote: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await db.delete(shotListItems).where(
          and(eq(shotListItems.projectId, input.projectId), eq(shotListItems.sceneName, input.sceneName), eq(shotListItems.userId, ctx.user.id))
        );
        if (input.shots.length > 0) {
          await db.insert(shotListItems).values(input.shots.map(s => ({
            projectId: input.projectId, userId: ctx.user.id,
            sceneName: input.sceneName, sceneNumber: input.sceneNumber,
            shotNumber: s.shotNumber, shotType: s.shotType, lensLength: s.lensLength,
            cameraMovement: s.cameraMovement, frameDescription: s.frameDescription,
            action: s.action, dialogue: s.dialogue,
            estimatedDuration: s.estimatedDuration,
            lightingNote: s.lightingNote, directorNote: s.directorNote,
            createdAt: new Date(), updatedAt: new Date(),
          })));
        }
        return { success: true, count: input.shots.length };
      }),

    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        return db.select().from(shotListItems)
          .where(and(eq(shotListItems.projectId, input.projectId), eq(shotListItems.userId, ctx.user.id)))
          .orderBy(shotListItems.sceneName, shotListItems.shotNumber);
      }),

    deleteScene: protectedProcedure
      .input(z.object({ projectId: z.number(), sceneName: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await db.delete(shotListItems).where(
          and(eq(shotListItems.projectId, input.projectId), eq(shotListItems.sceneName, input.sceneName), eq(shotListItems.userId, ctx.user.id))
        );
        return { success: true };
      }),
  }),

// ─── IMPROVEMENT 2: Wardrobe Character Linking (added to wardrobeUpload) ─────
// setCharacterLink is injected into wardrobeUpload sub-router separately

// ─── IMPROVEMENT 3: Location → Shooting Schedule ─────────────────────────────
  shootingSchedule: router({

    generate: creationProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const [locs, shots, visionArr] = await Promise.all([
          db.select().from(locations).where(and(eq(locations.projectId, input.projectId), eq(locations.userId, ctx.user.id))),
          db.select().from(shotListItems).where(and(eq(shotListItems.projectId, input.projectId), eq(shotListItems.userId, ctx.user.id))),
          db.select().from(directorVision).where(eq(directorVision.projectId, input.projectId)).limit(1),
        ]);
        const vision = visionArr[0];
        const locSummary = (locs as any[]).map((l: any) =>
          `- ${l.name} (type:${l.locationType||"?"}, bestTime:${l.bestTimeOfDay||"any"}, permit:${l.permitRequired?"REQUIRED":"no"}, capacity:${l.crewCapacity||"?"})`
        ).join("\n") || "No locations scouted";
        const sceneNames = [...new Set((shots as any[]).map((s: any) => s.sceneName))];
        const sceneSummary = sceneNames.map(n => {
          const sc = (shots as any[]).filter((s: any) => s.sceneName === n);
          const totalSec = sc.reduce((a: number, s: any) => a + (s.estimatedDuration || 5), 0);
          return `- ${n}: ${sc.length} shots, ~${Math.ceil(totalSec / 60 * 3)} min screen time`;
        }).join("\n") || "No shot list generated yet";
        const resp = await invokeLLM({
          messages: [
            { role: "system", content: `You are an experienced First AD scheduling a film shoot. Optimise the schedule to minimise company moves, group scenes by location, respect permit windows, and maximise golden-hour shooting. Be practical and specific.` },
            { role: "user", content: `Create a shooting schedule.\n\nLOCATIONS:\n${locSummary}\n\nSCENES:\n${sceneSummary}\n\nPRODUCTION:\nEra:${(vision as any)?.productionEra||"?"} Country:${(vision as any)?.productionCountry||"?"}\n\nReturn JSON {"days":[{dayNumber,locationName,scenes,callTime,wrapTime,estimatedPages,notes,lightingWindow}]}` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "shooting_schedule",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  days: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        dayNumber:      { type: "number" },
                        locationName:   { type: "string" },
                        scenes:         { type: "array", items: { type: "string" } },
                        callTime:       { type: "string" },
                        wrapTime:       { type: "string" },
                        estimatedPages: { type: "string" },
                        notes:          { type: "string" },
                        lightingWindow: { type: "string" },
                      },
                      required: ["dayNumber","locationName","scenes","callTime","wrapTime","estimatedPages","notes","lightingWindow"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["days"],
                additionalProperties: false,
              },
            },
          },
        });
        const parsed = JSON.parse((resp.choices[0].message.content as string) || '{"days":[]}');
        return { days: (parsed.days || []) as any[] };
      }),

    save: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        days: z.array(z.object({
          dayNumber: z.number(), locationName: z.string(),
          scenes: z.array(z.string()), callTime: z.string(), wrapTime: z.string(),
          estimatedPages: z.string(), notes: z.string(), lightingWindow: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await db.delete(shootingDays).where(and(eq(shootingDays.projectId, input.projectId), eq(shootingDays.userId, ctx.user.id)));
        if (input.days.length > 0) {
          await db.insert(shootingDays).values(input.days.map(d => ({
            projectId: input.projectId, userId: ctx.user.id,
            dayNumber: d.dayNumber, locationName: d.locationName,
            scenes: JSON.stringify(d.scenes), callTime: d.callTime, wrapTime: d.wrapTime,
            estimatedPages: d.estimatedPages, notes: d.notes, lightingWindow: d.lightingWindow,
            createdAt: new Date(), updatedAt: new Date(),
          })));
        }
        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const rows = await db.select().from(shootingDays)
          .where(and(eq(shootingDays.projectId, input.projectId), eq(shootingDays.userId, ctx.user.id)))
          .orderBy(shootingDays.dayNumber);
        return (rows as any[]).map((r: any) => ({
          ...r,
          scenes: typeof r.scenes === "string" ? JSON.parse(r.scenes) : (r.scenes || []),
        }));
      }),

    deleteAll: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await db.delete(shootingDays).where(and(eq(shootingDays.projectId, input.projectId), eq(shootingDays.userId, ctx.user.id)));
        return { success: true };
      }),
  }),

// ─── IMPROVEMENT 5: Cross-Module Continuity Checker ──────────────────────────
  continuityCheck: router({

    run: creationProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const [locsArr, wardrobeArr, visionArr] = await Promise.all([
          db.select().from(locations).where(and(eq(locations.projectId, input.projectId), eq(locations.userId, ctx.user.id))),
          db.select().from(wardrobeItems).where(and(eq(wardrobeItems.projectId, input.projectId), eq(wardrobeItems.userId, ctx.user.id))),
          db.select().from(directorVision).where(eq(directorVision.projectId, input.projectId)).limit(1),
        ]);
        const vision = visionArr[0];
        const locsSummary = (locsArr as any[]).map((l: any) =>
          `- ${l.name}: type=${l.locationType||"?"}, era=${l.eraOverride||"none"}, class=${l.socialClass||"?"}, country=${l.countryOverride||"none"}`
        ).join("\n") || "None scouted";
        const wardrobeSummary = (wardrobeArr as any[]).map((w: any) => {
          const ai = w.aiStyleProfile ? (() => { try { return JSON.parse(w.aiStyleProfile); } catch { return null; } })() : null;
          return `- ${w.name}: cat=${w.category||"?"}, era=${ai?.estimatedEra||w.era||"?"}, class=${ai?.socialClassIndicator||"?"}, character=${(w as any).characterName||"unassigned"}`;
        }).join("\n") || "None uploaded";
        const resp = await invokeLLM({
          messages: [
            { role: "system", content: `You are an expert Script Supervisor specialising in continuity. Analyse the production data and identify continuity conflicts, mismatches, and risks across wardrobe, locations, and the director's vision. Be specific and actionable.` },
            { role: "user", content: `Continuity check for this production.\n\nDIRECTOR'S VISION:\nEra: ${(vision as any)?.productionEra||"Not set"}\nCountry: ${(vision as any)?.productionCountry||"Not set"}\nVisual DNA: ${(vision as any)?.visualDnaPrompt||"Not generated"}\n\nLOCATIONS (${locsArr.length}):\n${locsSummary}\n\nWARDROBE (${wardrobeArr.length} items):\n${wardrobeSummary}\n\nReturn JSON: {"overallRisk":"low|medium|high","summary":"2 sentence overview","issues":[{"severity":"critical|warning|info","category":"era|geography|class|character|lighting|other","title":"short title","description":"specific conflict","recommendation":"action to take"}],"strengths":["what is consistent and working"]}` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "continuity_check",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  overallRisk: { type: "string" },
                  summary:     { type: "string" },
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        severity:       { type: "string" },
                        category:       { type: "string" },
                        title:          { type: "string" },
                        description:    { type: "string" },
                        recommendation: { type: "string" },
                      },
                      required: ["severity","category","title","description","recommendation"],
                      additionalProperties: false,
                    },
                  },
                  strengths: { type: "array", items: { type: "string" } },
                },
                required: ["overallRisk","summary","issues","strengths"],
                additionalProperties: false,
              },
            },
          },
        });
        const parsed = JSON.parse((resp.choices[0].message.content as string) || '{"overallRisk":"low","summary":"","issues":[],"strengths":[]}');
        return {
          overallRisk: parsed.overallRisk || "low",
          summary:     parsed.summary     || "",
          issues:      parsed.issues      || [],
          strengths:   parsed.strengths   || [],
        };
      }),
  }),

});