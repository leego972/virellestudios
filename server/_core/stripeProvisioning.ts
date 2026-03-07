/**
 * Stripe Auto-Provisioning
 * 
 * Automatically creates Stripe products and prices on server startup
 * if they don't already exist. Uses the STRIPE_SECRET_KEY from env vars.
 * 
 * This ensures the enterprise pricing model is always in sync with Stripe.
 * 
 * MEMBERSHIP TIERS (USD):
 *   Independent — $5,000/month  or $50,000/year   (50 credits/mo)
 *   Creator     — $10,000/month or $100,000/year  (150 credits/mo)
 *   Studio      — $15,000/month or $150,000/year  (300 credits/mo)
 *   Industry    — $25,000/month or $250,000/year  (600 credits/mo)
 * 
 * CREDIT PACKS:
 *   Starter Pack     — 10 credits   $500
 *   Production Pack  — 50 credits   $2,000
 *   Director Pack    — 100 credits  $3,500
 *   Studio Pack      — 200 credits  $6,000
 *   Executive Pack   — 500 credits  $12,500
 *   Mogul Pack       — 1000 credits $20,000
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
 * Falls back to ENV if not yet provisioned.
 */
export function getStripePriceId(key: string): string {
  return resolvedPriceIds[key] || "";
}

// ─── Product & Price Definitions ───

interface PriceDefinition {
  key: string;           // Internal reference key
  envKey: string;        // ENV variable name to check first
  productName: string;   // Stripe product name
  productDesc: string;   // Stripe product description
  unitAmount: number;    // Price in cents
  currency: string;
  recurring?: { interval: "month" | "year" };  // undefined = one-time
  metadata?: Record<string, string>;
  paymentMethodTypes?: string[];
}

const SUBSCRIPTION_PRICES: PriceDefinition[] = [
  // ─── Independent tier ($5,000/mo, $50,000/yr) ───
  {
    key: "independent_monthly",
    envKey: "stripeIndependentMonthlyPriceId",
    productName: "Virelle Studios — Independent (Monthly)",
    productDesc: "AI film production platform — Independent tier, $5,000/month, 50 credits/mo",
    unitAmount: 500000, // $5,000
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { tier: "independent", billing: "monthly", credits: "50" },
    paymentMethodTypes: ["us_bank_account", "card"],
  },
  {
    key: "independent_annual",
    envKey: "stripeIndependentAnnualPriceId",
    productName: "Virelle Studios — Independent (Annual)",
    productDesc: "AI film production platform — Independent tier, $50,000/year, 50 credits/mo",
    unitAmount: 5000000, // $50,000
    currency: "usd",
    recurring: { interval: "year" },
    metadata: { tier: "independent", billing: "annual", credits: "50" },
  },
  // ─── Creator tier ($10,000/mo, $100,000/yr) ───
  {
    key: "creator_monthly",
    envKey: "stripeCreatorMonthlyPriceId",
    productName: "Virelle Studios — Creator (Monthly)",
    productDesc: "AI film production platform — Creator tier, $10,000/month, 150 credits/mo",
    unitAmount: 1000000, // $10,000
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { tier: "creator", billing: "monthly", credits: "150" },
    paymentMethodTypes: ["us_bank_account", "card"],
  },
  {
    key: "creator_annual",
    envKey: "stripeCreatorAnnualPriceId",
    productName: "Virelle Studios — Creator (Annual)",
    productDesc: "AI film production platform — Creator tier, $100,000/year, 150 credits/mo",
    unitAmount: 10000000, // $100,000
    currency: "usd",
    recurring: { interval: "year" },
    metadata: { tier: "creator", billing: "annual", credits: "150" },
  },
  // ─── Studio tier ($15,000/mo, $150,000/yr) ───
  {
    key: "studio_monthly",
    envKey: "stripeStudioMonthlyPriceId",
    productName: "Virelle Studios — Studio (Monthly)",
    productDesc: "AI film production platform — Studio tier, $15,000/month, 300 credits/mo",
    unitAmount: 1500000, // $15,000
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { tier: "studio", billing: "monthly", credits: "300" },
    paymentMethodTypes: ["us_bank_account", "card"],
  },
  {
    key: "studio_annual",
    envKey: "stripeStudioAnnualPriceId",
    productName: "Virelle Studios — Studio (Annual)",
    productDesc: "AI film production platform — Studio tier, $150,000/year, 300 credits/mo",
    unitAmount: 15000000, // $150,000
    currency: "usd",
    recurring: { interval: "year" },
    metadata: { tier: "studio", billing: "annual", credits: "300" },
  },
  // ─── Industry tier ($25,000/mo, $250,000/yr) ───
  {
    key: "industry_monthly",
    envKey: "stripeIndustryMonthlyPriceId",
    productName: "Virelle Studios — Industry (Monthly)",
    productDesc: "AI film production platform — Industry tier, $25,000/month, 600 credits/mo",
    unitAmount: 2500000, // $25,000
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { tier: "industry", billing: "monthly", credits: "600" },
    paymentMethodTypes: ["us_bank_account", "card"],
  },
  {
    key: "industry_annual",
    envKey: "stripeIndustryAnnualPriceId",
    productName: "Virelle Studios — Industry (Annual)",
    productDesc: "AI film production platform — Industry tier, $250,000/year, 600 credits/mo",
    unitAmount: 25000000, // $250,000
    currency: "usd",
    recurring: { interval: "year" },
    metadata: { tier: "industry", billing: "annual", credits: "600" },
  },
];

const TOPUP_PRICES: PriceDefinition[] = [
  {
    key: "topup_10",
    envKey: "stripeTopUp10PriceId",
    productName: "Virelle Studios — 10 Credits (Starter Pack)",
    productDesc: "One-time pack of 10 production credits — $500",
    unitAmount: 50000, // $500
    currency: "usd",
    metadata: { type: "topup", credits: "10" },
  },
  {
    key: "topup_50",
    envKey: "stripeTopUp50PriceId",
    productName: "Virelle Studios — 50 Credits (Production Pack)",
    productDesc: "One-time pack of 50 production credits — $2,000",
    unitAmount: 200000, // $2,000
    currency: "usd",
    metadata: { type: "topup", credits: "50" },
  },
  {
    key: "topup_100",
    envKey: "stripeTopUp100PriceId",
    productName: "Virelle Studios — 100 Credits (Director Pack)",
    productDesc: "One-time pack of 100 production credits — $3,500",
    unitAmount: 350000, // $3,500
    currency: "usd",
    metadata: { type: "topup", credits: "100" },
  },
  {
    key: "topup_200",
    envKey: "stripeTopUp200PriceId",
    productName: "Virelle Studios — 200 Credits (Studio Pack)",
    productDesc: "One-time pack of 200 production credits — $6,000",
    unitAmount: 600000, // $6,000
    currency: "usd",
    metadata: { type: "topup", credits: "200" },
  },
  {
    key: "topup_500",
    envKey: "stripeTopUp500PriceId",
    productName: "Virelle Studios — 500 Credits (Executive Pack)",
    productDesc: "One-time pack of 500 production credits — $12,500",
    unitAmount: 1250000, // $12,500
    currency: "usd",
    metadata: { type: "topup", credits: "500" },
  },
  {
    key: "topup_1000",
    envKey: "stripeTopUp1000PriceId",
    productName: "Virelle Studios — 1000 Credits (Mogul Pack)",
    productDesc: "One-time pack of 1000 production credits — $20,000",
    unitAmount: 2000000, // $20,000
    currency: "usd",
    metadata: { type: "topup", credits: "1000" },
  },
];

// ─── Provisioning Logic ───

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

async function provisionPrice(def: PriceDefinition): Promise<void> {
  const envValue = (ENV as any)[def.envKey];
  if (envValue && envValue.startsWith("price_")) {
    resolvedPriceIds[def.key] = envValue;
    return;
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
    console.log(`[StripeProvisioning] ${def.key} → ${priceId}`);
  } catch (err: any) {
    console.error(`[StripeProvisioning] Failed to provision ${def.key}:`, err.message);
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

  console.log("[StripeProvisioning] Starting auto-provisioning of Stripe products and prices...");

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
