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
            visualSpec: "35-42 year old man, British-Australian heritage, angular jawline with refined dark stubble, dark brown hair swept back with slight dishevelment, piercing grey-green eyes, lean athletic build with broad shoulders, a faint scar above right eyebrow, sharp aristocratic features with a dangerous undercurrent, dressed in a tailored dark charcoal suit with open collar revealing a white shirt",
      promptStyle: "dramatic amber-toned cinematic lighting, film noir shadows, warm tungsten backlight, prestige drama aesthetic",
      portraitUrl: "/portraits/julian-vance.png",
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
            visualSpec: "28-35 year old woman, Eastern European heritage, platinum-white blonde hair pulled back severely into a chignon, ice-blue eyes with extraordinary intensity, porcelain pale skin, razor-sharp cheekbones, slender elegant build with perfect posture, cold composed expression, dressed in minimalist black high-fashion",
      promptStyle: "cold blue-white cinematic lighting, high contrast shadows, clinical precision lighting, prestige thriller aesthetic",
      portraitUrl: "/portraits/elena-rostova.png",
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
            visualSpec: "28-34 year old woman, Latin American heritage, warm tawny-olive skin, long dark wavy chestnut hair loose over shoulders, large expressive dark brown almond-shaped eyes, full lips with warm natural colour, mid-height athletic figure, face that radiates warmth but holds concealed strength",
      promptStyle: "warm rose-golden cinematic lighting, soft dramatic shadows, romantic drama aesthetic",
      portraitUrl: "/portraits/sofia-reyes.png",
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
            visualSpec: "32-40 year old man, West African heritage, deep ebony skin, close-cropped natural hair, deep dark brown piercing eyes, powerful broad-shouldered athletic physique, strong square jaw, intense commanding gaze that fills the frame, dressed in dark fitted clothing",
      promptStyle: "dramatic emerald-toned cinematic lighting, powerful shadows, action drama aesthetic, authoritative presence",
      portraitUrl: "/portraits/kofi-adebayo.png",
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
            visualSpec: "30-38 year old man, Japanese heritage, black straight hair with a subtle undercut, dark narrow intense eyes, lean medium build, smooth skin, very still composed face, slight angular jaw, a stillness that reads as contained danger, dressed in dark minimalist fitted clothing",
      promptStyle: "cool blue neo-noir cinematic lighting, rain-slicked reflections suggested, high contrast shadows, film noir aesthetic",
      portraitUrl: "/portraits/kenji-sato.png",
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
            visualSpec: "30-38 year old man, Ghanaian-British heritage, medium-dark warm brown skin, short natural hair with clean fade at temples, warm dark eyes with emotional depth, broad trustworthy face, medium athletic build, open approachable features that show hidden complexity",
      promptStyle: "warm orange-amber cinematic lighting, naturalistic dramatic shadows, prestige drama aesthetic",
      portraitUrl: "/portraits/marcus-osei.png",
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
            visualSpec: "26-33 year old woman, West African Guinean heritage, deep rich dark skin, natural textured hair or elegant braids, dark determined eyes with quiet intensity, elegant athletic build, sharp observant features, deceptively calm composed expression with visible inner relentlessness",
      promptStyle: "violet-purple dramatic cinematic lighting, dramatic shadows, psychological thriller aesthetic",
      portraitUrl: "/portraits/amara-diallo.png",
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
            visualSpec: "27-35 year old woman, Japanese heritage, sleek black hair in a precise chin-length bob, dark almond eyes with extraordinary control, porcelain pale skin, slender elegant build, perfectly composed still features, minimalist dark fashion, every detail intentional",
      promptStyle: "indigo-cool cinematic lighting, precise rim lighting, noir aesthetic, razor-sharp focus",
      portraitUrl: "/portraits/yuki-tanaka.png",
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
            visualSpec: "50-60 year old man, Czech Eastern European heritage, silver-grey hair, deeply weathered lined face with quiet authority, pale grey eyes that have seen everything, powerful stocky build, heavy jaw, presence that does not need to announce itself, dressed in expensive understated dark clothing",
      promptStyle: "stone-grey cinematic lighting, dramatic shadows, crime drama aesthetic, authority without aggression",
      portraitUrl: "/portraits/viktor-vale.png",
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
            visualSpec: "45-55 year old man, Lebanese-Moroccan heritage, salt-and-pepper beard trimmed close, dark curly hair going silver at temples, warm dark eyes with dangerous intelligence behind warmth, olive skin, stocky powerful build, an expansive warm face that conceals enormous danger, dressed in well-worn expensive casual clothes",
      promptStyle: "warm amber-ochre cinematic lighting, comfortable yet dangerous atmosphere, crime thriller aesthetic",
      portraitUrl: "/portraits/tariq-haddad.png",
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
            visualSpec: "Two identical women, 28-35 years old, Irish heritage, copper-red hair (one loose, one precisely tied), sharp green eyes (one calculating, one with a subtle smile), freckled pale skin, wiry athletic build, identical features with subtly different expressions suggesting two sides of the same danger, dressed in dark practical matching clothing",
      promptStyle: "dual-tone dramatic cinematic lighting, thriller aesthetic, unsettling symmetry, crime drama",
      portraitUrl: "/portraits/gallagher-twins.png",
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
            visualSpec: "35-45 year old man, Anglo-Australian heritage, mousy brown hair with natural parting, average build with slight suburban softness, ordinary trustworthy face, blue-grey eyes, the kind of unremarkable face that makes him invisible until he isn't, dressed in smart suburban casual — the everyman hiding in plain sight",
      promptStyle: "flat neutral cinematic lighting, suburban drama aesthetic, deceptive ordinariness",
      portraitUrl: "/portraits/daniel-cross.png",
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
            visualSpec: "55-65 year old woman, British heritage, short neat silver-white hair, observant pale blue eyes behind reading glasses (glasses hanging around neck), soft weathered face with quiet authority, modest build, appearing completely harmless while cataloguing everything in the room",
      promptStyle: "soft natural cinematic lighting, domestic drama aesthetic, deceptive harmlessness",
      portraitUrl: "/portraits/mavis-whitlock.png",
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
            visualSpec: "40-50 year old woman, Anglo-Australian heritage, immaculate honey-blonde hair in perfect waves, sharp grey eyes with an unreadable expression, elegant composed features, slender maintained build with impeccable posture, dressed in pristine cream or pale pastel, absolutely impossible to read",
      promptStyle: "cool cream-white cinematic lighting, pristine aesthetic, psychological thriller undertones",
      portraitUrl: "/portraits/celeste-vale.png",
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
            visualSpec: "40-50 year old man, Russian Eastern Slavic heritage, shaved head, steel-grey eyes, enormous powerful frame with hands like sledgehammers, deep lines etched around eyes and jaw, utterly still watchful expression, presence that changes the atmosphere of every room he enters, dressed in dark practical clothing",
      promptStyle: "dark steel cinematic lighting, deep shadows, crime thriller aesthetic, menace without movement",
      portraitUrl: "/portraits/big-sasha.png",
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
            visualSpec: "35-45 year old man, Russian Eastern Slavic heritage, short dirty-blond hair, warm calculating hazel-green eyes that smile while taking inventory, medium compact build that belies considerable strength, disarming genuine-looking smile, friendly unremarkable face that is precisely the point",
      promptStyle: "warm neutral cinematic lighting, disarming friendliness over darker undertones, crime dark comedy aesthetic",
      portraitUrl: "/portraits/little-sasha.png",
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
  