import { sql } from "drizzle-orm";

  // Professional cinematographic VFX prompt language per pack.
  // These are SPECIFIC TECHNICAL DIRECTIONS that AI image models
  // respond to accurately — not generic labels.
  export const VFX_PACK_PROMPTS: Record<number, string> = {
    1:  "atmospheric dust motes suspended in volumetric light shafts, organic particle scatter with Brownian motion physics, screen-blend depth layers, micro-particles catching backlight",
    2:  "massive Phantom camera pyrotechnic explosion element composited, spherical shockwave pressure distortion, rising fire and black smoke column, heat shimmer caustic distortion at blast radius",
    3:  "practical smoke machine billowing haze filling air space, fire element in screen blend with ember float, colored smoke tendrils, atmospheric depth layering",
    4:  "semi-transparent holographic HUD overlay in foreground, futuristic scanning grid projection glowing blue-white, floating data readout panels, particle data cascade",
    5:  "streaking practical rain elements in foreground and midground planes, layered fog banks reducing depth, overcast diffuse silver light, moisture glistening on every surface with pooling reflections",
    6:  "Panavision anamorphic horizontal blue-teal lens flare streak at key light position, characteristic oval anamorphic bokeh, warm amber light leak bleed upper-right corner, J-cut chromatic aberration artifact at extreme frame edges",
    7:  "cinematic motion blur streaks from high-velocity camera whip, light burn overexposure bloom at practicals, frame-edge vignette compression",
    8:  "Kodak Vision3 500T film grain with organic silver halide crystal structure at 400 ISO, analog halation glow blooming around highlights, corner vignette, natural film color science",
    9:  "magical particle energy practical elements in golden light scatter, ethereal luminous glow around mystical sources, fairy dust crystalline particles, soft atmospheric haze with floating luminous elements",
    10: "crushing dark vignette compressing frame edges inward, desaturated sickly skin tones with deep inky shadows, psychological dread visual treatment, analog film flicker and frame instability, high-contrast chiaroscuro",
    11: "digital signal corruption fragmenting frame areas, RGB chromatic aberration channel split at edges, datamosh pixel displacement smearing, horizontal CRT scan line overlay, corrupted video artifact blocks",
    12: "practical water splash impact elements in foreground plane, underwater caustic light ripple patterns on surfaces, ocean spray mist particle, wet surface mirror reflections with ripple distortion",
    13: "deep space nebula color field in background, dense star field depth, asteroid debris scatter, planetary limb atmosphere glow on horizon, cosmic dust lane occlusion",
    14: "layered aerial atmospheric haze dissolving background into distance, golden-hour forward scattering, volumetric god rays cutting through haze, horizon mist softening background detail",
    15: "neon light streak overlays in magenta-cyan-amber, rain-wet ground mirror reflections of colored light, out-of-focus city light bokeh balls background, neo-noir crushed shadow treatment",
  };

  export const SFX_PACK_PROMPTS: Record<number, string> = {
    101: "massive Hollywood practical explosion: percussion crack, debris rumble, spherical pressure wave, long reverb tail with distant echo",
    102: "detailed cinematic foley: realistic material contact sounds, cloth movement, object handling weight, footstep texture on surface",
    103: "futuristic sound design: alien ambience, energy weapon discharge, spaceship hydraulics, digital interface scan tones",
    104: "rich immersive binaural atmosphere: layered environmental soundscape, natural and urban textural depth",
    105: "psychological horror stinger: atonal drone building to sub-bass tension swell, sudden sharp impact, unsettling creature breath",
    106: "fight choreography SFX: heavy punch impact, flesh contact, whoosh on miss, bone crack, body fall, crowd gasp",
    107: "realistic firearm: chamber load, shot crack with muzzle blast character, indoor reverb tail, brass ejection",
    108: "vehicle engine progression: startup idle through acceleration to high RPM, brake squeal, tyre screech",
    109: "crowd atmosphere: walla murmur building to cheer swell, stadium reverb bloom, audience reaction",
    110: "natural soundscape: layered bird song, wind through foliage, water over rocks, wildlife at distance",
    111: "cinematic impact: deep bass drop, high whoosh, full orchestra hit, trailer stinger reverb bloom",
    112: "digital interface: notification chime, data processing tone, scanning beep sequence, tech interaction confirm",
    113: "orchestral sting: full ensemble tutti hit with string swell, brass fanfare accent, tympani crash with tail",
    114: "underwater ambience: deep pressure rumble, bubble streams, whale song echo, muffled surface world",
    115: "period battle SFX: steel sword clash ring, shield impact, horse hooves on stone, cannon boom, war cry",
  };

  export function buildVfxPromptInjection(packIds: number[]): string {
    return packIds.map(id => VFX_PACK_PROMPTS[id]).filter(Boolean).join(", ");
  }

  export function buildSfxPromptInjection(packIds: number[]): string {
    return packIds.map(id => SFX_PACK_PROMPTS[id]).filter(Boolean).join(", ");
  }

  /** Called by the scene generation pipeline to fetch and inject a user's active packs. */
  export async function getVfxLibraryPrompt(
    userId: number,
    dbConn: any
  ): Promise<{ vfx: string; sfx: string; vfxIds: number[]; sfxIds: number[] }> {
    try {
      const rows: any = await dbConn.execute(
        sql`SELECT packId, packType FROM user_vfx_library WHERE userId = ${userId} AND isActive = 1 LIMIT 10`
      );
      const data: any[] = Array.isArray(rows[0]) ? rows[0] : [];
      const vfxIds = data.filter(r => r.packType === "vfx").map(r => Number(r.packId));
      const sfxIds = data.filter(r => r.packType === "sfx").map(r => Number(r.packId));
      return { vfx: buildVfxPromptInjection(vfxIds), sfx: buildSfxPromptInjection(sfxIds), vfxIds, sfxIds };
    } catch {
      return { vfx: "", sfx: "", vfxIds: [], sfxIds: [] };
    }
  }
  