import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
  import { z } from "zod";
  import { TRPCError } from "@trpc/server";
  import { generateImage } from "./_core/imageGeneration";
  import * as db from "./db";

  // Credit cost per location generation (matches location_scout_ai tier)
  const LOCATION_GEN_COST = 15;

  const CURATED_LOCATIONS = [
    { id:1, name:"Moroccan Desert Fortress", country:"Morocco", type:"Exterior", mood:"Mystical", description:"Ancient desert fortress with terracotta walls and sweeping dunes.", dailyRateUsd:2800, tags:["desert","fortress","historical","epic"], featured:true },
    { id:2, name:"Tokyo Neon District", country:"Japan", type:"Exterior/Night", mood:"Cyberpunk", description:"Iconic neon-lit streets with layered signage and reflections on wet pavement.", dailyRateUsd:4200, tags:["urban","neon","night","cyberpunk"], featured:true },
    { id:3, name:"Scottish Highland Moors", country:"Scotland", type:"Exterior", mood:"Dramatic", description:"Vast open moorland with dramatic rolling fog and ancient stone ruins.", dailyRateUsd:1500, tags:["scotland","highland","mist","dramatic"], featured:true },
    { id:4, name:"LA Rooftop Penthouse", country:"USA", type:"Interior/Exterior", mood:"Luxury", description:"Glass-walled penthouse with 360° city views and infinity pool.", dailyRateUsd:6500, tags:["luxury","penthouse","LA","modern"] },
    { id:5, name:"Icelandic Volcanic Landscape", country:"Iceland", type:"Exterior", mood:"Apocalyptic", description:"Otherworldly black lava fields, steam vents, and midnight sun.", dailyRateUsd:2200, tags:["iceland","volcanic","alien","apocalyptic"] },
    { id:6, name:"Amazon Rainforest Camp", country:"Brazil", type:"Exterior", mood:"Adventure", description:"Dense jungle canopy, river tributaries, and authentic tribal camp settings.", dailyRateUsd:3100, tags:["jungle","amazon","adventure","tropical"] },
    { id:7, name:"Paris Belle Époque Apartment", country:"France", type:"Interior", mood:"Romantic", description:"Authentic Haussmann apartment with ornate cornices and views over the Seine.", dailyRateUsd:3800, tags:["paris","romantic","interior","period"] },
    { id:8, name:"Dubai Glass Skyscraper", country:"UAE", type:"Interior", mood:"Corporate Power", description:"Ultra-modern 60th-floor executive suite with floor-to-ceiling glass and desert views.", dailyRateUsd:7200, tags:["dubai","corporate","luxury","modern"] },
    { id:9, name:"New Orleans Jazz Quarter", country:"USA", type:"Exterior", mood:"Atmospheric", description:"French Quarter streetscapes with wrought-iron balconies and gas lanterns.", dailyRateUsd:2400, tags:["new orleans","jazz","atmospheric","historical"] },
    { id:10, name:"Norwegian Fjord Village", country:"Norway", type:"Exterior", mood:"Serene", description:"Dramatic fjord with mirror-flat water and snow-capped peaks.", dailyRateUsd:2900, tags:["norway","fjord","nordic","serene"] },
    { id:11, name:"Mumbai Street Scene", country:"India", type:"Exterior", mood:"Raw/Authentic", description:"High-energy urban environment with incredible density, colour, and street life.", dailyRateUsd:1200, tags:["india","urban","authentic","vibrant"] },
    { id:12, name:"Berlin Abandoned Factory", country:"Germany", type:"Interior", mood:"Industrial/Gritty", description:"Massive industrial shell with exposed steel and dramatic shaft lighting.", dailyRateUsd:1800, tags:["berlin","industrial","abandoned","gritty"] },
  ];

  export const locationStudioRouter = router({
    listLocations: publicProcedure.query(() => CURATED_LOCATIONS),

    generateLocation: protectedProcedure
      .input(z.object({
        // The user's own words — this is passed directly to the AI, nothing added
        description: z.string().min(5, "Please describe the location").max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        // Deduct credits first — fail fast if insufficient
        try {
          await db.deductCredits(
            ctx.user.id,
            LOCATION_GEN_COST,
            "location_gen_ai",
            `AI location generation: ${input.description.slice(0, 80)}`
          );
        } catch (e: any) {
          if (e.message?.includes("INSUFFICIENT_CREDITS")) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient credits. Please top up to generate locations." });
          }
          throw e;
        }

        // Pass the user's description EXACTLY as written to the image AI
        // We only prepend "film still:" so the generator understands the medium —
        // everything else is 100% what the user typed
        const prompt = `film still: ${input.description}`;

        const result = await generateImage({ prompt }).catch(() => {
          // If generation fails, refund the credits
          db.addCredits(ctx.user.id, LOCATION_GEN_COST, "location_gen_refund", "Refund — location generation failed").catch(() => {});
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Image generation failed. Your credits have been refunded." });
        });

        return {
          imageUrl: result.url,
          description: input.description,
          creditsCost: LOCATION_GEN_COST,
        };
      }),
  });
  