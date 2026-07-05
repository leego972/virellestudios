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
import { generateImage } from "./_core/imageGeneration";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc, isNotNull, sql } from "drizzle-orm";
import { ENV } from "./_core/env";
import { isTopTierUser } from "./_core/subscription";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import * as db from "./db";
import {
  designerProfiles,
  designerCollections,
  wardrobeItems,
  wardrobeAssignments,
  characters,
  scenes,
  projects,
  customItemOrders,
} from "../drizzle/schema";

// returnUrl domain allowlist — prevents open redirect after Stripe checkout/portal.
function assertAppReturnUrl(url: string): void {
  let parsed: URL;
  try { parsed = new URL(url); } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid return URL." });
  }
  const allowedHosts = [
    "virelle.life",
    process.env.RAILWAY_PUBLIC_DOMAIN ?? "",
    "localhost",
  ].filter(Boolean);
  const ok = allowedHosts.some(
    (h) => parsed.hostname === h || parsed.hostname.endsWith("." + h)
  );
  if (!ok) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Return URL must point to the Virelle Studios application.",
    });
  }
}

const stripe: Stripe | null = ENV.stripeSecretKey
  ? new Stripe(ENV.stripeSecretKey, { apiVersion: "2024-06-20" as any })
  : null;

const PLATFORM_COMMISSION = 0.05; // 5%
const DESIGNER_YEARLY_CENTS = 29900; // A$299.00 — standard annual membership
const FOUNDING_DESIGNER_YEARLY_CENTS = 15000; // A$150.00 — Founding Designer Partner price
  const FOUNDING_MEMBER_LIMIT = 50;                // promo closes automatically at this count
  const BUNDLE_YEARLY_CENTS = 143120; // A$1,431.20 — Designer membership + Virelle Indie (20% off combined A$1,789/yr)

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

    /** Create a Stripe Checkout Session for the designer membership.
     * Currently charges the Founding Partner price (A$150/year). */
    subscribeMembership: protectedProcedure
      .input(z.object({ returnUrl: z.string().url().max(512) }))
      .mutation(async ({ ctx, input }) => {
          assertAppReturnUrl(input.returnUrl);
        const s = requireStripe();
        const profile = await db.getDesignerProfileByUserId(ctx.user.id);
        if (profile?.membershipStatus === "active") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You already have an active designer membership." });
        }

        // Auto-select founding vs standard price based on live paying-designer count
        const dbConn = await getDb();
        const [countRow] = dbConn
          ? await dbConn.select({ n: sql<number>`count(*)` }).from(designerProfiles)
              .where(and(eq(designerProfiles.membershipStatus, "active"), isNotNull(designerProfiles.membershipSubscriptionId)))
          : [{ n: 0 }];
        const payingCount = Number(countRow?.n ?? 0);
        const isFounding = payingCount < FOUNDING_MEMBER_LIMIT;
        const priceToCharge = isFounding ? FOUNDING_DESIGNER_YEARLY_CENTS : DESIGNER_YEARLY_CENTS;
        const productName = isFounding
          ? `Virelle Studios — Founding Designer Partner Membership`
          : "Virelle Studios — Designer Marketplace Membership";
        const productDesc = isFounding
          ? `Founding Partner (spot ${payingCount + 1} of ${FOUNDING_MEMBER_LIMIT}): A$150/yr. Priority placement, 95% of every lease.`
          : "Designer Marketplace Membership: A$299/year. Unlimited collections, 95% of every lease, direct Stripe payouts.";

        const session = await s.checkout.sessions.create({
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [{
            price_data: {
              currency: "aud",
              product_data: {
                name: productName,
                description: productDesc,
                metadata: { type: "designer_membership" },
              },
              unit_amount: priceToCharge,
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

      /** Create a Stripe Checkout Session for the Designer + Virelle Indie bundle (20% off). */
      subscribeBundleMembership: protectedProcedure
        .input(z.object({ returnUrl: z.string().url().max(512) }))
        .mutation(async ({ ctx, input }) => {
          assertAppReturnUrl(input.returnUrl);
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
                  name: "Virelle Studios — Designer + Filmmaker Bundle",
                  description: "Designer Marketplace membership (A$299/yr) + Virelle Indie filmmaker plan (A$1,490/yr) — 20% off. Unlimited collections, filmmaker tools, 95% of every lease.",
                  metadata: { type: "designer_bundle" },
                },
                unit_amount: BUNDLE_YEARLY_CENTS,
                recurring: { interval: "year" },
              },
              quantity: 1,
            }],
            success_url: `${input.returnUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${input.returnUrl}?checkout=cancelled`,
            metadata: { userId: String(ctx.user.id), type: "designer_bundle" },
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

        const sub = session.subscription as any;
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
          await db.updateDesignerProfile(existing.id, patch);
          // If bundle: also activate the user's Virelle Indie tier
          if (session.metadata?.type === "designer_bundle") {
            await db.updateUser(ctx.user.id, {
              subscriptionTier: "indie" as any,
              subscriptionStatus: "active" as any,
              subscriptionCurrentPeriodEnd: periodEnd,
            });
          }
          return db.getDesignerProfileByUserId(ctx.user.id);
        }

          if (session.metadata?.type === "designer_bundle") {
            await db.updateUser(ctx.user.id, {
              subscriptionTier: "indie" as any,
              subscriptionStatus: "active" as any,
              subscriptionCurrentPeriodEnd: periodEnd,
            });
          }
        return db.createDesignerProfile({
          userId: ctx.user.id,
          brandName: "My Brand",
          ...patch,
        });
      }),

    /** Save brand profile info (name, type, bio) to the designer profile */
    updateBrandProfile: protectedProcedure
      .input(z.object({
        brandName: z.string().min(1).max(255),
        profileType: z.string().max(64).optional(),
        bio: z.string().max(2000).optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getDesignerProfileByUserId(ctx.user.id);
        if (existing) {
          return db.updateDesignerProfile(existing.id, {
            brandName: input.brandName,
            profileType: input.profileType ?? undefined,
            bio: input.bio ?? undefined,
          });
        }
        return db.createDesignerProfile({
          userId: ctx.user.id,
          brandName: input.brandName,
          profileType: input.profileType ?? "designer",
          bio: input.bio ?? undefined,
        });
      }),

    /** Get current membership status for the authenticated user */
    getMembershipStatus: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getDesignerProfileByUserId(ctx.user.id);
      return {
        status: profile?.membershipStatus ?? "none",
        expiresAt: profile?.membershipCurrentPeriodEnd ?? null,
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
          assertAppReturnUrl(input.returnUrl);
        const s = requireStripe();
        const profile = await db.getDesignerProfileByUserId(ctx.user.id);
        if (!profile || profile.membershipStatus !== "active") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Active designer membership required to set up payouts" });
        }

        let accountId: string = profile.stripeAccountId ?? "";

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
          });
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
      const accountId = profile?.stripeAccountId ?? undefined;
      if (!accountId || !stripe) {
        return { connected: false, chargesEnabled: false, payoutsEnabled: false };
      }
      try {
        const account = await stripe.accounts.retrieve(accountId);
        if (account.charges_enabled && account.payouts_enabled &&
            profile?.stripeAccountStatus !== "active") {
          await db.updateDesignerProfile(profile!.id, { stripeAccountStatus: "active" });
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
        });
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
          .set({ collectionPriceAud: input.collectionPriceAud })
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
        if (!profile || profile.membershipStatus !== "active") {
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
          })
          .where(eq(designerCollections.id, input.collectionId));
        return db.getDesignerCollectionById(input.collectionId);
      }),

    /** Designer's earnings summary */
    getEarnings: protectedProcedure.query(async ({ ctx }) => {
      const profile = await db.getDesignerProfileByUserId(ctx.user.id);
      if (!profile) return { totalEarned: 0, leaseCount: 0, pendingPayout: 0 };
      const leases = await db.getWardrobeLeasesByDesigner(profile.id);
      const active = leases.filter((l) => l.status === "active");
      const totalEarned = active.reduce((sum, l) => sum + (l.designerAmountAud ?? 0), 0);
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


    /** Returns live founding-program status so the frontend can show spots remaining */
    foundingStatus: publicProcedure.query(async () => {
      const dbConn = await getDb();
      const [row] = dbConn
        ? await dbConn.select({ n: sql<number>`count(*)` }).from(designerProfiles)
            .where(and(eq(designerProfiles.membershipStatus, "active"), isNotNull(designerProfiles.membershipSubscriptionId)))
        : [{ n: 0 }];
      const taken = Number(row?.n ?? 0);
      const spotsRemaining = Math.max(0, FOUNDING_MEMBER_LIMIT - taken);
      return { foundingActive: taken < FOUNDING_MEMBER_LIMIT, spotsRemaining, taken, totalSpots: FOUNDING_MEMBER_LIMIT };
    }),
    /** List all designers with an active membership */
    browseDesigners: publicProcedure
      .input(z.object({
        limit: z.number().int().min(1).max(60).default(24),
        offset: z.number().int().min(0).default(0),
      }).optional())
      .query(async ({ input }) => {
        const dbConn = await getDb();
        if (!dbConn) return [];
        // Deduplicate by brandName — take the canonical (lowest-id) profile per brand.
        // Without a UNIQUE constraint on brandName, repeated seed runs create duplicate
        // profiles; this ensures each brand appears exactly once in the marketplace grid.
        const lim = input?.limit ?? 24;
        const off = input?.offset ?? 0;
        const [rows] = await dbConn.execute(sql`
          SELECT dp.* FROM designerProfiles dp
          INNER JOIN (
            SELECT MIN(id) AS min_id
            FROM designerProfiles
            WHERE visibility = 'public' AND membershipStatus = 'active'
            GROUP BY brandName
          ) deduped ON dp.id = deduped.min_id
          ORDER BY dp.createdAt DESC
          LIMIT ${lim} OFFSET ${off}
        `);
        return (rows as unknown as any[]);
      }),
    /** Single designer + their published collections */
    getDesigner: publicProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ input }) => {
        const profile = await db.getDesignerProfileById(input.id);
        if (!profile || profile.visibility !== "public") return null;
        const collections = await db.getDesignerCollectionsByDesigner(profile.id);
        const published = collections.filter((c) => c.published);
        // Fetch leasable items for every published collection so CollectionBlock renders them
        const collectionsWithItems = await Promise.all(
          published.map(async (col) => {
            const allItems = await db.getWardrobeItemsByCollection(col.id);
            const leasable = allItems.filter(
              (i: any) => i.visibility === "public" && i.status === "active" && i.retailPriceAud,
            );
            return { ...col, items: leasable };
          }),
        );
        // Deduplicate by name — keep the canonical collection (most items wins, tie → lowest id)
          const seenNames = new Map<string, typeof collectionsWithItems[0]>();
          for (const col of collectionsWithItems) {
            const existing = seenNames.get(col.name);
            if (!existing || col.items.length > existing.items.length ||
                (col.items.length === existing.items.length && col.id < existing.id)) {
              seenNames.set(col.name, col);
            }
          }
          // Filter: only show collections that actually have leasable items
          const deduped = Array.from(seenNames.values()).filter(c => c.items.length > 0);
          return { profile, collections: deduped };
      }),

    /** Single collection + items available for lease */
    getCollection: publicProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ input }) => {
        const col = await db.getDesignerCollectionById(input.id);
        if (!col || !col.published) return null;
        const designer = await db.getDesignerProfileById(col.designerProfileId);
        const items = await db.getWardrobeItemsByCollection(input.id);
        const leasable = items.filter(
          (i) => i.visibility === "public" && i.status === "active" && i.retailPriceAud,
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
              isNotNull(wardrobeItems.retailPriceAud),
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
     * Create a Stripe Checkout Session for leasing an item or collection.
     * Redirects the user to Stripe-hosted checkout — no Stripe.js needed on the client.
     */
    checkout: protectedProcedure
      .input(z.object({
        type: z.enum(["item", "collection"]),
        id: z.number().int(),
        returnUrl: z.string().url().max(512),
      }))
      .mutation(async ({ ctx, input }) => {
          assertAppReturnUrl(input.returnUrl);
        const s = requireStripe();

        let amountCents: number;
        let designerProfileId: number;
        let productName: string;

        if (input.type === "item") {
          const item = await db.getWardrobeItemById(input.id);
          if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
          if (!item.retailPriceAud) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Item has no purchase price set" });
          }
          amountCents = item.retailPriceAud;
          designerProfileId = item.designerProfileId!;
          productName = `Buy: ${item.name} — Virelle Studios`;
        } else {
          const col = await db.getDesignerCollectionById(input.id);
          if (!col) throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });
          // Auto-calculate bundle: sum of actual item prices × 0.90 (10% bundle discount)
          const _colItems = await db.getWardrobeItemsByCollection(input.id);
          const _colItemSum = (_colItems as any[]).reduce((s: number, i: any) => s + (i.retailPriceAud ?? 0), 0);
          amountCents = _colItemSum > 0 ? Math.floor(_colItemSum * 0.90) : (col.collectionPriceAud ?? 100);
          designerProfileId = col.designerProfileId;
          productName = `Buy: ${col.name} Collection — Virelle Studios`;
        }

        const designer = await db.getDesignerProfileById(designerProfileId);
        const designerAccountId: string | null = designer?.stripeAccountId ?? null;

        const platformFeeCents = Math.round(amountCents * PLATFORM_COMMISSION);
        const designerAmountCents = amountCents - platformFeeCents;

        const sessionMeta: Record<string, string> = {
          userId: String(ctx.user.id),
          leaseType: input.type,
          itemOrCollectionId: String(input.id),
          designerProfileId: String(designerProfileId),
          platformFeeCents: String(platformFeeCents),
          designerAmountCents: String(designerAmountCents),
        };

        const paymentIntentData = {
          metadata: sessionMeta,
          ...(designerAccountId
            ? { application_fee_amount: platformFeeCents, transfer_data: { destination: designerAccountId } }
            : {}),
        };

        const session = await s.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          line_items: [{
            price_data: {
              currency: "aud",
              product_data: { name: productName },
              unit_amount: amountCents,
            },
            quantity: 1,
          }],
          success_url: `${input.returnUrl}?purchase_session={CHECKOUT_SESSION_ID}`,
          cancel_url: `${input.returnUrl}?purchase_cancelled=1`,
          metadata: sessionMeta,
          payment_intent_data: paymentIntentData,
          customer_email: (ctx.user as any).email ?? undefined,
        });

        return {
          checkoutUrl: session.url,
          sessionId: session.id,
          amountAud: (amountCents / 100).toFixed(2),
          platformFeeAud: (platformFeeCents / 100).toFixed(2),
          designerAmountAud: (designerAmountCents / 100).toFixed(2),
        };
      }),

    /**
     * Called from the client after Stripe Checkout succeeds (via ?purchase_session=).
     * Creates the lease record in the DB and marks it as active.
     */
    confirmLease: protectedProcedure
      .input(z.object({ sessionId: z.string().max(255) }))
      .mutation(async ({ ctx, input }) => {
        const s = requireStripe();
        const session = await s.checkout.sessions.retrieve(input.sessionId, {
          expand: ["payment_intent"],
        });

        if (session.metadata?.userId !== String(ctx.user.id)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (session.payment_status !== "paid") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Payment not yet complete (status: ${session.payment_status})`,
          });
        }

        const pi = session.payment_intent as Stripe.PaymentIntent | null;
        const piId = pi?.id ?? null;

        // Guard: don't create duplicate leases for the same payment intent
        if (piId) {
          const existing = await db.getWardrobeLeaseByPaymentIntent(piId);
          if (existing) return existing;
        }

        const meta = session.metadata ?? {};
        const leaseType = (meta.leaseType ?? "item") as "item" | "collection";
        const itemOrCollectionId = parseInt(meta.itemOrCollectionId ?? "0", 10);
        const designerProfileId = parseInt(meta.designerProfileId ?? "0", 10);
        const platformFeeCents = parseInt(meta.platformFeeCents ?? "0", 10);
        const designerAmountCents = parseInt(meta.designerAmountCents ?? "0", 10);
        const amountCents = session.amount_total ?? 0;

        return db.createWardrobeLease({
          userId: ctx.user.id,
          designerProfileId,
          wardrobeItemId: leaseType === "item" ? itemOrCollectionId : null,
          collectionId: leaseType === "collection" ? itemOrCollectionId : null,
          leaseType,
          stripePaymentIntentId: piId,
          stripeTransferId: null,
          amountPaidAud: amountCents,
          designerAmountAud: designerAmountCents,
          platformFeeAud: platformFeeCents,
          status: "active",
        } as any);
      }),

    /** All leases for the current user */
    myInventory: protectedProcedure.query(async ({ ctx }) => {
        const leases = await db.getWardrobeLeasesByUser(ctx.user.id);
        // Enrich each lease with item/collection name and image for the inventory UI
        return Promise.all(leases.map(async (l) => {
          if (l.leaseType === "item" && l.wardrobeItemId) {
            const item = await db.getWardrobeItemById(l.wardrobeItemId);
            return { ...l, itemName: item?.name ?? null, imageUrl: item?.primaryImageUrl ?? null };
          }
          if (l.leaseType === "collection" && l.collectionId) {
            const col = await db.getDesignerCollectionById(l.collectionId);
            return { ...l, collectionName: col?.name ?? null };
          }
          return l;
        }));
      }),

    /** Check if the current user has an active lease for a specific item */
    hasAccess: protectedProcedure
      .input(z.object({ wardrobeItemId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const leases = await db.getWardrobeLeasesByUser(ctx.user.id);
        const active = leases.filter((l) => l.status === "active");

        const hasItem = active.some((l) => l.wardrobeItemId === input.wardrobeItemId);
        if (hasItem) return { hasAccess: true };

        const item = await db.getWardrobeItemById(input.wardrobeItemId);
        if (!item?.collectionId) return { hasAccess: false };

        const hasCollection = active.some((l) => l.collectionId === item.collectionId);
        return { hasAccess: hasCollection };
      }),
  }),

      /** ── Director: assign leased items to characters for scene ranges ── */
      director: router({
        /** Assign a leased wardrobe item to a character for a range of scenes */
        assign: protectedProcedure
            .input(z.object({
              projectId: z.number().int(),
              characterId: z.number().int(),
              wardrobeItemId: z.number().int(),
              fromSceneOrder: z.number().int().min(0),
              toSceneOrder: z.number().int().min(0),
              notes: z.string().max(500).optional(),
            }))
            .mutation(async ({ ctx, input }) => {
              const _db = (await getDb())!;

              // ── Verify project ownership ──
              const rows = await _db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1).catch(()=>[] as any[]);
              if (!rows[0] || (rows[0] as any).userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

              // ── Verify the user has purchased this item before assigning it ──
              // One purchase = unlimited use across all the user's projects,
              // characters and scenes, present and future. We check:
              //   (a) direct item lease  OR
              //   (b) collection lease that includes this item  OR
              //   (c) the user IS the designer who created this item
              const userLeases = await db.getWardrobeLeasesByUser(ctx.user.id);
              const activeLeases = userLeases.filter((l) => l.status === "active");
              const hasDirectLease = activeLeases.some((l) => l.wardrobeItemId === input.wardrobeItemId);
              if (!hasDirectLease) {
                const item = await db.getWardrobeItemById(input.wardrobeItemId);
                if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Wardrobe item not found" });
                const isOwnItem = item.userId === ctx.user.id;
                const hasCollectionLease = item.collectionId
                  ? activeLeases.some((l) => l.collectionId === item.collectionId)
                  : false;
                if (!isOwnItem && !hasCollectionLease) {
                  throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Purchase this item (or its collection) before assigning it to a character.",
                  });
                }
              }

              await _db.delete(wardrobeAssignments).where(
                and(
                  eq(wardrobeAssignments.projectId, input.projectId),
                  eq(wardrobeAssignments.characterId, input.characterId),
                  eq(wardrobeAssignments.fromSceneOrder, input.fromSceneOrder),
                  eq(wardrobeAssignments.toSceneOrder, input.toSceneOrder),
                )
              ).catch(()=>{});
              const res = await _db.insert(wardrobeAssignments).values({
                userId: ctx.user.id,
                assignmentType: "character_wardrobe",
                projectId: input.projectId,
                characterId: input.characterId,
                wardrobeItemId: input.wardrobeItemId,
                fromSceneOrder: input.fromSceneOrder,
                toSceneOrder: input.toSceneOrder,
                placementNotes: input.notes ?? undefined,
              });
              return { id: (res as any).insertId, success: true };
            }),

        /** List all wardrobe assignments for a project */
        list: protectedProcedure
          .input(z.object({ projectId: z.number().int() }))
          .query(async ({ ctx, input }) => {
            const _db = (await getDb())!;
            const rows = await _db
              .select({ assignment: wardrobeAssignments, item: wardrobeItems })
              .from(wardrobeAssignments)
              .leftJoin(wardrobeItems, eq(wardrobeAssignments.wardrobeItemId, wardrobeItems.id))
              .where(eq(wardrobeAssignments.projectId, input.projectId));
            return rows;
          }),

        /** Remove a wardrobe assignment */
        remove: protectedProcedure
          .input(z.object({ assignmentId: z.number().int() }))
          .mutation(async ({ ctx, input }) => {
            (await getDb())!.delete(wardrobeAssignments).where(eq(wardrobeAssignments.id, input.assignmentId));
            return { success: true };
          }),

        /** All assignments for a specific wardrobe item owned by the user */
        listByItem: protectedProcedure
          .input(z.object({ wardrobeItemId: z.number().int() }))
          .query(async ({ ctx, input }) => {
            const _db = (await getDb())!;
            const rows = await _db
              .select({
                id: wardrobeAssignments.id,
                characterId: wardrobeAssignments.characterId,
                projectId: wardrobeAssignments.projectId,
                fromSceneOrder: wardrobeAssignments.fromSceneOrder,
                toSceneOrder: wardrobeAssignments.toSceneOrder,
                placementNotes: wardrobeAssignments.placementNotes,
                characterName: characters.name,
                projectTitle: projects.title,
              })
              .from(wardrobeAssignments)
              .leftJoin(characters, eq(wardrobeAssignments.characterId, characters.id))
              .leftJoin(projects, eq(wardrobeAssignments.projectId, projects.id))
              .where(
                and(
                  eq(wardrobeAssignments.wardrobeItemId, input.wardrobeItemId),
                  eq(wardrobeAssignments.userId, ctx.user.id),
                )
              );
            return rows;
          }),
      }),

    // ═══════════════════════════════════════════════════════════════════════════
    // CUSTOM ITEM ORDERS — AI-generated wardrobe items
    //   Price: A$4.99 per item
    //   Flow: describe → Stripe checkout → AI generation → wardrobe inventory
    // ═══════════════════════════════════════════════════════════════════════════
    customItem: router({

      /** Create a Stripe Checkout Session for a custom item order (A$4.99) */
      checkout: protectedProcedure
        .input(z.object({
          description:       z.string().min(5).max(1000),
          referenceImageUrl: z.string().url().max(512).optional(),
          characterId:       z.number().int().positive().optional(),
          sceneId:           z.number().int().positive().optional(),
          returnUrl:         z.string().url().max(512),
        }))
        .mutation(async ({ ctx, input }) => {
          assertAppReturnUrl(input.returnUrl);
          const s = requireStripe();
          const PRICE_CENTS = 499; // A$4.99
          const dbConn = await getDb();
          if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

          const [insertResult] = await dbConn
            .insert(customItemOrders)
            .values({
              userId:            ctx.user.id,
              description:       input.description,
              referenceImageUrl: input.referenceImageUrl ?? null,
              priceAud:          PRICE_CENTS,
              status:            "pending_payment",
              characterId:       input.characterId ?? null,
              sceneId:           input.sceneId ?? null,
            } as any);
          const orderId = (insertResult as any).insertId as number;

          const session = await s.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [{
              price_data: {
                currency: "aud",
                product_data: {
                  name: "Lamalo Custom Item — AI Fashion Generation",
                  description: input.description.slice(0, 100),
                },
                unit_amount: PRICE_CENTS,
              },
              quantity: 1,
            }],
            success_url: input.returnUrl + "?custom_session={CHECKOUT_SESSION_ID}&order_id=" + orderId,
            cancel_url:  input.returnUrl + "?custom_cancelled=1",
            metadata: {
              userId:            String(ctx.user.id),
              type:              "custom_item_order",
              orderId:           String(orderId),
              description:       input.description.slice(0, 500),
              referenceImageUrl: input.referenceImageUrl ?? "",
              characterId:       input.characterId ? String(input.characterId) : "",
              sceneId:           input.sceneId     ? String(input.sceneId)     : "",
            },
            customer_email: (ctx.user as any).email ?? undefined,
          });

          await dbConn
            .update(customItemOrders)
            .set({ stripeSessionId: session.id })
            .where(eq(customItemOrders.id, orderId));

          return { checkoutUrl: session.url, sessionId: session.id, orderId };
        }),

      /**
       * Called when the user returns from Stripe with ?custom_session=.
       * Verifies payment, generates the AI image, adds item to wardrobe inventory.
       */
      confirmAndGenerate: protectedProcedure
        .input(z.object({ sessionId: z.string().max(255) }))
        .mutation(async ({ ctx, input }) => {
          const s = requireStripe();
          const dbConn = await getDb();
          if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

          const session = await s.checkout.sessions.retrieve(input.sessionId, {
            expand: ["payment_intent"],
          });
          if (session.metadata?.userId !== String(ctx.user.id)) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
          if (session.payment_status !== "paid") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Payment not completed yet." });
          }

          const orderId         = parseInt(session.metadata?.orderId ?? "0", 10);
            const description     = session.metadata?.description ?? "";
            const referenceImgUrl = session.metadata?.referenceImageUrl || null;
            const metaCharId      = session.metadata?.characterId ? parseInt(session.metadata.characterId, 10) : null;
            const metaSceneId     = session.metadata?.sceneId     ? parseInt(session.metadata.sceneId,     10) : null;

            // Idempotency
            const [existingOrder] = await dbConn
              .select()
              .from(customItemOrders)
              .where(eq(customItemOrders.id, orderId));
            if (existingOrder?.status === "completed") {
              return { success: true, wardrobeItemId: existingOrder.wardrobeItemId, alreadyProcessed: true };
            }

            await dbConn
              .update(customItemOrders)
              .set({
                status: "pending_generation",
                stripePaymentIntentId: (session.payment_intent as any)?.id ?? null,
              })
              .where(eq(customItemOrders.id, orderId));

            try {
              // ── Fetch character + scene context for AI generation ──
              let character: (typeof characters.$inferSelect) | undefined;
              let scene:     (typeof scenes.$inferSelect)     | undefined;

              if (metaCharId) {
                const [c] = await dbConn.select().from(characters)
                  .where(eq(characters.id, metaCharId)).limit(1);
                character = c;
              }
              if (metaSceneId) {
                const [s] = await dbConn.select().from(scenes)
                  .where(eq(scenes.id, metaSceneId)).limit(1);
                scene = s;
              }

              // ── Build cinematic, character-anchored prompt ──
              const promptParts: string[] = [];

              if (character) {
                const attrs         = (character.attributes ?? {}) as Record<string, unknown>;
                const wardrobeStyle = (character.wardrobe  ?? {}) as Record<string, string>;
                const charDetails   = [
                  attrs.gender    ? String(attrs.gender)    : null,
                  attrs.age       ? `age ${attrs.age}`     : null,
                  attrs.ethnicity ? String(attrs.ethnicity) : null,
                  character.nationality ?? null,
                  character.occupation  ?? null,
                ].filter(Boolean).join(", ");

                promptParts.push(
                  `Character: ${character.name}${charDetails ? ` (${charDetails})` : ""}.`
                );
                promptParts.push(`${character.name} is wearing: ${description}.`);
                if (character.description) {
                  promptParts.push(`Character appearance: ${character.description.slice(0, 300)}.`);
                }
                if (wardrobeStyle.signature) {
                  promptParts.push(`Signature wardrobe style: ${wardrobeStyle.signature}.`);
                }
              } else {
                promptParts.push(`Fashion model wearing: ${description}.`);
              }

              if (scene) {
                const sceneCtx = [
                  scene.timeOfDay    ? `time of day: ${scene.timeOfDay}`       : null,
                  scene.weather      ? `weather: ${scene.weather}`             : null,
                  scene.lighting     ? `lighting: ${scene.lighting}`           : null,
                  scene.mood         ? `mood: ${scene.mood}`                   : null,
                  scene.locationType ? `location: ${scene.locationType}`       : null,
                  scene.colorPalette ? `colour palette: ${scene.colorPalette}` : null,
                ].filter(Boolean).join(", ");
                if (sceneCtx) promptParts.push(`Scene context — ${sceneCtx}.`);
                if (scene.description) {
                  promptParts.push(`Scene: ${scene.description.slice(0, 200)}.`);
                }
              }

              promptParts.push(
                "Full body shot showing the complete outfit from head to toe.",
                "Cinematic photorealistic quality, professional costume reference.",
                "Clothing item clearly and accurately rendered — correct fabric texture, fit, silhouette and colour.",
                "Ultra-high detail, fashion editorial photography standard."
              );

              const prompt = promptParts.join(" ");

              // Reference images: character photo takes priority, then user-supplied URL
              const refImages: Parameters<typeof generateImage>[0]["originalImages"] = [];
              if (character?.photoUrl)               refImages.push({ url: character.photoUrl });
              else if (character?.referenceImageUrl) refImages.push({ url: character.referenceImageUrl });
              if (referenceImgUrl)                   refImages.push({ url: referenceImgUrl });

              const genOptions: Parameters<typeof generateImage>[0] = { prompt };
              if (refImages.length > 0) genOptions.originalImages = refImages;

                          const { url: generatedImageUrl } = await generateImage(genOptions);

            const itemName = description.trim().split(/\s+/).slice(0, 6).join(" ");

            const [itemInsert] = await dbConn
              .insert(wardrobeItems)
                .values({
                  userId:          ctx.user.id,
                  name:            itemName,
                  description,
                  category: (() => {
                    const d = description.toLowerCase();
                    if (/\bshoe|\bboot|\bsneaker|\bheel|\bsandal/.test(d))    return "shoes";
                    if (/\bjacket|\bcoat|\bblazer|\bouterwear/.test(d))        return "outerwear";
                    if (/\bdress|\bgown|\bsaree|\bkimono/.test(d))            return "dress";
                    if (/\bsuit|\btuxedo/.test(d))                              return "suit";
                    if (/\bshirt|\btop|\btank|\bblouse|\bsweater|\bjumper/.test(d)) return "top";
                    if (/\bpant|\btrousers|\bjeans|\bshorts|\bskirt/.test(d)) return "bottom";
                    if (/\bhat|\bcap|\bbeanie|\bhelmet/.test(d))              return "hat";
                    if (/\bbag|\bbackpack|\bpurse|\bhandbag/.test(d))         return "bag";
                    if (/\bnecklace|\bring|\bearring|\bbracelet|\bjewel/.test(d)) return "jewellery";
                    if (/\bscarf|\bgloves|\bbelt|\btie|\bsocks/.test(d))     return "accessory";
                    if (/\bcostume|\buniform|\barmou?r|\brobe/.test(d))        return "costume";
                    return "other";
                  })(),
                  primaryImageUrl: generatedImageUrl ?? null,
                  imageUrls:       generatedImageUrl ? [generatedImageUrl] : [],
                  wardrobeType:    character ? "character_signature" : "wardrobe",
                  visibility:      "private",
                  referencePrompt: prompt,
                  retailPriceAud:  0,
                } as any);
              const newItemId = (itemInsert as any).insertId as number;

              // Auto-assign item to character so scene AI can pick it up automatically
              if (metaCharId && character?.projectId) {
                await dbConn.insert(wardrobeAssignments).values({
                  userId:         ctx.user.id,
                  projectId:      character.projectId,
                  wardrobeItemId: newItemId,
                  assignmentType: "character_costume",
                  characterId:    metaCharId,
                  usageMode:      "must_match",
                  promptWeight:   80,
                  locked:         false,
                } as any).catch(() => { /* non-fatal — item still created */ });
              }

              await dbConn
                .update(customItemOrders)
                .set({
                  status:           "completed",
                  generatedImageUrl: generatedImageUrl ?? null,
                  wardrobeItemId:   newItemId,
                  itemName:         itemName || null,
                  itemCategory:     (() => {
                    const d = description.toLowerCase();
                    if (/\bshoe|\bboot|\bsneaker|\bheel|\bsandal/.test(d))     return "shoes";
                    if (/\bjacket|\bcoat|\bblazer|\bouterwear/.test(d))         return "outerwear";
                    if (/\bdress|\bgown|\bsaree|\bkimono/.test(d))             return "dress";
                    if (/\bsuit|\btuxedo/.test(d))                               return "suit";
                    if (/\bshirt|\btop|\btank|\bblouse|\bsweater|\bjumper/.test(d)) return "top";
                    if (/\bpant|\btrousers|\bjeans|\bshorts|\bskirt/.test(d))  return "bottom";
                    if (/\bhat|\bcap|\bbeanie|\bhelmet/.test(d))               return "hat";
                    if (/\bbag|\bbackpack|\bpurse|\bhandbag/.test(d))          return "bag";
                    if (/\bnecklace|\bring|\bearring|\bbracelet|\bjewel/.test(d)) return "jewellery";
                    if (/\bscarf|\bgloves|\bbelt|\btie|\bsocks/.test(d))      return "accessory";
                    if (/\bcostume|\buniform|\barmou?r|\brobe/.test(d))         return "costume";
                    return "other";
                  })(),
                })
                .where(eq(customItemOrders.id, orderId));

              return { success: true, wardrobeItemId: newItemId, generatedImageUrl };

          } catch (err: any) {
            await dbConn
              .update(customItemOrders)
              .set({ status: "failed", errorMessage: String(err?.message ?? "Generation failed") })
              .where(eq(customItemOrders.id, orderId));
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "AI generation failed — please contact support for a refund.",
            });
          }
        }),

      /** List the current user's custom item orders */
        /** List the current user's characters — used to pick who wears a custom item */
        getMyCharacters: protectedProcedure.query(async ({ ctx }) => {
          const dbConn = await getDb();
          if (!dbConn) return [];
          return dbConn
            .select({
              id:          characters.id,
              name:        characters.name,
              description: characters.description,
              photoUrl:    characters.photoUrl,
              projectId:   characters.projectId,
            })
            .from(characters)
            .where(eq(characters.userId, ctx.user.id))
            .orderBy(desc(characters.updatedAt))
            .limit(100);
        }),
  

        /**
         * Generate a custom wardrobe item FREE — top-tier (Industry) members only.
         * Non-top-tier members use customItem.checkout (A$4.99 via Stripe).
         */
        generateFree: protectedProcedure
          .input(z.object({
            description: z.string().min(5).max(1000),
            characterId: z.number().int().positive().optional(),
            sceneId:     z.number().int().positive().optional(),
            itemName:    z.string().max(255).optional(),
          }))
          .mutation(async ({ ctx, input }) => {
            if (!isTopTierUser(ctx.user)) {
              throw new TRPCError({ code: "FORBIDDEN", message: "Custom item AI generation is free for Industry-tier members. Others pay A$4.99 — use customItem.checkout." });
            }
            const dbConn = await getDb();
            if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

            const [ins] = await dbConn.insert(customItemOrders).values({
              userId:      ctx.user.id,
              description: input.description,
              priceAud:    0,
              status:      "pending_generation",
              characterId: input.characterId ?? null,
              sceneId:     input.sceneId ?? null,
            } as any);
            const orderId = (ins as any).insertId as number;

            try {
              let character: any;
              if (input.characterId) {
                const [c] = await dbConn.select().from(characters)
                  .where(eq(characters.id, input.characterId)).limit(1);
                character = c;
              }
              const promptParts: string[] = [];
              if (character) {
                promptParts.push(`Character: ${character.name} wearing: ${input.description}.`);
                if (character.description) promptParts.push(`Character appearance: ${character.description.slice(0,300)}.`);
              } else {
                promptParts.push(`Fashion model wearing: ${input.description}.`);
              }
              promptParts.push(
                "Full body shot showing the complete outfit from head to toe.",
                "Cinematic photorealistic quality, professional costume reference sheet.",
                "Clothing item clearly rendered — correct fabric texture, fit, silhouette and colour.",
                "Ultra-high detail, fashion editorial photography standard."
              );
              const prompt = promptParts.join(" ");
              const refImages: Parameters<typeof generateImage>[0]["originalImages"] = [];
              if (character?.photoUrl) refImages.push({ url: character.photoUrl });
              else if (character?.referenceImageUrl) refImages.push({ url: character.referenceImageUrl });
              const genOpts: Parameters<typeof generateImage>[0] = { prompt };
              if (refImages.length > 0) genOpts.originalImages = refImages;
              const { url: generatedImageUrl } = await generateImage(genOpts);

              const catDetect = (d: string): string => {
                const s = d.toLowerCase();
                if (/\bshoe|\bboot|\bsneaker|\bheel|\bsandal/.test(s)) return "shoes";
                if (/\bjacket|\bcoat|\bblazer|\bouterwear/.test(s))      return "outerwear";
                if (/\bdress|\bgown/.test(s))                               return "dress";
                if (/\bsuit|\btuxedo/.test(s))                             return "suit";
                if (/\bshirt|\btop|\btank|\bblouse|\bsweater/.test(s))  return "top";
                if (/\bpant|\bjeans|\bshorts|\bskirt/.test(s))           return "bottom";
                if (/\bhat|\bcap|\bbeanie/.test(s))                       return "hat";
                if (/\bbag|\bpurse|\bhandbag/.test(s))                    return "bag";
                return "other";
              };
              const itemName = (input.itemName || input.description).trim().split(/\s+/).slice(0, 6).join(" ");
              const [itemIns] = await dbConn.insert(wardrobeItems).values({
                userId:          ctx.user.id,
                name:            itemName,
                description:     input.description,
                category:        catDetect(input.description),
                primaryImageUrl: generatedImageUrl ?? null,
                imageUrls:       generatedImageUrl ? [generatedImageUrl] : [],
                wardrobeType:    character ? "character_signature" : "wardrobe",
                visibility:      "private",
                referencePrompt: prompt,
                retailPriceAud:  0,
              } as any);
              const newItemId = (itemIns as any).insertId as number;

              if (input.characterId && character?.projectId) {
                await dbConn.insert(wardrobeAssignments).values({
                  userId: ctx.user.id, projectId: character.projectId,
                  wardrobeItemId: newItemId, assignmentType: "character_costume",
                  characterId: input.characterId, usageMode: "must_match",
                  promptWeight: 80, locked: false,
                } as any).catch(() => {});
              }
              await dbConn.update(customItemOrders)
                .set({ status: "completed", generatedImageUrl: generatedImageUrl ?? null, wardrobeItemId: newItemId, itemName })
                .where(eq(customItemOrders.id, orderId));

              return { success: true, wardrobeItemId: newItemId, generatedImageUrl };
            } catch (err: any) {
              await dbConn.update(customItemOrders)
                .set({ status: "failed", errorMessage: err.message })
                .where(eq(customItemOrders.id, orderId));
              throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Image generation failed. Please try again." });
            }
          }),

        getMyOrders: protectedProcedure.query(async ({ ctx }) => {
        const dbConn = await getDb();
        if (!dbConn) return [];
        return dbConn
          .select()
          .from(customItemOrders)
          .where(eq(customItemOrders.userId, ctx.user.id))
          .orderBy(desc(customItemOrders.createdAt))
          .limit(50);
      }),
    }),
  
  });