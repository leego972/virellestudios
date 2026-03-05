
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
