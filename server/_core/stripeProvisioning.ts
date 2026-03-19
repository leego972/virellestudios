/**
 * Stripe Auto-Provisioning
 *
 * Automatically creates Stripe products and prices on server startup
 * if they don't already exist. Uses the STRIPE_SECRET_KEY from env vars.
 *
 * MEMBERSHIP TIERS (AUD):
 *   Creator (DB: amateur)         — A$1,250/month  or A$12,000/year  — 2,000 credits/mo
 *   Studio (DB: independent) — A$3,900/month or A$36,000/year — 5,500 credits/mo
 *   Production (DB: studio)        — From A$150,000/year (consultative) — 15,500 credits/mo
 *   Enterprise          — Custom pricing (sales-led)         — 50,500 credits/mo
 *
 * FOUNDING MEMBER OFFER: 50% off first year on annual billing (VIRELLE_FOUNDER_50 coupon)
 *   Creator founder price:        A$6,000  first year (then A$12,000/yr)
 *   Studio founder price: A$18,000 first year (then A$36,000/yr)
 *
 * CREDIT PACKS (AUD — one-time top-ups):
 *   Starter Pack     — 500 credits    A$750    (A$1.50/credit)
 *   Producer Pack    — 1,500 credits  A$1,800  (A$1.20/credit — Save 20%)
 *   Director Pack    — 3,000 credits  A$3,150  (A$1.05/credit — Save 30%)
 *   Studio Pack      — 6,000 credits  A$5,400  (A$0.90/credit — Save 40%)
 *   Blockbuster Pack — 12,000 credits A$9,000  (A$0.75/credit — Save 50%)
 *   Mogul Pack       — 25,000 credits A$15,000 (A$0.60/credit — Save 60%)
 */
import Stripe from "stripe";
import { ENV } from "./env";

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

// ─── Product & Price Definitions ─────────────────────────────────────────────

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

  // ─── Creator (DB: amateur) — A$1,250/month ───────────────────────────────
  {
    key: "auteur_monthly",
    envKey: "stripeCreatorMonthlyPriceId",
    productName: "Virelle Studios — Creator (Monthly)",
    productDesc: "AI film production platform — Creator tier, A$1,250/month, 2,000 credits/mo",
    unitAmount: 125000, // A$1,250 in cents
    currency: "aud",
    recurring: { interval: "month" },
    metadata: { tier: "amateur", display_name: "Creator", billing: "monthly", credits: "2000" },
    paymentMethodTypes: ["card"],
  },
  {
    key: "auteur_annual",
    envKey: "stripeCreatorAnnualPriceId",
    productName: "Virelle Studios — Creator (Annual)",
    productDesc: "AI film production platform — Creator tier, A$12,000/year, 2,000 credits/mo",
    unitAmount: 1200000, // A$12,000 in cents
    currency: "aud",
    recurring: { interval: "year" },
    metadata: { tier: "amateur", display_name: "Creator", billing: "annual", credits: "2000" },
    paymentMethodTypes: ["card"],
  },

  // ─── Studio (DB: independent) — A$3,900/month ───────────────────
  {
    key: "production_pro_monthly",
    envKey: "stripeProductionProMonthlyPriceId",
    productName: "Virelle Studios — Studio (Monthly)",
    productDesc: "AI film production platform — Studio tier, A$3,900/month, 5,500 credits/mo",
    unitAmount: 390000, // A$3,900 in cents
    currency: "aud",
    recurring: { interval: "month" },
    metadata: { tier: "independent", display_name: "Studio", billing: "monthly", credits: "5500" },
    paymentMethodTypes: ["card"],
  },
  {
    key: "production_pro_annual",
    envKey: "stripeProductionProAnnualPriceId",
    productName: "Virelle Studios — Studio (Annual)",
    productDesc: "AI film production platform — Studio tier, A$36,000/year, 5,500 credits/mo",
    unitAmount: 3600000, // A$36,000 in cents
    currency: "aud",
    recurring: { interval: "year" },
    metadata: { tier: "independent", display_name: "Studio", billing: "annual", credits: "5500" },
    paymentMethodTypes: ["card"],
  },

  // ─── Backward-compat aliases (old "amateur" / "independent" keys) ────────
  // These point to the same products as auteur/production_pro above.
  // Kept so existing webhook handlers that reference old keys continue to work.
  {
    key: "amateur_monthly",
    envKey: "stripeAmateurMonthlyPriceId",
    productName: "Virelle Studios — Creator (Monthly)",
    productDesc: "AI film production platform — Creator tier, A$1,250/month, 2,000 credits/mo",
    unitAmount: 125000,
    currency: "aud",
    recurring: { interval: "month" },
    metadata: { tier: "amateur", display_name: "Creator", billing: "monthly", credits: "2000" },
    paymentMethodTypes: ["card"],
  },
  {
    key: "amateur_annual",
    envKey: "stripeAmateurAnnualPriceId",
    productName: "Virelle Studios — Creator (Annual)",
    productDesc: "AI film production platform — Creator tier, A$12,000/year, 2,000 credits/mo",
    unitAmount: 1200000,
    currency: "aud",
    recurring: { interval: "year" },
    metadata: { tier: "amateur", display_name: "Creator", billing: "annual", credits: "2000" },
    paymentMethodTypes: ["card"],
  },
  {
    key: "independent_monthly",
    envKey: "stripeIndependentMonthlyPriceId",
    productName: "Virelle Studios — Studio (Monthly)",
    productDesc: "AI film production platform — Studio tier, A$3,900/month, 5,500 credits/mo",
    unitAmount: 390000,
    currency: "aud",
    recurring: { interval: "month" },
    metadata: { tier: "independent", display_name: "Studio", billing: "monthly", credits: "5500" },
    paymentMethodTypes: ["card"],
  },
  {
    key: "independent_annual",
    envKey: "stripeIndependentAnnualPriceId",
    productName: "Virelle Studios — Studio (Annual)",
    productDesc: "AI film production platform — Studio tier, A$36,000/year, 5,500 credits/mo",
    unitAmount: 3600000,
    currency: "aud",
    recurring: { interval: "year" },
    metadata: { tier: "independent", display_name: "Studio", billing: "annual", credits: "5500" },
    paymentMethodTypes: ["card"],
  },

  // ─── Studio — consultative; base annual price A$150,000 ─────────────────
  {
    key: "studio_annual",
    envKey: "stripeStudioAnnualPriceId",
    productName: "Virelle Studios — Studio (Annual Base)",
    productDesc: "AI film production platform — Studio tier, from A$150,000/year, 15,500 credits/mo",
    unitAmount: 15000000, // A$150,000 in cents
    currency: "aud",
    recurring: { interval: "year" },
    metadata: { tier: "studio", display_name: "Studio", billing: "annual", credits: "15500" },
    paymentMethodTypes: ["card"],
  },
  {
    key: "studio_monthly",
    envKey: "stripeStudioMonthlyPriceId",
    productName: "Virelle Studios — Studio (Monthly Base)",
    productDesc: "AI film production platform — Studio tier, from A$15,000/month, 15,500 credits/mo",
    unitAmount: 1500000, // A$15,000 in cents
    currency: "aud",
    recurring: { interval: "month" },
    metadata: { tier: "studio", display_name: "Studio", billing: "monthly", credits: "15500" },
    paymentMethodTypes: ["card"],
  },

  // ─── Enterprise — custom; base annual price A$300,000 ──────────
  {
    key: "industry_enterprise_annual",
    envKey: "stripeIndustryEnterpriseAnnualPriceId",
    productName: "Virelle Studios — Enterprise (Annual Base)",
    productDesc: "AI film production platform — Enterprise tier, from A$300,000/year, 50,500 credits/mo",
    unitAmount: 30000000, // A$300,000 in cents
    currency: "aud",
    recurring: { interval: "year" },
    metadata: { tier: "industry", display_name: "Enterprise", billing: "annual", credits: "50500" },
    paymentMethodTypes: ["card"],
  },
  {
    key: "industry_enterprise_monthly",
    envKey: "stripeIndustryEnterpriseMonthlyPriceId",
    productName: "Virelle Studios — Enterprise (Monthly Base)",
    productDesc: "AI film production platform — Enterprise tier, from A$30,000/month, 50,500 credits/mo",
    unitAmount: 3000000, // A$30,000 in cents
    currency: "aud",
    recurring: { interval: "month" },
    metadata: { tier: "industry", display_name: "Enterprise", billing: "monthly", credits: "50500" },
    paymentMethodTypes: ["card"],
  },

  // ─── Backward-compat aliases (old "industry" keys) ──────────────────────
  {
    key: "industry_annual",
    envKey: "stripeIndustryAnnualPriceId",
    productName: "Virelle Studios — Enterprise (Annual Base)",
    productDesc: "AI film production platform — Enterprise tier, from A$300,000/year, 50,500 credits/mo",
    unitAmount: 30000000,
    currency: "aud",
    recurring: { interval: "year" },
    metadata: { tier: "industry", display_name: "Enterprise", billing: "annual", credits: "50500" },
    paymentMethodTypes: ["card"],
  },
  {
    key: "industry_monthly",
    envKey: "stripeIndustryMonthlyPriceId",
    productName: "Virelle Studios — Enterprise (Monthly Base)",
    productDesc: "AI film production platform — Enterprise tier, from A$30,000/month, 50,500 credits/mo",
    unitAmount: 3000000,
    currency: "aud",
    recurring: { interval: "month" },
    metadata: { tier: "industry", display_name: "Enterprise", billing: "monthly", credits: "50500" },
    paymentMethodTypes: ["card"],
  },
];

const TOPUP_PRICES: PriceDefinition[] = [
  {
    key: "topup_10",
    envKey: "stripeTopUp10PriceId",
    productName: "Virelle Studios — 500 Credits (Starter Pack)",
    productDesc: "One-time pack of 500 production credits — A$750 (A$1.50/credit)",
    unitAmount: 75000, // A$750
    currency: "aud",
    metadata: { type: "topup", credits: "500", pack: "starter" },
  },
  {
    key: "topup_30",
    envKey: "stripeTopUp30PriceId",
    productName: "Virelle Studios — 1,500 Credits (Producer Pack)",
    productDesc: "One-time pack of 1,500 production credits — A$1,800 (A$1.20/credit — Save 20%)",
    unitAmount: 180000, // A$1,800
    currency: "aud",
    metadata: { type: "topup", credits: "1500", pack: "producer" },
  },
  {
    key: "topup_100",
    envKey: "stripeTopUp100PriceId",
    productName: "Virelle Studios — 3,000 Credits (Director Pack)",
    productDesc: "One-time pack of 3,000 production credits — A$3,150 (A$1.05/credit — Save 30%)",
    unitAmount: 315000, // A$3,150
    currency: "aud",
    metadata: { type: "topup", credits: "3000", pack: "director" },
  },
  {
    key: "topup_200",
    envKey: "stripeTopUp200PriceId",
    productName: "Virelle Studios — 6,000 Credits (Studio Pack)",
    productDesc: "One-time pack of 6,000 production credits — A$5,400 (A$0.90/credit — Save 40%)",
    unitAmount: 540000, // A$5,400
    currency: "aud",
    metadata: { type: "topup", credits: "6000", pack: "studio" },
  },
  {
    key: "topup_500",
    envKey: "stripeTopUp500PriceId",
    productName: "Virelle Studios — 12,000 Credits (Blockbuster Pack)",
    productDesc: "One-time pack of 12,000 production credits — A$9,000 (A$0.75/credit — Save 50%)",
    unitAmount: 900000, // A$9,000
    currency: "aud",
    metadata: { type: "topup", credits: "12000", pack: "blockbuster" },
  },
  {
    key: "topup_1000",
    envKey: "stripeTopUp1000PriceId",
    productName: "Virelle Studios — 25,000 Credits (Mogul Pack)",
    productDesc: "One-time pack of 25,000 production credits — A$15,000 (A$0.60/credit — Save 60%)",
    unitAmount: 1500000, // A$15,000
    currency: "aud",
    metadata: { type: "topup", credits: "25000", pack: "mogul" },
  },
];

// ─── Provisioning Logic ───────────────────────────────────────────────────────

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
    // doesn't exist yet — create it
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
    console.log("[StripeProvisioning] Created VIRELLE_FOUNDER_50 coupon");
    return COUPON_ID;
  } catch (err: any) {
    console.error("[StripeProvisioning] Failed to create founder coupon:", err.message);
    return null;
  }
}

/**
 * Run the full Stripe auto-provisioning on server startup.
 */
export async function runStripeProvisioning(): Promise<void> {
  if (!stripe) {
    console.log("[StripeProvisioning] Stripe not configured — skipping provisioning");
    return;
  }
  console.log("[StripeProvisioning] Starting auto-provisioning of Stripe products and prices (AUD)...");

  await ensureFounderCoupon();

  const allPrices = [...SUBSCRIPTION_PRICES, ...TOPUP_PRICES];
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
      console.log(`[StripeProvisioning] Created: ${def.key} → ${priceId}`);
    } catch (err: any) {
      console.error(`[StripeProvisioning] Failed: ${def.key} — ${err.message}`);
    }
  }

  console.log(`[StripeProvisioning] Done: ${existing} existing, ${created} created`);
  console.log("[StripeProvisioning] Resolved price IDs:", JSON.stringify(resolvedPriceIds, null, 2));
}

/**
 * Get the payment method types for a given price key.
 */
export function getPaymentMethodTypes(priceKey: string): string[] {
  const def = [...SUBSCRIPTION_PRICES, ...TOPUP_PRICES].find(d => d.key === priceKey);
  return def?.paymentMethodTypes || ["card"];
}

/**
 * Get all resolved price IDs as a map.
 */
export function getAllResolvedPriceIds(): Record<string, string> {
  return { ...resolvedPriceIds };
}
