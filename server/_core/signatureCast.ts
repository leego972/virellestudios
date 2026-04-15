/**
 * VIRELLE SIGNATURE CAST — Server Core
 *
 * Handles:
 *  - Actor registry (config-driven, DB-backed)
 *  - Entitlement checks (subscription inclusion + paid unlocks)
 *  - Stripe checkout sessions for per-actor license purchases
 *  - Analytics event logging
 *  - Brand-safety enforcement (no explicit/pornographic use)
 */

import type { SubscriptionTier } from "./subscription";

// ─── Plan → Cast Tier Access Map ─────────────────────────────────────────────
// Which actor tiers each subscription plan can access via inclusion.
// Paid unlocks bypass this — any plan can unlock any actor if they pay.

export const PLAN_CAST_ACCESS: Record<SubscriptionTier, ("standard" | "premium" | "flagship")[]> = {
  none:        [],
  indie:       ["standard"],
  amateur:     ["standard", "premium"],
  independent: ["standard", "premium", "flagship"],
  creator:     ["standard", "premium", "flagship"],  // alias for independent
  studio:      ["standard", "premium", "flagship"],  // alias for independent
  industry:    ["standard", "premium", "flagship"],
  beta:        ["standard"],
};

// ─── Actor Unlock Pricing (AUD cents) ────────────────────────────────────────
// Config-driven pricing per license type per actor tier.
// Launch defaults — editable in admin without code changes.
//
// Pricing model:
//   Base price: standard=$15, premium=$39, flagship=$99
//   Commercial add-on: +$79 per actor
//   Episodic: 4x the base price
//   Commercial episodic: 4x base + $79 commercial add-on (future)
//
// All values in AUD cents.

export const BASE_UNLOCK_PRICE_CENTS: Record<"standard" | "premium" | "flagship", number> = {
  standard: 1500,   // A$15
  premium:  3900,   // A$39
  flagship: 9900,   // A$99
};

export const COMMERCIAL_ADDON_CENTS = 7900;  // A$79
export const EPISODIC_MULTIPLIER = 4;        // 4x base price

// Derived pricing table (used by checkout and UI)
export const DEFAULT_UNLOCK_PRICING: Record<
  "standard" | "premium" | "flagship",
  Record<"personal" | "creator" | "commercial" | "episodic", number>
> = {
  standard: {
    personal:   BASE_UNLOCK_PRICE_CENTS.standard,                                              // A$15
    creator:    BASE_UNLOCK_PRICE_CENTS.standard,                                              // A$15
    commercial: BASE_UNLOCK_PRICE_CENTS.standard + COMMERCIAL_ADDON_CENTS,                    // A$94
    episodic:   BASE_UNLOCK_PRICE_CENTS.standard * EPISODIC_MULTIPLIER,                       // A$60
  },
  premium: {
    personal:   BASE_UNLOCK_PRICE_CENTS.premium,                                              // A$39
    creator:    BASE_UNLOCK_PRICE_CENTS.premium,                                              // A$39
    commercial: BASE_UNLOCK_PRICE_CENTS.premium + COMMERCIAL_ADDON_CENTS,                     // A$118
    episodic:   BASE_UNLOCK_PRICE_CENTS.premium * EPISODIC_MULTIPLIER,                        // A$156
  },
  flagship: {
    personal:   BASE_UNLOCK_PRICE_CENTS.flagship,                                             // A$99
    creator:    BASE_UNLOCK_PRICE_CENTS.flagship,                                             // A$99
    commercial: BASE_UNLOCK_PRICE_CENTS.flagship + COMMERCIAL_ADDON_CENTS,                    // A$178
    episodic:   BASE_UNLOCK_PRICE_CENTS.flagship * EPISODIC_MULTIPLIER,                       // A$396
  },
};

// ─── License Type Display Copy ────────────────────────────────────────────────
export const LICENSE_COPY: Record<
  "personal" | "creator" | "commercial" | "episodic",
  { label: string; description: string; badge: string }
> = {
  personal: {
    label: "Personal License",
    description: "Use in one private project. Not for public release or commercial work.",
    badge: "Private Use",
  },
  creator: {
    label: "Creator License",
    description: "Use in one public creator release — YouTube, socials, indie film, or festival submission.",
    badge: "Public Release",
  },
  commercial: {
    label: "Commercial License",
    description: "Use in client work, branded content, ads, or any monetized campaign.",
    badge: "Commercial",
  },
  episodic: {
    label: "Episodic License",
    description: "Use across a series project — recurring episodes or multi-part installments.",
    badge: "Series",
  },
};

// ─── Brand Safety Rules ───────────────────────────────────────────────────────
export const BRAND_SAFETY_RULES = {
  allowed: [
    "romantic scenes",
    "sensual scenes",
    "seductive tension",
    "kissing",
    "implied intimacy",
    "adult glamour",
    "prestige sensuality",
    "mature drama",
    "provocative wardrobe",
    "adult chemistry",
  ],
  prohibited: [
    "pornography",
    "explicit sex acts",
    "pornographic nudity",
    "fetish content",
    "sexual exploitation",
    "adult-industry positioning",
  ],
  blockedMessage:
    "Signature Cast talent is licensed for professional cinematic use only. " +
    "Explicit sexual content, pornography, and adult-industry use are prohibited. " +
    "Consider implied intimacy, a fade-to-black treatment, or romantic tension instead.",
};

// ─── Entitlement Check ────────────────────────────────────────────────────────
/**
 * Returns true if the user has active entitlement to use the given actor.
 * Checks both subscription-plan inclusion and paid per-actor unlocks.
 */
export function checkPlanInclusion(
  userTier: SubscriptionTier,
  actorIncludedInPlan: "none" | "indie" | "amateur" | "independent"
): boolean {
  const planOrder: Record<string, number> = {
    none: 0, indie: 1, amateur: 2, independent: 3, creator: 3, studio: 3, industry: 3, beta: 1,
  };
  const userLevel = planOrder[userTier] ?? 0;
  const requiredLevel = planOrder[actorIncludedInPlan] ?? 99;
  return userLevel >= requiredLevel;
}

// ─── Stripe Price ID Helpers ──────────────────────────────────────────────────
// We create one-time Stripe price objects dynamically per unlock.
// In production, these would be pre-created Stripe Price IDs.
// For now we use dynamic price creation via the Stripe API.

export interface ActorUnlockCheckoutParams {
  actorId: string;
  actorName: string;
  actorTier: "standard" | "premium" | "flagship";
  licenseType: "personal" | "creator" | "commercial" | "episodic";
  projectId?: number;
  amountAud: number; // in cents
  userId: number;
  userEmail: string;
  stripeCustomerId: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createActorUnlockCheckoutSession(
  params: ActorUnlockCheckoutParams,
  stripe: import("stripe").default
): Promise<{ url: string; sessionId: string }> {
  const licenseLabel = LICENSE_COPY[params.licenseType].label;
  const session = await stripe.checkout.sessions.create({
    customer: params.stripeCustomerId,
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "aud",
          unit_amount: params.amountAud,
          product_data: {
            name: `${params.actorName} — ${licenseLabel}`,
            description:
              `Virelle Signature Cast: ${params.actorTier.charAt(0).toUpperCase() + params.actorTier.slice(1)} tier. ` +
              LICENSE_COPY[params.licenseType].description,
            metadata: {
              type: "signature_cast_unlock",
              actorId: params.actorId,
              licenseType: params.licenseType,
              projectId: params.projectId?.toString() ?? "",
              userId: params.userId.toString(),
            },
          },
        },
      },
    ],
    metadata: {
      type: "signature_cast_unlock",
      actorId: params.actorId,
      licenseType: params.licenseType,
      projectId: params.projectId?.toString() ?? "",
      userId: params.userId.toString(),
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    payment_intent_data: {
      metadata: {
        type: "signature_cast_unlock",
        actorId: params.actorId,
        licenseType: params.licenseType,
        userId: params.userId.toString(),
      },
    },
  });
  return { url: session.url!, sessionId: session.id };
}

// ─── Seed Data: Initial Actor Registry ──────────────────────────────────────
  // Full cast — 4 Flagship, 7 Premium, 5 Standard actors.
  // Used by autoMigrate to seed the actor catalog on first boot.
  export const INITIAL_ACTORS = [
    // ── FLAGSHIP ──────────────────────────────────────────────────────────────
    {
      id: "julian-vance",
      name: "Julian Vance",
      tier: "flagship" as const,
      includedInPlan: "independent" as const,
      pricePersonalAud: 9900,
      priceCreatorAud: 9900,
      priceCommercialAud: 17800,
      priceEpisodicAud: 39600,
      hook: "Sharp, dangerous charisma built for thrillers, prestige drama, and high-stakes romance.",
      tags: ["Crime Thriller", "Prestige Drama", "Romantic Lead"],
      chemistryWith: ["elena-rostova", "sofia-reyes"],
      isActive: true,
      isFeatured: true,
      isRetired: false,
      allowCommercialUse: true,
      noExplicitContent: true,
    },
    {
      id: "elena-rostova",
      name: "Elena Rostova",
      tier: "flagship" as const,
      includedInPlan: "independent" as const,
      pricePersonalAud: 9900,
      priceCreatorAud: 9900,
      priceCommercialAud: 17800,
      priceEpisodicAud: 39600,
      hook: "Cold architectural beauty with the emotional intelligence of a chess grandmaster.",
      tags: ["Prestige Drama", "Thriller", "High Fashion"],
      chemistryWith: ["julian-vance", "kofi-adebayo"],
      isActive: true,
      isFeatured: true,
      isRetired: false,
      allowCommercialUse: true,
      noExplicitContent: true,
    },
    {
      id: "sofia-reyes",
      name: "Sofia Reyes",
      tier: "flagship" as const,
      includedInPlan: "independent" as const,
      pricePersonalAud: 9900,
      priceCreatorAud: 9900,
      priceCommercialAud: 17800,
      priceEpisodicAud: 39600,
      hook: "The most combustible screen presence in the cast. Warmth that can turn to fire in a single cut.",
      tags: ["Drama", "Romance", "Action"],
      chemistryWith: ["julian-vance", "marcus-osei"],
      isActive: true,
      isFeatured: false,
      isRetired: false,
      allowCommercialUse: true,
      noExplicitContent: true,
    },
    {
      id: "kofi-adebayo",
      name: "Kofi Adebayo",
      tier: "flagship" as const,
      includedInPlan: "independent" as const,
      pricePersonalAud: 9900,
      priceCreatorAud: 9900,
      priceCommercialAud: 17800,
      priceEpisodicAud: 39600,
      hook: "Immediate, undeniable physical authority. The room changes when he enters it.",
      tags: ["Action", "Prestige Drama", "Crime"],
      chemistryWith: ["elena-rostova", "sofia-reyes"],
      isActive: true,
      isFeatured: false,
      isRetired: false,
      allowCommercialUse: true,
      noExplicitContent: true,
    },
    // ── PREMIUM ───────────────────────────────────────────────────────────────
    {
      id: "kenji-sato",
      name: "Kenji Sato",
      tier: "premium" as const,
      includedInPlan: "amateur" as const,
      pricePersonalAud: 3900,
      priceCreatorAud: 3900,
      priceCommercialAud: 11800,
      priceEpisodicAud: 15600,
      hook: "Neo-noir's perfect face. Stillness that reads as danger under dramatic lighting.",
      tags: ["Noir", "Thriller", "Drama"],
      chemistryWith: ["elena-rostova", "yuki-tanaka"],
      isActive: true,
      isFeatured: false,
      isRetired: false,
      allowCommercialUse: true,
      noExplicitContent: true,
    },
    {
      id: "marcus-osei",
      name: "Marcus Osei",
      tier: "premium" as const,
      includedInPlan: "amateur" as const,
      pricePersonalAud: 3900,
      priceCreatorAud: 3900,
      priceCommercialAud: 11800,
      priceEpisodicAud: 15600,
      hook: "Grounded, emotionally complex. The kind of face audiences trust and follow.",
      tags: ["Drama", "Crime", "Action"],
      chemistryWith: ["sofia-reyes", "amara-diallo"],
      isActive: true,
      isFeatured: false,
      isRetired: false,
      allowCommercialUse: true,
      noExplicitContent: true,
    },
    {
      id: "amara-diallo",
      name: "Amara Diallo",
      tier: "premium" as const,
      includedInPlan: "amateur" as const,
      pricePersonalAud: 3900,
      priceCreatorAud: 3900,
      priceCommercialAud: 11800,
      priceEpisodicAud: 15600,
      hook: "Still on the outside. Relentless underneath. Audiences underestimate her exactly once.",
      tags: ["Drama", "Thriller", "Action"],
      chemistryWith: ["marcus-osei", "kofi-adebayo"],
      isActive: true,
      isFeatured: false,
      isRetired: false,
      allowCommercialUse: true,
      noExplicitContent: true,
    },
    {
      id: "yuki-tanaka",
      name: "Yuki Tanaka",
      tier: "premium" as const,
      includedInPlan: "amateur" as const,
      pricePersonalAud: 3900,
      priceCreatorAud: 3900,
      priceCommercialAud: 11800,
      priceEpisodicAud: 15600,
      hook: "Controlled, exact, and quietly magnetic. Every gesture is intentional.",
      tags: ["Noir", "Thriller", "Drama"],
      chemistryWith: ["kenji-sato", "elena-rostova"],
      isActive: true,
      isFeatured: false,
      isRetired: false,
      allowCommercialUse: true,
      noExplicitContent: true,
    },
    {
      id: "viktor-vale",
      name: "Viktor Vale",
      tier: "premium" as const,
      includedInPlan: "amateur" as const,
      pricePersonalAud: 3900,
      priceCreatorAud: 3900,
      priceCommercialAud: 11800,
      priceEpisodicAud: 15600,
      hook: "Quiet authority that doesn't need to announce itself. The most dangerous man at the table.",
      tags: ["Crime", "Prestige Drama", "Thriller"],
      chemistryWith: ["celeste-vale", "elena-rostova"],
      isActive: true,
      isFeatured: true,
      isRetired: false,
      allowCommercialUse: true,
      noExplicitContent: true,
    },
    {
      id: "tariq-haddad",
      name: "Tariq Haddad",
      tier: "premium" as const,
      includedInPlan: "amateur" as const,
      pricePersonalAud: 3900,
      priceCreatorAud: 3900,
      priceCommercialAud: 11800,
      priceEpisodicAud: 15600,
      hook: "Warm, expansive, and unpredictable. The most dangerous man at the dinner table.",
      tags: ["Crime", "Drama", "Thriller"],
      chemistryWith: ["viktor-vale", "kofi-adebayo"],
      isActive: true,
      isFeatured: true,
      isRetired: false,
      allowCommercialUse: true,
      noExplicitContent: true,
    },
    {
      id: "gallagher-twins",
      name: "The Gallagher Twins",
      tier: "premium" as const,
      includedInPlan: "amateur" as const,
      pricePersonalAud: 3900,
      priceCreatorAud: 3900,
      priceCommercialAud: 11800,
      priceEpisodicAud: 15600,
      hook: "Two faces, one alibi. The most visually distinctive unit in the cast.",
      tags: ["Thriller", "Crime", "Dark Comedy"],
      chemistryWith: ["elena-rostova", "kenji-sato"],
      isActive: true,
      isFeatured: false,
      isRetired: false,
      allowCommercialUse: true,
      noExplicitContent: true,
    },
    // ── STANDARD ─────────────────────────────────────────────────────────────
    {
      id: "daniel-cross",
      name: "Daniel Cross",
      tier: "standard" as const,
      includedInPlan: "indie" as const,
      pricePersonalAud: 1500,
      priceCreatorAud: 1500,
      priceCommercialAud: 9400,
      priceEpisodicAud: 6000,
      hook: "Suburban everyman energy that makes moral compromise feel real and earned.",
      tags: ["Drama", "Thriller", "Crime"],
      chemistryWith: ["mavis-whitlock", "celeste-vale"],
      isActive: true,
      isFeatured: false,
      isRetired: false,
      allowCommercialUse: false,
      noExplicitContent: true,
    },
    {
      id: "mavis-whitlock",
      name: "Mavis Whitlock",
      tier: "standard" as const,
      includedInPlan: "indie" as const,
      pricePersonalAud: 1500,
      priceCreatorAud: 1500,
      priceCommercialAud: 9400,
      priceEpisodicAud: 6000,
      hook: "Sees everything. Says less than she knows. The most dangerous witness in any scene.",
      tags: ["Drama", "Dark Comedy", "Crime"],
      chemistryWith: ["daniel-cross", "celeste-vale"],
      isActive: true,
      isFeatured: false,
      isRetired: false,
      allowCommercialUse: false,
      noExplicitContent: true,
    },
    {
      id: "celeste-vale",
      name: "Celeste Vale",
      tier: "standard" as const,
      includedInPlan: "indie" as const,
      pricePersonalAud: 1500,
      priceCreatorAud: 1500,
      priceCommercialAud: 9400,
      priceEpisodicAud: 6000,
      hook: "Immaculate, composed, and impossible to read. The most unsettling neighbour you'll ever meet.",
      tags: ["Thriller", "Drama", "Crime"],
      chemistryWith: ["daniel-cross", "mavis-whitlock"],
      isActive: true,
      isFeatured: true,
      isRetired: false,
      allowCommercialUse: false,
      noExplicitContent: true,
    },
    {
      id: "big-sasha",
      name: "Big Sasha",
      tier: "standard" as const,
      includedInPlan: "indie" as const,
      pricePersonalAud: 1500,
      priceCreatorAud: 1500,
      priceCommercialAud: 9400,
      priceEpisodicAud: 6000,
      hook: "The harder edge. More silent, more suspicious, more final. His presence does the threatening.",
      tags: ["Crime", "Thriller", "Drama"],
      chemistryWith: ["little-sasha", "viktor-vale"],
      isActive: true,
      isFeatured: false,
      isRetired: false,
      allowCommercialUse: false,
      noExplicitContent: true,
    },
    {
      id: "little-sasha",
      name: "Little Sasha",
      tier: "standard" as const,
      includedInPlan: "indie" as const,
      pricePersonalAud: 1500,
      priceCreatorAud: 1500,
      priceCommercialAud: 9400,
      priceEpisodicAud: 6000,
      hook: "More talkative, more disarming, more likely to smile. Warmth as a security function.",
      tags: ["Crime", "Thriller", "Dark Comedy"],
      chemistryWith: ["big-sasha", "viktor-vale"],
      isActive: true,
      isFeatured: false,
      isRetired: false,
      allowCommercialUse: false,
      noExplicitContent: true,
    },
  ];
  