import Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { ENV } from "./_core/env";
import { fulfillWardrobePurchaseSession } from "./_core/wardrobePurchaseFulfillment";
import {
  createPhysicalOrderFromSession,
  ensurePortalCommerceSchema,
  getSavedAddressById,
  isLamaloBrandName,
} from "./_core/portalAccess";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";

const stripe: Stripe | null = ENV.stripeSecretKey
  ? new Stripe(ENV.stripeSecretKey, { apiVersion: "2024-06-20" as any })
  : null;

const PLATFORM_COMMISSION = 0.05;

function requireStripe(): Stripe {
  if (!stripe) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Payments are not configured." });
  }
  return stripe;
}

function assertReturnUrl(raw: string): void {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid return URL." });
  }
  const configuredHost = (() => {
    try { return ENV.publicAppUrl ? new URL(ENV.publicAppUrl).hostname : ""; } catch { return ""; }
  })();
  const allowed = [
    "virelle.life",
    "www.virelle.life",
    configuredHost,
    process.env.RENDER_EXTERNAL_HOSTNAME ?? "",
    "localhost",
  ].filter(Boolean);
  if (!allowed.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Return URL must point to Virelle Studios." });
  }
}

function firstRow(result: any): any | undefined {
  const rows = Array.isArray(result?.[0]) ? result[0] : result;
  return Array.isArray(rows) ? rows[0] : undefined;
}

export const designerCommerceCheckoutRouter = router({
  checkout: protectedProcedure
    .input(z.object({
      itemId: z.number().int().positive(),
      purchaseMode: z.enum(["virtual", "physical"]),
      shippingAddressId: z.number().int().positive().optional(),
      returnUrl: z.string().url().max(512),
    }))
    .mutation(async ({ ctx, input }) => {
      assertReturnUrl(input.returnUrl);
      await ensurePortalCommerceSchema();
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });

      const item = firstRow(await dbConn.execute(sql`
        SELECT wi.id, wi.name, wi.retailPriceAud, wi.physicalRetailPriceAud, wi.isVirtualOnly,
               wi.designerProfileId, wi.visibility, wi.status,
               dp.brandName, dp.stripeAccountId, dp.stripeAccountStatus
        FROM wardrobeItems wi
        INNER JOIN designerProfiles dp ON dp.id = wi.designerProfileId
        WHERE wi.id = ${input.itemId}
        LIMIT 1
      `));
      if (!item || item.visibility !== "public" || item.status !== "active") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Designer item is not available." });
      }

      const isLamalo = isLamaloBrandName(item.brandName);
      if (!isLamalo && (!item.stripeAccountId || item.stripeAccountStatus !== "active")) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This designer has not completed Stripe payout onboarding.",
        });
      }

      let amountCents: number;
      if (input.purchaseMode === "physical") {
        if (Boolean(item.isVirtualOnly) || !Number(item.physicalRetailPriceAud)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This item is virtual only." });
        }
        if (!input.shippingAddressId) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Select a saved delivery address." });
        }
        await getSavedAddressById(ctx.user.id, input.shippingAddressId);
        amountCents = Number(item.physicalRetailPriceAud);
      } else {
        amountCents = Number(item.retailPriceAud ?? 0);
        if (amountCents < 1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This item has no virtual purchase price." });
        }
      }

      const platformFeeCents = Math.round(amountCents * PLATFORM_COMMISSION);
      const designerAmountCents = amountCents - platformFeeCents;
      const metadata: Record<string, string> = {
        type: "wardrobe_purchase",
        userId: String(ctx.user.id),
        leaseType: "item",
        itemOrCollectionId: String(item.id),
        designerProfileId: String(item.designerProfileId),
        platformFeeCents: String(platformFeeCents),
        designerAmountCents: String(designerAmountCents),
        purchaseMode: input.purchaseMode,
        ...(input.shippingAddressId ? { shippingAddressId: String(input.shippingAddressId) } : {}),
      };

      const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {
        metadata,
        ...(!isLamalo
          ? {
              application_fee_amount: platformFeeCents,
              transfer_data: { destination: String(item.stripeAccountId) },
            }
          : {}),
      };

      const session = await requireStripe().checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "aud",
            product_data: {
              name: `${input.purchaseMode === "physical" ? "Physical" : "Virtual"}: ${item.name}`,
              description: input.purchaseMode === "physical"
                ? "Includes physical delivery and a permanent Virelle virtual wardrobe copy."
                : "Permanent Virelle virtual wardrobe licence.",
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        }],
        success_url: `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}purchase_session={CHECKOUT_SESSION_ID}`,
        cancel_url: `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}purchase_cancelled=1`,
        metadata,
        payment_intent_data: paymentIntentData,
        customer_email: ctx.user.email ?? undefined,
      });

      return {
        checkoutUrl: session.url,
        sessionId: session.id,
        amountAud: (amountCents / 100).toFixed(2),
        platformFeeAud: (platformFeeCents / 100).toFixed(2),
        designerAmountAud: (designerAmountCents / 100).toFixed(2),
      };
    }),

  confirm: protectedProcedure
    .input(z.object({ sessionId: z.string().max(255) }))
    .mutation(async ({ ctx, input }) => {
      const session = await requireStripe().checkout.sessions.retrieve(input.sessionId, {
        expand: ["payment_intent"],
      });
      if (session.metadata?.userId !== String(ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Checkout does not belong to this account." });
      }
      if (session.payment_status !== "paid") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payment is not complete." });
      }

      const fulfilled = await fulfillWardrobePurchaseSession(session, ctx.user.id);
      await createPhysicalOrderFromSession(session, fulfilled.lease.id, ctx.user.id);
      return {
        lease: fulfilled.lease,
        copies: fulfilled.copies,
        purchaseMode: session.metadata?.purchaseMode ?? "virtual",
      };
    }),
});
