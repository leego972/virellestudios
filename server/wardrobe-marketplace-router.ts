/**
 * wardrobe-marketplace-router.ts  — v7.0
 *
 * Designer Marketplace: membership subscriptions, Stripe Connect payouts,
 * collection publishing, public browsing, and item/collection leasing.
 *
 * Money flow: user pays → Stripe charges → platform keeps 5% (application_fee_amount)
 *             → designer receives 95% via Stripe Connect transfer_data.destination
 */
import Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc, isNotNull } from "drizzle-orm";
import { ENV } from "./_core/env";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import * as db from "./db";
import {
  designerProfiles,
  designerCollections,
  wardrobeItems,
} from "../drizzle/schema";

const stripe: Stripe | null = ENV.stripeSecretKey
  ? new Stripe(ENV.stripeSecretKey, { apiVersion: "2024-06-20" as any })
  : null;

const PLATFORM_COMMISSION = 0.05; // 5%
const DESIGNER_YEARLY_CENTS = 29900; // A$299.00

// ─── helpers ────────────────────────────────────────────────────────────────

function requireStripe(): Stripe {
  if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Payments not configured" });
  return stripe;
}

// ─── router ─────────────────────────────────────────────────────────────────

export const wardrobeMarketplaceRouter = router({

  // ═══════════════════════════════════════════════════════════════════════════
  // DESIGNER — membership + Stripe Connect management
  // ═══════════════════════════════════════════════════════════════════════════
  designer: router({

    /** Create a Stripe Checkout Session for the A$299/year designer membership */
    subscribeMembership: protectedProcedure
      .input(z.object({ returnUrl: z.string().url().max(512) }))
      .mutation(async ({ ctx, input }) => {
        const s = requireStripe();
        const profile = await db.getDesignerProfileByUserId(ctx.user.id);
        if (profile?.membershipStatus === "active") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You already have an active designer membership." });
        }

        const session = await s.checkout.sessions.create({
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [{
            price_data: {
              currency: "aud",
              product_data: {
                name: "Virelle Studios — Designer Marketplace Membership",
                description: "List your fashion & costume collections for film productions worldwide. Renews yearly.",
                metadata: { type: "designer_membership" },
              },
              unit_amount: DESIGNER_YEARLY_CENTS,
              recurring: { interval: "year" },
            },
            quantity: 1,
          }],
          success_url: `${input.returnUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${input.returnUrl}?checkout=cancelled`,
          metadata: { userId: String(ctx.user.id), type: "designer_membership" },
          customer_email: (ctx.user as any).email || undefined,
        });

        return { checkoutUrl: session.url, sessionId: session.id };
      }),

    /** Activate membership after Stripe Checkout succeeds */
    activateMembership: protectedProcedure
      .input(z.object({ sessionId: z.string().max(255) }))
      .mutation(async ({ ctx, input }) => {
        const s = requireStripe();
        const session = await s.checkout.sessions.retrieve(input.sessionId, {
          expand: ["subscription"],
        });

        if (session.metadata?.userId !== String(ctx.user.id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Session does not belong to you" });
        }
        if (session.payment_status !== "paid") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Payment has not completed yet" });
        }

        const sub = session.subscription as Stripe.Subscription | null;
        const periodEnd = sub?.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        const patch = {
          membershipStatus: "active",
          membershipSubscriptionId: sub?.id ?? null,
          membershipCurrentPeriodEnd: periodEnd,
        };

        const existing = await db.getDesignerProfileByUserId(ctx.user.id);
        if (existing) {
          await db.updateDesignerProfile(existing.id, patch as any);
          return db.getDesignerProfileByUserId(ctx.user.id);
        }

        return db.createDesignerProfile({
          userId: ctx.user.id,
          brandName: "My Brand",
          ...patch,
        } as any);
      }),

    /** Get current membership status for the authenticated user */
    getMembershipStatus: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getDesignerProfileByUserId(ctx.user.id);
      return {
        status: (profile as any)?.membershipStatus ?? "none",
        expiresAt: (profile as any)?.membershipCurrentPeriodEnd ?? null,
        profile: profile ?? null,
      };
    }),

    /** Create or re-open a Stripe Connect onboarding link */
    onboardConnect: protectedProcedure
      .input(z.object({
        returnUrl: z.string().url().max(512),
        refreshUrl: z.string().url().max(512),
      }))
      .mutation(async ({ ctx, input }) => {
        const s = requireStripe();
        const profile = await db.getDesignerProfileByUserId(ctx.user.id);
        if (!profile || (profile as any).membershipStatus !== "active") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Active designer membership required to set up payouts" });
        }

        let accountId: string = (profile as any).stripeAccountId ?? "";

        if (!accountId) {
          const account = await s.accounts.create({
            type: "express",
            country: "AU",
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            business_type: "individual",
            metadata: {
              userId: String(ctx.user.id),
              designerProfileId: String(profile.id),
            },
          });
          accountId = account.id;
          await db.updateDesignerProfile(profile.id, {
            stripeAccountId: accountId,
            stripeAccountStatus: "pending",
          } as any);
        }

        const link = await s.accountLinks.create({
          account: accountId,
          return_url: input.returnUrl,
          refresh_url: input.refreshUrl,
          type: "account_onboarding",
        });

        return { onboardingUrl: link.url };
      }),

    /** Check whether the designer's Connect account is fully enabled */
    getConnectStatus: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getDesignerProfileByUserId(ctx.user.id);
      const accountId = (profile as any)?.stripeAccountId as string | undefined;
      if (!accountId || !stripe) {
        return { connected: false, chargesEnabled: false, payoutsEnabled: false };
      }
      try {
        const account = await stripe.accounts.retrieve(accountId);
        if (account.charges_enabled && account.payouts_enabled &&
            (profile as any)?.stripeAccountStatus !== "active") {
          await db.updateDesignerProfile(profile!.id, { stripeAccountStatus: "active" } as any);
        }
        return {
          connected: true,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          accountId,
        };
      } catch {
        return { connected: false, chargesEnabled: false, payoutsEnabled: false };
      }
    }),

    /** Set lease + retail prices on a wardrobe item */
    setItemPricing: protectedProcedure
      .input(z.object({
        itemId: z.number().int(),
        retailPriceAud: z.number().int().min(0),
        leasePriceAud: z.number().int().min(50),
      }))
      .mutation(async ({ ctx, input }) => {
        const item = await db.getWardrobeItemById(input.itemId);
        if (!item || item.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your item" });
        }
        return db.updateWardrobeItem(input.itemId, {
          retailPriceAud: input.retailPriceAud,
          leasePriceAud: input.leasePriceAud,
        } as any);
      }),

    /** Set bundle lease price on a collection */
    setCollectionPricing: protectedProcedure
      .input(z.object({
        collectionId: z.number().int(),
        collectionPriceAud: z.number().int().min(50),
      }))
      .mutation(async ({ ctx, input }) => {
        const col = await db.getDesignerCollectionById(input.collectionId);
        if (!col || col.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your collection" });
        }
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn
          .update(designerCollections)
          .set({ collectionPriceAud: input.collectionPriceAud } as any)
          .where(eq(designerCollections.id, input.collectionId));
        return db.getDesignerCollectionById(input.collectionId);
      }),

    /** Publish or unpublish a collection */
    publishCollection: protectedProcedure
      .input(z.object({
        collectionId: z.number().int(),
        published: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const col = await db.getDesignerCollectionById(input.collectionId);
        if (!col || col.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your collection" });
        }
        const profile = await db.getDesignerProfileByUserId(ctx.user.id);
        if (!profile || (profile as any).membershipStatus !== "active") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Active designer membership required to publish" });
        }
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn
          .update(designerCollections)
          .set({
            published: input.published,
            publishedAt: input.published ? new Date() : null,
            visibility: input.published ? "public" : "private",
          } as any)
          .where(eq(designerCollections.id, input.collectionId));
        return db.getDesignerCollectionById(input.collectionId);
      }),

    /** Designer's earnings summary */
    getEarnings: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getDesignerProfileByUserId(ctx.user.id);
      if (!profile) return { totalEarned: 0, leaseCount: 0, pendingPayout: 0 };
      const leases = await db.getWardrobeLeasesByDesigner(profile.id);
      const active = leases.filter((l) => (l as any).status === "active");
      const totalEarned = active.reduce((sum, l) => sum + ((l as any).designerAmountAud ?? 0), 0);
      return {
        totalEarned,
        totalEarnedDisplay: (totalEarned / 100).toFixed(2),
        leaseCount: active.length,
      };
    }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // MARKETPLACE — public browsing
  // ═══════════════════════════════════════════════════════════════════════════
  marketplace: router({

    /** List all designers with an active membership */
    browseDesigners: publicProcedure
      .input(z.object({
        limit: z.number().int().min(1).max(60).default(24),
        offset: z.number().int().min(0).default(0),
      }).optional())
      .query(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) return [];
        return dbConn
          .select()
          .from(designerProfiles)
          .where(
            and(
              eq(designerProfiles.visibility, "public"),
              eq(designerProfiles.membershipStatus as any, "active"),
            ),
          )
          .orderBy(desc(designerProfiles.createdAt))
          .limit(input?.limit ?? 24)
          .offset(input?.offset ?? 0);
      }),

    /** Single designer + their published collections */
    getDesigner: publicProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ input }) => {
        const profile = await db.getDesignerProfileById(input.id);
        if (!profile || profile.visibility !== "public") return null;
        const collections = await db.getDesignerCollectionsByDesigner(profile.id);
        const published = collections.filter((c) => (c as any).published);
        return { profile, collections: published };
      }),

    /** Single collection + items available for lease */
    getCollection: publicProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ input }) => {
        const col = await db.getDesignerCollectionById(input.id);
        if (!col || !(col as any).published) return null;
        const designer = await db.getDesignerProfileById(col.designerProfileId);
        const items = await db.getWardrobeItemsByCollection(input.id);
        const leasable = items.filter(
          (i) => i.visibility === "public" && i.status === "active" && (i as any).leasePriceAud,
        );
        return { collection: col, designer, items: leasable };
      }),

    /** Search leasable wardrobe items */
    searchItems: publicProcedure
      .input(z.object({
        category: z.string().max(64).optional(),
        wardrobeType: z.string().max(64).optional(),
        maxPriceAud: z.number().int().optional(),
        limit: z.number().int().min(1).max(120).default(60),
        offset: z.number().int().min(0).default(0),
      }).optional())
      .query(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) return [];
        return dbConn
          .select()
          .from(wardrobeItems)
          .where(
            and(
              eq(wardrobeItems.visibility, "public"),
              eq(wardrobeItems.status, "active"),
              isNotNull(wardrobeItems.leasePriceAud as any),
            ),
          )
          .orderBy(desc(wardrobeItems.createdAt))
          .limit(input?.limit ?? 60)
          .offset(input?.offset ?? 0);
      }),
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // LEASING — user leases items / collections
  // ═══════════════════════════════════════════════════════════════════════════
  leasing: router({

    /**
     * Create a Stripe PaymentIntent for leasing an item or collection.
     * Returns the client_secret for Stripe.js to complete the payment.
     */
    checkout: protectedProcedure
      .input(z.object({
        type: z.enum(["item", "collection"]),
        id: z.number().int(),
      }))
      .mutation(async ({ ctx, input }) => {
        const s = requireStripe();

        let amountCents: number;
        let designerProfileId: number;
        let description: string;

        if (input.type === "item") {
          const item = await db.getWardrobeItemById(input.id);
          if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
          if (!(item as any).leasePriceAud) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Item has no lease price set" });
          }
          amountCents = (item as any).leasePriceAud as number;
          designerProfileId = item.designerProfileId!;
          description = `Lease: ${item.name} — Virelle Studios`;
        } else {
          const col = await db.getDesignerCollectionById(input.id);
          if (!col || !(col as any).collectionPriceAud) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found or not priced" });
          }
          amountCents = (col as any).collectionPriceAud as number;
          designerProfileId = col.designerProfileId;
          description = `Lease collection: ${col.name} — Virelle Studios`;
        }

        const designer = await db.getDesignerProfileById(designerProfileId);
        const designerAccountId: string | null = (designer as any)?.stripeAccountId ?? null;

        const platformFeeCents = Math.round(amountCents * PLATFORM_COMMISSION);
        const designerAmountCents = amountCents - platformFeeCents;

        const piParams: Stripe.PaymentIntentCreateParams = {
          amount: amountCents,
          currency: "aud",
          description,
          metadata: {
            userId: String(ctx.user.id),
            type: input.type,
            itemOrCollectionId: String(input.id),
            designerProfileId: String(designerProfileId),
            platformFeeCents: String(platformFeeCents),
            designerAmountCents: String(designerAmountCents),
          },
        };

        if (designerAccountId) {
          piParams.application_fee_amount = platformFeeCents;
          piParams.transfer_data = { destination: designerAccountId };
        }

        const pi = await s.paymentIntents.create(piParams);

        return {
          clientSecret: pi.client_secret,
          paymentIntentId: pi.id,
          amountAud: (amountCents / 100).toFixed(2),
          platformFeeAud: (platformFeeCents / 100).toFixed(2),
          designerAmountAud: (designerAmountCents / 100).toFixed(2),
        };
      }),

    /**
     * Called from the client after Stripe confirms the payment.
     * Creates the lease record in the DB and marks it as active.
     */
    confirmLease: protectedProcedure
      .input(z.object({ paymentIntentId: z.string().max(255) }))
      .mutation(async ({ ctx, input }) => {
        const s = requireStripe();
        const pi = await s.paymentIntents.retrieve(input.paymentIntentId);

        if (pi.metadata?.userId !== String(ctx.user.id)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (pi.status !== "succeeded") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Payment not yet complete (status: ${pi.status})`,
          });
        }

        // Guard: don't create duplicate leases for the same payment intent
        const existing = await db.getWardrobeLeaseByPaymentIntent(input.paymentIntentId);
        if (existing) return existing;

        const leaseType = pi.metadata?.type as "item" | "collection";
        const itemOrCollectionId = parseInt(pi.metadata?.itemOrCollectionId ?? "0", 10);
        const designerProfileId = parseInt(pi.metadata?.designerProfileId ?? "0", 10);
        const platformFeeCents = parseInt(pi.metadata?.platformFeeCents ?? "0", 10);
        const designerAmountCents = parseInt(pi.metadata?.designerAmountCents ?? "0", 10);

        return db.createWardrobeLease({
          userId: ctx.user.id,
          designerProfileId,
          wardrobeItemId: leaseType === "item" ? itemOrCollectionId : null,
          collectionId: leaseType === "collection" ? itemOrCollectionId : null,
          leaseType,
          stripePaymentIntentId: pi.id,
          stripeTransferId: (pi.transfer_data as any)?.destination ?? null,
          amountPaidAud: pi.amount,
          designerAmountAud: designerAmountCents,
          platformFeeAud: platformFeeCents,
          status: "active",
        } as any);
      }),

    /** All leases for the current user */
    myInventory: protectedProcedure.query(async ({ ctx }) => {
      return db.getWardrobeLeasesByUser(ctx.user.id);
    }),

    /** Check if the current user has an active lease for a specific item */
    hasAccess: protectedProcedure
      .input(z.object({ wardrobeItemId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const leases = await db.getWardrobeLeasesByUser(ctx.user.id);
        const active = leases.filter((l) => (l as any).status === "active");

        const hasItem = active.some((l) => (l as any).wardrobeItemId === input.wardrobeItemId);
        if (hasItem) return { hasAccess: true };

        const item = await db.getWardrobeItemById(input.wardrobeItemId);
        if (!item?.collectionId) return { hasAccess: false };

        const hasCollection = active.some((l) => (l as any).collectionId === item.collectionId);
        return { hasAccess: hasCollection };
      }),
  }),
});
