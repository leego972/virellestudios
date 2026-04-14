/**
 * Production Assets Router
 *
 * Director's Pre-Production Control Panel for consistent AI generation:
 *
 * 1. Director's Vision — lock in the visual DNA of your entire production:
 *    camera system, lens set, aspect ratio, frame rate, color grade,
 *    movement style, lighting philosophy, sound design direction.
 *    AI generates a "Visual DNA" prompt that feeds into every scene.
 *
 * 2. Location Scout — build a library of filming locations with full
 *    pre-production context: best time of day, weather preferences, permit
 *    status, seasonal notes, crew logistics, and AI-enriched visual prompt.
 *
 * 3. Vehicle Registry — register hero, background, and stunt vehicles.
 *    make/model/year/color, role, period accuracy, special features.
 *    AI generates a visual prompt so every vehicle appears consistently.
 *
 * 4. Atmosphere Generator — standalone AI tool:
 *    given time of day + weather + season + lighting intent,
 *    AI outputs the precise cinematographic atmosphere description
 *    ready to inject into any image/video generation prompt.
 */
import { z } from "zod";
import { router, protectedProcedure, creationProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { directorVision, productionVehicles } from "../drizzle/schema_additions";
import { locations } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { TRPCError } from "@trpc/server";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const VisionInput = z.object({
  projectId: z.number(),
  // Camera Package
  cameraSystem: z.string().max(128).optional(),      // ARRI ALEXA Mini LF, RED V-Raptor, Sony Venice 2, Blackmagic 6K, iPhone 15 Pro
  lensSet: z.string().max(128).optional(),            // Cooke S4/i, Zeiss Master Anamorphic, Leica Summilux-C, Vintage Kowa
  aspectRatio: z.string().max(16).optional(),         // 2.39:1, 1.85:1, 16:9, 4:3, 1.33:1, 2:1
  frameRate: z.string().max(16).optional(),           // 24fps, 25fps, 48fps, 120fps slow-mo
  shootingFormat: z.string().max(64).optional(),      // ARRIRAW, ProRes 4.4K, 6K RAW, Log-C, S-Log3
  // Color & Look
  colorGradeStyle: z.string().max(128).optional(),    // desaturated, warm-shadows, teal-orange, bleach-bypass, vintage, high-contrast
  referenceFilms: z.array(z.string()).optional(),     // ["Blade Runner 2049","Mad Max: Fury Road"]
  colorPalette: z.array(z.string()).optional(),       // ["deep teal","amber","charcoal"]
  lutName: z.string().max(128).optional(),            // LUT reference or brand
  // Camera Movement
  movementStyle: z.string().max(128).optional(),      // static master shots, handheld verite, steadicam, slow push/pull, aerial, drone
  coverageNotes: z.string().optional(),               // director's blocking and coverage philosophy
  // Lighting
  lightingStyle: z.string().max(128).optional(),      // available light, practicals-only, dramatic chiaroscuro, soft naturalistic, neon urban
  // Sound Design
  soundDesignDirection: z.string().optional(),        // naturalistic, stylised Foley, minimal silence, hyper-real
  musicGenre: z.string().max(128).optional(),         // orchestral, electronic, jazz, ambient, score-less
});

const LocationScoutInput = z.object({
  projectId: z.number(),
  name: z.string().min(1).max(255),
  address: z.string().max(512).optional(),
  locationType: z.enum([
    // ── Residential ──────────────────────────────────────────────────────
    "apartment-building-exterior",  // apartment block / complex outside shot
    "apartment-interior",           // inside a flat/apartment unit
    "apartment-lobby",              // building entrance, mailboxes, lifts, common hall
    "apartment-corridor",           // hallway between units
    "house-single-storey",          // single-level private residence exterior
    "house-double-storey",          // two-storey private house exterior
    "house-interior-lounge",        // living room / lounge
    "house-interior-kitchen",       // kitchen / open-plan kitchen-dining
    "house-interior-bedroom",       // bedroom
    "house-interior-bathroom",      // bathroom / ensuite
    "house-backyard",               // private garden / pool area
    "penthouse-interior",           // top-floor luxury interior
    "penthouse-terrace",            // rooftop terrace of penthouse
    "townhouse",                    // terraced / row house
    "villa-exterior",               // standalone luxury villa outside
    "villa-interior",               // inside a villa
    "mansion-exterior",             // grand estate exterior
    "mansion-interior",             // inside a mansion (ballroom, library, study)
    "loft-apartment",               // open industrial-style loft
    "studio-apartment",             // single-room compact apartment
    "basement-apartment",           // below-grade unit
    "gated-community",              // private estate / compound entrance
    "housing-estate",               // suburban estate / development street
    "construction-site-residential",// house being built
    // ── Hospitality ───────────────────────────────────────────────────────
    "hotel-exterior",               // hotel building façade
    "hotel-lobby",                  // check-in, concierge, reception area
    "hotel-room",                   // standard or luxury hotel bedroom
    "hotel-suite",                  // suite with lounge area
    "hotel-corridor",               // hotel hallway
    "hotel-rooftop-bar",            // sky bar / rooftop pool deck
    "hotel-restaurant",             // hotel dining room
    "hotel-conference-room",        // meeting / event space
    "boutique-hotel-interior",      // styled boutique hotel common areas
    "resort-exterior",              // holiday resort grounds
    "resort-pool",                  // resort pool area
    "motel",                        // roadside motel exterior + rooms
    "airbnb-property",              // short-stay rental interior
    // ── Commercial / Business ─────────────────────────────────────────────
    "office-building-exterior",     // corporate tower / business park outside
    "office-interior-open-plan",    // open-plan office floor
    "office-interior-private",      // private office / executive suite
    "office-lobby",                 // corporate reception / atrium
    "office-conference-room",       // boardroom / meeting room
    "coworking-space",              // shared workspace / WeWork-style
    "retail-store",                 // shop floor / showroom
    "shopping-mall-interior",       // mall concourse
    "shopping-mall-exterior",       // mall forecourt / carpark
    "bank-interior",                // bank branch or vault
    "bank-exterior",                // bank building façade
    "law-firm",                     // legal office interior
    "medical-clinic",               // doctor's office / waiting room
    "pharmacy",                     // chemist interior
    // ── Dining & Nightlife ────────────────────────────────────────────────
    "restaurant-fine-dining",       // upscale restaurant interior
    "restaurant-casual",            // casual diner / bistro
    "restaurant-exterior",          // restaurant façade / al fresco tables
    "cafe",                         // coffee shop interior
    "bar",                          // pub / bar interior
    "nightclub",                    // dance floor / club interior
    "rooftop-bar",                  // outdoor rooftop bar (non-hotel)
    // ── Urban Exterior ────────────────────────────────────────────────────
    "city-street",                  // main road with buildings
    "alley",                        // narrow lane / back alley
    "rooftop-urban",                // generic urban rooftop with city view
    "carpark-multi-level",          // multi-storey parking structure
    "carpark-basement",             // underground carpark
    "carpark-surface",              // open-air surface carpark
    "bridge",                       // road or pedestrian bridge
    "tunnel",                       // vehicle or pedestrian tunnel
    "underpass",                    // below overpass / underpass graffiti wall
    "urban-plaza",                  // public square / piazza
    "bus-stop",                     // street-level bus shelter
    "sidewalk",                     // footpath / pavement close-up
    // ── Transport Infrastructure ──────────────────────────────────────────
    "airport-terminal-interior",    // check-in, departures, arrivals hall
    "airport-exterior",             // terminal façade / runway view
    "train-station-interior",       // concourse / platforms
    "train-station-exterior",       // station building exterior
    "subway-station",               // underground metro platform
    "subway-train-interior",        // carriage interior
    "highway",                      // motorway / freeway with movement
    "dockyard-marina",              // harbour, boats, loading dock
    "helipad",                      // rooftop or ground helipad
    // ── Natural / Landscape ───────────────────────────────────────────────
    "forest",                       // dense woodland
    "beach",                        // coastal beach
    "desert",                       // arid sand or rocky desert
    "mountain",                     // high-altitude terrain
    "countryside",                  // open rural landscape
    "lake",                         // lakeside / water's edge
    "river",                        // riverbank / bridge over river
    "cliff",                        // coastal or inland cliff edge
    "field",                        // open grass field / meadow
    "swamp",                        // wetlands / bayou
    // ── Rural / Farm ──────────────────────────────────────────────────────
    "farmhouse-exterior",           // rural house with land
    "farmhouse-interior",           // inside a farmhouse
    "barn",                         // agricultural barn
    "silo",                         // grain silo / farm structure
    // ── Industrial ────────────────────────────────────────────────────────
    "warehouse",                    // empty or active warehouse interior
    "factory-floor",                // manufacturing / production floor
    "shipping-container-yard",      // port container stacks
    "power-station",                // industrial power facility
    "construction-site",            // active construction site
    "abandoned-building",           // derelict structure interior/exterior
    // ── Institutional ─────────────────────────────────────────────────────
    "school-exterior",              // school building outside
    "school-classroom",             // classroom interior
    "school-corridor",              // school hallway / lockers
    "university-campus",            // campus grounds
    "hospital-exterior",            // hospital building façade
    "hospital-interior",            // ward, corridor, operating theatre
    "police-station",               // exterior or interior
    "courthouse",                   // exterior or courtroom
    "government-building",          // civic / government exterior
    "church-exterior",              // religious building outside
    "church-interior",              // nave, altar, pews
    "cemetery",                     // gravestone grounds
    // ── Entertainment / Leisure ───────────────────────────────────────────
    "stadium-exterior",             // sports stadium outside
    "stadium-interior",             // pitch view / stands
    "cinema-interior",              // screen room or lobby
    "theatre-stage",                // stage with seats
    "gym-fitness",                  // gym floor / boxing ring
    "swimming-pool-indoor",         // enclosed pool
    "swimming-pool-outdoor",        // outdoor pool / lido
    "casino-floor",                 // gaming floor interior
    "art-gallery",                  // gallery white walls
    "museum",                       // museum exhibit space
    // ── Other ─────────────────────────────────────────────────────────────
    "custom",                       // director-specified custom type
  ]).optional()
  description: z.string().optional(),
  // Director's pre-production scout variables
  bestTimeOfDay: z.string().max(64).optional(),       // golden-hour-morning, midday, blue-hour, night, pre-dawn
  weatherPreferences: z.array(z.string()).optional(), // ["overcast","golden-hour-clear","light-fog"]
  permitStatus: z.enum(["not_required","pending","obtained","denied"]).optional(),
  permitNotes: z.string().optional(),
  powerAccess: z.boolean().optional(),                // electrical access for lighting rigs
  parkingNotes: z.string().optional(),
  crewCapacity: z.string().max(64).optional(),        // "Up to 40 crew", "Restricted — 10 max"
  shootingConstraints: z.string().optional(),         // noise limits, shooting hours, restricted zones
  seasonalNotes: z.string().optional(),               // "Best in autumn — leaf colour", "Avoid summer — tourist crowds"
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const VehicleInput = z.object({
  projectId: z.number(),
  name: z.string().min(1).max(255),                  // "Hero Car", "Police Cruiser #2", "Camera Van"
  make: z.string().max(128).optional(),              // Ford, Chevrolet, BMW, Tesla, etc.
  model: z.string().max(128).optional(),             // Mustang GT500, Impala, M3, Cybertruck
  year: z.number().int().min(1885).max(2100).optional(),
  color: z.string().max(128).optional(),             // "midnight black metallic", "pearl white", "matte olive"
  condition: z.string().max(64).optional(),          // pristine, well-used, battle-damaged, weathered, classic
  vehicleRole: z.enum(["hero","background","camera-car","stunt","period","aerial"]).optional(),
  vehicleType: z.string().max(64).optional(),        // sedan, SUV, truck, motorcycle, boat, aircraft, bicycle, spacecraft
  period: z.string().max(64).optional(),             // "1940s noir", "1970s muscle", "near-future", "post-apocalyptic"
  specialFeatures: z.string().optional(),            // "bullet-hole dressings", "custom exhaust wrap", "roof-mounted camera rig"
  sceneIds: z.array(z.number()).optional(),
  notes: z.string().optional(),
});

const AtmosphereInput = z.object({
  // Scene context (optional)
  sceneDescription: z.string().optional(),
  genre: z.string().optional(),                       // thriller, romance, action, horror, sci-fi, drama
  // Time of day
  timeOfDay: z.enum([
    "pre-dawn",
    "golden-hour-morning",
    "morning",
    "midday",
    "afternoon",
    "golden-hour-evening",
    "blue-hour",
    "dusk",
    "night",
    "deep-night",
  ]),
  // Weather
  weather: z.enum([
    "clear",
    "partly-cloudy",
    "overcast",
    "light-fog",
    "heavy-fog",
    "drizzle",
    "light-rain",
    "heavy-rain",
    "thunderstorm",
    "snow",
    "blizzard",
    "dry-heat-haze",
    "humid-haze",
    "sandstorm",
    "smoke",
  ]),
  // Season
  season: z.enum(["spring","summer","autumn","winter"]),
  // Additional control variables
  visibility: z.enum(["crystal-clear","normal","reduced","low","near-zero"]).optional(),
  windCondition: z.enum(["still","gentle-breeze","moderate-wind","strong-wind","gale"]).optional(),
  lightingIntent: z.string().max(128).optional(),    // "low-key moody", "high-key energetic", "naturalistic", "dramatic chiaroscuro"
  locationContext: z.enum([
    // Residential
    "residential-apartment-exterior", "residential-apartment-interior", "residential-apartment-lobby",
    "residential-house-exterior", "residential-house-interior", "residential-mansion", "residential-penthouse",
    "residential-villa", "residential-loft", "residential-backyard", "residential-estate",
    // Hospitality
    "hotel-exterior", "hotel-lobby", "hotel-room", "hotel-rooftop", "hotel-restaurant",
    "resort-grounds", "resort-pool", "motel",
    // Commercial / Office
    "office-exterior", "office-interior", "office-lobby", "retail-store", "shopping-mall",
    "bank", "coworking-space",
    // Dining & Nightlife
    "restaurant-interior", "restaurant-exterior", "cafe", "bar", "nightclub", "rooftop-bar",
    // Urban Exterior
    "urban-city-street", "urban-alley", "urban-rooftop", "urban-plaza", "urban-carpark",
    "urban-bridge", "urban-tunnel", "urban-underpass",
    // Transport
    "airport-terminal", "train-station", "subway-station", "highway", "dockyard",
    // Natural
    "forest", "beach", "desert", "mountain", "countryside", "lake", "river", "cliff", "field",
    // Rural / Farm
    "farmhouse", "barn", "rural-landscape",
    // Industrial
    "warehouse", "factory", "construction-site", "abandoned-building", "shipping-yard",
    // Institutional
    "school", "hospital", "police-station", "courthouse", "government-building", "church", "cemetery",
    // Entertainment
    "stadium", "cinema", "theatre", "gym", "casino", "gallery", "museum",
    // Custom
    "custom",
  ]).optional()
  // Director's Visual DNA (inject master prompt if available)
  visualDna: z.string().optional(),
});

// ─── Router ──────────────────────────────────────────────────────────────────

export const productionAssetsRouter = router({

  // ──────────────────────────────────────────────────────────────────────────
  // 1. DIRECTOR'S VISION
  // Lock in the cinematic DNA of the entire production so every scene
  // generation call inherits the same camera, grade, movement, and sound DNA.
  // ──────────────────────────────────────────────────────────────────────────
  vision: router({

    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const [row] = await db
          .select()
          .from(directorVision)
          .where(and(eq(directorVision.projectId, input.projectId), eq(directorVision.userId, ctx.user.id)));
        return row ?? null;
      }),

    set: protectedProcedure
      .input(VisionInput)
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const { projectId, ...fields } = input;
        const [existing] = await db
          .select({ id: directorVision.id })
          .from(directorVision)
          .where(and(eq(directorVision.projectId, projectId), eq(directorVision.userId, ctx.user.id)));
        if (existing) {
          await db.update(directorVision)
            .set({ ...fields, updatedAt: new Date() })
            .where(eq(directorVision.id, existing.id));
          return { success: true, action: "updated" as const };
        }
        await db.insert(directorVision).values({
          projectId, userId: ctx.user.id, ...fields,
          createdAt: new Date(), updatedAt: new Date(),
        });
        return { success: true, action: "created" as const };
      }),

    // AI: synthesise all vision choices into one "Visual DNA" prompt string
    generateDNA: creationProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const [vision] = await db
          .select()
          .from(directorVision)
          .where(and(eq(directorVision.projectId, input.projectId), eq(directorVision.userId, ctx.user.id)));
        if (!vision) throw new TRPCError({ code: "NOT_FOUND", message: "Set your Director's Vision first before generating DNA" });

        const visionSummary = [
          vision.cameraSystem    && `Camera system: ${vision.cameraSystem}`,
          vision.lensSet         && `Lens set: ${vision.lensSet}`,
          vision.aspectRatio     && `Aspect ratio: ${vision.aspectRatio}`,
          vision.frameRate       && `Frame rate: ${vision.frameRate}`,
          vision.shootingFormat  && `Shooting format: ${vision.shootingFormat}`,
          vision.colorGradeStyle && `Color grade style: ${vision.colorGradeStyle}`,
          vision.referenceFilms  && `Reference films: ${(vision.referenceFilms as string[]).join(", ")}`,
          vision.colorPalette    && `Color palette: ${(vision.colorPalette as string[]).join(", ")}`,
          vision.lutName         && `LUT: ${vision.lutName}`,
          vision.movementStyle   && `Camera movement: ${vision.movementStyle}`,
          vision.coverageNotes   && `Coverage philosophy: ${vision.coverageNotes}`,
          vision.lightingStyle   && `Lighting style: ${vision.lightingStyle}`,
          vision.soundDesignDirection && `Sound design: ${vision.soundDesignDirection}`,
          vision.musicGenre      && `Music direction: ${vision.musicGenre}`,
        ].filter(Boolean).join("\n");

        const resp = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a master cinematographer, colorist, and production designer. Translate a director's technical and aesthetic choices into a single, dense 'Visual DNA' prompt string — a concise paragraph that can be appended to any AI image or video generation prompt to enforce consistent cinematographic style throughout the entire production. Be specific, technical, and evocative. Write as if briefing an AI image generator on the exact look of this film.",
            },
            {
              role: "user",
              content: `Generate a Visual DNA prompt string from these director's production choices:\n\n${visionSummary}\n\nReturn ONLY a JSON object: { "visualDnaPrompt": "...", "summary": "..." }\n\n- visualDnaPrompt: a single dense paragraph (80-150 words) encoding camera, glass, format, grade, movement, lighting, and sound into one generation-ready prompt string\n- summary: 1-2 sentences for the director explaining what this DNA captures`,
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
                },
                required: ["visualDnaPrompt", "summary"],
                additionalProperties: false,
              },
            },
          },
        });

        const parsed = JSON.parse((resp.choices[0].message.content as string) || "{}");
        const prompt = parsed.visualDnaPrompt || "";
        await db.update(directorVision)
          .set({ visualDnaPrompt: prompt, updatedAt: new Date() })
          .where(eq(directorVision.id, vision.id));
        return { visualDnaPrompt: prompt, summary: parsed.summary || "" };
      }),
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // 2. LOCATION SCOUT
  // Build a pre-production library of filming locations. Each location carries
  // full director variables: best time of day, weather preferences, permits,
  // seasonal constraints, crew logistics, and an AI-enriched visual prompt.
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
        const result = await db.insert(locations).values({
          ...input,
          userId: ctx.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);
        return { success: true, id: Number((result as any).insertId) };
      }),

    update: protectedProcedure
      .input(
        z.object({ id: z.number() })
          .merge(LocationScoutInput.omit({ projectId: true }).partial())
          .extend({ projectId: z.number().optional() })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const { id, ...fields } = input;
        await db.update(locations)
          .set({ ...fields, updatedAt: new Date() } as any)
          .where(and(eq(locations.id, id), eq(locations.userId, ctx.user.id)));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await db.delete(locations)
          .where(and(eq(locations.id, input.id), eq(locations.userId, ctx.user.id)));
        return { success: true };
      }),

    // AI: deep cinematographic enrichment of a location
    enrich: creationProcedure
      .input(z.object({ locationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const [loc] = await db.select().from(locations)
          .where(and(eq(locations.id, input.locationId), eq(locations.userId, ctx.user.id)));
        if (!loc) throw new TRPCError({ code: "NOT_FOUND", message: "Location not found" });

        const l = loc as any;
        const locationDetails = [
          `Name: ${loc.name}`,
          loc.address       && `Address: ${loc.address}`,
          loc.locationType  && `Type: ${loc.locationType}`,
          loc.description   && `Description: ${loc.description}`,
          l.bestTimeOfDay   && `Preferred shooting window: ${l.bestTimeOfDay}`,
          l.weatherPreferences?.length && `Weather preferences: ${(l.weatherPreferences as string[]).join(", ")}`,
          l.seasonalNotes   && `Seasonal notes: ${l.seasonalNotes}`,
          l.shootingConstraints && `Shooting constraints: ${l.shootingConstraints}`,
          typeof l.powerAccess !== "undefined" && `Power access: ${l.powerAccess ? "yes" : "no"}`,
          l.crewCapacity    && `Crew capacity: ${l.crewCapacity}`,
        ].filter(Boolean).join("\n");

        const resp = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a professional location manager, director of photography, and pre-production consultant. Your job is to produce a rich cinematographic dossier for a filming location — one that a director and AI generator can use to ensure every shot at this location looks consistent and visually intentional.",
            },
            {
              role: "user",
              content: `Analyse this filming location and produce a cinematographic enrichment dossier:\n\n${locationDetails}\n\nReturn JSON with these exact fields:\n{\n  "visualDescription": "...",\n  "lightingAnalysis": "...",\n  "weatherImpact": "...",\n  "bestAngles": "...",\n  "timeOfDayGuide": "...",\n  "aiPromptSuffix": "..."\n}\n\n- visualDescription: 2-3 vivid sentences describing this location's visual character for AI generation\n- lightingAnalysis: how natural and practical light behaves here at pre-dawn / golden hour morning / midday / golden hour evening / blue hour / night\n- weatherImpact: how clear, overcast, rain, fog, snow, and haze each transform this location's look and feel\n- bestAngles: recommended camera positions, heights, and focal lengths (wide establishing, intimate mid, close detail)\n- timeOfDayGuide: which time of day unlocks this location's best look and why\n- aiPromptSuffix: 30-50 word prompt suffix that captures this location's visual essence for AI image/video generation`,
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
                  visualDescription: { type: "string" },
                  lightingAnalysis:  { type: "string" },
                  weatherImpact:     { type: "string" },
                  bestAngles:        { type: "string" },
                  timeOfDayGuide:    { type: "string" },
                  aiPromptSuffix:    { type: "string" },
                },
                required: ["visualDescription","lightingAnalysis","weatherImpact","bestAngles","timeOfDayGuide","aiPromptSuffix"],
                additionalProperties: false,
              },
            },
          },
        });

        const parsed = JSON.parse((resp.choices[0].message.content as string) || "{}");
        const aiPrompt = parsed.aiPromptSuffix || "";
        await db.update(locations)
          .set({ aiVisualPrompt: aiPrompt, updatedAt: new Date() } as any)
          .where(eq(locations.id, input.locationId));

        return {
          visualDescription: parsed.visualDescription || "",
          lightingAnalysis:  parsed.lightingAnalysis  || "",
          weatherImpact:     parsed.weatherImpact     || "",
          bestAngles:        parsed.bestAngles        || "",
          timeOfDayGuide:    parsed.timeOfDayGuide    || "",
          aiPromptSuffix:    aiPrompt,
        };
      }),
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // 3. VEHICLE REGISTRY
  // Register every vehicle in the production — hero, background, stunt,
  // camera cars. AI generates a visual prompt for consistent rendering.
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
        const result = await db.insert(productionVehicles).values({
          ...input,
          userId: ctx.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        return { success: true, id: Number((result as any).insertId) };
      }),

    update: protectedProcedure
      .input(
        z.object({ id: z.number() })
          .merge(VehicleInput.omit({ projectId: true }).partial())
          .extend({ projectId: z.number().optional() })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const { id, ...fields } = input;
        await db.update(productionVehicles)
          .set({ ...fields, updatedAt: new Date() })
          .where(and(eq(productionVehicles.id, id), eq(productionVehicles.userId, ctx.user.id)));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await db.delete(productionVehicles)
          .where(and(eq(productionVehicles.id, input.id), eq(productionVehicles.userId, ctx.user.id)));
        return { success: true };
      }),

    // AI: generate a precise visual prompt for this vehicle
    generatePrompt: creationProcedure
      .input(z.object({ vehicleId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const [vehicle] = await db.select().from(productionVehicles)
          .where(and(eq(productionVehicles.id, input.vehicleId), eq(productionVehicles.userId, ctx.user.id)));
        if (!vehicle) throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found" });

        const vehicleDetails = [
          `Label: ${vehicle.name}`,
          vehicle.make            && `Make: ${vehicle.make}`,
          vehicle.model           && `Model: ${vehicle.model}`,
          vehicle.year            && `Year: ${vehicle.year}`,
          vehicle.color           && `Color/finish: ${vehicle.color}`,
          vehicle.condition       && `Condition: ${vehicle.condition}`,
          vehicle.vehicleRole     && `Production role: ${vehicle.vehicleRole}`,
          vehicle.vehicleType     && `Vehicle type: ${vehicle.vehicleType}`,
          vehicle.period          && `Period/era: ${vehicle.period}`,
          vehicle.specialFeatures && `Special features/dressings: ${vehicle.specialFeatures}`,
        ].filter(Boolean).join("\n");

        const resp = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an automotive specialist, production designer, and cinematographic consultant. You generate precise, technically accurate visual descriptions of vehicles so AI image generators can render the exact same vehicle consistently across every scene in the production.",
            },
            {
              role: "user",
              content: `Generate a cinematographic vehicle profile for this production vehicle:\n\n${vehicleDetails}\n\nReturn JSON:\n{\n  "visualDescription": "...",\n  "cinematicNotes": "...",\n  "lightingBehavior": "...",\n  "aiPromptSuffix": "..."\n}\n\n- visualDescription: 2-3 sentences describing exactly how this vehicle looks in fine physical detail (paint, trim, stance, proportions, distinguishing marks)\n- cinematicNotes: how to light and frame this vehicle for maximum visual impact (angles, lens choice, movement)\n- lightingBehavior: how this vehicle's finish and color respond to different lighting conditions — golden hour, overcast, night practicals, studio, harsh midday sun\n- aiPromptSuffix: 20-40 word AI generation prompt suffix that captures this vehicle's look for consistent rendering`,
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
                  cinematicNotes:    { type: "string" },
                  lightingBehavior:  { type: "string" },
                  aiPromptSuffix:    { type: "string" },
                },
                required: ["visualDescription","cinematicNotes","lightingBehavior","aiPromptSuffix"],
                additionalProperties: false,
              },
            },
          },
        });

        const parsed = JSON.parse((resp.choices[0].message.content as string) || "{}");
        const aiPrompt = parsed.aiPromptSuffix || "";
        await db.update(productionVehicles)
          .set({ aiVisualPrompt: aiPrompt, updatedAt: new Date() })
          .where(eq(productionVehicles.id, input.vehicleId));

        return {
          visualDescription: parsed.visualDescription || "",
          cinematicNotes:    parsed.cinematicNotes    || "",
          lightingBehavior:  parsed.lightingBehavior  || "",
          aiPromptSuffix:    aiPrompt,
        };
      }),
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // 4. ATMOSPHERE GENERATOR
  // Standalone AI tool — director pre-selects all atmospheric variables and
  // gets back a precise cinematographic atmosphere description + generation
  // prompt suffix that can be injected into any scene generation call.
  //
  // Variables covered:
  //   Time of day   — 10 options from pre-dawn through deep night
  //   Weather       — 15 conditions from clear to sandstorm
  //   Season        — spring / summer / autumn / winter
  //   Visibility    — 5 levels
  //   Wind          — 5 levels
  //   Lighting intent — director's aesthetic goal
  //   Location context — broad environment type
  //   Visual DNA    — injects the project-level camera/grade style
  // ──────────────────────────────────────────────────────────────────────────
  atmosphere: router({

    generate: creationProcedure
      .input(AtmosphereInput)
      .mutation(async ({ ctx, input }) => {
        const context = [
          `Time of day: ${input.timeOfDay.replace(/-/g, " ")}`,
          `Weather: ${input.weather.replace(/-/g, " ")}`,
          `Season: ${input.season}`,
          input.visibility      && `Visibility: ${input.visibility.replace(/-/g, " ")}`,
          input.windCondition   && `Wind: ${input.windCondition.replace(/-/g, " ")}`,
          input.lightingIntent  && `Lighting intent: ${input.lightingIntent}`,
          input.locationContext && `Location context: ${input.locationContext}`,
          input.genre           && `Genre / tone: ${input.genre}`,
          input.sceneDescription && `Scene: ${input.sceneDescription}`,
          input.visualDna       && `Director's Visual DNA: ${input.visualDna}`,
        ].filter(Boolean).join("\n");

        const resp = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a director of photography, colorist, and gaffer with 30 years of experience across feature films, commercials, and music videos. You translate environmental conditions into precise, technically accurate cinematographic atmosphere descriptions that AI image and video generators can use to produce photorealistic scenes with correct lighting physics, color science, and atmospheric effects. Be technical, specific, and evocative.",
            },
            {
              role: "user",
              content: `Generate a complete cinematographic atmosphere profile from these director's pre-production choices:\n\n${context}\n\nReturn JSON:\n{\n  "atmosphereDescription": "...",\n  "lightingConditions": "...",\n  "colorScience": "...",\n  "shadowBehavior": "...",\n  "atmosphericElements": "...",\n  "moodImpact": "...",\n  "cameraRecommendations": "...",\n  "aiPromptSuffix": "..."\n}\n\n- atmosphereDescription: 2-3 sentences capturing the complete visual atmosphere with physical accuracy\n- lightingConditions: light source, direction, quality (hard/soft/diffused), color temperature in Kelvin, intensity\n- colorScience: dominant color palette, shadow and highlight tones, overall contrast and saturation character\n- shadowBehavior: how shadows fall — hard/soft, direction, length, fill ratio\n- atmosphericElements: haze, mist, rain streaks, lens flare potential, heat shimmer, smoke, particulates, surface reflections\n- moodImpact: how this atmosphere affects emotional and narrative tone\n- cameraRecommendations: exposure guidance (f-stop / ISO suggestions), ND filter needs, white balance point, lens flare awareness\n- aiPromptSuffix: 40-60 word generation-ready prompt suffix that fully encodes this atmosphere`,
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
                  atmosphereDescription: { type: "string" },
                  lightingConditions:    { type: "string" },
                  colorScience:          { type: "string" },
                  shadowBehavior:        { type: "string" },
                  atmosphericElements:   { type: "string" },
                  moodImpact:            { type: "string" },
                  cameraRecommendations: { type: "string" },
                  aiPromptSuffix:        { type: "string" },
                },
                required: [
                  "atmosphereDescription","lightingConditions","colorScience",
                  "shadowBehavior","atmosphericElements","moodImpact",
                  "cameraRecommendations","aiPromptSuffix",
                ],
                additionalProperties: false,
              },
            },
          },
        });

        const parsed = JSON.parse((resp.choices[0].message.content as string) || "{}");
        return {
          atmosphereDescription: parsed.atmosphereDescription || "",
          lightingConditions:    parsed.lightingConditions    || "",
          colorScience:          parsed.colorScience          || "",
          shadowBehavior:        parsed.shadowBehavior        || "",
          atmosphericElements:   parsed.atmosphericElements   || "",
          moodImpact:            parsed.moodImpact            || "",
          cameraRecommendations: parsed.cameraRecommendations || "",
          aiPromptSuffix:        parsed.aiPromptSuffix        || "",
        };
      }),
  }),
});
