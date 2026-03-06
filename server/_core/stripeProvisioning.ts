/**
 * Stripe Auto-Provisioning
 * 
 * Automatically creates Stripe products and prices on server startup
 * if they don't already exist. Uses the STRIPE_SECRET_KEY from env vars.
 * 
 * This ensures the enterprise pricing model is always in sync with Stripe.
 * 
 * MEMBERSHIP TIERS:
 *   Independent — $10,000/year or $900/month (direct debit)
 *   Industry    — $50,000/year or $4,500/month (direct debit)
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
  paymentMethodTypes?: string[];  // e.g. ["us_bank_account", "card"] for direct debit
}

const SUBSCRIPTION_PRICES: PriceDefinition[] = [
  // ─── Independent tier ───
  {
    key: "independent_monthly",
    envKey: "stripeIndependentMonthlyPriceId",
    productName: "Virelle Studios — Independent (Monthly)",
    productDesc: "AI film production platform access — Independent tier, billed monthly via direct debit",
    unitAmount: 90000, // $900/month
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { tier: "independent", billing: "monthly" },
    paymentMethodTypes: ["us_bank_account", "card"],
  },
  {
    key: "independent_annual",
    envKey: "stripeIndependentAnnualPriceId",
    productName: "Virelle Studios — Independent (Annual)",
    productDesc: "AI film production platform access — Independent tier, billed annually",
    unitAmount: 1000000, // $10,000/year
    currency: "usd",
    recurring: { interval: "year" },
    metadata: { tier: "independent", billing: "annual" },
  },
  // ─── Industry tier ───
  {
    key: "industry_monthly",
    envKey: "stripeIndustryMonthlyPriceId",
    productName: "Virelle Studios — Industry (Monthly)",
    productDesc: "AI film production platform access — Industry tier, billed monthly via direct debit",
    unitAmount: 450000, // $4,500/month
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { tier: "industry", billing: "monthly" },
    paymentMethodTypes: ["us_bank_account", "card"],
  },
  {
    key: "industry_annual",
    envKey: "stripeIndustryAnnualPriceId",
    productName: "Virelle Studios — Industry (Annual)",
    productDesc: "AI film production platform access — Industry tier, billed annually",
    unitAmount: 5000000, // $50,000/year
    currency: "usd",
    recurring: { interval: "year" },
    metadata: { tier: "industry", billing: "annual" },
  },
];

const TOPUP_PRICES: PriceDefinition[] = [
  {
    key: "topup_10",
    envKey: "stripeTopUp10PriceId",
    productName: "Virelle Studios — 10 Generation Credits",
    productDesc: "One-time pack of 10 additional AI generation credits",
    unitAmount: 4900, // $49
    currency: "usd",
    metadata: { type: "topup", credits: "10" },
  },
  {
    key: "topup_30",
    envKey: "stripeTopUp30PriceId",
    productName: "Virelle Studios — 30 Generation Credits",
    productDesc: "One-time pack of 30 additional AI generation credits",
    unitAmount: 12900, // $129
    currency: "usd",
    metadata: { type: "topup", credits: "30" },
  },
  {
    key: "topup_100",
    envKey: "stripeTopUp100PriceId",
    productName: "Virelle Studios — 100 Generation Credits",
    productDesc: "One-time pack of 100 additional AI generation credits",
    unitAmount: 34900, // $349
    currency: "usd",
    metadata: { type: "topup", credits: "100" },
  },
];

// ─── Provisioning Logic ───

/**
 * Find an existing Stripe product by name, or create a new one.
 */
async function findOrCreateProduct(name: string, description: string): Promise<string> {
  if (!stripe) throw new Error("Stripe not configured");

  // Search for existing product by name
  const existing = await stripe.products.search({
    query: `name:"${name}"`,
    limit: 1,
  });

  if (existing.data.length > 0 && existing.data[0].active) {
    return existing.data[0].id;
  }

  // Create new product
  const product = await stripe.products.create({
    name,
    description,
    metadata: { platform: "virelle_studios" },
  });

  return product.id;
}

/**
 * Find an existing price for a product, or create a new one.
 */
async function findOrCreatePrice(
  productId: string,
  unitAmount: number,
  currency: string,
  recurring?: { interval: "month" | "year" },
  metadata?: Record<string, string>,
): Promise<string> {
  if (!stripe) throw new Error("Stripe not configured");

  // List existing prices for this product
  const existingPrices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 10,
  });

  // Find a matching price
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

  // Create new price
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
 * Provision a single price definition — checks ENV first, then creates if needed.
 */
async function provisionPrice(def: PriceDefinition): Promise<void> {
  // Check if already configured via ENV
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
 * Creates all products and prices that don't already exist.
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
 * Monthly plans support direct debit (ACH) + card; annual plans default to card.
 */
export function getPaymentMethodTypes(priceKey: string): string[] {
  const def = [...SUBSCRIPTION_PRICES, ...TOPUP_PRICES].find(d => d.key === priceKey);
  return def?.paymentMethodTypes || ["card"];
}

/**
 * Get all resolved price IDs as a map (for use in routers).
 * Keys: independent_monthly, independent_annual,
 *       industry_monthly, industry_annual,
 *       topup_10, topup_30, topup_100
 */
export function getAllResolvedPriceIds(): Record<string, string> {
  return { ...resolvedPriceIds };
}
