/**
 * Stripe Auto-Provisioning
 *
 * Automatically creates Stripe products and prices on server startup
 * if they don't already exist. Uses the STRIPE_SECRET_KEY from env vars.
 *
 * MEMBERSHIP TIERS (AUD):
 *   Indie (DB: indie)              â A$149/month    or A$1,490/year   â 500 credits/mo
 *   Creator (DB: amateur)          â A$490/month    or A$4,900/year   â 2,000 credits/mo
 *   Studio (DB: independent)       â A$1,490/month  or A$14,900/year  â 6,000 credits/mo
 *   Production (DB: studio)        â From A$150,000/year (consultative) â 15,500 credits/mo
 *   Enterprise                     â Custom pricing (sales-led)         â 50,500 credits/mo
 *
 * FOUNDING MEMBER OFFER: 50% off first year on annual billing (VIRELLE_FOUNDER_50 coupon)
 *   Indie founder price:           A$745   first year (then A$1,490/yr)
 *   Creator founder price:          A$2,450  first year (then A$4,900/yr)
 *   Studio founder price:           A$7,450  first year (then A$14,900/yr)
 *
 * CREDIT PACKS (AUD â one-time top-ups):
 *   Starter Pack     â 100 credits    A$19     (A$0.19/credit)
 *   Producer Pack    â 300 credits    A$49     (A$0.16/credit â Save 16%)
 *   Director Pack    â 750 credits    A$99     (A$0.13/credit â Save 32%)
 *   Filmmaker Pack   â 2,000 credits  A$199    (A$0.10/credit â Save 47%)
 *   Blockbuster Pack â 5,000 credits  A$399    (A$0.08/credit â Save 58%)
 *   Mogul Pack       â 12,000 credits A$799    (A$0.07/credit â Save 63%)
 */
import Stripe from "stripe";
import { ENV } from "./env";
import { logger } from "./logger";

const stripe = ENV.stripeSecretKey
  ? new Stripe(ENV.stripeSecretKey, { apiVersion: "2026-02-25.clover" as any })
  : null;

// In-memory cache of resolved price IDs (populated on startup)
const resolvedPriceIds: Record<string, string> = {};

/**
 * Get a resolved Stripe price ID by internal key name.
 */
export function getStripePriceId(key: string): string {
  return resolvedPriceIds[key] || "";
}

// âââ Product & Price Definitions âââââââââââââââââââââââââââââââââââââââââââââ

interface PriceDefinition {
  key: string;
  envKey: string;
  productName: string;
  productDesc: string;
  unitAmount: number;    // Price in AUD cents
  currency: string;      // "aud"
  recurring?: { interval: "month" | "year" };
  metadata?: Record<string, string>;
  paymentMethodTypes?: string[];
}

const SUBSCRIPTION_PRICES: PriceDefinition[] = [

  // âââ Indie (DB: indie) â A$149/month âââââââââââââââââââââââââââââââââââââ
  {
    key: "indie_monthly",
    envKey: "stripeIndieMonthlyPriceId",
    productName: "Virelle Studios â Indie (Monthly)",
    productDesc: "AI film production platform â Indie tier, A$149/month, 500 credits/mo",
    unitAmount: 14900, // A$149 in cents
    currency: "aud",
    recurring: { interval: "month" },
    metadata: { tier: "indie", display_name: "Indie", billing: "monthly", credits: "500" },
    paymentMethodTypes: ["card"],
  },
  {
    key: "indie_annual",
    envKey: "stripeIndieAnnualPriceId",
    productName: "Virelle Studios â Indie (Annual)",
    productDesc: "AI film production platform â Indie tier, A$1,490/year, 500 credits/mo",
    unitAmount: 149000, // A$1,490 in cents (save ~17%)
    currency: "aud",
    recurring: { interval: "year" },
    metadata: { tier: "indie", display_name: "Indie", billing: "annual", credits: "500" },
    paymentMethodTypes: ["card"],
  },

  // âââ Creator (DB: amateur) â A$490/month âââââââââââââââââââââââââââââââââ
  // Note: DB tier name remains "amateur" for backward compat with existing subscribers
  {
    key: "auteur_monthly",
    envKey: "stripeCreatorMonthlyPriceId",
    productName: "Virelle Studios â Creator (Monthly)",
    productDesc: "AI film production platform â Creator tier, A$490/month, 2,000 credits/mo",
    unitAmount: 49000, // A$490 in cents
    currency: "aud",
    recurring: { interval: "month" },
    metadata: { tier: "amateur", display_name: "Creator", billing: "monthly", credits: "2000" },
    paymentMethodTypes: ["card"],
  },
  {
    key: "auteur_annual",
    envKey: "stripeCreatorAnnualPriceId",
    productName: "Virelle Studios â Creator (Annual)",
    productDesc: "AI film production platform â Creator tier, A$4,900/year, 2,000 credits/mo",
    unitAmount: 490000, // A$4,900 in cents (save ~17%)
    currency: "aud",
    recurring: { interval: "year" },
    metadata: { tier: "amateur", display_name: "Creator", billing: "annual", credits: "2000" },
    paymentMethodTypes: ["card"],
  },

  // âââ Studio (DB: independent) â A$1,490/month âââââââââââââââââââ
  {
    key: "production_pro_monthly",
    envKey: "stripeProductionProMonthlyPriceId",
    productName: "Virelle Studios â Studio (Monthly)",
    productDesc: "AI film production platform â Studio tier, A$1,490/month, 6,000 credits/mo",
    unitAmount: 149000, // A$1,490 in cents
    currency: "aud",
    recurring: { interval: "month" },
    metadata: { tier: "independent", display_name: "Studio", billing: "monthly", credits: "6000" },
    paymentMethodTypes: ["card"],
  },
  {
    key: "production_pro_annual",
    envKey: "stripeProductionProAnnualPriceId",
    productName: "Virelle Studios â Studio (Annual)",
    productDesc: "AI film production platform â Studio tier, A$14,900/year, 6,000 credits/mo",
    unitAmount: 1490000, // A$14,900 in cents (save ~17%)
    currency: "aud",
    recurring: { interval: "year" },
    metadata: { tier: "independent", display_name: "Studio", billing: "annual", credits: "6000" },
    paymentMethodTypes: ["card"],
  },

  // âââ Backward-compat aliases (old "amateur" / "independent" keys) ââââââââ
  // These point to the same products as auteur/production_pro above.
  // Kept so existing webhook handlers that reference old keys continue to work.
  {
    key: "amateur_monthly",
    envKey: "stripeAmateurMonthlyPriceId",
    productName: "Virelle Studios â Creator (Monthly)",
    productDesc: "AI film production platform â Creator tier, A$490/month, 2,000 credits/mo",
    unitAmount: 49000,
    currency: "aud",
    recurring: { interval: "month" },
    metadata: { tier: "amateur", display_name: "Creator", billing: "monthly", credits: "2000" },
    paymentMethodTypes: ["card"],
  },
  {
    key: "amateur_annual",
    envKey: "stripeAmateurAnnualPriceId",
    productName: "Virelle Studios â Creator (Annual)",
    productDesc: "AI film production platform â Creator tier, A$4,900/year, 2,000 credits/mo",
    unitAmount: 490000,
    currency: "aud",
    recurring: { interval: "year" },
    metadata: { tier: "amateur", display_name: "Creator", billing: "annual", credits: "2000" },
    paymentMethodTypes: ["card"],
  },
  {
    key: "independent_monthly",
    envKey: "stripeIndependentMonthlyPriceId",
    productName: "Virelle Studios â Studio (Monthly)",
    productDesc: "AI film production platform â Studio tier, A$1,490/month, 6,000 credits/mo",
    unitAmount: 149000,
    currency: "aud",
    recurring: { interval: "month" },
    metadata: { tier: "independent", display_name: "Studio", billing: "monthly", credits: "6000" },
    paymentMethodTypes: ["card"],
  },
  {
    key: "independent_annual",
    envKey: "stripeIndependentAnnualPriceId",
    productName: "Virelle Studios â Studio (Annual)",
    productDesc: "AI film production platform â Studio tier, A$14,900/year, 6,000 credits/mo",
    unitAmount: 1490000,
    currency: "aud",
    recurring: { interval: "year" },
    metadata: { tier: "independent", display_name: "Studio", billing: "annual", credits: "6000" },
    paymentMethodTypes: ["card"],
  },

  // âââ Studio â consultative; base annual price A$150,000 âââââââââââââââââ
  {
    key: "studio_annual",
    envKey: "stripeStudioAnnualPriceId",
    productName: "Virelle Studios â Studio (Annual Base)",
    productDesc: "AI film production platform â Studio tier, from A$150,000/year, 15,500 credits/mo",
    unitAmount: 15000000, // A$150,000 in cents
    currency: "aud",
    recurring: { interval: "year" },
    metadata: { tier: "studio", display_name: "Studio", billing: "annual", credits: "15500" },
    paymentMethodTypes: ["card"],
  },
  {
    key: "studio_monthly",
    envKey: "stripeStudioMonthlyPriceId",
    productName: "Virelle Studios â Studio (Monthly Base)",
    productDesc: "AI film production platform â Studio tier, from A$15,000/month, 15,500 credits/mo",
    unitAmount: 1500000, // A$15,000 in cents
    currency: "aud",
    recurring: { interval: "month" },
    metadata: { tier: "studio", display_name: "Studio", billing: "monthly", credits: "15500" },
    paymentMethodTypes: ["card"],
  },

  // âââ Enterprise â custom; base annual price A$300,000 ââââââââââ
  {
    key: "industry_enterprise_annual",
    envKey: "stripeIndustryEnterpriseAnnualPriceId",
    productName: "Virelle Studios â Enterprise (Annual Base)",
    productDesc: "AI film production platform â Enterprise tier, from A$300,000/year, 50,500 credits/mo",
    unitAmount: 30000000, // A$300,000 in cents
    currency: "aud",
    recurring: { interval: "year" },
    metadata: { tier: "industry", display_name: "Enterprise", billing: "annual", credits: "50500" },
    paymentMethodTypes: ["card"],
  },
  {
    key: "industry_enterprise_monthly",
    envKey: "stripeIndustryEnterpriseMonthlyPriceId",
    productName: "Virelle Studios â Enterprise (Monthly Base)",
    productDesc: "AI film production platform â Enterprise tier, from A$30,000/month, 50,500 credits/mo",
    unitAmount: 3000000, // A$30,000 in cents
    currency: "aud",
    recurring: { interval: "month" },
    metadata: { tier: "industry", display_name: "Enterprise", billing: "monthly", credits: "50500" },
    paymentMethodTypes: ["card"],
  },

  // âââ Backward-compat aliases (old "industry" keys) ââââââââââââââââââââââ
  {
    key: "industry_annual",
    envKey: "stripeIndustryAnnualPriceId",
    productName: "Virelle Studios â Enterprise (Annual Base)",
    productDesc: "AI film production platform â Enterprise tier, from A$300,000/year, 50,500 credits/mo",
    unitAmount: 30000000,
    currency: "aud",
    recurring: { interval: "year" },
    metadata: { tier: "industry", display_name: "Enterprise", billing: "annual", credits: "50500" },
    paymentMethodTypes: ["card"],
  },
  {
    key: "industry_monthly",
    envKey: "stripeIndustryMonthlyPriceId",
    productName: "Virelle Studios â Enterprise (Monthly Base)",
    productDesc: "AI film production platform â Enterprise tier, from A$30,000/month, 50,500 credits/mo",
    unitAmount: 3000000,
    currency: "aud",
    recurring: { interval: "month" },
    metadata: { tier: "industry", display_name: "Enterprise", billing: "monthly", credits: "50500" },
    paymentMethodTypes: ["card"],
  },
];

// Credit pack prices match the Pricing page UI (Pricing.tsx CREDIT_PACKS array).
// topup_10   = Starter Pack:     100 cr  A$19
// topup_50   = Producer Pack:    300 cr  A$49
// topup_100  = Director Pack:    750 cr  A$99
// topup_200  = Filmmaker Pack: 2,000 cr  A$199  (most popular)
// topup_500  = Blockbuster Pack: 5,000 cr A$399
// topup_1000 = Mogul Pack:    12,000 cr A$799
const TOPUP_PRICES: PriceDefinition[] = [
  {
    key: "topup_10",
    envKey: "stripeTopUp10PriceId",
    productName: "Virelle Studios â 100 Credits (Starter Pack)",
    productDesc: "One-time pack of 100 production credits â A$19 (A$0.19/credit)",
    unitAmount: 1900, // A$19
    currency: "aud",
    metadata: { type: "topup", credits: "100", pack: "starter" },
  },
  {
    key: "topup_50",
    envKey: "stripeTopUp50PriceId",
    productName: "Virelle Studios â 300 Credits (Producer Pack)",
    productDesc: "One-time pack of 300 production credits â A$49 (A$0.16/credit â Save 16%)",
    unitAmount: 4900, // A$49
    currency: "aud",
    metadata: { type: "topup", credits: "300", pack: "producer" },
  },
  {
    key: "topup_100",
    envKey: "stripeTopUp100PriceId",
    productName: "Virelle Studios â 750 Credits (Director Pack)",
    productDesc: "One-time pack of 750 production credits â A$99 (A$0.13/credit â Save 32%)",
    unitAmount: 9900, // A$99
    currency: "aud",
    metadata: { type: "topup", credits: "750", pack: "director" },
  },
  {
    key: "topup_200",
    envKey: "stripeTopUp200PriceId",
    productName: "Virelle Studios â 2,000 Credits (Filmmaker Pack)",
    productDesc: "One-time pack of 2,000 production credits â A$199 (A$0.10/credit â Save 47%)",
    unitAmount: 19900, // A$199
    currency: "aud",
    metadata: { type: "topup", credits: "2000", pack: "filmmaker" },
  },
  {
    key: "topup_500",
    envKey: "stripeTopUp500PriceId",
    productName: "Virelle Studios â 5,000 Credits (Blockbuster Pack)",
    productDesc: "One-time pack of 5,000 production credits â A$399 (A$0.08/credit â Save 58%)",
    unitAmount: 39900, // A$399
    currency: "aud",
    metadata: { type: "topup", credits: "5000", pack: "blockbuster" },
  },
  {
    key: "topup_1000",
    envKey: "stripeTopUp1000PriceId",
    productName: "Virelle Studios â 12,000 Credits (Mogul Pack)",
    productDesc: "One-time pack of 12,000 production credits â A$799 (A$0.07/credit â Save 63%)",
    unitAmount: 79900, // A$799
    currency: "aud",
    metadata: { type: "topup", credits: "12000", pack: "mogul" },
  },
];

// âââ Signature Cast One-Time License Prices âââââââââââââââââââââââââââââââââ
// 3 tiers Ã 3 license types = 9 prices (AUD, one-time)
// Standard: A$15 creator / A$94 commercial / A$60 episodic
// Premium:  A$39 creator / A$118 commercial / A$156 episodic
// Flagship: A$99 creator / A$178 commercial / A$396 episodic

const SIGNATURE_CAST_PRICES: PriceDefinition[] = [
  // âââ Standard Tier ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  {
    key: "sc_standard_creator",
    envKey: "stripeScStandardCreatorPriceId",
    productName: "Virelle Signature Cast â Standard Actor (Creator License)",
    productDesc: "One-time creator license for a Standard Signature Cast actor â personal/portfolio use, A$15",
    unitAmount: 1500, // A$15
    currency: "aud",
    metadata: { type: "signature_cast", tier: "standard", license: "creator" },
  },
  {
    key: "sc_standard_commercial",
    envKey: "stripeScStandardCommercialPriceId",
    productName: "Virelle Signature Cast â Standard Actor (Commercial License)",
    productDesc: "One-time commercial license for a Standard Signature Cast actor â paid campaigns, A$94",
    unitAmount: 9400, // A$94
    currency: "aud",
    metadata: { type: "signature_cast", tier: "standard", license: "commercial" },
  },
  {
    key: "sc_standard_episodic",
    envKey: "stripeScStandardEpisodicPriceId",
    productName: "Virelle Signature Cast â Standard Actor (Episodic License)",
    productDesc: "One-time episodic license for a Standard Signature Cast actor â series/multi-episode, A$60",
    unitAmount: 6000, // A$60
    currency: "aud",
    metadata: { type: "signature_cast", tier: "standard", license: "episodic" },
  },
  // âââ Premium Tier âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  {
    key: "sc_premium_creator",
    envKey: "stripeScPremiumCreatorPriceId",
    productName: "Virelle Signature Cast â Premium Actor (Creator License)",
    productDesc: "One-time creator license for a Premium Signature Cast actor â personal/portfolio use, A$39",
    unitAmount: 3900, // A$39
    currency: "aud",
    metadata: { type: "signature_cast", tier: "premium", license: "creator" },
  },
  {
    key: "sc_premium_commercial",
    envKey: "stripeScPremiumCommercialPriceId",
    productName: "Virelle Signature Cast â Premium Actor (Commercial License)",
    productDesc: "One-time commercial license for a Premium Signature Cast actor â paid campaigns, A$118",
    unitAmount: 11800, // A$118
    currency: "aud",
    metadata: { type: "signature_cast", tier: "premium", license: "commercial" },
  },
  {
    key: "sc_premium_episodic",
    envKey: "stripeScPremiumEpisodicPriceId",
    productName: "Virelle Signature Cast â Premium Actor (Episodic License)",
    productDesc: "One-time episodic license for a Premium Signature Cast actor â series/multi-episode, A$156",
    unitAmount: 15600, // A$156
    currency: "aud",
    metadata: { type: "signature_cast", tier: "premium", license: "episodic" },
  },
  // âââ Flagship Tier ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  {
    key: "sc_flagship_creator",
    envKey: "stripeScFlagshipCreatorPriceId",
    productName: "Virelle Signature Cast â Flagship Star (Creator License)",
    productDesc: "One-time creator license for a Flagship Signature Cast star â personal/portfolio use, A$99",
    unitAmount: 9900, // A$99
    currency: "aud",
    metadata: { type: "signature_cast", tier: "flagship", license: "creator" },
  },
  {
    key: "sc_flagship_commercial",
    envKey: "stripeScFlagshipCommercialPriceId",
    productName: "Virelle Signature Cast â Flagship Star (Commercial License)",
    productDesc: "One-time commercial license for a Flagship Signature Cast star â paid campaigns, A$178",
    unitAmount: 17800, // A$178
    currency: "aud",
    metadata: { type: "signature_cast", tier: "flagship", license: "commercial" },
  },
  {
    key: "sc_flagship_episodic",
    envKey: "stripeScFlagshipEpisodicPriceId",
    productName: "Virelle Signature Cast â Flagship Star (Episodic License)",
    productDesc: "One-time episodic license for a Flagship Signature Cast star â series/multi-episode, A$396",
    unitAmount: 39600, // A$396
    currency: "aud",
    metadata: { type: "signature_cast", tier: "flagship", license: "episodic" },
  },
];

// âââ Designer Marketplace Membership (v7.0) ââââââââââââââââââââââââââââââââââ
// A$299/year â gives designers access to list collections on the marketplace.
// One-time yearly subscription; designer receives 95% of each lease payment.
const DESIGNER_MEMBERSHIP_PRICES: PriceDefinition[] = [
  {
    key: "designer_yearly",
    envKey: "stripeDesignerYearlyPriceId",
    productName: "Virelle Studios â Designer Marketplace Membership",
    productDesc: "Annual membership for fashion and costume designers to list collections on the Virelle Studios wardrobe marketplace. Renews yearly.",
    unitAmount: 29900, // A$299/year
    currency: "aud",
    recurring: { interval: "year" },
    metadata: { type: "designer_membership", display_name: "Designer Membership", billing: "annual" },
    paymentMethodTypes: ["card"],
  },
];

// âââ Provisioning Logic âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function findOrCreateProduct(name: string, description: string): Promise<string> {
  if (!stripe) throw new Error("Stripe not configured");
  const existing = await stripe.products.search({
    query: `name:"${name}"`,
    limit: 1,
  });
  if (existing.data.length > 0 && existing.data[0].active) {
    return existing.data[0].id;
  }
  const product = await stripe.products.create({
    name,
    description,
    metadata: { platform: "virelle_studios" },
  });
  return product.id;
}

async function findOrCreatePrice(
  productId: string,
  unitAmount: number,
  currency: string,
  recurring?: { interval: "month" | "year" },
  metadata?: Record<string, string>,
): Promise<string> {
  if (!stripe) throw new Error("Stripe not configured");
  const existingPrices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 10,
  });
  for (const price of existingPrices.data) {
    if (
      price.unit_amount === unitAmount &&
      price.currency === currency &&
      ((!recurring && !price.recurring) ||
        (recurring && price.recurring?.interval === recurring.interval))
    ) {
      return price.id;
    }
  }
  const priceParams: Stripe.PriceCreateParams = {
    product: productId,
    unit_amount: unitAmount,
    currency,
    metadata: metadata || {},
  };
  if (recurring) {
    priceParams.recurring = { interval: recurring.interval };
  }
  const price = await stripe.prices.create(priceParams);
  return price.id;
}

/**
 * Ensure the Founding Member coupon exists in Stripe.
 * 50% off first year on annual Creator and Studio subscriptions.
 */
export async function ensureFounderCoupon(): Promise<string | null> {
  if (!stripe) return null;
  const COUPON_ID = "VIRELLE_FOUNDER_50";
  try {
    const existing = await stripe.coupons.retrieve(COUPON_ID);
    if (existing && !existing.deleted) return COUPON_ID;
  } catch {
    // doesn't exist yet â create it
  }
  try {
    await stripe.coupons.create({
      id: COUPON_ID,
      name: "Virelle Founding Member 50% Off",
      percent_off: 50,
      duration: "once",
      metadata: {
        type: "founder_special",
        platform: "virelle_studios",
        applies_to: "auteur_annual,production_pro_annual",
      },
    });
    logger.info("[StripeProvisioning] Created VIRELLE_FOUNDER_50 coupon");
    return COUPON_ID;
  } catch (err: any) {
    logger.error("[StripeProvisioning] Failed to create founder coupon:", err.message);
    return null;
  }
}

/**
 * Run the full Stripe auto-provisioning on server startup.
 */
export async function runStripeProvisioning(): Promise<void> {
  if (!stripe) {
    logger.info("[StripeProvisioning] Stripe not configured â skipping provisioning");
    return;
  }
  logger.info("[StripeProvisioning] Starting auto-provisioning of Stripe products and prices (AUD)...");

  await ensureFounderCoupon();

  const allPrices = [...SUBSCRIPTION_PRICES, ...TOPUP_PRICES, ...SIGNATURE_CAST_PRICES, ...DESIGNER_MEMBERSHIP_PRICES];
  let created = 0;
  let existing = 0;

  for (const def of allPrices) {
    const envValue = (ENV as any)[def.envKey];
    if (envValue && envValue.startsWith("price_")) {
      resolvedPriceIds[def.key] = envValue;
      existing++;
      continue;
    }
    try {
      const productId = await findOrCreateProduct(def.productName, def.productDesc);
      const priceId = await findOrCreatePrice(
        productId,
        def.unitAmount,
        def.currency,
        def.recurring,
        def.metadata,
      );
      resolvedPriceIds[def.key] = priceId;
      created++;
      logger.info(`[StripeProvisioning] Created: ${def.key} â ${priceId}`);
    } catch (err: any) {
      logger.error(`[StripeProvisioning] Failed: ${def.key} â ${err.message}`);
    }
  }

  logger.info(`[StripeProvisioning] Done: ${existing} existing, ${created} created`);
  logger.info("[StripeProvisioning] Resolved price IDs:", { data: JSON.stringify(resolvedPriceIds, null, 2) });
}

/**
 * Get the payment method types for a given price key.
 */
export function getPaymentMethodTypes(priceKey: string): string[] {
  const def = [...SUBSCRIPTION_PRICES, ...TOPUP_PRICES, ...SIGNATURE_CAST_PRICES].find(d => d.key === priceKey);
  return def?.paymentMethodTypes || ["card"];
}

/**
 * Get all resolved price IDs as a map.
 */
export function getAllResolvedPriceIds(): Record<string, string> {
  return { ...resolvedPriceIds };
}
