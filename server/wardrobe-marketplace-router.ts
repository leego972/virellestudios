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
import { eq, and, desc, isNotNull, sql } from "drizzle-orm";
import { ENV } from "./_core/env";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import * as db from "./db";
import {
  designerProfiles,
  designerCollections,
  wardrobeItems,
  wardrobeAssignments,
  projects,
} from "../drizzle/schema";

const stripe: Stripe | null = ENV.stripeSecretKey
  ? new Stripe(ENV.stripeSecretKey, { apiVersion: "2024-06-20" as any })
  : null;

const PLATFORM_COMMISSION = 0.05; // 5%
const DESIGNER_YEARLY_CENTS = 29900; // A$299.00 — standard annual membership
const FOUNDING_DESIGNER_YEARLY_CENTS = 15000; // A$150.00 — Founding Designer Partner price
  const FOUNDING_MEMBER_LIMIT = 50;                // promo closes automatically at this count

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
          return db.getDesignerProfileByUserId(ctx.user.id);
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
        return dbConn
          .select()
          .from(designerProfiles)
          .where(
            and(
              eq(designerProfiles.visibility, "public"),
              eq(designerProfiles.membershipStatus, "active"),
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
        const published = collections.filter((c) => c.published);
        return { profile, collections: published };
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
          (i) => i.visibility === "public" && i.status === "active" && i.leasePriceAud,
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
              isNotNull(wardrobeItems.leasePriceAud),
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
        const s = requireStripe();

        let amountCents: number;
        let designerProfileId: number;
        let productName: string;

        if (input.type === "item") {
          const item = await db.getWardrobeItemById(input.id);
          if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
          if (!item.leasePriceAud) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Item has no lease price set" });
          }
          amountCents = item.leasePriceAud;
          designerProfileId = item.designerProfileId!;
          productName = `Lease: ${item.name} — Virelle Studios`;
        } else {
          const col = await db.getDesignerCollectionById(input.id);
          if (!col || !col.collectionPriceAud) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found or not priced" });
          }
          amountCents = col.collectionPriceAud;
          designerProfileId = col.designerProfileId;
          productName = `Lease collection: ${col.name} — Virelle Studios`;
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
          success_url: `${input.returnUrl}?lease_session={CHECKOUT_SESSION_ID}`,
          cancel_url: `${input.returnUrl}?lease_cancelled=1`,
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
     * Called from the client after Stripe Checkout succeeds (via ?lease_session=).
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
      return db.getWardrobeLeasesByUser(ctx.user.id);
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
            const rows = await _db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1).catch(()=>[] as any[]);
            if (!rows[0] || (rows[0] as any).userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
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
      }),
  });