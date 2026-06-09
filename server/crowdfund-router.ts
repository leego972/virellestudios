import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { logger } from "./_core/logger";
import { z } from "zod";
import { getDb } from "./db";
import {
  crowdfundCampaigns,
  crowdfundRewards,
  crowdfundContributions,
} from "../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 80);
  }

  // ─── Router ───────────────────────────────────────────────────────────────────

  export const crowdfundRouter = router({
    // ── Campaign CRUD ───────────────────────────────────────────────────────────
    campaign: router({
      create: protectedProcedure
        .input(
          z.object({
            title: z.string().min(3).max(255),
            tagline: z.string().max(512).optional(),
            description: z.string().optional(),
            posterUrl: z.string().optional(),
            videoUrl: z.string().optional(),
            genre: z.string().max(128).optional(),
            format: z.enum(["Feature", "Short", "Series", "Documentary", "Other"]).optional(),
            goalAmountCents: z.number().int().min(100),
            fundingModel: z.enum(["all_or_nothing", "keep_it_all"]),
            projectId: z.number().int().optional(),
            payoutEmail: z.string().email().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
          const slug = `${slugify(input.title)}-${nanoid(6)}`;
          const [result] = await db.insert(crowdfundCampaigns).values({
            userId: ctx.user.id,
            projectId: input.projectId ?? null,
            title: input.title,
            slug,
            tagline: input.tagline ?? null,
            description: input.description ?? null,
            posterUrl: input.posterUrl ?? null,
            videoUrl: input.videoUrl ?? null,
            genre: input.genre ?? null,
            format: input.format ?? null,
            goalAmountCents: input.goalAmountCents,
            raisedAmountCents: 0,
            backerCount: 0,
            fundingModel: input.fundingModel,
            status: "draft",
            platformFeeBps: 700,
            stripeConnectOnboarded: false,
            payoutEmail: input.payoutEmail ?? null,
          });
          return { id: (result as any).insertId as number, slug };
        }),

      update: protectedProcedure
        .input(
          z.object({
            id: z.number().int(),
            title: z.string().min(3).max(255).optional(),
            tagline: z.string().max(512).optional(),
            description: z.string().optional(),
            posterUrl: z.string().optional(),
            videoUrl: z.string().optional(),
            genre: z.string().max(128).optional(),
            format: z.enum(["Feature", "Short", "Series", "Documentary", "Other"]).optional(),
            goalAmountCents: z.number().int().min(100).optional(),
            fundingModel: z.enum(["all_or_nothing", "keep_it_all"]).optional(),
            payoutEmail: z.string().email().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
          const [campaign] = await db
            .select()
            .from(crowdfundCampaigns)
            .where(and(eq(crowdfundCampaigns.id, input.id), eq(crowdfundCampaigns.userId, ctx.user.id)));
          if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
          if (campaign.status !== "draft")
            throw new TRPCError({ code: "FORBIDDEN", message: "Can only edit draft campaigns" });
          const updates: Record<string, unknown> = {};
          if (input.title !== undefined) updates.title = input.title;
          if (input.tagline !== undefined) updates.tagline = input.tagline;
          if (input.description !== undefined) updates.description = input.description;
          if (input.posterUrl !== undefined) updates.posterUrl = input.posterUrl;
          if (input.videoUrl !== undefined) updates.videoUrl = input.videoUrl;
          if (input.genre !== undefined) updates.genre = input.genre;
          if (input.format !== undefined) updates.format = input.format;
          if (input.goalAmountCents !== undefined) updates.goalAmountCents = input.goalAmountCents;
          if (input.fundingModel !== undefined) updates.fundingModel = input.fundingModel;
          if (input.payoutEmail !== undefined) updates.payoutEmail = input.payoutEmail;
          await db.update(crowdfundCampaigns).set(updates).where(eq(crowdfundCampaigns.id, input.id));
          return { success: true };
        }),

      launch: protectedProcedure
        .input(z.object({ id: z.number().int(), deadlineDays: z.number().int().min(1).max(90) }))
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
          const [campaign] = await db
            .select()
            .from(crowdfundCampaigns)
            .where(and(eq(crowdfundCampaigns.id, input.id), eq(crowdfundCampaigns.userId, ctx.user.id)));
          if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
          if (campaign.status !== "draft")
            throw new TRPCError({ code: "FORBIDDEN", message: "Campaign is not a draft" });
          if (!campaign.stripeConnectOnboarded)
            throw new TRPCError({ code: "FORBIDDEN", message: "Complete payout setup before launching" });
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + input.deadlineDays);
          const now = new Date();
          await db
            .update(crowdfundCampaigns)
            .set({ status: "active", launchedAt: now, deadline })
            .where(eq(crowdfundCampaigns.id, input.id));
          return { success: true, deadline };
        }),

      get: publicProcedure
        .input(z.object({ slug: z.string() }))
        .query(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
          const [campaign] = await db
            .select()
            .from(crowdfundCampaigns)
            .where(eq(crowdfundCampaigns.slug, input.slug));
          if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
          const rewards = await db
            .select()
            .from(crowdfundRewards)
            .where(and(eq(crowdfundRewards.campaignId, campaign.id), eq(crowdfundRewards.isActive, true)))
            .orderBy(crowdfundRewards.sortOrder);
          return { campaign, rewards };
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number().int() }))
        .query(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
          const [campaign] = await db
            .select()
            .from(crowdfundCampaigns)
            .where(and(eq(crowdfundCampaigns.id, input.id), eq(crowdfundCampaigns.userId, ctx.user.id)));
          if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
          const rewards = await db
            .select()
            .from(crowdfundRewards)
            .where(eq(crowdfundRewards.campaignId, campaign.id))
            .orderBy(crowdfundRewards.sortOrder);
          const contributions = await db
            .select()
            .from(crowdfundContributions)
            .where(eq(crowdfundContributions.campaignId, campaign.id))
            .orderBy(desc(crowdfundContributions.createdAt));
          return { campaign, rewards, contributions };
        }),

      listPublic: publicProcedure
        .input(
          z.object({
            limit: z.number().int().min(1).max(50).default(20),
            offset: z.number().int().min(0).default(0),
            genre: z.string().optional(),
            format: z.string().optional(),
            fundingModel: z.enum(["all_or_nothing", "keep_it_all"]).optional(),
          })
        )
        .query(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
          const campaigns = await db
            .select()
            .from(crowdfundCampaigns)
            .where(eq(crowdfundCampaigns.status, "active"))
            .orderBy(desc(crowdfundCampaigns.raisedAmountCents))
            .limit(input.limit)
            .offset(input.offset);
          return campaigns;
        }),

      listMine: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        return db
          .select()
          .from(crowdfundCampaigns)
          .where(eq(crowdfundCampaigns.userId, ctx.user.id))
          .orderBy(desc(crowdfundCampaigns.createdAt));
      }),

      delete: protectedProcedure
        .input(z.object({ id: z.number().int() }))
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
          const [campaign] = await db
            .select()
            .from(crowdfundCampaigns)
            .where(and(eq(crowdfundCampaigns.id, input.id), eq(crowdfundCampaigns.userId, ctx.user.id)));
          if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
          if (campaign.status !== "draft")
            throw new TRPCError({ code: "FORBIDDEN", message: "Can only delete draft campaigns" });
          await db
            .update(crowdfundCampaigns)
            .set({ status: "cancelled" })
            .where(eq(crowdfundCampaigns.id, input.id));
          return { success: true };
        }),
    }),

    // ── Reward tiers ────────────────────────────────────────────────────────────
    reward: router({
      list: publicProcedure
        .input(z.object({ campaignId: z.number().int() }))
        .query(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
          return db
            .select()
            .from(crowdfundRewards)
            .where(and(eq(crowdfundRewards.campaignId, input.campaignId), eq(crowdfundRewards.isActive, true)))
            .orderBy(crowdfundRewards.sortOrder);
        }),

      create: protectedProcedure
        .input(
          z.object({
            campaignId: z.number().int(),
            title: z.string().min(1).max(255),
            description: z.string().optional(),
            amountCents: z.number().int().min(100),
            limitCount: z.number().int().min(1).optional(),
            estimatedDelivery: z.string().max(128).optional(),
            sortOrder: z.number().int().default(0),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
          const [campaign] = await db
            .select({ id: crowdfundCampaigns.id })
            .from(crowdfundCampaigns)
            .where(and(eq(crowdfundCampaigns.id, input.campaignId), eq(crowdfundCampaigns.userId, ctx.user.id)));
          if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
          const [result] = await db.insert(crowdfundRewards).values({
            campaignId: input.campaignId,
            title: input.title,
            description: input.description ?? null,
            amountCents: input.amountCents,
            limitCount: input.limitCount ?? null,
            claimedCount: 0,
            estimatedDelivery: input.estimatedDelivery ?? null,
            sortOrder: input.sortOrder,
            isActive: true,
          });
          return { id: (result as any).insertId as number };
        }),

      update: protectedProcedure
        .input(
          z.object({
            id: z.number().int(),
            title: z.string().min(1).max(255).optional(),
            description: z.string().optional(),
            amountCents: z.number().int().min(100).optional(),
            limitCount: z.number().int().min(1).nullable().optional(),
            estimatedDelivery: z.string().max(128).optional(),
            sortOrder: z.number().int().optional(),
            isActive: z.boolean().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
          const [reward] = await db
            .select({ id: crowdfundRewards.id, campaignId: crowdfundRewards.campaignId })
            .from(crowdfundRewards)
            .where(eq(crowdfundRewards.id, input.id));
          if (!reward) throw new TRPCError({ code: "NOT_FOUND", message: "Reward not found" });
          const [camp] = await db
            .select({ id: crowdfundCampaigns.id })
            .from(crowdfundCampaigns)
            .where(and(eq(crowdfundCampaigns.id, reward.campaignId), eq(crowdfundCampaigns.userId, ctx.user.id)));
          if (!camp) throw new TRPCError({ code: "FORBIDDEN", message: "Not your campaign" });
          const updates: Record<string, unknown> = {};
          if (input.title !== undefined) updates.title = input.title;
          if (input.description !== undefined) updates.description = input.description;
          if (input.amountCents !== undefined) updates.amountCents = input.amountCents;
          if (input.limitCount !== undefined) updates.limitCount = input.limitCount;
          if (input.estimatedDelivery !== undefined) updates.estimatedDelivery = input.estimatedDelivery;
          if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
          if (input.isActive !== undefined) updates.isActive = input.isActive;
          await db.update(crowdfundRewards).set(updates).where(eq(crowdfundRewards.id, input.id));
          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ id: z.number().int() }))
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
          const [reward] = await db
            .select({ id: crowdfundRewards.id, campaignId: crowdfundRewards.campaignId })
            .from(crowdfundRewards)
            .where(eq(crowdfundRewards.id, input.id));
          if (!reward) throw new TRPCError({ code: "NOT_FOUND", message: "Reward not found" });
          const [camp] = await db
            .select({ id: crowdfundCampaigns.id })
            .from(crowdfundCampaigns)
            .where(and(eq(crowdfundCampaigns.id, reward.campaignId), eq(crowdfundCampaigns.userId, ctx.user.id)));
          if (!camp) throw new TRPCError({ code: "FORBIDDEN", message: "Not your campaign" });
          await db.update(crowdfundRewards).set({ isActive: false }).where(eq(crowdfundRewards.id, input.id));
          return { success: true };
        }),
    }),

    // ── Stripe Connect onboarding ───────────────────────────────────────────────
    connect: router({
      createAccount: protectedProcedure
        .input(z.object({ campaignId: z.number().int() }))
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
          const { stripe } = await import("./_core/subscription");
          if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });
          const [campaign] = await db
            .select()
            .from(crowdfundCampaigns)
            .where(and(eq(crowdfundCampaigns.id, input.campaignId), eq(crowdfundCampaigns.userId, ctx.user.id)));
          if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
          if (campaign.stripeConnectAccountId) return { accountId: campaign.stripeConnectAccountId, alreadyExists: true };
          const account = await stripe.accounts.create({
            type: "express",
            email: ctx.user.email ?? undefined,
            capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
            metadata: { userId: String(ctx.user.id), campaignId: String(campaign.id) },
          });
          await db
            .update(crowdfundCampaigns)
            .set({ stripeConnectAccountId: account.id })
            .where(eq(crowdfundCampaigns.id, input.campaignId));
          return { accountId: account.id, alreadyExists: false };
        }),

      getOnboardingUrl: protectedProcedure
        .input(z.object({ campaignId: z.number().int(), returnUrl: z.string().url() }))
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
          const { stripe } = await import("./_core/subscription");
          if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });
          const [campaign] = await db
            .select()
            .from(crowdfundCampaigns)
            .where(and(eq(crowdfundCampaigns.id, input.campaignId), eq(crowdfundCampaigns.userId, ctx.user.id)));
          if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
          if (!campaign.stripeConnectAccountId)
            throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Create Connect account first" });
          const link = await stripe.accountLinks.create({
            account: campaign.stripeConnectAccountId,
            refresh_url: input.returnUrl,
            return_url: input.returnUrl,
            type: "account_onboarding",
          });
          return { url: link.url };
        }),

      getStatus: protectedProcedure
        .input(z.object({ campaignId: z.number().int() }))
        .query(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
          const [campaign] = await db
            .select()
            .from(crowdfundCampaigns)
            .where(and(eq(crowdfundCampaigns.id, input.campaignId), eq(crowdfundCampaigns.userId, ctx.user.id)));
          if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
          if (!campaign.stripeConnectAccountId)
            return { onboarded: false, chargesEnabled: false, payoutsEnabled: false };
          try {
            const { stripe } = await import("./_core/subscription");
            if (!stripe) return { onboarded: campaign.stripeConnectOnboarded, chargesEnabled: false, payoutsEnabled: false };
            const account = await stripe.accounts.retrieve(campaign.stripeConnectAccountId);
            const chargesEnabled = account.charges_enabled ?? false;
            const payoutsEnabled = account.payouts_enabled ?? false;
            const onboarded = chargesEnabled && payoutsEnabled;
            if (onboarded && !campaign.stripeConnectOnboarded) {
              await db
                .update(crowdfundCampaigns)
                .set({ stripeConnectOnboarded: true })
                .where(eq(crowdfundCampaigns.id, input.campaignId));
            }
            return { onboarded, chargesEnabled, payoutsEnabled };
          } catch {
            return { onboarded: campaign.stripeConnectOnboarded, chargesEnabled: false, payoutsEnabled: false };
          }
        }),
    }),

    // ── Contributions / Backing ─────────────────────────────────────────────────
    contribute: protectedProcedure
      .input(
        z.object({
          campaignSlug: z.string(),
          amountCents: z.number().int().min(100),
          rewardId: z.number().int().optional(),
          message: z.string().max(500).optional(),
          isAnonymous: z.boolean().default(false),
          successUrl: z.string().url(),
          cancelUrl: z.string().url(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { stripe, getOrCreateStripeCustomer } = await import("./_core/subscription");
        if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });
        const [campaign] = await db
          .select()
          .from(crowdfundCampaigns)
          .where(eq(crowdfundCampaigns.slug, input.campaignSlug));
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        if (campaign.status !== "active")
          throw new TRPCError({ code: "FORBIDDEN", message: "Campaign is not accepting contributions" });
        if (!campaign.stripeConnectAccountId || !campaign.stripeConnectOnboarded)
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Campaign payout not configured" });
        if (campaign.deadline && new Date() > campaign.deadline)
          throw new TRPCError({ code: "FORBIDDEN", message: "Campaign deadline has passed" });
        const platformFeeCents = Math.floor((input.amountCents * campaign.platformFeeBps) / 10000);
        const [insertResult] = await db.insert(crowdfundContributions).values({
          campaignId: campaign.id,
          userId: ctx.user.id,
          backerEmail: ctx.user.email ?? null,
          backerName: ctx.user.name ?? null,
          rewardId: input.rewardId ?? null,
          amountCents: input.amountCents,
          platformFeeCents,
          message: input.message ?? null,
          isAnonymous: input.isAnonymous,
          status: "pending",
        });
        const contributionId = (insertResult as any).insertId as number;
        const stripeCustomerId = await getOrCreateStripeCustomer(ctx.user);
        const isAon = campaign.fundingModel === "all_or_nothing";
        const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
          customer: stripeCustomerId,
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "aud",
                product_data: {
                  name: `Back: ${campaign.title}`,
                  description: campaign.tagline ?? undefined,
                },
                unit_amount: input.amountCents,
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          payment_intent_data: {
            application_fee_amount: platformFeeCents,
            transfer_data: { destination: campaign.stripeConnectAccountId! },
            capture_method: isAon ? "manual" : "automatic",
            metadata: {
              contributionId: String(contributionId),
              campaignId: String(campaign.id),
            },
          },
          success_url: `${input.successUrl}?contribution=${contributionId}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: input.cancelUrl,
          metadata: {
            contributionId: String(contributionId),
            campaignId: String(campaign.id),
          },
        };
        const session = await stripe.checkout.sessions.create(sessionParams);
        await db
          .update(crowdfundContributions)
          .set({ stripeSessionId: session.id })
          .where(eq(crowdfundContributions.id, contributionId));
        return { checkoutUrl: session.url!, contributionId };
      }),

    confirmContribution: publicProcedure
      .input(z.object({ sessionId: z.string(), contributionId: z.number().int() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { stripe } = await import("./_core/subscription");
        if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });
        const session = await stripe.checkout.sessions.retrieve(input.sessionId, {
          expand: ["payment_intent"],
        });
        const pi = session.payment_intent as any;
        const isPaid = session.payment_status === "paid" || pi?.status === "requires_capture";
        if (!isPaid) return { success: false, status: session.payment_status };
        const [contribution] = await db
          .select()
          .from(crowdfundContributions)
          .where(
            input.contributionId > 0
              ? eq(crowdfundContributions.id, input.contributionId)
              : eq(crowdfundContributions.stripeSessionId, input.sessionId)
          );
        if (!contribution)
          throw new TRPCError({ code: "NOT_FOUND", message: "Contribution not found" });
        if (contribution.status === "paid" || contribution.status === "captured")
          return { success: true, alreadyConfirmed: true };
        const newStatus = pi?.capture_method === "manual" ? "captured" : "paid";
        await db
          .update(crowdfundContributions)
          .set({ status: newStatus, stripePaymentIntentId: pi?.id ?? null })
          .where(eq(crowdfundContributions.id, contribution.id));
        await db
          .update(crowdfundCampaigns)
          .set({
            raisedAmountCents: sql`raisedAmountCents + ${contribution.amountCents}`,
            backerCount: sql`backerCount + 1`,
          })
          .where(eq(crowdfundCampaigns.id, contribution.campaignId));
        if (contribution.rewardId) {
          await db
            .update(crowdfundRewards)
            .set({ claimedCount: sql`claimedCount + 1` })
            .where(eq(crowdfundRewards.id, contribution.rewardId));
        }
        return { success: true };
      }),

    myContributions: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      return db
        .select({
          contribution: crowdfundContributions,
          campaign: {
            id: crowdfundCampaigns.id,
            title: crowdfundCampaigns.title,
            slug: crowdfundCampaigns.slug,
            posterUrl: crowdfundCampaigns.posterUrl,
            status: crowdfundCampaigns.status,
          },
        })
        .from(crowdfundContributions)
        .innerJoin(crowdfundCampaigns, eq(crowdfundContributions.campaignId, crowdfundCampaigns.id))
        .where(eq(crowdfundContributions.userId, ctx.user.id))
        .orderBy(desc(crowdfundContributions.createdAt));
    }),

    // ── Admin ───────────────────────────────────────────────────────────────────
    admin: router({
      listAll: adminProcedure
        .input(z.object({ limit: z.number().int().default(50) }))
        .query(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
          return db
            .select()
            .from(crowdfundCampaigns)
            .orderBy(desc(crowdfundCampaigns.createdAt))
            .limit(input.limit);
        }),

      closeCampaign: adminProcedure
        .input(z.object({ id: z.number().int(), outcome: z.enum(["funded", "failed"]) }))
        .mutation(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
          const { stripe } = await import("./_core/subscription");
          const [campaign] = await db
            .select()
            .from(crowdfundCampaigns)
            .where(eq(crowdfundCampaigns.id, input.id));
          if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
          if (stripe && campaign.fundingModel === "all_or_nothing") {
            const toProcess = await db
              .select()
              .from(crowdfundContributions)
              .where(
                and(
                  eq(crowdfundContributions.campaignId, campaign.id),
                  eq(crowdfundContributions.status, "captured")
                )
              );
            for (const c of toProcess) {
              if (!c.stripePaymentIntentId) continue;
              try {
                if (input.outcome === "funded") {
                  await stripe.paymentIntents.capture(c.stripePaymentIntentId);
                  await db
                    .update(crowdfundContributions)
                    .set({ status: "paid" })
                    .where(eq(crowdfundContributions.id, c.id));
                } else {
                  await stripe.paymentIntents.cancel(c.stripePaymentIntentId);
                  await db
                    .update(crowdfundContributions)
                    .set({ status: "cancelled" })
                    .where(eq(crowdfundContributions.id, c.id));
                }
              } catch (err: any) {
                logger.error(`[Crowdfund] Failed to process PI ${c.stripePaymentIntentId}: ${err.message}`);
              }
            }
          }
          await db
            .update(crowdfundCampaigns)
            .set({ status: input.outcome === "funded" ? "funded" : "failed", closedAt: new Date() })
            .where(eq(crowdfundCampaigns.id, input.id));
          return { success: true };
        }),
    }),
  });
  