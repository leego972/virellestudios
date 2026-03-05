/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// Scene parameter options for the manual editor
export const TIME_OF_DAY_OPTIONS = ["dawn", "morning", "afternoon", "evening", "night", "golden-hour"] as const;
export const WEATHER_OPTIONS = ["clear", "cloudy", "rainy", "stormy", "snowy", "foggy", "windy"] as const;
export const LIGHTING_OPTIONS = ["natural", "dramatic", "soft", "neon", "candlelight", "studio", "backlit", "silhouette"] as const;
export const CAMERA_ANGLE_OPTIONS = ["wide", "medium", "close-up", "extreme-close-up", "birds-eye", "low-angle", "dutch-angle", "over-shoulder", "pov"] as const;
export const RATING_OPTIONS = ["G", "PG", "PG-13", "R"] as const;
export const QUALITY_OPTIONS = ["standard", "high", "ultra"] as const;
export const MOOD_OPTIONS = ["tense", "romantic", "action", "comedic", "dramatic", "mysterious", "horror", "inspirational", "melancholic", "epic"] as const;

export const LOCATION_TYPES = [
  "City Street", "Rooftop", "Beach", "Forest", "Desert", "Mountain",
  "Office", "Restaurant", "Bar/Club", "Hospital", "Courtroom", "Prison",
  "Airport", "Train Station", "Highway", "Warehouse", "Alley", "Park",
  "Underwater", "Space", "Castle", "Church", "School", "Library",
  "Stadium", "Harbor/Dock", "Farm", "Cave", "Bridge", "Subway",
] as const;

export const REAL_ESTATE_STYLES = [
  "Modern Mansion", "Victorian House", "Penthouse Apartment", "Suburban Home",
  "Log Cabin", "Beach House", "Loft Apartment", "Country Estate",
  "Industrial Warehouse", "Townhouse", "Mediterranean Villa", "Art Deco Building",
  "Minimalist Studio", "Gothic Manor", "Futuristic Complex", "Colonial Home",
] as const;

export const VEHICLE_TYPES = [
  "None", "Sports Car", "Sedan", "SUV", "Pickup Truck", "Motorcycle",
  "Helicopter", "Private Jet", "Yacht", "Speedboat", "Limousine",
  "Police Car", "Ambulance", "Bus", "Bicycle", "Horse", "Tank",
  "Spaceship", "Classic Car", "Van",
] as const;

export const GENRE_OPTIONS = [
  "Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance",
  "Thriller", "Documentary", "Animation", "Fantasy", "Mystery",
  "Western", "Musical", "War", "Crime", "Adventure",
] as const;

export const ACT_STRUCTURE_OPTIONS = [
  "three-act", "five-act", "heros-journey", "nonlinear", "episodic", "circular", "in-medias-res",
] as const;

export const ACT_STRUCTURE_LABELS: Record<string, string> = {
  "three-act": "Three-Act Structure",
  "five-act": "Five-Act Structure",
  "heros-journey": "Hero's Journey",
  "nonlinear": "Nonlinear / Fragmented",
  "episodic": "Episodic",
  "circular": "Circular Narrative",
  "in-medias-res": "In Medias Res",
};

export const TONE_OPTIONS = [
  "Dark", "Comedic", "Suspenseful", "Romantic", "Gritty", "Whimsical",
  "Satirical", "Melancholic", "Uplifting", "Noir", "Surreal", "Intense",
  "Lighthearted", "Philosophical", "Absurdist", "Poetic",
] as const;

export const TARGET_AUDIENCE_OPTIONS = [
  "Children (5-12)", "Teens (13-17)", "Young Adults (18-25)",
  "Adults (25-45)", "Mature Adults (45+)", "Family", "Universal",
] as const;

export type CharacterAttributes = {
  age?: string;
  gender?: string;
  ethnicity?: string;
  build?: string;
  hairColor?: string;
  role?: string;
};

export type CharacterPosition = {
  x: number;
  y: number;
  action: string;
};

// ─── Extended Time of Day Labels ──────────────────────────────────────────────
export const TIME_OF_DAY_LABELS: Record<string, string> = {
  "dawn": "Dawn", "morning": "Morning", "afternoon": "Afternoon",
  "evening": "Evening", "night": "Night", "golden-hour": "Golden Hour",
  "early-morning": "Early Morning", "midday": "Midday / Noon",
  "magic-hour": "Magic Hour", "dusk": "Dusk", "blue-hour": "Blue Hour / Twilight",
  "midnight": "Midnight", "pre-dawn": "Pre-Dawn / 3am",
};

// ─── Weather Labels ───────────────────────────────────────────────────────────
export const WEATHER_LABELS: Record<string, string> = {
  "clear": "Clear & Sunny", "cloudy": "Cloudy", "rainy": "Rainy",
  "stormy": "Stormy", "snowy": "Snowy", "foggy": "Foggy", "windy": "Windy",
  "partly-cloudy": "Partly Cloudy", "overcast": "Overcast / Grey",
  "light-rain": "Light Rain", "heavy-rain": "Heavy Rain",
  "thunderstorm": "Thunderstorm", "drizzle": "Drizzle", "blizzard": "Blizzard",
  "mist": "Mist", "haze": "Haze", "heat-haze": "Heat Haze / Shimmer",
  "dust-storm": "Dust Storm / Sandstorm", "humid-tropical": "Humid / Tropical",
  "dry-arid": "Dry / Arid", "hurricane": "Hurricane / Cyclone",
};

// ─── Lighting Labels ──────────────────────────────────────────────────────────
export const LIGHTING_LABELS: Record<string, string> = {
  "natural": "Natural Daylight", "dramatic": "Dramatic", "soft": "Soft",
  "neon": "Neon / Cyberpunk", "candlelight": "Candlelight / Warm Glow",
  "studio": "Studio", "backlit": "Backlit / Contre-Jour", "silhouette": "Silhouette",
  "golden-hour": "Golden Hour Warmth", "blue-hour": "Blue Hour / Twilight",
  "overcast-diffused": "Overcast / Diffused",
  "dramatic-chiaroscuro": "Dramatic Chiaroscuro", "hard-directional": "Hard Directional",
  "soft-fill": "Soft Fill / Beauty", "rembrandt": "Rembrandt Lighting",
  "loop": "Loop Lighting", "butterfly": "Butterfly / Glamour", "split": "Split Lighting",
  "rim-light": "Rim / Edge Light", "fluorescent": "Fluorescent / Office",
  "firelight": "Firelight / Campfire", "moonlight": "Moonlight / Cool Blue",
  "studio-three-point": "Studio Three-Point", "high-key": "High Key / Bright",
  "low-key": "Low Key / Dark", "motivated": "Motivated / Practical",
  "practical-only": "Practical Lights Only", "mixed-day-interior": "Mixed Day / Interior",
  "magic-hour-warm": "Magic Hour Warm", "interrogation": "Interrogation / Harsh Overhead",
  "underwater": "Underwater / Caustics", "volumetric-god-rays": "Volumetric God Rays",
};

// ─── Camera Angle Labels ──────────────────────────────────────────────────────
export const CAMERA_ANGLE_LABELS: Record<string, string> = {
  "wide": "Wide Shot", "medium": "Medium Shot", "close-up": "Close-Up",
  "extreme-close-up": "Extreme Close-Up / Insert", "birds-eye": "Bird's Eye / Top-Down",
  "low-angle": "Low Angle (Hero Shot)", "dutch-angle": "Dutch Angle / Tilted",
  "over-shoulder": "Over-the-Shoulder", "pov": "POV / First Person",
  "extreme-wide": "Extreme Wide / Establishing", "medium-wide": "Medium Wide / Cowboy",
  "medium-close": "Medium Close-Up", "two-shot": "Two-Shot",
  "high-angle": "High Angle (Diminishing)", "worms-eye": "Worm's Eye (Looking Up)",
  "canted": "Canted / Oblique", "aerial": "Aerial / Helicopter", "drone": "Drone Shot",
  "tracking": "Tracking Shot", "dolly": "Dolly / Dolly-Zoom",
  "handheld": "Handheld / Verite", "steadicam": "Steadicam / Smooth Follow",
  "crane": "Crane / Jib", "underwater-angle": "Underwater Angle",
  "through-glass": "Through Glass / Window", "mirror-reflection": "Mirror / Reflection Shot",
};

// ─── Camera Movement ──────────────────────────────────────────────────────────
export const CAMERA_MOVEMENT_OPTIONS = [
  "static", "slow-push-in", "pull-back", "dolly-left", "dolly-right",
  "pan-left", "pan-right", "tilt-up", "tilt-down", "orbit-left", "orbit-right",
  "crane-up", "crane-down", "handheld-follow", "steadicam-follow", "whip-pan",
  "dolly-zoom", "arc-shot", "drone-rise", "drone-descend", "drone-fly-through",
  "360-rotation", "slow-motion", "time-lapse",
] as const;
export const CAMERA_MOVEMENT_LABELS: Record<string, string> = {
  "static": "Static / Locked Off", "slow-push-in": "Slow Push In",
  "pull-back": "Pull Back / Reveal", "dolly-left": "Dolly Left", "dolly-right": "Dolly Right",
  "pan-left": "Pan Left", "pan-right": "Pan Right", "tilt-up": "Tilt Up", "tilt-down": "Tilt Down",
  "orbit-left": "Orbit Left", "orbit-right": "Orbit Right", "crane-up": "Crane Up",
  "crane-down": "Crane Down", "handheld-follow": "Handheld Follow",
  "steadicam-follow": "Steadicam Follow", "whip-pan": "Whip Pan",
  "dolly-zoom": "Dolly Zoom / Vertigo", "arc-shot": "Arc Shot",
  "drone-rise": "Drone Rise", "drone-descend": "Drone Descend",
  "drone-fly-through": "Drone Fly-Through", "360-rotation": "360 Rotation",
  "slow-motion": "Slow Motion", "time-lapse": "Time-Lapse",
};

// ─── Lens / Focal Length ──────────────────────────────────────────────────────
export const LENS_OPTIONS = [
  "8mm-fisheye", "14mm-ultra-wide", "18mm-wide", "24mm-wide", "28mm", "35mm",
  "50mm-standard", "85mm-portrait", "100mm-macro", "135mm-telephoto",
  "200mm-telephoto", "300mm-telephoto",
  "anamorphic-35mm", "anamorphic-50mm", "anamorphic-85mm",
] as const;
export const LENS_LABELS: Record<string, string> = {
  "8mm-fisheye": "8mm Fisheye", "14mm-ultra-wide": "14mm Ultra-Wide",
  "18mm-wide": "18mm Wide", "24mm-wide": "24mm Wide", "28mm": "28mm", "35mm": "35mm",
  "50mm-standard": "50mm Standard", "85mm-portrait": "85mm Portrait",
  "100mm-macro": "100mm Macro", "135mm-telephoto": "135mm Telephoto",
  "200mm-telephoto": "200mm Telephoto", "300mm-telephoto": "300mm Long Telephoto",
  "anamorphic-35mm": "Anamorphic 35mm", "anamorphic-50mm": "Anamorphic 50mm",
  "anamorphic-85mm": "Anamorphic 85mm",
};

// ─── Depth of Field ───────────────────────────────────────────────────────────
export const DEPTH_OF_FIELD_OPTIONS = [
  "shallow-f1.2", "shallow-f1.8", "shallow-f2.8", "medium-f4", "medium-f5.6",
  "deep-f8", "deep-f11", "deep-f16", "tilt-shift",
] as const;
export const DEPTH_OF_FIELD_LABELS: Record<string, string> = {
  "shallow-f1.2": "Extremely Shallow (f/1.2) - Dreamy Bokeh",
  "shallow-f1.8": "Very Shallow (f/1.8) - Soft Background",
  "shallow-f2.8": "Shallow (f/2.8) - Portrait Bokeh",
  "medium-f4": "Medium (f/4) - Slight Separation",
  "medium-f5.6": "Medium (f/5.6) - Balanced",
  "deep-f8": "Deep (f/8) - Sharp Throughout",
  "deep-f11": "Very Deep (f/11) - Landscape",
  "deep-f16": "Maximum Depth (f/16) - Everything Sharp",
  "tilt-shift": "Tilt-Shift / Miniature Effect",
};

// ─── Color Grade ──────────────────────────────────────────────────────────────
export const COLOR_GRADE_OPTIONS = [
  "natural", "teal-orange", "cold-blue", "warm-amber", "desaturated-gritty",
  "high-contrast-bw", "sepia-vintage", "bleach-bypass", "cross-processed",
  "day-for-night", "neon-cyberpunk", "golden-warm", "horror-green", "noir-bw",
  "pastel-soft", "kodak-vision3", "fuji-velvia", "arri-alexa", "red-dragon",
] as const;
export const COLOR_GRADE_LABELS: Record<string, string> = {
  "natural": "Natural / Neutral", "teal-orange": "Teal & Orange (Hollywood Blockbuster)",
  "cold-blue": "Cold Blue / Nordic", "warm-amber": "Warm Amber / Golden",
  "desaturated-gritty": "Desaturated & Gritty", "high-contrast-bw": "High Contrast B&W",
  "sepia-vintage": "Sepia / Vintage", "bleach-bypass": "Bleach Bypass (Saving Private Ryan)",
  "cross-processed": "Cross-Processed", "day-for-night": "Day for Night",
  "neon-cyberpunk": "Neon / Cyberpunk", "golden-warm": "Golden Hour Warm",
  "horror-green": "Horror Green Tint", "noir-bw": "Film Noir B&W",
  "pastel-soft": "Pastel / Soft Romance", "kodak-vision3": "Kodak Vision3 Film Emulation",
  "fuji-velvia": "Fuji Velvia (Vivid)", "arri-alexa": "ARRI Alexa Log-C",
  "red-dragon": "RED Dragon / High Dynamic Range",
};

// ─── Season ───────────────────────────────────────────────────────────────────
export const SEASON_OPTIONS = [
  "spring", "summer", "autumn", "winter", "dry-season", "wet-season", "monsoon",
] as const;
export const SEASON_LABELS: Record<string, string> = {
  "spring": "Spring", "summer": "Summer", "autumn": "Autumn / Fall", "winter": "Winter",
  "dry-season": "Dry Season", "wet-season": "Wet Season", "monsoon": "Monsoon",
};

// ─── Scene Transitions ────────────────────────────────────────────────────────
export const TRANSITION_OPTIONS = [
  "cut", "smash-cut", "jump-cut", "dissolve", "cross-dissolve",
  "fade-to-black", "fade-from-black", "match-cut", "wipe", "iris",
  "whip-pan", "j-cut", "l-cut", "montage",
] as const;
export const TRANSITION_LABELS: Record<string, string> = {
  "cut": "Hard Cut", "smash-cut": "Smash Cut (Sudden / Jarring)", "jump-cut": "Jump Cut",
  "dissolve": "Dissolve", "cross-dissolve": "Cross-Dissolve",
  "fade-to-black": "Fade to Black", "fade-from-black": "Fade from Black",
  "match-cut": "Match Cut", "wipe": "Wipe", "iris": "Iris In / Out",
  "whip-pan": "Whip Pan Transition", "j-cut": "J-Cut (Audio Leads)",
  "l-cut": "L-Cut (Audio Trails)", "montage": "Montage Sequence",
};

// ─── Crowd Level ──────────────────────────────────────────────────────────────
export const CROWD_LEVEL_OPTIONS = [
  "empty", "isolated", "sparse", "moderate", "busy", "crowded", "packed", "riot",
] as const;
export const CROWD_LEVEL_LABELS: Record<string, string> = {
  "empty": "Empty / Deserted", "isolated": "Isolated (1-2 people)",
  "sparse": "Sparse (a few people)", "moderate": "Moderate (some activity)",
  "busy": "Busy", "crowded": "Crowded", "packed": "Packed / Jam-Packed",
  "riot": "Riot / Mass Crowd",
};

// ─── Visual Effects ───────────────────────────────────────────────────────────
export const VFX_OPTIONS = [
  "none", "lens-flare", "anamorphic-flare", "film-grain", "light-leak",
  "bokeh-circles", "rain-on-lens", "fog-haze", "dust-particles", "smoke",
  "fire", "explosion", "sparks", "water-splash", "snow-falling", "lightning",
  "neon-glow", "motion-blur", "chromatic-aberration", "vignette",
  "double-exposure", "glitch", "heat-distortion",
] as const;
export const VFX_LABELS: Record<string, string> = {
  "none": "None", "lens-flare": "Lens Flare", "anamorphic-flare": "Anamorphic Lens Flare",
  "film-grain": "Film Grain", "light-leak": "Light Leak", "bokeh-circles": "Bokeh Circles",
  "rain-on-lens": "Rain on Lens", "fog-haze": "Fog / Atmospheric Haze",
  "dust-particles": "Dust Particles", "smoke": "Smoke", "fire": "Fire / Flames",
  "explosion": "Explosion", "sparks": "Sparks / Embers", "water-splash": "Water Splash",
  "snow-falling": "Falling Snow", "lightning": "Lightning", "neon-glow": "Neon Glow",
  "motion-blur": "Motion Blur", "chromatic-aberration": "Chromatic Aberration",
  "vignette": "Vignette", "double-exposure": "Double Exposure",
  "glitch": "Digital Glitch", "heat-distortion": "Heat Distortion",
};

// ─── Mood Labels ──────────────────────────────────────────────────────────────
export const MOOD_LABELS: Record<string, string> = {
  "tense": "Tense / Suspenseful", "romantic": "Romantic / Intimate",
  "action": "Action / Adrenaline", "comedic": "Comedic / Playful",
  "dramatic": "Dramatic / Intense", "mysterious": "Mysterious / Enigmatic",
  "horror": "Horror / Terrifying", "inspirational": "Inspirational / Uplifting",
  "melancholic": "Melancholic / Sad", "epic": "Epic / Grand",
  "serene": "Serene / Peaceful", "ominous": "Ominous / Foreboding",
  "nostalgic": "Nostalgic / Wistful", "euphoric": "Euphoric / Joyful",
  "desperate": "Desperate / Frantic", "hopeful": "Hopeful / Optimistic",
  "grief": "Grief / Heartbreak", "rage": "Rage / Fury",
  "dread": "Dread / Creeping Fear", "wonder": "Wonder / Awe",
  "isolation": "Isolation / Loneliness", "triumphant": "Triumphant / Victorious",
  "bittersweet": "Bittersweet", "surreal": "Surreal / Dreamlike",
};

// ─── Extended Mood Options ────────────────────────────────────────────────────
// (extends existing MOOD_OPTIONS with additional moods)
export const MOOD_OPTIONS_EXTENDED = [
  ...["tense","romantic","action","comedic","dramatic","mysterious","horror",
  "inspirational","melancholic","epic"],
  "serene","ominous","nostalgic","euphoric","desperate","hopeful",
  "grief","rage","dread","wonder","isolation","triumphant","bittersweet","surreal",
] as const;

// ─── Extended Location Types (adds to existing LOCATION_TYPES) ────────────────
export const LOCATION_TYPES_EXTENDED = [
  // Original
  "City Street","Rooftop","Beach","Forest","Desert","Mountain",
  "Office","Restaurant","Bar/Club","Hospital","Courtroom","Prison",
  "Airport","Train Station","Highway","Warehouse","Alley","Park",
  "Underwater","Space","Castle","Church","School","Library",
  "Stadium","Harbor/Dock","Farm","Cave","Bridge","Subway",
  // New
  "Back Alley","Skyscraper Exterior","Penthouse","Subway / Metro",
  "Airport Terminal","Bus Station","Modern Apartment","Luxury Penthouse",
  "Suburban Home","Victorian House","Mansion Interior","Basement","Attic",
  "Bedroom","Kitchen","Living Room","Office Building","Corporate Boardroom",
  "Fine Dining","Bar / Club / Nightclub","Casino","Hotel Lobby","Hotel Room",
  "Shopping Mall","Supermarket","Pharmacy","Barbershop","Operating Theatre",
  "Prison Cell","Police Station","School / Classroom","University / Lecture Hall",
  "Museum","Church / Cathedral","Mosque","Temple","Factory Floor","Power Plant",
  "Shipping Dock","Construction Site","Underground Bunker","Server Room",
  "Laboratory","Beach / Coastline","Ocean / Open Sea","Forest / Woodland",
  "Dense Jungle","Desert / Sand Dunes","Mountain / Highland","Cliff Edge",
  "Waterfall","River / Lake","Swamp / Marsh","Snowy Tundra",
  "Volcanic Landscape","Cave / Cavern","Highway / Motorway","Tunnel",
  "Moving Train Interior","Airplane Interior","Yacht / Boat","Submarine",
  "Stadium / Arena","Harbor / Dock","Farm / Countryside","Ancient Ruins",
  "Castle / Fortress","Palace","Graveyard / Cemetery","Amusement Park",
  "Swimming Pool","Gym / Boxing Ring","Space Station","Spaceship Interior",
  "Alien Planet","Futuristic City","Underwater Base","Virtual Reality World",
] as const;

// ─── Extended Vehicle Types ───────────────────────────────────────────────────
export const VEHICLE_TYPES_EXTENDED = [
  "None","Sports Car","Supercar / Hypercar","Sedan","SUV","Pickup Truck",
  "Motorcycle","Helicopter","Private Jet","Yacht","Speedboat",
  "Limousine","Police Car","Ambulance","Fire Truck","Bus",
  "Bicycle","Horse","Tank","Spaceship","Classic Car","Van",
  "Armoured Vehicle","Submarine","Jet Ski","Snowmobile",
] as const;

// ─── Extended Genre Options ───────────────────────────────────────────────────
export const GENRE_OPTIONS_EXTENDED = [
  "Action","Comedy","Drama","Horror","Sci-Fi","Romance",
  "Thriller","Documentary","Animation","Fantasy","Mystery",
  "Western","Musical","War","Crime","Adventure",
  "Psychological","Supernatural","Period Drama","Noir","Heist","Spy / Espionage",
] as const;

// ─── Wardrobe Categories ──────────────────────────────────────────────────────
export const WARDROBE_CATEGORIES = [
  "signature", "formal", "casual", "action", "uniform", "period",
  "fantasy", "sportswear", "swimwear", "sleepwear", "custom",
] as const;
export const WARDROBE_CATEGORY_LABELS: Record<string, string> = {
  "signature": "Signature / Hero Outfit",
  "formal": "Formal / Black Tie",
  "casual": "Casual / Everyday",
  "action": "Action / Combat",
  "uniform": "Uniform / Professional",
  "period": "Period / Historical",
  "fantasy": "Fantasy / Sci-Fi",
  "sportswear": "Sportswear / Athletic",
  "swimwear": "Swimwear / Beach",
  "sleepwear": "Sleepwear / Intimate",
  "custom": "Custom / Other",
};

// ─── Wardrobe Item Type ───────────────────────────────────────────────────────
export type WardrobeItem = {
  id?: string;
  category: string;
  label: string;
  description: string;
  photoUrl?: string;
  photoUrls?: string[];
  notes?: string;
  season?: string;
  colorPalette?: string;
};

// ─── Extended Character Attributes ───────────────────────────────────────────
export type CharacterAttributesExtended = CharacterAttributes & {
  // Identity
  nationality?: string;
  countryOfOrigin?: string;
  cityOfOrigin?: string;
  dateOfBirth?: string;
  zodiacSign?: string;
  religion?: string;
  language?: string;
  accent?: string;
  // Personality
  personalityType?: string; // MBTI e.g. INTJ
  temperament?: string;
  coreTraits?: string[];
  fears?: string[];
  desires?: string[];
  flaws?: string[];
  strengths?: string[];
  // Backstory
  backstory?: string;
  occupation?: string;
  education?: string;
  socioeconomicStatus?: string;
  familyBackground?: string;
  traumaHistory?: string;
  motivation?: string;
  // Speech & Mannerisms
  speechPattern?: string;
  vocabulary?: string;
  catchphrase?: string;
  mannerisms?: string;
  // Physical Extended
  weight?: string;
  fitnessLevel?: string;
  posture?: string;
  gait?: string;
  // Environment Preferences
  preferredWeather?: string;
  preferredSeason?: string;
  preferredTimeOfDay?: string;
  preferredLocation?: string;
  // Relationships
  relationships?: Array<{
    characterId?: number;
    characterName: string;
    relationshipType: string;
    description?: string;
  }>;
  // Wardrobe
  wardrobe?: WardrobeItem[];
  // DNA / Consistency
  faceDnaPrompt?: string;
  bodyDnaPrompt?: string;
  consistencyNotes?: string;
};

export type SceneWardrobeOverride = {
  characterId: number;
  characterName: string;
  wardrobeCategory?: string;
  wardrobeDescription: string;
  wardrobePhotoUrl?: string;
  makeupNotes?: string;
  hairNotes?: string;
  accessories?: string;
};

// ─── Focal Length Options ────────────────────────────────────────────────────
export const FOCAL_LENGTH_OPTIONS = [
  "8mm (fisheye)",
  "14mm (ultra-wide)",
  "24mm (wide)",
  "35mm (standard-wide)",
  "50mm (standard)",
  "85mm (portrait)",
  "100mm (macro)",
  "135mm (telephoto)",
  "200mm (telephoto)",
  "400mm (super-telephoto)",
  "Anamorphic 35mm",
  "Anamorphic 50mm",
  "Anamorphic 85mm",
] as const;

// ─── Shot Type Options ───────────────────────────────────────────────────────
export const SHOT_TYPE_OPTIONS = [
  "Establishing shot",
  "Master shot",
  "Two-shot",
  "Reaction shot",
  "Insert shot",
  "Cutaway",
  "POV shot",
  "Over-the-shoulder",
  "Single",
  "Group shot",
  "Aerial / Drone",
  "Tracking shot",
  "Dolly shot",
  "Crane shot",
] as const;

// ─── Frame Rate Options ──────────────────────────────────────────────────────
export const FRAME_RATE_OPTIONS = [
  "24fps (cinematic)",
  "25fps (European cinema)",
  "30fps (TV standard)",
  "48fps (HFR)",
  "60fps (smooth action)",
  "120fps (slow motion)",
  "240fps (ultra slow motion)",
] as const;

// ─── Aspect Ratio Options ────────────────────────────────────────────────────
export const ASPECT_RATIO_OPTIONS = [
  "2.39:1 (Anamorphic / Scope)",
  "2.35:1 (Cinemascope)",
  "1.85:1 (Flat / Academy)",
  "1.78:1 (16:9 / HD)",
  "1.33:1 (4:3 / Classic)",
  "1.43:1 (IMAX)",
  "1:1 (Square)",
  "9:16 (Vertical / Mobile)",
] as const;

// ─── Color Temperature Options ───────────────────────────────────────────────
export const COLOR_TEMPERATURE_OPTIONS = [
  "2700K (warm candlelight)",
  "3200K (tungsten / warm indoor)",
  "4000K (neutral warm)",
  "5000K (daylight balanced)",
  "5600K (direct sunlight)",
  "6500K (overcast / cool daylight)",
  "7500K (cool blue sky)",
  "10000K (deep blue / twilight)",
] as const;

// ─── Color Palette Options ───────────────────────────────────────────────────
export const COLOR_PALETTE_OPTIONS = [
  "Monochromatic",
  "Complementary (warm + cool)",
  "Analogous warm (reds, oranges, yellows)",
  "Analogous cool (blues, greens, purples)",
  "Triadic",
  "Earthy / Muted naturals",
  "Neon / Vivid saturated",
  "Pastel / Soft muted",
  "Black, white & grey",
  "Gold & black",
  "Deep jewel tones",
  "Bleached / Washed out",
  "High contrast primary colors",
] as const;

// ─── Emotional Beat Options ──────────────────────────────────────────────────
export const EMOTIONAL_BEAT_OPTIONS = [
  "Rising tension",
  "Breaking point",
  "Revelation / Twist",
  "Reconciliation",
  "Betrayal",
  "Loss / Grief",
  "Joy / Triumph",
  "Fear / Dread",
  "Longing / Yearning",
  "Determination",
  "Despair",
  "Hope",
  "Rage",
  "Tenderness / Intimacy",
  "Shock / Disbelief",
  "Resignation",
  "Catharsis",
  "Comic relief",
  "Quiet contemplation",
  "Escalating danger",
] as const;

// ─── Music Mood Options ──────────────────────────────────────────────────────
export const MUSIC_MOOD_OPTIONS = [
  "Orchestral / Epic",
  "Tense / Suspenseful",
  "Romantic / Tender",
  "Action / Adrenaline",
  "Melancholic / Sad",
  "Mysterious / Eerie",
  "Triumphant / Heroic",
  "Dark / Ominous",
  "Playful / Light",
  "Dramatic / Intense",
  "Ambient / Atmospheric",
  "Jazz / Lounge",
  "Electronic / Futuristic",
  "Folk / Acoustic",
  "Hip-hop / Urban",
  "None / Silent",
] as const;

// ─── Music Tempo Options ─────────────────────────────────────────────────────
export const MUSIC_TEMPO_OPTIONS = [
  "Very slow (Largo)",
  "Slow (Adagio)",
  "Moderate (Andante)",
  "Medium (Moderato)",
  "Lively (Allegretto)",
  "Fast (Allegro)",
  "Very fast (Vivace)",
  "Building / Crescendo",
  "Fading / Decrescendo",
] as const;

// ─── Ambient Sound Options ───────────────────────────────────────────────────
export const AMBIENT_SOUND_OPTIONS = [
  "City traffic",
  "Crowd murmur",
  "Rain on windows",
  "Heavy rain / storm",
  "Thunder",
  "Ocean waves",
  "Forest / birds",
  "Wind",
  "Fire crackling",
  "Silence / dead quiet",
  "Industrial / machinery",
  "Office ambience",
  "Restaurant / cafe",
  "Bar / nightclub",
  "Church bells",
  "Train / subway",
  "Airport",
  "Hospital",
  "School hallway",
  "Night insects / crickets",
  "Underwater",
  "Space (silence)",
] as const;

// ─── Action Description Presets ──────────────────────────────────────────────
export const ACTION_PRESETS = [
  "Characters in conversation",
  "Physical confrontation / Fight",
  "Chase sequence",
  "Romantic moment",
  "Character walking / Moving",
  "Character alone / Introspective",
  "Group scene / Gathering",
  "Discovery / Revelation",
  "Escape sequence",
  "Surveillance / Observation",
  "Negotiation / Standoff",
  "Emotional breakdown",
  "Celebration",
  "Funeral / Mourning",
  "Training / Practice",
  "Heist / Infiltration",
  "Interrogation",
  "Seduction",
  "Argument / Confrontation",
  "Reunion",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// TOP-TIER PLATFORM UPGRADE — NEW TYPES (appended)
// ─────────────────────────────────────────────────────────────────────────────

// ─── Camera Body / Sensor (Tier 1 — Deterministic Camera Control) ─────────────
export const CAMERA_BODY_OPTIONS = [
  "arri-alexa-65", "arri-alexa-mini-lf", "arri-alexa-35",
  "red-v-raptor-xL", "red-komodo-6k", "red-monstro-8k",
  "sony-venice-2", "sony-fx9", "sony-fx3",
  "blackmagic-ursa-mini-pro-12k", "blackmagic-pocket-6k-pro",
  "canon-eos-r5c", "canon-c70", "nikon-z9",
  "panavision-millennium-dxl2",
  "film-35mm-kodak-vision3", "film-16mm-kodak-vision3", "film-imax-70mm",
] as const;
export const CAMERA_BODY_LABELS: Record<string, string> = {
  "arri-alexa-65": "ARRI ALEXA 65 (Large Format — Dune, Blade Runner 2049)",
  "arri-alexa-mini-lf": "ARRI ALEXA Mini LF (Large Format — Nomadland)",
  "arri-alexa-35": "ARRI ALEXA 35 (Latest ARRI — The Zone of Interest)",
  "red-v-raptor-xL": "RED V-RAPTOR XL 8K (High Resolution — Knives Out)",
  "red-komodo-6k": "RED KOMODO 6K (Compact Cinema — The Mandalorian)",
  "red-monstro-8k": "RED MONSTRO 8K (Ultra High Res — Gemini Man)",
  "sony-venice-2": "Sony VENICE 2 (8.6K Full Frame — Spider-Man: No Way Home)",
  "sony-fx9": "Sony FX9 (Full Frame — Documentary & Drama)",
  "sony-fx3": "Sony FX3 (Compact Full Frame — Indie Cinema)",
  "blackmagic-ursa-mini-pro-12k": "Blackmagic URSA Mini Pro 12K (Indie Blockbuster)",
  "blackmagic-pocket-6k-pro": "Blackmagic Pocket 6K Pro (Indie & Short Film)",
  "canon-eos-r5c": "Canon EOS R5 C (8K Cinema — Hybrid Production)",
  "canon-c70": "Canon EOS C70 (Compact Cinema — Run-and-Gun)",
  "nikon-z9": "Nikon Z9 (8K Hybrid — Commercial & Documentary)",
  "panavision-millennium-dxl2": "Panavision Millennium DXL2 (8K — Hollywood Prestige)",
  "film-35mm-kodak-vision3": "35mm Film — Kodak Vision3 500T (Analog Grain)",
  "film-16mm-kodak-vision3": "16mm Film — Kodak Vision3 (Indie Gritty Grain)",
  "film-imax-70mm": "IMAX 70mm Film (Oppenheimer, Interstellar)",
};

// ─── Lens Brand / Glass Character (Tier 1) ────────────────────────────────────
export const LENS_BRAND_OPTIONS = [
  "zeiss-supreme-prime", "zeiss-master-prime", "cooke-s8i", "cooke-s7i",
  "cooke-anamorphic-sf", "leica-summilux-c", "leica-thalia",
  "sigma-cine-ff-high-speed", "canon-cinema-prime",
  "panavision-primo-70", "panavision-anamorphic-e-series",
  "hawk-v-series-anamorphic", "lomo-square-front-anamorphic",
  "vintage-uncoated-super-baltar", "vintage-cooke-speed-panchro",
] as const;
export const LENS_BRAND_LABELS: Record<string, string> = {
  "zeiss-supreme-prime": "Zeiss Supreme Prime Radiance (Flare & Glow — Dune)",
  "zeiss-master-prime": "Zeiss Master Prime (Clinical Sharp — Fincher Films)",
  "cooke-s8i": "Cooke S8/i (Warm Organic Cooke Look)",
  "cooke-s7i": "Cooke S7/i (Classic Hollywood Warmth)",
  "cooke-anamorphic-sf": "Cooke Anamorphic/i SF (Oval Bokeh & Flare)",
  "leica-summilux-c": "Leica Summilux-C (Micro-contrast & Sharpness)",
  "leica-thalia": "Leica Thalia (Large Format — Soft & Organic)",
  "sigma-cine-ff-high-speed": "Sigma Cine FF High Speed (T1.5 — Low Light)",
  "canon-cinema-prime": "Canon Cinema Prime (Warm & Natural Skin Tones)",
  "panavision-primo-70": "Panavision Primo 70 (Large Format — Prestige)",
  "panavision-anamorphic-e-series": "Panavision Anamorphic E-Series (Classic Hollywood Scope)",
  "hawk-v-series-anamorphic": "Hawk V-Series Anamorphic (Vintage Scope Look)",
  "lomo-square-front-anamorphic": "LOMO Square Front Anamorphic (Soviet Flare)",
  "vintage-uncoated-super-baltar": "Vintage Uncoated Super Baltar (Dreamy Soft Glow)",
  "vintage-cooke-speed-panchro": "Vintage Cooke Speed Panchro (Classic 1930s Warmth)",
};

// ─── Aperture / T-Stop (Tier 1) ───────────────────────────────────────────────
export const APERTURE_OPTIONS = [
  "t1.0", "t1.3", "t1.5", "t1.8", "t2.0", "t2.8", "t4.0", "t5.6", "t8.0", "t11", "t16", "t22",
] as const;
export const APERTURE_LABELS: Record<string, string> = {
  "t1.0": "T1.0 — Wide Open (Maximum Bokeh, Dreamy)",
  "t1.3": "T1.3 — Extremely Wide (Very Shallow DOF)",
  "t1.5": "T1.5 — Very Wide (Shallow DOF, Low Light)",
  "t1.8": "T1.8 — Wide (Portrait Bokeh, Natural)",
  "t2.0": "T2.0 — Wide (Soft Background Separation)",
  "t2.8": "T2.8 — Standard Wide (Cinema Portrait)",
  "t4.0": "T4.0 — Medium (Slight Background Blur)",
  "t5.6": "T5.6 — Medium (Balanced, Two-Shot)",
  "t8.0": "T8.0 — Deep (Group Shots, Landscapes)",
  "t11": "T11 — Very Deep (Architectural, Wide Shots)",
  "t16": "T16 — Maximum Depth (Everything Sharp)",
  "t22": "T22 — Diffraction (Starburst on Lights)",
};

// ─── Genre-Based Motion Logic (Tier 2) ────────────────────────────────────────
export const GENRE_MOTION_OPTIONS = [
  "auto", "action-thriller", "horror-suspense", "romance-intimate",
  "comedy-light", "drama-contemplative", "sci-fi-spectacle",
  "western-epic", "documentary-observational", "musical-expressive",
] as const;
export const GENRE_MOTION_LABELS: Record<string, string> = {
  "auto": "Auto (AI Decides Based on Scene)",
  "action-thriller": "Action / Thriller (Fast Cuts, Dynamic Movement)",
  "horror-suspense": "Horror / Suspense (Slow Creep, Tension Builds)",
  "romance-intimate": "Romance / Intimate (Soft Push-Ins, Gentle Pacing)",
  "comedy-light": "Comedy / Light (Energetic, Reactive Cuts)",
  "drama-contemplative": "Drama / Contemplative (Long Takes, Slow Drift)",
  "sci-fi-spectacle": "Sci-Fi / Spectacle (Epic Reveals, Sweeping Moves)",
  "western-epic": "Western / Epic (Wide Establishing, Slow Zoom)",
  "documentary-observational": "Documentary / Observational (Handheld, Reactive)",
  "musical-expressive": "Musical / Expressive (Rhythmic Cuts, Dance-Synced)",
};

// ─── Visual Style Modes (Tier 2) ──────────────────────────────────────────────
export const VISUAL_STYLE_OPTIONS = [
  "photorealistic", "cinematic-film", "anime-2d", "cartoon-3d-pixar",
  "cartoon-2d-flat", "comic-book-ink", "oil-painting", "watercolor",
  "noir-graphic-novel", "claymation", "stop-motion", "rotoscope",
  "cyberpunk-neon", "painterly-impressionist",
] as const;
export const VISUAL_STYLE_LABELS: Record<string, string> = {
  "photorealistic": "Photorealistic (Indistinguishable from Real Film)",
  "cinematic-film": "Cinematic Film (Hollywood Production Quality)",
  "anime-2d": "Anime / 2D Animation (Studio Ghibli / Makoto Shinkai Style)",
  "cartoon-3d-pixar": "3D Animation (Pixar / DreamWorks Style)",
  "cartoon-2d-flat": "2D Cartoon (Flat Design / Adult Swim Style)",
  "comic-book-ink": "Comic Book / Ink (Marvel / DC Graphic Novel)",
  "oil-painting": "Oil Painting (Classical Renaissance Style)",
  "watercolor": "Watercolor (Soft Illustrative Style)",
  "noir-graphic-novel": "Noir Graphic Novel (Sin City / 300 Style)",
  "claymation": "Claymation (Wallace & Gromit Style)",
  "stop-motion": "Stop Motion (Wes Anderson / Laika Style)",
  "rotoscope": "Rotoscope (Waking Life Style)",
  "cyberpunk-neon": "Cyberpunk Neon (Blade Runner / Akira Style)",
  "painterly-impressionist": "Painterly Impressionist (Loving Vincent Style)",
};

// ─── Character Emotion States (Tier 1) ────────────────────────────────────────
export const CHARACTER_EMOTION_OPTIONS = [
  "neutral", "happy-joyful", "sad-grief", "angry-rage", "fearful-terrified",
  "surprised-shocked", "disgusted", "contemptuous", "confused-uncertain",
  "determined-resolute", "exhausted-defeated", "hopeful-optimistic",
  "suspicious-wary", "in-love-longing", "proud-triumphant", "guilty-ashamed",
  "nervous-anxious", "calm-serene", "menacing-threatening", "broken-devastated",
] as const;
export const CHARACTER_EMOTION_LABELS: Record<string, string> = {
  "neutral": "Neutral / Composed", "happy-joyful": "Happy / Joyful",
  "sad-grief": "Sad / Grief", "angry-rage": "Angry / Rage",
  "fearful-terrified": "Fearful / Terrified", "surprised-shocked": "Surprised / Shocked",
  "disgusted": "Disgusted", "contemptuous": "Contemptuous / Dismissive",
  "confused-uncertain": "Confused / Uncertain", "determined-resolute": "Determined / Resolute",
  "exhausted-defeated": "Exhausted / Defeated", "hopeful-optimistic": "Hopeful / Optimistic",
  "suspicious-wary": "Suspicious / Wary", "in-love-longing": "In Love / Longing",
  "proud-triumphant": "Proud / Triumphant", "guilty-ashamed": "Guilty / Ashamed",
  "nervous-anxious": "Nervous / Anxious", "calm-serene": "Calm / Serene",
  "menacing-threatening": "Menacing / Threatening", "broken-devastated": "Broken / Devastated",
};

// ─── Character Position in Frame (Tier 1) ─────────────────────────────────────
export const CHARACTER_POSITION_OPTIONS = [
  "center-frame", "left-third", "right-third", "foreground-left", "foreground-right",
  "background-center", "background-left", "background-right",
  "extreme-foreground", "extreme-background",
] as const;
export const CHARACTER_POSITION_LABELS: Record<string, string> = {
  "center-frame": "Center Frame", "left-third": "Left Third (Rule of Thirds)",
  "right-third": "Right Third (Rule of Thirds)", "foreground-left": "Foreground Left",
  "foreground-right": "Foreground Right", "background-center": "Background Center",
  "background-left": "Background Left", "background-right": "Background Right",
  "extreme-foreground": "Extreme Foreground (Close, Blurred)",
  "extreme-background": "Extreme Background (Distant)",
};

// ─── Speed Ramp / Timing Control (Tier 2) ─────────────────────────────────────
export const SPEED_RAMP_OPTIONS = [
  "normal", "slow-motion-50", "slow-motion-25", "slow-motion-10",
  "speed-ramp-in", "speed-ramp-out", "speed-ramp-in-out",
  "time-lapse-10x", "time-lapse-60x", "undercranked-silent-era",
] as const;
export const SPEED_RAMP_LABELS: Record<string, string> = {
  "normal": "Normal Speed (1x)", "slow-motion-50": "Slow Motion 50% (2x Slow)",
  "slow-motion-25": "Slow Motion 25% (4x Slow — Action Detail)",
  "slow-motion-10": "Slow Motion 10% (10x Slow — Ultra Slow)",
  "speed-ramp-in": "Speed Ramp In (Starts Slow, Ends Normal)",
  "speed-ramp-out": "Speed Ramp Out (Starts Normal, Ends Slow)",
  "speed-ramp-in-out": "Speed Ramp In & Out (Slow-Fast-Slow)",
  "time-lapse-10x": "Time-Lapse 10x (Clouds, Crowds)",
  "time-lapse-60x": "Time-Lapse 60x (Day to Night)",
  "undercranked-silent-era": "Undercranked (Silent Era / Comedic Effect)",
};

// ─── Lip-Sync Mode (Tier 2) ───────────────────────────────────────────────────
export const LIP_SYNC_OPTIONS = [
  "none", "auto-match-dialogue", "phoneme-precise", "subtle-mouth-movement",
] as const;
export const LIP_SYNC_LABELS: Record<string, string> = {
  "none": "No Lip Sync (Non-Dialogue Scene)",
  "auto-match-dialogue": "Auto Match Dialogue (AI Syncs to Voice Track)",
  "phoneme-precise": "Phoneme-Precise (Frame-Perfect Sync)",
  "subtle-mouth-movement": "Subtle Mouth Movement (Background Characters)",
};

// ─── Live Action Plate Mode (Tier 3) ──────────────────────────────────────────
export const LIVE_ACTION_COMPOSITE_OPTIONS = [
  "none", "background-replacement", "foreground-character-insert",
  "full-scene-composite", "vfx-element-overlay", "sky-replacement",
  "crowd-multiplication", "environment-extension",
] as const;
export const LIVE_ACTION_COMPOSITE_LABELS: Record<string, string> = {
  "none": "No Live Action Plate",
  "background-replacement": "Background Replacement (Green Screen / Keying)",
  "foreground-character-insert": "Insert AI Character into Live Footage",
  "full-scene-composite": "Full Scene Composite (AI + Live Action Blend)",
  "vfx-element-overlay": "VFX Element Overlay (Explosions, Weather, FX)",
  "sky-replacement": "Sky Replacement (AI Sky into Live Footage)",
  "crowd-multiplication": "Crowd Multiplication (Expand Background Crowd)",
  "environment-extension": "Environment Extension (Extend Set Boundaries)",
};

// ─── VFX Suite Operations (Tier 2) ────────────────────────────────────────────
export const VFX_SUITE_OPTIONS = [
  "none", "scene-extension-outpaint", "object-removal-inpaint",
  "style-transfer", "face-enhancement", "upscale-4k", "upscale-8k",
  "denoising-grain-removal", "stabilization", "color-match",
  "motion-blur-add", "lens-flare-add", "film-grain-add",
  "depth-of-field-post", "vignette-add",
] as const;
export const VFX_SUITE_LABELS: Record<string, string> = {
  "none": "No VFX Processing",
  "scene-extension-outpaint": "Scene Extension / Outpainting (Expand Frame)",
  "object-removal-inpaint": "Object Removal / Inpainting",
  "style-transfer": "Style Transfer (Apply Visual Style to Footage)",
  "face-enhancement": "Face Enhancement (Hyper-Realism Boost)",
  "upscale-4k": "Upscale to 4K (AI Super-Resolution)",
  "upscale-8k": "Upscale to 8K (AI Super-Resolution)",
  "denoising-grain-removal": "Denoising / Grain Removal",
  "stabilization": "Stabilization (Remove Camera Shake)",
  "color-match": "Color Match (Match to Reference Frame)",
  "motion-blur-add": "Add Cinematic Motion Blur",
  "lens-flare-add": "Add Anamorphic Lens Flare",
  "film-grain-add": "Add Film Grain (Analog Texture)",
  "depth-of-field-post": "Post-Process Depth of Field (Rack Focus)",
  "vignette-add": "Add Cinematic Vignette",
};

// ─── AI Performance Style (Tier 3) ────────────────────────────────────────────
export const AI_PERFORMANCE_STYLE_OPTIONS = [
  "method-naturalistic", "classical-theatrical", "minimalist-bresson",
  "expressionist-intense", "comedic-timing", "action-physical",
  "documentary-observational", "silent-film-physical",
] as const;
export const AI_PERFORMANCE_STYLE_LABELS: Record<string, string> = {
  "method-naturalistic": "Method / Naturalistic (Marlon Brando, Joaquin Phoenix)",
  "classical-theatrical": "Classical Theatrical (Laurence Olivier, Cate Blanchett)",
  "minimalist-bresson": "Minimalist / Bresson (Non-Professional, Raw)",
  "expressionist-intense": "Expressionist / Intense (Klaus Kinski, Daniel Day-Lewis)",
  "comedic-timing": "Comedic Timing (Perfect Reaction, Beat-Precise)",
  "action-physical": "Action / Physical (Tom Cruise, Jackie Chan Energy)",
  "documentary-observational": "Documentary / Observational (Unaware of Camera)",
  "silent-film-physical": "Silent Film / Physical (Chaplin, Keaton Expressiveness)",
};

// ─── NLE Export Format (Tier 1) ───────────────────────────────────────────────
export const NLE_EXPORT_OPTIONS = [
  "xml-premiere-pro", "xml-final-cut-pro-x", "edl-davinci-resolve",
  "aaf-avid-media-composer", "csv-shot-list", "pdf-production-report",
] as const;
export const NLE_EXPORT_LABELS: Record<string, string> = {
  "xml-premiere-pro": "Adobe Premiere Pro XML (.xml)",
  "xml-final-cut-pro-x": "Final Cut Pro X FCPXML (.fcpxml)",
  "edl-davinci-resolve": "DaVinci Resolve EDL (.edl)",
  "aaf-avid-media-composer": "Avid Media Composer AAF (.aaf)",
  "csv-shot-list": "Shot List CSV (.csv)",
  "pdf-production-report": "Full Production Report PDF (.pdf)",
};
