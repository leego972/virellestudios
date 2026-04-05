import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Search, Star, Download, ShoppingCart,
  Music, Palette, Users, MapPin, Shirt, Sparkles, Lock, CheckCircle2, Loader2,
  Camera, Film, Mic, Clapperboard, Layers, Zap, Crown,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type AssetCategory = "all" | "characters" | "locations" | "music" | "vfx-packs" | "wardrobes" | "color-grades" | "cinematography" | "prompt-packs" | "sfx" | "dialogue-packs";

const ASSETS = [
  // ── FREE ASSETS ──────────────────────────────────────────────────────────────
  {
    id: "a001", name: "Neo-Tokyo Street Market", category: "locations" as AssetCategory,
    price: 0, isPremium: false, rating: 4.9, downloads: 8420,
    tags: ["sci-fi", "night", "urban", "neon"], author: "Virelle Studios",
    description: "Crowded night market with neon signs, street food stalls, and rain-slicked pavement. Ideal for cyberpunk and sci-fi scenes.",
    applyHint: "Use as a location reference in your scene's Location field.",
  },
  {
    id: "a002", name: "Orchestral Drama Suite Vol. 1", category: "music" as AssetCategory,
    price: 0, isPremium: false, rating: 4.8, downloads: 12300,
    tags: ["drama", "emotional", "strings", "orchestral"], author: "Virelle Studios",
    description: "Full orchestral suite with 8 cues: tension build, emotional reveal, quiet grief, triumphant resolution, and more.",
    applyHint: "Added to your Sound Library. Apply it to any scene's background music.",
  },
  {
    id: "a004", name: "Victorian London Mansion", category: "locations" as AssetCategory,
    price: 0, isPremium: false, rating: 4.7, downloads: 5230,
    tags: ["period", "gothic", "interior", "drama"], author: "Virelle Studios",
    description: "Grand Victorian interior with dark wood panelling, candlelit chandeliers, and heavy drapes. Perfect for period drama and gothic horror.",
    applyHint: "Use as a location reference in your scene's Location field.",
  },
  {
    id: "a006", name: "Horror Atmosphere SFX Pack", category: "sfx" as AssetCategory,
    price: 0, isPremium: false, rating: 4.8, downloads: 9100,
    tags: ["horror", "suspense", "atmosphere", "sound"], author: "Virelle Studios",
    description: "20 atmospheric sound prompts: distant footsteps, creaking floorboards, low drones, sudden silence, and jump-scare stingers.",
    applyHint: "Added to your Sound Library. Apply to scenes in the Sound Effects tab.",
  },
  {
    id: "a007", name: "Deakins Desert Landscape", category: "locations" as AssetCategory,
    price: 0, isPremium: false, rating: 4.9, downloads: 7650,
    tags: ["western", "epic", "outdoor", "golden-hour"], author: "Virelle Studios",
    description: "Vast desert plateau at golden hour. Sparse scrub brush, red rock formations, and a horizon that stretches forever.",
    applyHint: "Use as a location reference in your scene's Location field.",
  },
  {
    id: "a008", name: "Noir Detective Wardrobe Pack", category: "wardrobes" as AssetCategory,
    price: 0, isPremium: false, rating: 4.7, downloads: 4320,
    tags: ["noir", "1940s", "detective", "period"], author: "Virelle Studios",
    description: "8 wardrobe descriptions for 1940s noir characters: trench coat detective, femme fatale, corrupt cop, and newspaper editor.",
    applyHint: "Apply wardrobe descriptions to your characters.",
  },
  {
    id: "a010", name: "Romance Drama Color Grades", category: "color-grades" as AssetCategory,
    price: 0, isPremium: false, rating: 4.6, downloads: 3210,
    tags: ["romance", "warm", "soft", "golden"], author: "Virelle Studios",
    description: "4 color grade presets for romantic drama: golden afternoon, soft morning, twilight warmth, and candlelit evening.",
    applyHint: "Apply in Color Grading Studio.",
  },
  {
    id: "a011", name: "Jazz Club Interior — 1950s", category: "locations" as AssetCategory,
    price: 0, isPremium: false, rating: 4.8, downloads: 6890,
    tags: ["jazz", "1950s", "interior", "night"], author: "Virelle Studios",
    description: "Intimate jazz club with low lighting, a small stage, smoke haze, and round tables with candles. Perfect for crime drama and period romance.",
    applyHint: "Use as a location reference in your scene's Location field.",
  },
  {
    id: "a020", name: "Handheld Cinematography Starter Pack", category: "cinematography" as AssetCategory,
    price: 0, isPremium: false, rating: 4.7, downloads: 5100,
    tags: ["handheld", "documentary", "indie", "camera"], author: "Virelle Studios",
    description: "15 handheld camera movement descriptions for indie and documentary-style scenes. Adds urgency, intimacy, and realism.",
    applyHint: "Apply camera movement descriptions in the Scene Editor's Camera field.",
  },
  {
    id: "a021", name: "Urban Ambience SFX Pack", category: "sfx" as AssetCategory,
    price: 0, isPremium: false, rating: 4.6, downloads: 4800,
    tags: ["urban", "city", "ambient", "modern"], author: "Virelle Studios",
    description: "18 urban ambient sound prompts: traffic hum, subway rumble, distant sirens, coffee shop chatter, rain on glass.",
    applyHint: "Added to your Sound Library.",
  },
  {
    id: "a022", name: "Villain Monologue Dialogue Pack", category: "dialogue-packs" as AssetCategory,
    price: 0, isPremium: false, rating: 4.8, downloads: 6200,
    tags: ["villain", "monologue", "drama", "thriller"], author: "Virelle Studios",
    description: "10 villain monologue templates across genres: cold corporate, theatrical megalomaniac, quiet menace, tragic antagonist.",
    applyHint: "Use as dialogue starting points in the Dialogue Editor.",
  },
  {
    id: "a029", name: "Indie Film Starter Prompt Pack", category: "prompt-packs" as AssetCategory,
    price: 0, isPremium: false, rating: 4.7, downloads: 7400,
    tags: ["indie", "drama", "prompts", "beginner"], author: "Virelle Studios",
    description: "30 beginner-friendly scene prompts for indie drama: kitchen arguments, late-night drives, rooftop conversations, and quiet morning routines.",
    applyHint: "Use prompts directly in Quick Generate or Scene Editor.",
  },
  {
    id: "a030", name: "Sci-Fi Ambient SFX Pack", category: "sfx" as AssetCategory,
    price: 0, isPremium: false, rating: 4.7, downloads: 5900,
    tags: ["sci-fi", "ambient", "space", "electronic"], author: "Virelle Studios",
    description: "22 sci-fi ambient sound prompts: ship engine hum, airlock pressure, holographic interface beeps, distant nebula winds, and cryosleep chambers.",
    applyHint: "Added to your Sound Library.",
  },
  {
    id: "a031", name: "Street Photography Color Grades", category: "color-grades" as AssetCategory,
    price: 0, isPremium: false, rating: 4.5, downloads: 3800,
    tags: ["street", "urban", "gritty", "documentary"], author: "Virelle Studios",
    description: "5 gritty urban color grade presets: faded film, high-contrast B&W, bleach bypass, cold steel, and warm sepia.",
    applyHint: "Apply in Color Grading Studio.",
  },
  {
    id: "a032", name: "Hero's Journey Character Pack", category: "characters" as AssetCategory,
    price: 0, isPremium: false, rating: 4.8, downloads: 8100,
    tags: ["hero", "adventure", "archetype", "drama"], author: "Virelle Studios",
    description: "5 classic hero archetype profiles: the reluctant hero, the chosen one, the anti-hero, the underdog, and the reformed villain. Includes backstory and personality notes.",
    applyHint: "Import directly into your project's Character Library.",
  },
  {
    id: "a033", name: "Nature & Wilderness SFX Pack", category: "sfx" as AssetCategory,
    price: 0, isPremium: false, rating: 4.6, downloads: 4200,
    tags: ["nature", "wilderness", "outdoor", "ambient"], author: "Virelle Studios",
    description: "20 nature sound prompts: dense forest at dawn, crashing ocean waves, thunderstorm approach, desert wind, and mountain stream.",
    applyHint: "Added to your Sound Library.",
  },
  {
    id: "a034", name: "Confrontation Dialogue Pack", category: "dialogue-packs" as AssetCategory,
    price: 0, isPremium: false, rating: 4.7, downloads: 5300,
    tags: ["confrontation", "drama", "tension", "dialogue"], author: "Virelle Studios",
    description: "15 confrontation scene dialogue templates: family argument, workplace power struggle, betrayal reveal, and courtroom cross-examination.",
    applyHint: "Use as dialogue starting points in the Dialogue Editor.",
  },

  // ── PREMIUM ASSETS ───────────────────────────────────────────────────────────
  {
    id: "a003", name: "Blade Runner Color Grade Pack", category: "color-grades" as AssetCategory,
    price: 4.99, isPremium: true, rating: 4.9, downloads: 6780,
    tags: ["sci-fi", "neon", "noir", "cyberpunk"], author: "CinematicLUTs",
    description: "6 LUT presets inspired by neo-noir cinematography. Deep teals, amber highlights, crushed blacks. Instantly transforms any scene into a cyberpunk masterpiece.",
    applyHint: "Apply in Color Grading Studio.",
  },
  {
    id: "a005", name: "Action Hero Wardrobe Pack", category: "wardrobes" as AssetCategory,
    price: 2.99, isPremium: true, rating: 4.6, downloads: 3890,
    tags: ["action", "tactical", "military", "modern"], author: "CostumePro",
    description: "12 wardrobe descriptions for action protagonists: tactical gear, undercover civilian, formal infiltration, and field medic variants.",
    applyHint: "Apply wardrobe descriptions to your characters.",
  },
  {
    id: "a009", name: "Sci-Fi VFX Particle Pack", category: "vfx-packs" as AssetCategory,
    price: 7.99, isPremium: true, rating: 4.9, downloads: 5670,
    tags: ["sci-fi", "particles", "energy", "hologram"], author: "VFXPro",
    description: "15 VFX prompt templates: holographic displays, energy shields, teleportation effects, laser fire, and plasma explosions.",
    applyHint: "Apply in VFX Suite.",
  },
  {
    id: "a012", name: "Epic Action Score Vol. 2", category: "music" as AssetCategory,
    price: 3.99, isPremium: true, rating: 4.9, downloads: 8900,
    tags: ["action", "epic", "percussion", "orchestral"], author: "FilmScore Pro",
    description: "10 action cues: chase sequence, final battle, hero theme, villain reveal, and victory fanfare. Full orchestral with heavy percussion.",
    applyHint: "Added to your Sound Library.",
  },
  {
    id: "a013", name: "Anamorphic Lens Cinematography Pack", category: "cinematography" as AssetCategory,
    price: 5.99, isPremium: true, rating: 4.9, downloads: 4200,
    tags: ["anamorphic", "cinematic", "lens-flare", "widescreen"], author: "CinematicLUTs",
    description: "20 anamorphic lens shot descriptions with horizontal lens flares, oval bokeh, and 2.39:1 widescreen compositions. The Hollywood blockbuster look.",
    applyHint: "Apply in Scene Editor under Camera & Optics.",
  },
  {
    id: "a014", name: "Psychological Thriller Prompt Pack", category: "prompt-packs" as AssetCategory,
    price: 6.99, isPremium: true, rating: 4.8, downloads: 3100,
    tags: ["thriller", "psychological", "suspense", "prompts"], author: "Virelle Studios",
    description: "50 scene generation prompts for psychological thrillers: unreliable narrators, paranoia sequences, gaslighting confrontations, and mind-bending reveals.",
    applyHint: "Use prompts directly in Quick Generate or Scene Editor.",
  },
  {
    id: "a015", name: "Hollywood Character Pack — 10 Archetypes", category: "characters" as AssetCategory,
    price: 9.99, isPremium: true, rating: 4.9, downloads: 7800,
    tags: ["characters", "archetypes", "hollywood", "drama"], author: "Virelle Studios",
    description: "10 fully developed character profiles: the reluctant hero, the femme fatale, the wise mentor, the corrupt authority figure, and 6 more. Each includes backstory, personality, wardrobe, and voice notes.",
    applyHint: "Import directly into your project's Character Library.",
  },
  {
    id: "a016", name: "War Film Location Pack", category: "locations" as AssetCategory,
    price: 4.99, isPremium: true, rating: 4.8, downloads: 3400,
    tags: ["war", "military", "battlefield", "historical"], author: "Virelle Studios",
    description: "12 war film locations: WWI trenches, WWII bombed city streets, jungle warfare, modern urban combat zones, field hospitals, and command bunkers.",
    applyHint: "Use as location references in your scene's Location field.",
  },
  {
    id: "a017", name: "Drone Cinematography Pack", category: "cinematography" as AssetCategory,
    price: 4.99, isPremium: true, rating: 4.7, downloads: 2900,
    tags: ["drone", "aerial", "establishing", "epic"], author: "CinematicLUTs",
    description: "18 drone shot descriptions: sweeping establishing reveals, low-altitude chase tracking, orbital character shots, and epic landscape reveals.",
    applyHint: "Apply in Scene Editor under Camera Movement.",
  },
  {
    id: "a018", name: "Horror & Suspense Score Pack", category: "music" as AssetCategory,
    price: 5.99, isPremium: true, rating: 4.9, downloads: 5100,
    tags: ["horror", "suspense", "score", "strings"], author: "FilmScore Pro",
    description: "12 horror and suspense cues: creeping dread, jump scare stinger, psychological unease, monster reveal, and final confrontation. Strings, brass, and dissonant piano.",
    applyHint: "Added to your Sound Library.",
  },
  {
    id: "a019", name: "Romantic Drama Dialogue Pack", category: "dialogue-packs" as AssetCategory,
    price: 3.99, isPremium: true, rating: 4.7, downloads: 4600,
    tags: ["romance", "drama", "dialogue", "emotional"], author: "Virelle Studios",
    description: "25 romantic dialogue templates: first meeting sparks, slow-burn tension, heartbreaking breakup, reunion after years apart, and love confession under pressure.",
    applyHint: "Use as dialogue starting points in the Dialogue Editor.",
  },
  {
    id: "a023", name: "Neon Noir Location Pack", category: "locations" as AssetCategory,
    price: 4.99, isPremium: true, rating: 4.8, downloads: 3700,
    tags: ["noir", "neon", "night", "urban"], author: "Virelle Studios",
    description: "10 neon noir locations: rain-soaked alleyways, rooftop bars, underground fight clubs, corrupt police precincts, and smoky detective offices.",
    applyHint: "Use as location references in your scene's Location field.",
  },
  {
    id: "a024", name: "Complete VFX Explosion Pack", category: "vfx-packs" as AssetCategory,
    price: 8.99, isPremium: true, rating: 4.9, downloads: 4300,
    tags: ["vfx", "explosion", "action", "practical"], author: "VFXPro",
    description: "22 explosion and destruction VFX prompt templates: car explosions, building collapses, shockwave blasts, fire propagation, and debris fields.",
    applyHint: "Apply in VFX Suite.",
  },
  {
    id: "a025", name: "Director's Master Prompt Library", category: "prompt-packs" as AssetCategory,
    price: 14.99, isPremium: true, rating: 5.0, downloads: 2100,
    tags: ["prompts", "master", "all-genre", "professional"], author: "Virelle Studios",
    description: "100 professional-grade scene generation prompts across 10 genres. Crafted by the Virelle team to get the best results from AI video generation. The ultimate prompt toolkit for serious filmmakers.",
    applyHint: "Use prompts in Quick Generate or Scene Editor for best AI results.",
  },
  {
    id: "a026", name: "Sci-Fi Character Pack — 8 Archetypes", category: "characters" as AssetCategory,
    price: 7.99, isPremium: true, rating: 4.8, downloads: 3200,
    tags: ["sci-fi", "characters", "space", "futuristic"], author: "Virelle Studios",
    description: "8 fully developed sci-fi character profiles: space captain, rogue AI, alien diplomat, cybernetic soldier, colony scientist, and more. Full backstory and wardrobe included.",
    applyHint: "Import directly into your project's Character Library.",
  },
  {
    id: "a027", name: "Steadicam & Dolly Shot Pack", category: "cinematography" as AssetCategory,
    price: 3.99, isPremium: true, rating: 4.7, downloads: 2600,
    tags: ["steadicam", "dolly", "smooth", "tracking"], author: "CinematicLUTs",
    description: "16 steadicam and dolly shot descriptions: long corridor reveals, character-following tracking shots, slow push-ins on emotional beats, and dramatic pull-backs.",
    applyHint: "Apply in Scene Editor under Camera Movement.",
  },
  {
    id: "a028", name: "Western Frontier Score Pack", category: "music" as AssetCategory,
    price: 4.99, isPremium: true, rating: 4.8, downloads: 3800,
    tags: ["western", "frontier", "score", "guitar"], author: "FilmScore Pro",
    description: "8 western score cues: lonesome frontier theme, standoff tension, saloon brawl, sunset ride, and final showdown. Acoustic guitar, harmonica, and sweeping strings.",
    applyHint: "Added to your Sound Library.",
  },

  // ── NEW PREMIUM ASSETS ───────────────────────────────────────────────────────
  {
    id: "a035", name: "Period Drama Wardrobe — Regency Era", category: "wardrobes" as AssetCategory,
    price: 3.99, isPremium: true, rating: 4.8, downloads: 2800,
    tags: ["regency", "period", "costume", "romance"], author: "CostumePro",
    description: "10 Regency-era wardrobe descriptions: aristocratic ball gowns, military dress uniforms, servant livery, and country gentleman attire. Perfect for Jane Austen-style productions.",
    applyHint: "Apply wardrobe descriptions to your characters.",
  },
  {
    id: "a036", name: "Tokyo Neon Rooftop Location Pack", category: "locations" as AssetCategory,
    price: 3.99, isPremium: true, rating: 4.9, downloads: 4100,
    tags: ["tokyo", "rooftop", "neon", "night"], author: "Virelle Studios",
    description: "8 Tokyo rooftop locations: rain-soaked helipad, neon-lit terrace bar, satellite dish forest, penthouse pool at midnight, and graffiti-covered water tower.",
    applyHint: "Use as location references in your scene's Location field.",
  },
  {
    id: "a037", name: "Electronic & Synthwave Score Pack", category: "music" as AssetCategory,
    price: 4.99, isPremium: true, rating: 4.8, downloads: 3600,
    tags: ["synthwave", "electronic", "retro", "80s"], author: "FilmScore Pro",
    description: "10 synthwave score cues: neon chase, slow-motion hero walk, digital heartbeat, retro-future montage, and final transmission. Perfect for 80s-inspired and cyberpunk films.",
    applyHint: "Added to your Sound Library.",
  },
  {
    id: "a038", name: "Crime Thriller Dialogue Pack", category: "dialogue-packs" as AssetCategory,
    price: 4.99, isPremium: true, rating: 4.8, downloads: 3900,
    tags: ["crime", "thriller", "interrogation", "dialogue"], author: "Virelle Studios",
    description: "20 crime thriller dialogue templates: police interrogation, criminal negotiation, witness intimidation, corrupt deal, and courtroom testimony under pressure.",
    applyHint: "Use as dialogue starting points in the Dialogue Editor.",
  },
  {
    id: "a039", name: "Water & Ocean VFX Pack", category: "vfx-packs" as AssetCategory,
    price: 6.99, isPremium: true, rating: 4.7, downloads: 2400,
    tags: ["water", "ocean", "storm", "vfx"], author: "VFXPro",
    description: "18 water and ocean VFX prompt templates: rogue waves, underwater pressure cracks, ship hull breach, tsunami wall, rain curtain, and flooded city streets.",
    applyHint: "Apply in VFX Suite.",
  },
  {
    id: "a040", name: "Tilt-Shift & Macro Cinematography Pack", category: "cinematography" as AssetCategory,
    price: 4.99, isPremium: true, rating: 4.7, downloads: 2100,
    tags: ["tilt-shift", "macro", "miniature", "artistic"], author: "CinematicLUTs",
    description: "14 tilt-shift and macro shot descriptions: miniaturised city overhead, extreme close-up emotional detail, shallow-depth-of-field isolation, and dreamlike focus pulls.",
    applyHint: "Apply in Scene Editor under Camera & Optics.",
  },
  {
    id: "a041", name: "Post-Apocalyptic Location Pack", category: "locations" as AssetCategory,
    price: 5.99, isPremium: true, rating: 4.9, downloads: 4700,
    tags: ["post-apocalyptic", "wasteland", "ruins", "survival"], author: "Virelle Studios",
    description: "12 post-apocalyptic locations: overgrown shopping mall, flooded subway tunnels, collapsed skyscraper camp, irradiated desert highway, and fortified survivor compound.",
    applyHint: "Use as location references in your scene's Location field.",
  },
  {
    id: "a042", name: "Fantasy Epic Score Pack", category: "music" as AssetCategory,
    price: 5.99, isPremium: true, rating: 4.9, downloads: 5500,
    tags: ["fantasy", "epic", "choir", "orchestral"], author: "FilmScore Pro",
    description: "12 fantasy epic cues: ancient prophecy theme, dragon flight, dark forest approach, throne room confrontation, and sacrifice finale. Full choir and orchestral.",
    applyHint: "Added to your Sound Library.",
  },
  {
    id: "a043", name: "Horror Character Pack — 6 Archetypes", category: "characters" as AssetCategory,
    price: 6.99, isPremium: true, rating: 4.8, downloads: 3300,
    tags: ["horror", "characters", "dark", "supernatural"], author: "Virelle Studios",
    description: "6 horror character profiles: the final girl, the skeptic, the occultist, the possessed innocent, the ancient evil, and the grieving parent. Full backstory and psychological notes.",
    applyHint: "Import directly into your project's Character Library.",
  },
  {
    id: "a044", name: "Cinéma Vérité Color Grade Pack", category: "color-grades" as AssetCategory,
    price: 3.99, isPremium: true, rating: 4.7, downloads: 2700,
    tags: ["documentary", "vérité", "naturalistic", "raw"], author: "CinematicLUTs",
    description: "6 naturalistic color grade presets: raw daylight, overcast grey, fluorescent interior, golden magic hour, and desaturated realism. For documentary and social realist films.",
    applyHint: "Apply in Color Grading Studio.",
  },
  {
    id: "a045", name: "Sci-Fi Prompt Pack Vol. 2 — Space Opera", category: "prompt-packs" as AssetCategory,
    price: 7.99, isPremium: true, rating: 4.9, downloads: 3800,
    tags: ["sci-fi", "space-opera", "prompts", "epic"], author: "Virelle Studios",
    description: "60 space opera scene prompts: first contact encounters, fleet battles, alien world landings, AI uprising sequences, and wormhole jumps. Built for Veo3 and Runway.",
    applyHint: "Use prompts in Quick Generate or Scene Editor.",
  },
  {
    id: "a046", name: "Futuristic Wardrobe Pack", category: "wardrobes" as AssetCategory,
    price: 3.99, isPremium: true, rating: 4.7, downloads: 2500,
    tags: ["futuristic", "sci-fi", "fashion", "costume"], author: "CostumePro",
    description: "12 futuristic wardrobe descriptions: biopunk body armour, corporate executive nanosuit, rebel faction gear, AI android uniform, and high-fashion zero-gravity couture.",
    applyHint: "Apply wardrobe descriptions to your characters.",
  },
  {
    id: "a047", name: "Battle & Combat SFX Pack", category: "sfx" as AssetCategory,
    price: 4.99, isPremium: true, rating: 4.9, downloads: 5800,
    tags: ["battle", "combat", "war", "action"], author: "FilmScore Pro",
    description: "25 battle and combat sound prompts: sword clashes, gunfire echoes, grenade concussions, tank rumble, helicopter blades, and distant artillery.",
    applyHint: "Added to your Sound Library.",
  },
  {
    id: "a048", name: "Emotional Monologue Dialogue Pack", category: "dialogue-packs" as AssetCategory,
    price: 3.99, isPremium: true, rating: 4.8, downloads: 4100,
    tags: ["monologue", "emotional", "drama", "character"], author: "Virelle Studios",
    description: "12 emotional monologue templates: grief after loss, redemption confession, farewell speech, survivor's testimony, and a parent's apology to their child.",
    applyHint: "Use as dialogue starting points in the Dialogue Editor.",
  },
  {
    id: "a049", name: "Macro Close-Up SFX Pack", category: "sfx" as AssetCategory,
    price: 2.99, isPremium: true, rating: 4.6, downloads: 2200,
    tags: ["foley", "close-up", "detail", "practical"], author: "Virelle Studios",
    description: "20 hyper-detailed Foley sound prompts: pen clicking, coffee pour, paper rustle, glass clink, keyboard typing, and heartbeat under stress.",
    applyHint: "Added to your Sound Library.",
  },
  {
    id: "a050", name: "Supernatural VFX Pack", category: "vfx-packs" as AssetCategory,
    price: 7.99, isPremium: true, rating: 4.9, downloads: 3900,
    tags: ["supernatural", "magic", "vfx", "horror"], author: "VFXPro",
    description: "20 supernatural VFX prompt templates: spectral apparitions, shadow tendrils, reality tears, levitation effects, blood-red sky, and demonic possession visual distortions.",
    applyHint: "Apply in VFX Suite.",
  },
  {
    id: "a051", name: "Spy Thriller Location Pack", category: "locations" as AssetCategory,
    price: 4.99, isPremium: true, rating: 4.8, downloads: 3500,
    tags: ["spy", "thriller", "international", "luxury"], author: "Virelle Studios",
    description: "10 spy thriller locations: Monaco casino floor, Berlin safe house, Moscow metro at night, Geneva private bank vault, Dubai rooftop helipad, and Istanbul grand bazaar.",
    applyHint: "Use as location references in your scene's Location field.",
  },
  {
    id: "a052", name: "Jazz & Soul Score Pack", category: "music" as AssetCategory,
    price: 3.99, isPremium: true, rating: 4.8, downloads: 3200,
    tags: ["jazz", "soul", "blues", "character"], author: "FilmScore Pro",
    description: "10 jazz and soul score cues: late-night piano bar, slow blues walk, upbeat bebop chase, soulful ballad, and melancholic trumpet solo.",
    applyHint: "Added to your Sound Library.",
  },
  {
    id: "a053", name: "Crime Drama Character Pack — 8 Profiles", category: "characters" as AssetCategory,
    price: 7.99, isPremium: true, rating: 4.8, downloads: 3600,
    tags: ["crime", "drama", "characters", "gritty"], author: "Virelle Studios",
    description: "8 crime drama character profiles: the burned detective, the ambitious DA, the mob enforcer, the informant, the corrupt politician, the reformed criminal, the journalist, and the crime boss.",
    applyHint: "Import directly into your project's Character Library.",
  },
  {
    id: "a054", name: "Wuxia & Martial Arts Wardrobe Pack", category: "wardrobes" as AssetCategory,
    price: 3.99, isPremium: true, rating: 4.7, downloads: 2300,
    tags: ["wuxia", "martial-arts", "chinese", "period"], author: "CostumePro",
    description: "10 wuxia wardrobe descriptions: silk fighting robes, imperial guard armour, wandering swordsman attire, court official robes, and assassin's black garb.",
    applyHint: "Apply wardrobe descriptions to your characters.",
  },
  {
    id: "a055", name: "Neon Cyberpunk Color Grade Pack", category: "color-grades" as AssetCategory,
    price: 4.99, isPremium: true, rating: 4.9, downloads: 4900,
    tags: ["cyberpunk", "neon", "teal-orange", "night"], author: "CinematicLUTs",
    description: "8 cyberpunk color grade presets: neon magenta crush, acid green shadows, orange-teal split, holographic blue, and rain-soaked amber. The definitive cyberpunk look.",
    applyHint: "Apply in Color Grading Studio.",
  },
  {
    id: "a056", name: "Horror Prompt Pack — Supernatural & Slasher", category: "prompt-packs" as AssetCategory,
    price: 6.99, isPremium: true, rating: 4.8, downloads: 3400,
    tags: ["horror", "supernatural", "slasher", "prompts"], author: "Virelle Studios",
    description: "55 horror scene prompts: haunted house reveals, slasher chase sequences, possession rituals, creature encounters, and psychological breakdown scenes.",
    applyHint: "Use prompts in Quick Generate or Scene Editor.",
  },
  {
    id: "a057", name: "Long Take & Oner Cinematography Pack", category: "cinematography" as AssetCategory,
    price: 5.99, isPremium: true, rating: 4.9, downloads: 2800,
    tags: ["long-take", "oner", "tracking", "cinematic"], author: "CinematicLUTs",
    description: "12 long-take and single-shot descriptions: Goodfellas-style restaurant walk, war trench oner, apartment building descent, and crowd-parting reveal. The most cinematic shots in film.",
    applyHint: "Apply in Scene Editor under Camera Movement.",
  },
  {
    id: "a058", name: "Ambient Electronic & Dark Ambient Score Pack", category: "music" as AssetCategory,
    price: 4.99, isPremium: true, rating: 4.7, downloads: 2900,
    tags: ["ambient", "dark", "electronic", "atmospheric"], author: "FilmScore Pro",
    description: "10 dark ambient and electronic score cues: industrial drone, glitching signal, void silence, corrupted memory, and slow system shutdown. For sci-fi, horror, and art house.",
    applyHint: "Added to your Sound Library.",
  },
  {
    id: "a059", name: "Comedy Dialogue Pack", category: "dialogue-packs" as AssetCategory,
    price: 2.99, isPremium: true, rating: 4.7, downloads: 3700,
    tags: ["comedy", "banter", "sitcom", "dialogue"], author: "Virelle Studios",
    description: "20 comedy dialogue templates: awkward first date, workplace misunderstanding, family dinner chaos, best friend banter, and mistaken identity confrontation.",
    applyHint: "Use as dialogue starting points in the Dialogue Editor.",
  },
  {
    id: "a060", name: "Natural Disaster VFX Pack", category: "vfx-packs" as AssetCategory,
    price: 9.99, isPremium: true, rating: 4.9, downloads: 4200,
    tags: ["disaster", "vfx", "earthquake", "tornado"], author: "VFXPro",
    description: "24 natural disaster VFX prompt templates: earthquake ground split, tornado funnel, volcanic eruption, flash flood surge, wildfire wall, and lightning storm strike.",
    applyHint: "Apply in VFX Suite.",
  },
  {
    id: "a061", name: "Abandoned Locations Pack", category: "locations" as AssetCategory,
    price: 3.99, isPremium: true, rating: 4.8, downloads: 3100,
    tags: ["abandoned", "decay", "atmospheric", "horror"], author: "Virelle Studios",
    description: "10 abandoned location descriptions: derelict hospital, overgrown theme park, flooded basement, crumbling church, rust-belt factory, and empty shopping mall at night.",
    applyHint: "Use as location references in your scene's Location field.",
  },
  {
    id: "a062", name: "Royalty & Court Wardrobe Pack", category: "wardrobes" as AssetCategory,
    price: 4.99, isPremium: true, rating: 4.8, downloads: 2600,
    tags: ["royalty", "medieval", "court", "fantasy"], author: "CostumePro",
    description: "12 royal and court wardrobe descriptions: king's battle armour, queen's ceremonial gown, court jester, royal assassin's cloak, and exiled prince's travel wear.",
    applyHint: "Apply wardrobe descriptions to your characters.",
  },
  {
    id: "a063", name: "Cinematic Dialogue Pack — Mentor & Student", category: "dialogue-packs" as AssetCategory,
    price: 3.99, isPremium: true, rating: 4.8, downloads: 3400,
    tags: ["mentor", "student", "wisdom", "drama"], author: "Virelle Studios",
    description: "15 mentor-student dialogue templates: first lesson, moment of doubt, tough love confrontation, passing the torch, and final goodbye. Timeless dramatic exchanges.",
    applyHint: "Use as dialogue starting points in the Dialogue Editor.",
  },
];

const CATEGORY_ICONS: Record<AssetCategory, React.ReactNode> = {
  "all": <Sparkles className="w-4 h-4" />,
  "characters": <Users className="w-4 h-4" />,
  "locations": <MapPin className="w-4 h-4" />,
  "music": <Music className="w-4 h-4" />,
  "vfx-packs": <Zap className="w-4 h-4" />,
  "wardrobes": <Shirt className="w-4 h-4" />,
  "color-grades": <Palette className="w-4 h-4" />,
  "cinematography": <Camera className="w-4 h-4" />,
  "prompt-packs": <Clapperboard className="w-4 h-4" />,
  "sfx": <Mic className="w-4 h-4" />,
  "dialogue-packs": <Layers className="w-4 h-4" />,
};

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  "all": "All Assets",
  "characters": "Characters",
  "locations": "Locations",
  "music": "Music & Score",
  "vfx-packs": "VFX Packs",
  "wardrobes": "Wardrobes",
  "color-grades": "Color Grades",
  "cinematography": "Cinematography",
  "prompt-packs": "Prompt Packs",
  "sfx": "Sound FX",
  "dialogue-packs": "Dialogue Packs",
};

export default function AssetMarketplace() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<AssetCategory>("all");
  const [sortBy, setSortBy] = useState("popular");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  // Saved free assets
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("virelle_marketplace_assets") || "[]");
      return saved.map((a: any) => a.id);
    } catch { return []; }
  });

  // Server-side owned assets (purchased or admin)
  const { data: ownedData, refetch: refetchOwned } = trpc.subscription.getOwnedAssets.useQuery(undefined, {
    retry: false,
  });
  const createAssetCheckout = trpc.subscription.createAssetCheckout.useMutation();
  const confirmPurchase = trpc.subscription.confirmAssetPurchase.useMutation();

  // Admin owns everything — ownedAssetIds === "all" means admin bypass
  const isAdmin = ownedData?.ownedAssetIds === "all";
  const ownedIds: string[] = isAdmin ? ASSETS.map(a => a.id) : (ownedData?.ownedAssetIds as string[] ?? []);

  // Handle ?asset_purchased= redirect from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const purchasedId = params.get("asset_purchased");
    const sessionId = params.get("session_id");
    if (purchasedId) {
      confirmPurchase.mutate({ assetId: purchasedId, sessionId: sessionId || undefined }, {
        onSuccess: (res) => {
          if (res.success) {
            toast.success("Purchase confirmed! Asset unlocked.");
            refetchOwned();
          }
        },
      });
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const filteredAssets = ASSETS.filter((asset) => {
    const matchesSearch =
      !searchQuery ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = category === "all" || asset.category === category;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === "popular") return b.downloads - a.downloads;
    if (sortBy === "rating") return b.rating - a.rating;
    if (sortBy === "free") return (a.price === 0 ? -1 : 1);
    if (sortBy === "price-asc") return a.price - b.price;
    return 0;
  });

  const handleSaveFree = async (asset: typeof ASSETS[0]) => {
    if (savedIds.includes(asset.id)) {
      toast.info(`"${asset.name}" is already in your asset library.`);
      return;
    }
    setDownloading(asset.id);
    try {
      const saved = JSON.parse(localStorage.getItem("virelle_marketplace_assets") || "[]");
      saved.push({
        id: asset.id, name: asset.name, category: asset.category,
        tags: asset.tags, description: asset.description, applyHint: asset.applyHint,
        savedAt: new Date().toISOString(),
      });
      localStorage.setItem("virelle_marketplace_assets", JSON.stringify(saved));
      setSavedIds((prev) => [...prev, asset.id]);
      toast.success(`"${asset.name}" saved to your library. ${asset.applyHint}`);
    } catch {
      toast.error("Failed to save asset. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  const handleBuyPremium = async (asset: typeof ASSETS[0]) => {
    setBuying(asset.id);
    try {
      const result = await createAssetCheckout.mutateAsync({
        assetId: asset.id,
        assetName: asset.name,
        priceAud: asset.price,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      });
      if (result.adminBypass || result.alreadyOwned) {
        toast.success(result.adminBypass ? `Admin access — "${asset.name}" unlocked.` : `You already own "${asset.name}".`);
        refetchOwned();
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to start checkout. Please try again.");
    } finally {
      setBuying(null);
    }
  };

  const handleUseOwned = (asset: typeof ASSETS[0]) => {
    const saved = JSON.parse(localStorage.getItem("virelle_marketplace_assets") || "[]");
    if (!saved.find((a: any) => a.id === asset.id)) {
      saved.push({ id: asset.id, name: asset.name, category: asset.category, tags: asset.tags, description: asset.description, applyHint: asset.applyHint, savedAt: new Date().toISOString() });
      localStorage.setItem("virelle_marketplace_assets", JSON.stringify(saved));
      setSavedIds(prev => [...prev, asset.id]);
    }
    toast.success(`"${asset.name}" added to your library. ${asset.applyHint}`);
  };

  const freeCount = ASSETS.filter(a => !a.isPremium).length;
  const premiumCount = ASSETS.filter(a => a.isPremium).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-black/20 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-400" />
                Asset Marketplace
                {isAdmin && (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-xs ml-1">
                    <Crown className="w-3 h-3 mr-1" /> Admin — All Unlocked
                  </Badge>
                )}
              </h1>
              <p className="text-xs text-muted-foreground">
                {ASSETS.length} assets · {freeCount} free · {premiumCount} premium · {savedIds.length} saved
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="free">Free First</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(Object.keys(CATEGORY_LABELS) as AssetCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                category === cat
                  ? "bg-amber-500 text-black font-medium"
                  : "border border-border/40 text-muted-foreground hover:border-amber-500/40 hover:text-amber-400"
              }`}
            >
              {CATEGORY_ICONS[cat]}
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Asset Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const isSavedFree = savedIds.includes(asset.id);
            const isOwned = ownedIds.includes(asset.id);
            const isDownloading = downloading === asset.id;
            const isBuying = buying === asset.id;

            return (
              <Card key={asset.id} className={`border-border/40 bg-black/20 hover:border-amber-500/40 transition-all ${isOwned && asset.isPremium ? "ring-1 ring-amber-500/30" : ""}`}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-tight">{asset.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{asset.author}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                      {asset.isPremium ? (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-xs">
                          A${asset.price}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-400 border-green-500/40 text-xs">
                          Free
                        </Badge>
                      )}
                      {isOwned && asset.isPremium && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/40 text-[10px]">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Owned
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">{asset.description}</p>

                  <div className="flex flex-wrap gap-1">
                    {asset.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs bg-muted/40 px-1.5 py-0.5 rounded text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs text-amber-400">{asset.rating}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {(asset.downloads / 1000).toFixed(1)}k
                      </span>
                    </div>

                    {!asset.isPremium ? (
                      // Free asset
                      <Button
                        size="sm"
                        className={`h-7 text-xs ${isSavedFree ? "bg-green-600 hover:bg-green-700 text-white" : "bg-amber-500 hover:bg-amber-600 text-black"}`}
                        onClick={() => handleSaveFree(asset)}
                        disabled={isDownloading || isSavedFree}
                      >
                        {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> :
                          isSavedFree ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Saved</> :
                          <><Download className="w-3 h-3 mr-1" /> Save</>}
                      </Button>
                    ) : isOwned ? (
                      // Premium — already owned (includes admin)
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleUseOwned(asset)}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Use Asset
                      </Button>
                    ) : (
                      // Premium — not yet purchased
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-black"
                        onClick={() => handleBuyPremium(asset)}
                        disabled={isBuying}
                      >
                        {isBuying ? <Loader2 className="w-3 h-3 animate-spin" /> :
                          <><ShoppingCart className="w-3 h-3 mr-1" /> Buy A${asset.price}</>}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredAssets.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Film className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No assets found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
