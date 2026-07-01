import { TRPCError } from "@trpc/server";
import { getEffectiveTier, type SubscriptionTier } from "./subscription";

export type SwappysProduct = "standalone" | "virelle_studio";
export type SwappysWatermarkMode = "visible_required" | "small_required" | "tiny_disclosure" | "studio_hidden_visible_mark";
export type VfxQuality = "preview" | "final" | "master";
export type VfxJobKind =
  | "general_vfx"
  | "digital_double"
  | "stunt_face_replacement"
  | "actor_continuity_match"
  | "pickup_scene_match"
  | "ai_stunt_insert"
  | "cleanup"
  | "composite"
  | "restoration"
  | "finishing_qc";

const TIER_RANK: Record<SubscriptionTier | "none", number> = {
  none: 0,
  indie: 1,
  amateur: 2,
  independent: 3,
  creator: 3,
  studio: 3,
  industry: 4,
  beta: 5,
};

export const VFX_STUDIO_EFFECT_CATALOGUE = {
  swappysDigitalDouble: [
    "swappys-digital-double",
    "stunt-face-replacement",
    "actor-continuity-match",
    "pickup-scene-match",
    "ai-stunt-insert",
    "performance-polish",
  ],
  compositingAndPlates: [
    "roto-person-isolation",
    "green-screen-keying",
    "background-replacement",
    "foreground-composite",
    "sky-replacement",
    "set-extension",
    "crowd-multiplication",
  ],
  cleanupAndSafety: [
    "object-removal-inpaint",
    "wire-rig-removal",
    "safety-gear-removal",
    "reflection-cleanup",
    "screen-replacement",
  ],
  actionAndAtmosphere: [
    "muzzle-flash-practical",
    "debris-dust-impact",
    "weather-rain-snow",
    "fire-smoke-atmosphere",
    "motion-blur-add",
    "lens-flare-add",
  ],
  restorationAndQuality: [
    "upscale-4k",
    "upscale-8k",
    "denoising-grain-removal",
    "face-enhancement",
    "beauty-retouch-film",
    "de-age-subtle",
    "film-damage-restore",
    "deflicker-exposure",
  ],
  finishingAndQc: [
    "color-match",
    "style-transfer",
    "film-grain-add",
    "depth-of-field-post",
    "vignette-add",
    "stabilization",
    "lens-distortion-repair",
    "chromatic-repair",
    "final-qc-pass",
  ],
} as const;

export function hasTier(user: any, minimum: SubscriptionTier): boolean {
  const tier = getEffectiveTier(user);
  return (TIER_RANK[tier] ?? 0) >= (TIER_RANK[minimum] ?? 0);
}

export function requireVfxStudioTier(user: any, minimum: SubscriptionTier, featureName: string): SubscriptionTier {
  const tier = getEffectiveTier(user);
  if (!hasTier(user, minimum)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${featureName} requires ${minimum === "amateur" ? "Creator" : minimum} membership or higher.`,
    });
  }
  return tier;
}

export function getSwappysWatermarkMode(input: {
  product: SwappysProduct;
  user?: any;
  hideVisibleWatermark?: boolean;
  standalonePaid?: boolean;
}): SwappysWatermarkMode {
  if (input.product === "standalone") {
    // Standalone Swappys is the low-cost acquisition product. It stays visibly marked.
    return input.standalonePaid ? "small_required" : "visible_required";
  }

  const canUseStudioControls = input.user ? hasTier(input.user, "amateur") : false;
  if (input.hideVisibleWatermark && !canUseStudioControls) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Studio watermark controls require Virelle Creator membership or higher.",
    });
  }
  if (input.hideVisibleWatermark) return "studio_hidden_visible_mark";
  return canUseStudioControls ? "tiny_disclosure" : "visible_required";
}

export function getVfxCreditCost(input: {
  jobKind: VfxJobKind;
  quality: VfxQuality;
  operationCount?: number;
}): number {
  if (input.jobKind === "digital_double" || input.jobKind === "stunt_face_replacement" || input.jobKind === "actor_continuity_match" || input.jobKind === "pickup_scene_match" || input.jobKind === "ai_stunt_insert") {
    if (input.quality === "preview") return 12;
    if (input.quality === "final") return 24;
    return 40;
  }

  const count = Math.max(1, input.operationCount ?? 1);
  const base = count <= 2 ? 6 : count <= 5 ? 12 : 18;
  if (input.quality === "preview") return base;
  if (input.quality === "final") return Math.ceil(base * 1.8);
  return Math.ceil(base * 3);
}

export function assertDigitalLikenessConsent(input: {
  jobKind: VfxJobKind;
  consentConfirmed?: boolean;
}) {
  const requiresConsent = [
    "digital_double",
    "stunt_face_replacement",
    "actor_continuity_match",
    "pickup_scene_match",
    "ai_stunt_insert",
  ].includes(input.jobKind);

  if (requiresConsent && !input.consentConfirmed) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Actor likeness consent must be confirmed before using Swappys Digital Double or related actor-continuity effects.",
    });
  }
}

export function buildVfxAuditMetadata(input: {
  product: SwappysProduct;
  jobKind: VfxJobKind;
  quality: VfxQuality;
  operations: string[];
  watermarkMode: SwappysWatermarkMode;
  consentConfirmed?: boolean;
  consentNotes?: string | null;
  sourcePlateUrl?: string | null;
  actorReferenceUrl?: string | null;
  estimatedCredits: number;
}) {
  return {
    product: input.product,
    tool: input.jobKind.startsWith("digital") || input.jobKind.includes("actor") || input.jobKind.includes("stunt") ? "Swappys Digital Double" : "Virelle VFX Studio",
    aiAltered: true,
    quality: input.quality,
    operations: input.operations,
    sourcePlateUrl: input.sourcePlateUrl ?? null,
    actorReferenceUrl: input.actorReferenceUrl ?? null,
    visibleWatermarkMode: input.watermarkMode,
    consent: {
      required: input.jobKind !== "general_vfx",
      confirmed: Boolean(input.consentConfirmed),
      notes: input.consentNotes ?? null,
    },
    credits: {
      estimated: input.estimatedCredits,
    },
    provenance: {
      platform: "Virelle Studios",
      disclosure: input.watermarkMode === "studio_hidden_visible_mark"
        ? "Visible watermark hidden for paid studio production export; internal audit/provenance retained."
        : "Visible AI-altered disclosure retained.",
      createdAt: new Date().toISOString(),
    },
  };
}

export function getSwappysFunnelPricing() {
  return {
    standalone: {
      name: "Swappys Standalone",
      role: "entry product / traffic capture",
      suggestedMonthlyPriceAud: 7,
      watermark: "required visible Swappys mark",
      limits: ["short clips", "basic appearance swap", "record/play/pause/delete", "limited export quality"],
    },
    virelleCreator: {
      name: "Virelle Creator",
      role: "serious film-production upgrade",
      suggestedMonthlyPriceAud: 99,
      watermark: "studio-controlled visible watermark toggle with internal audit/provenance retained",
      limits: ["full VFX Suite", "digital-double controls", "advanced compositing", "higher render quality", "credits system"],
    },
  };
}
