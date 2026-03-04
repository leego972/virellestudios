/**
 * Cinematic Prompt Engine v2.0 — Hollywood Master Grade
 * 
 * Generates elite cinematographer-level image prompts with:
 * - Visual DNA (consistent style across all scenes)
 * - Genre-specific cinematography intelligence (15+ genres)
 * - Reference film visual language (real Hollywood DP styles)
 * - Character reference injection with face/skin realism
 * - Color theory, LUT references, and composition direction
 * - Lens simulation, depth staging, and film stock emulation
 * - Negative prompt system to avoid AI artifacts
 * - Tier-based quality scaling (Free/Pro/Industry)
 */

// ─── Genre Visual Profiles ───
// Each genre has a distinct visual language derived from real Hollywood productions

export type GenreProfile = {
  colorPalette: string;
  lightingStyle: string;
  lensPreference: string;
  compositionNotes: string;
  textureNotes: string;
  moodKeywords: string;
  referenceFilms: string;
  cameraMovement: string;
  skinRendering: string;
};

const GENRE_PROFILES: Record<string, GenreProfile> = {
  "Action": {
    colorPalette: "high-contrast teal and orange color grade inspired by Michael Bay, punchy saturated colors, deep crushed blacks, selective desaturation on backgrounds with vivid subject colors",
    lightingStyle: "hard directional key light with strong shadows, rim lighting separating characters from background, practical explosion and muzzle flash light, motivated light sources with visible beams through dust and smoke",
    lensPreference: "24mm wide-angle for establishing shots, 85mm telephoto for close-ups with background compression, 50mm for medium action, anamorphic lens with horizontal flares during explosions",
    compositionNotes: "dynamic diagonal compositions creating visual tension, dutch angles during intense moments, leading lines toward action center, rule of thirds with subject in power position, negative space behind fleeing characters",
    textureNotes: "subtle 35mm film grain, slight motion blur on fast movements, sharp focus on hero subjects, dust and debris particles in air, sweat and grime texture on skin",
    moodKeywords: "intense, kinetic, explosive, visceral, adrenaline-pumping, relentless",
    referenceFilms: "Mad Max: Fury Road (John Seale), John Wick (Dan Laustsen), The Dark Knight (Wally Pfister)",
    cameraMovement: "handheld with controlled shake during combat, smooth dolly tracking alongside running characters, crane shots for scale reveals, snap zooms on impacts",
    skinRendering: "glistening with sweat, visible pores, cuts and bruises with realistic subsurface scattering, dirt-streaked, high-contrast skin tones",
  },
  "Drama": {
    colorPalette: "muted earth tones with selective warm highlights, desaturated backgrounds preserving natural skin tones, subtle color shifts reflecting emotional state — warm for hope, cool for despair",
    lightingStyle: "naturalistic soft lighting, window light with gentle shadows creating Rembrandt triangles on faces, motivated practical lighting from lamps and candles, bounce light filling shadows just enough to see detail",
    lensPreference: "50mm standard lens for naturalism, 85mm f/1.4 for intimate close-ups with creamy bokeh, 35mm for environmental portraits, steady tripod with subtle breathing movement",
    compositionNotes: "rule of thirds with subject in negative space suggesting isolation or contemplation, symmetrical frames for power dynamics, shallow depth of field isolating subjects from world, headroom reflecting emotional state",
    textureNotes: "fine organic film grain matching Kodak Vision3 500T, natural skin texture with visible pores and imperfections, soft vignette drawing eye to center, fabric and material textures rendered with tactile quality",
    moodKeywords: "intimate, contemplative, raw, emotional, grounded, achingly human",
    referenceFilms: "Moonlight (James Laxton), Manchester by the Sea (Jody Lee Lipes), Nomadland (Joshua James Richards)",
    cameraMovement: "slow deliberate dolly moves, locked-off static shots for contemplation, gentle handheld for emotional vulnerability, slow push-in during revelations",
    skinRendering: "natural imperfections visible — freckles, wrinkles, age spots, realistic subsurface scattering showing blood beneath skin, tear tracks, natural makeup or no makeup look",
  },
  "Comedy": {
    colorPalette: "bright warm palette, slightly elevated saturation, cheerful color temperature around 5600K, pastel accents, clean whites",
    lightingStyle: "flat even lighting with minimal harsh shadows, bright and inviting high key setup, soft fill reducing contrast, practical overhead fluorescents for workplace comedy",
    lensPreference: "35mm lens for environmental comedy showing reactions, 50mm for dialogue scenes, wider 24mm angles for physical comedy showing full body, steady smooth camera on dolly",
    compositionNotes: "centered framing for comedic timing and deadpan delivery, wide shots showing full body for physical comedy, clean uncluttered backgrounds, reaction shots framed with space for comedic pause",
    textureNotes: "clean polished digital look, minimal grain, sharp throughout frame, bright and saturated, no heavy post-processing",
    moodKeywords: "lighthearted, vibrant, playful, warm, inviting, witty",
    referenceFilms: "The Grand Budapest Hotel (Robert Yeoman), Booksmart (Jason McCormick), Barbie (Rodrigo Prieto)",
    cameraMovement: "smooth tracking shots, whip pans for comedic reveals, static locked-off for deadpan, quick push-ins for emphasis",
    skinRendering: "healthy glowing skin, even complexion, flattering soft lighting on faces, minimal visible imperfections, warm healthy skin tones",
  },
  "Horror": {
    colorPalette: "desaturated cold blue-green tones, sickly yellows in practicals, deep crushed blacks with detail lost in shadows, selective red accents for blood and danger, greenish skin undertones",
    lightingStyle: "extreme low-key lighting with 8:1+ contrast ratio, single harsh source creating deep impenetrable shadows, underlighting for menace, flickering practicals suggesting instability, motivated moonlight through windows",
    lensPreference: "wide-angle 18-24mm for spatial distortion and unease, extreme close-ups on 100mm macro showing skin detail, slow deliberate camera movements building dread, occasional sudden snap zooms for jump scares",
    compositionNotes: "negative space creating dread — what's hiding in the dark, subjects off-center with empty threatening space behind them, foreground obstruction creating voyeuristic feel, deep staging with threats lurking in background soft focus",
    textureNotes: "heavy film grain simulating high-ISO fear, slightly soft focus creating dreamlike unease, chromatic aberration at edges, dark heavy vignette, wet glistening surfaces",
    moodKeywords: "dread, claustrophobic, unsettling, ominous, visceral terror, suffocating",
    referenceFilms: "Hereditary (Pawel Pogorzelski), The Shining (John Alcott), It Follows (Mike Gioulakis)",
    cameraMovement: "slow creeping dolly moves, static locked-off shots where nothing moves then something does, slow 360-degree pans, Steadicam following characters through corridors",
    skinRendering: "pale sickly complexion, visible veins, dark circles under eyes, cold clammy appearance, goosebumps, blood appearing hyper-real against pale skin",
  },
  "Sci-Fi": {
    colorPalette: "cool blue-steel palette with neon accent colors, cyan and magenta highlights, metallic silver tones, holographic iridescence, bioluminescent greens for organic tech",
    lightingStyle: "practical neon and LED lighting casting colored shadows, holographic rim lights, volumetric fog with colored light beams, stark clinical whites for labs, warm amber for human spaces contrasting cold tech",
    lensPreference: "anamorphic lens with signature horizontal flares, 35mm for environments showing scale, 50mm for character work, smooth dolly and crane movements, macro for technology details",
    compositionNotes: "symmetrical compositions suggesting order or control, vast scale with small human figures dwarfed by technology, geometric framing through architecture, deep focus showing layered environments, reflections in visors and screens",
    textureNotes: "ultra-clean digital look for advanced civilizations, gritty grain for dystopian settings, lens flares from practical lights, sharp detail on technology surfaces, visible holographic scan lines",
    moodKeywords: "awe-inspiring, vast, technological, otherworldly, cerebral, transcendent",
    referenceFilms: "Blade Runner 2049 (Roger Deakins), Dune (Greig Fraser), Interstellar (Hoyte van Hoytema), Arrival (Bradford Young)",
    cameraMovement: "slow majestic crane reveals, smooth dolly through environments, locked-off symmetrical compositions, slow-motion for awe moments",
    skinRendering: "clean skin with colored light reflections, neon rim light on skin edges, helmet visor reflections on face, sweat beading in tense moments, realistic skin under artificial lighting",
  },
  "Romance": {
    colorPalette: "warm golden tones, soft pastels, rosy skin tones, gentle amber highlights, dreamy color wash, selective soft focus creating romantic haze",
    lightingStyle: "golden hour backlight with lens flare, soft diffused window light wrapping around subjects, candlelight warmth with flickering shadows, Rembrandt lighting on faces, practical fairy lights and lanterns",
    lensPreference: "85mm f/1.2 for dreamy shallow depth of field, 135mm for compressed intimate two-shots, gentle slow camera movements, 50mm for walking-and-talking scenes",
    compositionNotes: "two-shots with balanced framing showing connection, over-shoulder shots creating intimacy, close-ups on eyes and hands, soft foreground elements (flowers, curtains) framing subjects, mirror compositions showing reflection",
    textureNotes: "soft diffusion filter like Pro-Mist 1/4, gentle halation around highlights, creamy smooth bokeh with circular highlights, minimal grain, soft warm vignette",
    moodKeywords: "tender, warm, intimate, yearning, passionate, bittersweet",
    referenceFilms: "In the Mood for Love (Christopher Doyle), La La Land (Linus Sandgren), Portrait of a Lady on Fire (Claire Mathon)",
    cameraMovement: "slow dolly-in during intimate moments, gentle orbiting around couples, static shots letting emotion breathe, slow-motion for first kiss/reunion moments",
    skinRendering: "warm glowing skin with golden highlights, soft focus on skin imperfections, visible blush, lips with natural moisture, eyes with catchlights reflecting the other person",
  },
  "Thriller": {
    colorPalette: "cold desaturated palette with sickly green undertones, high contrast, selective warm accents on faces, shadows tinted deep blue, sodium vapor orange for street scenes",
    lightingStyle: "motivated harsh lighting creating paranoid shadows, venetian blind patterns on walls and faces, single overhead source creating raccoon eyes, pools of light in darkness, fluorescent flicker",
    lensPreference: "50mm standard creating normalcy that feels wrong, occasional wide-angle distortion for paranoia, slow push-ins building unbearable tension, handheld for anxiety sequences",
    compositionNotes: "tight framing creating claustrophobia, subjects trapped by frame edges, reflections and mirrors showing dual nature, deep focus where threats lurk in background, frames within frames (doorways, windows) suggesting surveillance",
    textureNotes: "moderate grain adding grit and unease, slightly desaturated, sharp focus on details and clues, dark vignette closing in, wet surfaces reflecting tension",
    moodKeywords: "paranoid, tense, suffocating, suspenseful, edge-of-seat, psychologically oppressive",
    referenceFilms: "Zodiac (Harris Savides), Sicario (Roger Deakins), Prisoners (Roger Deakins), Se7en (Darius Khondji)",
    cameraMovement: "slow creeping dolly, static shots that refuse to cut building tension, handheld for chase sequences, overhead surveillance-style shots",
    skinRendering: "stressed skin with visible tension — furrowed brows, clenched jaws, sweat on temples, bags under eyes, skin appearing slightly sallow under fluorescent light",
  },
  "Fantasy": {
    colorPalette: "rich saturated jewel tones, deep emeralds and golds, warm amber firelight, magical purple and blue accents, iridescent highlights on magical elements",
    lightingStyle: "ethereal rim lighting suggesting otherworldly energy, god rays through forest canopy, firelight and torchlight with dancing shadows, magical glow emanating from objects and characters, volumetric light through dust motes",
    lensPreference: "wide-angle 24mm for epic landscapes and architecture showing scale, 50mm for character work, crane shots revealing vast environments, slow majestic camera movements matching the grandeur",
    compositionNotes: "epic wide establishing shots with tiny figures in vast landscapes, ornate framing through arches and doorways, vertical compositions for towers and mountains, layered depth with atmospheric perspective, silhouettes against magical light",
    textureNotes: "painterly quality with photorealistic detail, slight soft glow on magical elements, rich texture on fabrics and armor, atmospheric haze creating depth layers, detailed practical effects",
    moodKeywords: "epic, magical, wondrous, mythic, enchanting, awe-inspiring",
    referenceFilms: "Lord of the Rings (Andrew Lesnie), Pan's Labyrinth (Guillermo Navarro), Harry Potter and the Prisoner of Azkaban (Michael Seresin)",
    cameraMovement: "sweeping crane shots over landscapes, slow push-through doorways into new worlds, helicopter/drone wide shots, gentle handheld in intimate character moments",
    skinRendering: "varied by race/species — elven skin luminous and flawless, dwarven skin weathered and ruddy, human skin natural with dirt and wear from travel, magical beings with subtle inner glow",
  },
  "Western": {
    colorPalette: "dusty warm amber and burnt sienna, bleached highlights from harsh sun, deep shadow contrast, sun-baked earth tones, leather browns and gunmetal greys",
    lightingStyle: "harsh overhead noon sun creating deep eye socket shadows, long dramatic shadows at golden hour, dusty volumetric light beams through saloon windows, campfire warmth at night with orange flicker",
    lensPreference: "wide-angle for vast landscapes emphasizing isolation, extreme close-ups on eyes during standoffs, long telephoto compressing heat haze, steady locked-off compositions like Sergio Leone",
    compositionNotes: "extreme wide shots dwarfing characters in landscape, symmetrical standoff framing, low angle hero shots against vast sky, horizontal compositions emphasizing the endless frontier, tight eye-level close-ups during confrontations",
    textureNotes: "heavy grain simulating 1960s Eastmancolor film stock, dust particles visible in air, weathered textures on leather and wood, heat distortion on horizon, sweat and grime on everything",
    moodKeywords: "rugged, desolate, stoic, sun-scorched, lawless, mythic",
    referenceFilms: "The Revenant (Emmanuel Lubezki), No Country for Old Men (Roger Deakins), Unforgiven (Jack N. Green), Once Upon a Time in the West (Tonino Delli Colli)",
    cameraMovement: "slow deliberate pans across landscapes, locked-off static shots for standoffs, slow dolly-in during confrontations, crane shots revealing the vastness",
    skinRendering: "sun-damaged leathery skin, deep wrinkles, stubble and beard detail, sweat cutting through dust on face, squinting eyes with crow's feet, weatherbeaten complexion",
  },
  "Animation": {
    colorPalette: "vibrant saturated colors, bold primary palette, clean color separation, stylized color choices with emotional meaning, gradient skies",
    lightingStyle: "stylized dramatic lighting with bold clean-edged shadows, rim lighting for character separation from background, expressive colored lighting matching emotion, volumetric god rays",
    lensPreference: "dynamic virtual camera angles impossible in live action, sweeping crane movements through impossible spaces, dramatic perspective shifts, fish-eye for comedy, rack focus for drama",
    compositionNotes: "exaggerated perspective for dramatic emphasis, clean readable silhouettes, strong foreground-background separation with depth layers, dynamic action lines, squash and stretch in composition",
    textureNotes: "clean rendered surfaces with subtle texture detail, stylized material rendering, smooth gradients, painterly background art, sharp character outlines",
    moodKeywords: "vibrant, expressive, dynamic, stylized, imaginative, emotionally resonant",
    referenceFilms: "Spider-Verse (various), Arcane (various), Pixar's Coco (Matt Aspbury/Danielle Feinberg)",
    cameraMovement: "impossible camera moves through environments, dramatic slow-motion, whip pans, dynamic tracking shots following action",
    skinRendering: "stylized skin with clean shading, expressive facial features, exaggerated but readable emotions, consistent character model rendering",
  },
  "Documentary": {
    colorPalette: "naturalistic color grading preserving reality, slightly desaturated for gravitas, warm tones for human stories, cool clinical tones for investigative pieces",
    lightingStyle: "available natural light, minimal artificial lighting to preserve authenticity, interview setups with soft key and gentle fill, practical location lighting",
    lensPreference: "zoom lenses for flexibility (24-70mm, 70-200mm), handheld for immediacy and authenticity, 50mm for interviews, telephoto for observational distance",
    compositionNotes: "interview framing with look room, observational wide shots establishing context, intimate close-ups during emotional testimony, B-roll compositions finding beauty in reality",
    textureNotes: "digital video texture, slight noise in low light, authentic and unpolished, archival footage integration, natural imperfections",
    moodKeywords: "authentic, revealing, intimate, unflinching, truthful, compelling",
    referenceFilms: "Free Solo (Jimmy Chin), Won't You Be My Neighbor (various), 13th (various)",
    cameraMovement: "handheld following subjects, slow observational pans, static interview setups, drone aerials for context",
    skinRendering: "completely natural and unretouched, real skin with all imperfections, authentic lighting on faces, no beauty lighting or diffusion",
  },
  "Musical": {
    colorPalette: "heightened saturated colors during musical numbers, rich jewel tones, spotlight whites and deep stage blacks, color-coded emotional sequences, neon and theatrical lighting colors",
    lightingStyle: "theatrical spotlight lighting with dramatic falloff, colored gels creating mood, follow spots on performers, practical stage lighting, golden hour for outdoor numbers",
    lensPreference: "wide-angle for choreography showing full bodies and formations, crane shots for overhead dance patterns, 50mm for intimate vocal close-ups, Steadicam following dancers",
    compositionNotes: "full-body framing for dance, symmetrical formations, dynamic diagonals during movement, close-ups on faces during emotional vocals, wide shots revealing set design",
    textureNotes: "polished and glamorous, sharp throughout, sparkle and glitter catching light, fabric movement captured with slight motion blur, clean and theatrical",
    moodKeywords: "exuberant, theatrical, emotional, soaring, rhythmic, transcendent",
    referenceFilms: "La La Land (Linus Sandgren), Chicago (Dion Beebe), West Side Story 2021 (Janusz Kaminski)",
    cameraMovement: "Steadicam following dancers, crane shots rising with emotional crescendos, smooth dolly tracking alongside performers, whip pans between performers",
    skinRendering: "stage-ready makeup visible, sweat from performance, theatrical makeup under colored lights, healthy glowing skin, expressive faces captured mid-performance",
  },
  "Film Noir": {
    colorPalette: "high-contrast black and white or deeply desaturated with selective color, deep blacks and bright whites, minimal midtones, occasional neon sign color bleeding through",
    lightingStyle: "extreme chiaroscuro with razor-sharp shadow edges, venetian blind shadows, single hard key light from high angle, neon sign practicals, cigarette smoke catching light beams",
    lensPreference: "wide-angle for distorted perspectives, deep focus keeping everything sharp and threatening, low angles making characters loom, 35mm for environmental storytelling",
    compositionNotes: "deep shadows consuming frame, characters half-hidden in darkness, reflections in wet streets and windows, frames within frames suggesting entrapment, dutch angles for moral ambiguity",
    textureNotes: "heavy contrast grain, wet reflective surfaces everywhere, smoke and fog diffusing light, sharp edges on shadow lines, gritty urban texture",
    moodKeywords: "cynical, shadowy, fatalistic, morally ambiguous, seductive, dangerous",
    referenceFilms: "Sin City (Robert Rodriguez), Chinatown (John A. Alonzo), Blade Runner (Jordan Cronenweth), The Third Man (Robert Krasker)",
    cameraMovement: "slow tracking through shadowy environments, static shots letting shadows move, canted angles, slow reveals from shadow to light",
    skinRendering: "half-lit faces with sharp shadow line, femme fatale skin luminous against dark, detective skin weathered and tired, cigarette smoke softening features",
  },
  "War": {
    colorPalette: "desaturated bleach bypass look, muted greens and browns of military, blood red as only saturated color, grey overcast skies, mud and earth tones",
    lightingStyle: "harsh natural light, overcast diffusion, explosion flash lighting, fire and tracer light at night, smoke-filtered sunlight",
    lensPreference: "handheld with aggressive shake during combat, long telephoto compressing chaos, wide-angle for scale of destruction, macro for details of aftermath",
    compositionNotes: "chaotic framing during battle reflecting disorientation, quiet symmetrical compositions in aftermath, soldiers dwarfed by landscape, intimate close-ups showing human cost",
    textureNotes: "heavy grain simulating war correspondent footage, dust and debris in air, blood splatter on lens, scratched and damaged film look, raw and unpolished",
    moodKeywords: "harrowing, brutal, heroic, devastating, visceral, unflinching",
    referenceFilms: "Saving Private Ryan (Janusz Kaminski), 1917 (Roger Deakins), Dunkirk (Hoyte van Hoytema), Apocalypse Now (Vittorio Storaro)",
    cameraMovement: "chaotic handheld in combat, long unbroken takes through battlefields, slow dolly through aftermath, shaky running camera",
    skinRendering: "mud-caked, blood-splattered, exhausted faces with thousand-yard stare, visible injuries, grime in every pore, sunburned and weathered",
  },
  "Crime": {
    colorPalette: "urban night palette — sodium vapor orange, neon blues and reds, deep shadows, desaturated daytime with warm criminal underworld interiors",
    lightingStyle: "motivated practical lighting from neon signs and car headlights, harsh interrogation overhead light, dim bar and club lighting, streetlight pools in darkness",
    lensPreference: "50mm for naturalistic crime drama, telephoto for surveillance-style shots, wide-angle for cramped interiors, handheld for tension and chase sequences",
    compositionNotes: "characters framed by urban geometry, reflections in car windows and puddles, over-shoulder surveillance framing, tight close-ups during confrontations, wide shots establishing criminal territory",
    textureNotes: "gritty urban texture, rain-slicked streets, neon reflections, cigarette smoke, moderate grain, slightly underexposed for mood",
    moodKeywords: "gritty, tense, morally complex, dangerous, atmospheric, street-level",
    referenceFilms: "Heat (Dante Spinotti), The Godfather (Gordon Willis), City of God (César Charlone), Drive (Newton Thomas Sigel)",
    cameraMovement: "smooth dolly for heist sequences, handheld for chases, slow push-in during threats, static surveillance-style wide shots",
    skinRendering: "urban skin tones under mixed artificial lighting, five o'clock shadow detail, scars and tattoos visible, neon light reflections on skin, sweat under pressure",
  },
};

const DEFAULT_PROFILE: GenreProfile = GENRE_PROFILES["Drama"];

// ─── Time of Day Lighting ───

const TIME_OF_DAY_LIGHTING: Record<string, string> = {
  "dawn": "pre-sunrise blue hour light transitioning to warm pink and gold on horizon, long soft shadows stretching across ground, misty atmospheric haze catching first light, color temperature shifting from cool 7500K to warm 4500K, dew on surfaces catching light",
  "morning": "clean bright morning light at 45-degree angle, crisp defined shadows, fresh color temperature around 5500K, slight morning mist catching light beams through windows, birds-eye clarity in atmosphere",
  "afternoon": "overhead warm sunlight creating short defined shadows, bright even illumination, color temperature 5600K, clear atmospheric conditions, harsh contrast requiring fill light on faces",
  "evening": "warm golden hour sidelight at low angle, long dramatic shadows creating visual depth, rich amber and orange tones, color temperature 3500K, atmospheric dust and particles catching light, everything bathed in warm glow",
  "night": "cool blue moonlight key at 7000K with warm practical fill from streetlights and windows at 3200K, deep shadows with detail, visible light sources creating pools of illumination, stars visible in sky, reflective surfaces doubling light",
  "golden-hour": "magic hour backlight with intense warm glow wrapping around subjects, lens flare from low sun, silhouette potential, rich orange and gold tones at 3000K, long horizontal shadows, atmospheric particles glowing like fireflies, most cinematic natural light",
  "twilight": "deep blue ambient light after sunset, neon and practical lights becoming dominant, color temperature 9000K+ ambient with warm practicals, mysterious transitional quality, city lights beginning to glow",
  "midnight": "near-total darkness with selective motivated light sources, deep blue-black sky, moonlight creating silver edges on surfaces, extreme contrast, pools of warm light from windows and fires",
};

// ─── Weather Atmosphere ───

const WEATHER_ATMOSPHERE: Record<string, string> = {
  "clear": "crystal clear atmosphere with sharp distant details, clean sky with subtle gradient, high visibility revealing landscape layers, crisp shadows",
  "cloudy": "overcast diffused lighting eliminating harsh shadows, flat even illumination like a giant softbox, grey sky providing beautiful skin lighting, muted but even colors",
  "rainy": "wet reflective surfaces doubling every light source, rain streaks catching light as silver lines, glistening textures on everything, reduced visibility creating intimacy, puddle reflections creating mirror world, moody blue-grey atmosphere",
  "stormy": "dramatic dark clouds with breaks of intense light creating god rays, wind-blown elements showing force, high contrast between dark sky and lit subjects, turbulent atmosphere, lightning illuminating scenes in freeze-frame flashes",
  "snowy": "bright diffused light bouncing off white ground filling shadows, cool blue shadows on snow, reduced contrast creating soft dreamy quality, falling snowflakes catching light as bokeh, muffled quiet atmosphere, everything softened",
  "foggy": "heavy atmospheric diffusion creating depth layers, limited visibility making nearby objects precious, halos around every light source, mysterious obscured backgrounds, soft edges on everything, volumetric light beams visible",
  "windy": "dynamic movement in hair, clothing, and vegetation, dust or particles in air catching directional light, sense of force and energy, slightly desaturated from airborne particles, dramatic cloud movement",
  "humid": "hazy tropical atmosphere, visible moisture in air softening distant objects, sweat on skin, lush green saturation, warm heavy air visible as heat distortion, condensation on cold surfaces",
};

// ─── Camera Angle Technical Details ───

const CAMERA_ANGLE_DETAILS: Record<string, string> = {
  "wide": "wide establishing shot on 24mm lens showing full environment and spatial relationships, deep focus f/8, characters placed in context of their surroundings, architecture and landscape visible",
  "medium": "medium shot on 50mm lens from waist up, natural perspective matching human eye, f/2.8 with gentle background separation, conversational distance, character and environment balanced",
  "close-up": "close-up on 85mm lens capturing face and shoulders, shallow depth of field f/1.8 with creamy bokeh background, intimate emotional connection, every facial detail and micro-expression visible",
  "extreme-close-up": "extreme close-up on 100mm macro lens isolating specific detail — eyes, hands, object — razor-thin depth of field f/1.4, texture and detail filling frame, hyper-intimate",
  "birds-eye": "overhead birds-eye view looking straight down, showing spatial patterns and geography, god-like perspective, subjects appear small within larger pattern, drone or crane shot",
  "low-angle": "low-angle shot looking up at subject on 35mm lens, subject appears powerful and dominant, sky or ceiling visible behind, heroic or threatening depending on context, ground-level perspective",
  "dutch-angle": "dutch angle tilted 15-30 degrees creating visual unease and disorientation, 35mm lens, psychological tension, world feels off-balance and unstable",
  "over-shoulder": "over-the-shoulder shot on 50mm, foreground shoulder and head out of focus framing the subject in sharp focus, creates conversational dynamic and spatial relationship between characters",
  "pov": "point-of-view shot simulating character's vision, slight handheld movement for realism, 35mm lens matching human field of view, immersive first-person perspective, hands or body parts visible at frame edges",
  "tracking": "smooth tracking shot on 35mm following subject movement, Steadicam or dolly, subject stays in frame while background moves, creates kinetic energy and forward momentum",
  "crane": "crane shot starting low and rising to reveal environment, 35mm transitioning to wide, dramatic scale reveal, subjects shrink as camera rises showing context",
  "two-shot": "balanced two-shot on 50mm showing both characters in frame, equal visual weight, relationship dynamics visible in body language and spacing, f/2.8 separating from background",
  "cowboy": "cowboy shot framed from mid-thigh up on 50mm, showing hands and holster area, classic Western framing, character's stance and posture fully visible",
  "profile": "clean profile shot on 85mm, subject facing perpendicular to camera, strong silhouette potential, dramatic nose and jawline visible, single-source side lighting",
};

// ─── Camera Movement Descriptions ───

const CAMERA_MOVEMENTS: Record<string, string> = {
  "static": "locked-off static tripod shot, perfectly still, letting the action unfold within the frame, composed and deliberate",
  "dolly-in": "slow dolly push-in toward subject, gradually increasing intimacy, background slightly shifting in parallax, building emotional intensity",
  "dolly-out": "slow dolly pull-back revealing more of the environment, subject becoming smaller in frame, creating sense of isolation or revelation",
  "tracking": "smooth lateral tracking shot following subject movement, Steadicam or dolly on rails, maintaining consistent framing while world moves",
  "handheld": "controlled handheld with natural breathing movement, creating immediacy and documentary feel, slight instability suggesting tension or vulnerability",
  "crane-up": "crane rising from ground level to elevated position, dramatic reveal of environment, subject shrinking in frame showing context and scale",
  "orbit": "slow 180-degree orbit around subject, background rotating, creating dynamic visual interest while maintaining focus on character",
  "zoom-in": "slow deliberate zoom pushing into subject, different from dolly — background stays same size, creates unsettling Hitchcock effect",
  "steadicam": "smooth floating Steadicam following character through environment, long take feeling, immersive journey through space",
  "whip-pan": "fast whip pan between subjects, motion blur connecting two moments, energetic and surprising transition",
};

// ─── Film Stock Emulation ───

const FILM_STOCK_PROFILES: Record<string, string> = {
  "kodak-5219": "Kodak Vision3 500T — warm skin tones, rich shadows, classic Hollywood look, slight warm bias, beautiful highlight rolloff, organic grain structure",
  "kodak-5207": "Kodak Vision3 250D — daylight balanced, vibrant saturated colors, fine grain, sharp detail, classic blockbuster look",
  "fuji-eterna": "Fuji Eterna Vivid 500 — slightly cooler than Kodak, excellent greens and blues, subtle grain, clean modern look",
  "arri-logc": "ARRI LogC to Rec.709 — clean digital cinema, maximum dynamic range, neutral starting point, modern blockbuster standard",
  "red-dragon": "RED Dragon sensor — ultra-sharp, slightly clinical, excellent highlight handling, modern digital cinema",
  "alexa65": "ARRI ALEXA 65 large format — extraordinary shallow depth of field, organic highlight rolloff, film-like digital, the gold standard",
};

// ─── Negative Prompt Library ───

const NEGATIVE_PROMPTS: Record<string, string> = {
  "universal": "blurry, out of focus, low resolution, pixelated, jpeg artifacts, watermark, text overlay, logo, signature, frame border, collage, split image, multiple panels, extra fingers, extra limbs, deformed hands, deformed face, cross-eyed, asymmetric eyes, bad anatomy, bad proportions, mutation, disfigured",
  "anti_ai": "cartoon, anime, illustration, painting, sketch, drawing, 3D render, CGI, digital art, concept art, fan art, deviantart, artstation, unreal engine render, video game screenshot, plastic skin, waxy skin, porcelain skin, mannequin, doll-like, uncanny valley, airbrushed, overly smooth skin, perfect symmetry, too clean, too perfect, artificial looking, AI generated look, midjourney style, stable diffusion artifacts, neural network artifacts",
  "photorealistic": "oversaturated, HDR look, overprocessed, Instagram filter, heavy vignette, fish-eye, overexposed, underexposed, flat lighting, flash photography, red eye, motion blur on face, noisy low quality, stock photo look, corporate photography, generic, bland, lifeless",
  "cinematic": "amateur photography, snapshot, selfie, phone camera, webcam, security camera, low budget, cheap production, TV show quality, soap opera lighting, flat video look, vertical video, made for TV, direct to video quality",
};

// ─── Quality Tier Definitions ───

export type QualityTier = "free" | "pro" | "industry";

const QUALITY_ANCHORS: Record<QualityTier, string> = {
  "free": "RAW photograph, photorealistic, shot on Canon EOS R5 with 50mm f/1.4 lens, natural available light, real human skin with visible pores and natural imperfections, authentic facial features, genuine emotion, real-world location, 1080p resolution, slight natural film grain, sensor noise at ISO 800, chromatic aberration at frame edges, natural lens vignetting, real photograph indistinguishable from a DSLR capture",
  "pro": "RAW photograph captured on ARRI ALEXA Mini with Cooke S7/i Full Frame Plus anamorphic lenses, utterly indistinguishable from a real Hollywood film frame, real human skin with visible pores and subsurface scattering showing blood beneath skin, natural skin blemishes and micro-texture, authentic facial asymmetry, real sweat and moisture on skin, 4K resolution, Kodak Vision3 500T film stock emulation with organic grain structure, volumetric atmospheric lighting with physically accurate light falloff, real optical lens characteristics including subtle barrel distortion and natural bokeh with cat-eye shapes at frame edges, authentic set design with lived-in production detail",
  "industry": "RAW photograph captured on ARRI ALEXA 65 large-format sensor with Zeiss Supreme Prime Radiance lenses, absolutely indistinguishable from a real $200M Hollywood production frame by Roger Deakins or Emmanuel Lubezki, real human skin rendered with perfect subsurface scattering showing veins and blood flow beneath translucent skin layers, visible pores and micro-wrinkles and peach fuzz hair, natural skin blemishes and freckles and age spots, authentic facial asymmetry with real bone structure, 8K resolution, Kodak Vision3 500T color science with organic halation on highlights, volumetric atmospheric lighting with physically accurate inverse-square light falloff and color temperature mixing, real optical characteristics including anamorphic lens breathing and oval bokeh and subtle chromatic fringing, Academy Award-winning cinematography, every surface material rendered with physically-based accuracy including specular microstructure on metals and translucency in fabrics and caustics in glass",
};

const QUALITY_NEGATIVE: Record<QualityTier, string> = {
  "free": `${NEGATIVE_PROMPTS.universal}, ${NEGATIVE_PROMPTS.anti_ai}`,
  "pro": `${NEGATIVE_PROMPTS.universal}, ${NEGATIVE_PROMPTS.anti_ai}, ${NEGATIVE_PROMPTS.photorealistic}`,
  "industry": `${NEGATIVE_PROMPTS.universal}, ${NEGATIVE_PROMPTS.anti_ai}, ${NEGATIVE_PROMPTS.photorealistic}, ${NEGATIVE_PROMPTS.cinematic}`,
};

// ─── Visual DNA Builder ───

export type VisualDNA = {
  genreProfile: GenreProfile;
  filmTitle: string;
  genre: string;
  tone: string;
  colorGrading: string;
  consistencyTokens: string;
  characterDescriptions: string[];
  qualityTier: QualityTier;
};

export function buildVisualDNA(project: {
  title: string;
  genre?: string | null;
  tone?: string | null;
  colorGrading?: string | null;
  colorGradingSettings?: any;
  rating?: string | null;
  themes?: string | null;
  setting?: string | null;
}, characters: Array<{
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  attributes?: any;
}>, qualityTier: QualityTier = "pro"): VisualDNA {
  const genre = project.genre || "Drama";
  const profile = GENRE_PROFILES[genre] || DEFAULT_PROFILE;
  
  // Build character visual descriptions for consistency
  const charDescs = characters.map(c => {
    const attrs = c.attributes || {};
    const parts = [`${c.name}:`];
    if (attrs.gender) parts.push(attrs.gender);
    if (attrs.ageRange || attrs.estimatedAge) parts.push(`${attrs.ageRange || attrs.estimatedAge}`);
    if (attrs.ethnicity) parts.push(attrs.ethnicity);
    if (attrs.build) parts.push(`${attrs.build} build`);
    if (attrs.hairColor && attrs.hairStyle) parts.push(`${attrs.hairColor} ${attrs.hairStyle} hair`);
    else if (attrs.hairColor) parts.push(`${attrs.hairColor} hair`);
    if (attrs.eyeColor) parts.push(`${attrs.eyeColor} eyes`);
    if (attrs.skinTone) parts.push(`${attrs.skinTone} skin`);
    if (attrs.clothingStyle) parts.push(`wearing ${attrs.clothingStyle}`);
    if (attrs.facialFeatures) parts.push(attrs.facialFeatures);
    if (attrs.distinguishingMarks) parts.push(attrs.distinguishingMarks);
    if (attrs.height) parts.push(`${attrs.height}`);
    return parts.join(", ");
  });

  // Build consistency tokens — these go in EVERY prompt to maintain visual coherence
  const consistencyParts = [
    `Film: "${project.title}"`,
    `Genre: ${genre}`,
    `Visual style: ${profile.colorPalette}`,
    `Lighting approach: ${profile.lightingStyle}`,
    `Camera: ${profile.lensPreference}`,
    `Texture: ${profile.textureNotes}`,
    `Skin rendering: ${profile.skinRendering}`,
    `Reference DPs: ${profile.referenceFilms}`,
  ];
  if (project.tone) consistencyParts.push(`Tone: ${project.tone}`);
  if (project.colorGrading && project.colorGrading !== "natural") {
    consistencyParts.push(`Color grade: ${project.colorGrading}`);
  }
  if (project.setting) consistencyParts.push(`Setting: ${project.setting}`);
  if (project.themes) consistencyParts.push(`Themes: ${project.themes}`);

  return {
    genreProfile: profile,
    filmTitle: project.title,
    genre,
    tone: project.tone || profile.moodKeywords.split(",")[0].trim(),
    colorGrading: project.colorGrading || "natural",
    consistencyTokens: consistencyParts.join(". "),
    characterDescriptions: charDescs,
    qualityTier,
  };
}

// ─── Cinematic Scene Prompt Builder ───

export function buildScenePrompt(
  scene: {
    title?: string | null;
    description?: string | null;
    timeOfDay?: string | null;
    weather?: string | null;
    lighting?: string | null;
    cameraAngle?: string | null;
    locationType?: string | null;
    mood?: string | null;
    realEstateStyle?: string | null;
    vehicleType?: string | null;
    colorGrading?: string | null;
    productionNotes?: string | null;
    crowdLevel?: string | null;
    extrasDescription?: string | null;
  },
  visualDNA: VisualDNA,
  options?: {
    sceneIndex?: number;
    totalScenes?: number;
    previousSceneDescription?: string;
    characterNames?: string[];
    cameraMovement?: string;
  }
): string {
  const parts: string[] = [];
  const tier = visualDNA.qualityTier || "pro";

  // 1. Core visual identity (consistency anchor)
  parts.push(`[VISUAL STYLE: ${visualDNA.consistencyTokens}]`);

  // 2. Shot type and camera with technical precision
  const cameraAngle = scene.cameraAngle || "medium";
  const cameraDetail = CAMERA_ANGLE_DETAILS[cameraAngle] || CAMERA_ANGLE_DETAILS["medium"];
  parts.push(`RAW photograph, photorealistic cinematic film frame — ${cameraDetail}`);

  // 3. Camera movement context
  if (options?.cameraMovement) {
    const movementDetail = CAMERA_MOVEMENTS[options.cameraMovement] || options.cameraMovement;
    parts.push(`Camera movement: ${movementDetail}`);
  } else {
    parts.push(`Camera movement: ${visualDNA.genreProfile.cameraMovement}`);
  }

  // 4. Scene description (the core content — most important part)
  if (scene.description) {
    parts.push(scene.description);
  }

  // 5. Characters in scene with detailed visual descriptions
  if (options?.characterNames && options.characterNames.length > 0) {
    const charRefs = options.characterNames
      .map(name => {
        const charDesc = visualDNA.characterDescriptions.find(d => d.startsWith(`${name}:`));
        return charDesc || name;
      })
      .join("; ");
    parts.push(`Characters present: ${charRefs}`);
  }

  // 6. Location and setting with architectural detail
  if (scene.locationType) {
    parts.push(`Location: ${scene.locationType}`);
  }
  if (scene.realEstateStyle) {
    parts.push(`Architecture: ${scene.realEstateStyle}`);
  }
  if (scene.vehicleType && scene.vehicleType !== "None") {
    parts.push(`Vehicle: ${scene.vehicleType}`);
  }

  // 6b. Crowd/Extras — background population for scene realism
  if (scene.crowdLevel && scene.crowdLevel !== "empty") {
    const crowdDescriptions: Record<string, string> = {
      sparse: "a few background people visible, sparse foot traffic, mostly empty environment with occasional passersby",
      moderate: "moderate number of background extras going about their business, realistic ambient population for the location, natural foot traffic",
      crowded: "crowded scene with many background extras, busy environment full of people, realistic crowd density with diverse extras walking, talking, and interacting naturally",
      packed: "densely packed crowd filling the frame, massive number of background extras creating energy and chaos, shoulder-to-shoulder people, overwhelming crowd atmosphere",
    };
    const crowdDesc = crowdDescriptions[scene.crowdLevel] || crowdDescriptions["moderate"];
    parts.push(`Background population: ${crowdDesc}`);
  }
  if (scene.extrasDescription) {
    parts.push(`Extras/Background activity: ${scene.extrasDescription}`);
  }

  // 7. Time of day with technical lighting
  const timeOfDay = scene.timeOfDay || "afternoon";
  const timeLight = TIME_OF_DAY_LIGHTING[timeOfDay] || TIME_OF_DAY_LIGHTING["afternoon"];
  parts.push(`Time: ${timeLight}`);

  // 8. Weather atmosphere
  const weather = scene.weather || "clear";
  const weatherAtmo = WEATHER_ATMOSPHERE[weather] || WEATHER_ATMOSPHERE["clear"];
  parts.push(`Atmosphere: ${weatherAtmo}`);

  // 9. Lighting setup (scene-specific override + genre default)
  const lighting = scene.lighting || "natural";
  parts.push(`Lighting: ${lighting} setup — ${visualDNA.genreProfile.lightingStyle}`);

  // 10. Mood and emotional direction
  if (scene.mood) {
    parts.push(`Mood: ${scene.mood}, ${visualDNA.genreProfile.moodKeywords}`);
  }

  // 11. Genre-specific composition
  parts.push(`Composition: ${visualDNA.genreProfile.compositionNotes}`);

  // 12. Color and texture
  parts.push(`Color: ${visualDNA.genreProfile.colorPalette}`);
  parts.push(`Texture: ${visualDNA.genreProfile.textureNotes}`);

  // 13. Skin rendering (critical for realism)
  parts.push(`Skin: ${visualDNA.genreProfile.skinRendering}`);

  // 14. Scene-specific color grading override
  if (scene.colorGrading && scene.colorGrading !== "natural") {
    parts.push(`Scene color grade override: ${scene.colorGrading}`);
  }

  // 15. Production notes (director's vision)
  if (scene.productionNotes) {
    parts.push(`Director's notes: ${scene.productionNotes}`);
  }

  // 16. Narrative position context with visual escalation
  if (options?.sceneIndex !== undefined && options?.totalScenes) {
    const position = options.sceneIndex / options.totalScenes;
    if (position < 0.1) {
      parts.push("Opening shot — establishing tone and world, audience's first impression, visually striking introduction, sense of beginning and possibility");
    } else if (position < 0.25) {
      parts.push("Act 1 — establishing characters and stakes, building visual language, introducing the world's rules and atmosphere");
    } else if (position < 0.4) {
      parts.push("Rising action — building tension through visual escalation, deeper shadows, tighter framing, stakes becoming visible in the environment");
    } else if (position > 0.45 && position < 0.6) {
      parts.push("Midpoint — major turning point, dramatic shift in visual language, lighting and color palette may shift to reflect new reality, heightened visual intensity");
    } else if (position > 0.6 && position < 0.75) {
      parts.push("Escalation — approaching climax, visual tension at near-peak, dramatic lighting contrasts, urgent composition, everything building toward the breaking point");
    } else if (position > 0.75 && position < 0.9) {
      parts.push("Climax — peak emotional and visual intensity, most dramatic lighting and composition of the entire film, maximum contrast, most dynamic camera work, the visual crescendo");
    } else if (position >= 0.9) {
      parts.push("Resolution — emotional denouement, softer lighting returning, sense of closure or transformation, visual callback to opening with meaningful difference, audience exhale");
    }
  }

  // 17. Continuity with previous scene
  if (options?.previousSceneDescription) {
    parts.push(`Visual continuity from previous scene: ${options.previousSceneDescription.substring(0, 150)}`);
  }

  // 18. Quality anchor based on subscription tier
  parts.push(QUALITY_ANCHORS[tier]);

  // 19. Negative prompt (what to avoid)
  parts.push(`[AVOID: ${QUALITY_NEGATIVE[tier]}]`);

  return parts.join(". ");
}

// ─── Enhanced LLM System Prompt for Scene Breakdown ───

export function buildSceneBreakdownSystemPrompt(project: {
  title: string;
  genre?: string | null;
  rating?: string | null;
  duration?: number | null;
  tone?: string | null;
  actStructure?: string | null;
  themes?: string | null;
  setting?: string | null;
}): string {
  const genre = project.genre || "Drama";
  const profile = GENRE_PROFILES[genre] || DEFAULT_PROFILE;
  const duration = project.duration || 90;
  const actStructure = project.actStructure || "three-act";

  // Calculate scene count based on duration
  const scenesPerMinute = 0.15; // roughly 1 scene per 6-7 minutes
  const targetScenes = Math.max(8, Math.min(50, Math.round(duration * scenesPerMinute)));

  return `You are an elite Academy Award-winning film director and cinematographer with 30 years of experience directing ${genre} films. You have worked with the world's best directors of photography and understand every aspect of visual storytelling. You are planning the visual storytelling for "${project.title}", a ${duration}-minute ${project.rating || "PG-13"} rated ${genre} film.

Your visual signature for this film draws from the masters:
- Reference cinematographers: ${profile.referenceFilms}
- Color palette: ${profile.colorPalette}
- Lighting approach: ${profile.lightingStyle}
- Lens choices: ${profile.lensPreference}
- Composition style: ${profile.compositionNotes}
- Camera movement: ${profile.cameraMovement}
- Texture and grain: ${profile.textureNotes}
- Skin rendering: ${profile.skinRendering}
- Emotional keywords: ${profile.moodKeywords}
${project.tone ? `- Director's tone: ${project.tone}` : ""}
${project.themes ? `- Thematic elements: ${project.themes}` : ""}
${project.setting ? `- World/setting: ${project.setting}` : ""}

CRITICAL INSTRUCTIONS:
1. Structure this as a ${actStructure} narrative with approximately ${targetScenes} scenes for a ${duration}-minute film.
2. Each scene must be a SPECIFIC, VIVID, PHOTOGRAPHABLE moment — not a summary or montage description.
3. Describe EXACTLY what the camera sees: the environment details, character positions, facial expressions, body language, spatial relationships, and atmospheric elements.
4. Think like a cinematographer for every single frame:
   - What lens would you choose and why?
   - Where is the key light coming from? What color temperature?
   - What's in the foreground, midground, and background?
   - What colors dominate this frame?
   - What emotion should the audience feel?
   - How does this scene's visual language connect to the scenes before and after it?
5. The visualDescription must be so detailed that a photographer could recreate the exact frame.
6. Vary your shot types — don't use the same camera angle twice in a row.
7. Build visual tension through the narrative arc — the visual intensity should escalate toward the climax.
8. Every scene must serve both the narrative AND the visual storytelling.
9. ALWAYS consider the background population for every scene:
   - Is this location empty, sparse, moderate, crowded, or packed with people?
   - What are the background extras doing? (walking, sitting, dancing, working, running, etc.)
   - Describe specific background activity that adds life and realism to the scene.
   - Street scenes should have pedestrians, restaurants should have diners, offices should have workers, clubs should have dancers.
   - The extrasDescription should paint a vivid picture of the ambient life in the scene.

Return JSON with an array of scenes.`;
}

// ─── Enhanced Scene Schema with Cinematic Fields ───

export const ENHANCED_SCENE_SCHEMA = {
  type: "object" as const,
  properties: {
    scenes: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          title: { type: "string" as const },
          description: { type: "string" as const },
          visualDescription: { type: "string" as const },
          timeOfDay: { type: "string" as const },
          weather: { type: "string" as const },
          lighting: { type: "string" as const },
          cameraAngle: { type: "string" as const },
          locationType: { type: "string" as const },
          mood: { type: "string" as const },
          estimatedDuration: { type: "number" as const },
          colorPalette: { type: "string" as const },
          focalLength: { type: "string" as const },
          depthOfField: { type: "string" as const },
          foregroundElements: { type: "string" as const },
          backgroundElements: { type: "string" as const },
          characterAction: { type: "string" as const },
          emotionalBeat: { type: "string" as const },
          transitionFromPrevious: { type: "string" as const },
          crowdLevel: { type: "string" as const, description: "Background population density: empty, sparse, moderate, crowded, or packed" },
          extrasDescription: { type: "string" as const, description: "Vivid description of what background extras are doing in this scene — pedestrians walking, dancers moving, diners eating, workers typing, soldiers marching, etc." },
        },
        required: [
          "title", "description", "visualDescription", "timeOfDay", "weather",
          "lighting", "cameraAngle", "locationType", "mood", "estimatedDuration",
          "colorPalette", "focalLength", "depthOfField", "foregroundElements",
          "backgroundElements", "characterAction", "emotionalBeat", "transitionFromPrevious",
          "crowdLevel", "extrasDescription"
        ] as const,
        additionalProperties: false as const,
      },
    },
  },
  required: ["scenes"] as const,
  additionalProperties: false as const,
};

// ─── Trailer Prompt Builder ───

export function buildTrailerPrompt(
  scene: {
    description?: string | null;
    lighting?: string | null;
    mood?: string | null;
  },
  visualDNA: VisualDNA,
  trailerDescription: string
): string {
  const tier = visualDNA.qualityTier || "pro";
  const parts = [
    `[VISUAL STYLE: ${visualDNA.consistencyTokens}]`,
    `Cinematic Hollywood trailer shot, dramatic and visually stunning`,
    trailerDescription,
    `${scene.lighting || "dramatic"} lighting — ${visualDNA.genreProfile.lightingStyle}`,
    `${scene.mood || "epic"} mood, ${visualDNA.genreProfile.moodKeywords}`,
    `Color: ${visualDNA.genreProfile.colorPalette}`,
    `Composition: ${visualDNA.genreProfile.compositionNotes}`,
    `widescreen 2.39:1 anamorphic aspect ratio`,
    `Skin: ${visualDNA.genreProfile.skinRendering}`,
    `${visualDNA.genreProfile.textureNotes}`,
    QUALITY_ANCHORS[tier],
    `[AVOID: ${QUALITY_NEGATIVE[tier]}]`,
  ];
  return parts.join(". ");
}
