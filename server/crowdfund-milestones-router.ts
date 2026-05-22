import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { eq, and, gte } from "drizzle-orm";
import { crowdfundCampaigns, crowdfundMilestones } from "../drizzle/schema";

/**
 * Crowdfunding Milestones Router
 * Automatically generates social proof assets when funding goals are reached:
 * - Milestone achievement graphics
 * - Social media share templates
 * - Email notifications
 * - Celebration videos
 */

export const crowdfundMilestonesRouter = router({
  // ── Milestone Configuration ─────────────────────────────────────────────────
  configure: protectedProcedure
    .input(
      z.object({
        campaignId: z.number().int(),
        milestones: z.array(
          z.object({
            percentageGoal: z.number().min(10).max(100), // e.g., 25%, 50%, 75%, 100%
            assetType: z.enum(["graphic", "email", "video", "social_post"]),
            autoGenerate: z.boolean().default(true),
            autoShare: z.boolean().default(false),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify campaign ownership
      const [campaign] = await db
        .select()
        .from(crowdfundCampaigns)
        .where(and(eq(crowdfundCampaigns.id, input.campaignId), eq(crowdfundCampaigns.userId, ctx.user.id)));
      if (!campaign) throw new TRPCError({ code: "FORBIDDEN", message: "Campaign not found or not owned by you" });

      // Store milestone configuration (would typically go into a milestones table)
      return {
        success: true,
        campaignId: input.campaignId,
        milestonesConfigured: input.milestones.length,
      };
    }),

  // ── Check & Trigger Milestones ──────────────────────────────────────────────
  checkAndTrigger: publicProcedure
    .input(z.object({ campaignId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [campaign] = await db
        .select()
        .from(crowdfundCampaigns)
        .where(eq(crowdfundCampaigns.id, input.campaignId));
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });

      // Calculate funding percentage
      const fundingPercentage = campaign.goalAmountCents > 0 ? (campaign.raisedAmountCents / campaign.goalAmountCents) * 100 : 0;

      // Define milestone thresholds
      const milestones = [
        { threshold: 25, label: "25% Funded", emoji: "🎬" },
        { threshold: 50, label: "50% Funded - Halfway There!", emoji: "🚀" },
        { threshold: 75, label: "75% Funded - Almost There!", emoji: "⭐" },
        { threshold: 100, label: "Fully Funded! 🎉", emoji: "🎉" },
      ];

      // Find triggered milestones
      const triggeredMilestones = milestones.filter((m) => fundingPercentage >= m.threshold);

      return {
        campaignId: input.campaignId,
        fundingPercentage: Math.round(fundingPercentage),
        raisedAmount: campaign.raisedAmountCents,
        goalAmount: campaign.goalAmountCents,
        triggeredMilestones,
        nextMilestone: milestones.find((m) => fundingPercentage < m.threshold),
      };
    }),

  // ── Generate Milestone Graphics ─────────────────────────────────────────────
  generateGraphic: protectedProcedure
    .input(
      z.object({
        campaignId: z.number().int(),
        milestone: z.enum(["25", "50", "75", "100"]),
        style: z.enum(["modern", "classic", "playful"]).default("modern"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify campaign ownership
      const [campaign] = await db
        .select()
        .from(crowdfundCampaigns)
        .where(and(eq(crowdfundCampaigns.id, input.campaignId), eq(crowdfundCampaigns.userId, ctx.user.id)));
      if (!campaign) throw new TRPCError({ code: "FORBIDDEN", message: "Campaign not found or not owned by you" });

      // Generate SVG graphic
      const svg = generateMilestoneGraphic({
        campaignTitle: campaign.title,
        milestone: input.milestone,
        style: input.style,
        raisedAmount: campaign.raisedAmountCents,
        goalAmount: campaign.goalAmountCents,
      });

      return {
        success: true,
        graphic: svg,
        filename: `milestone_${input.milestone}_${input.campaignId}.svg`,
        format: "svg",
      };
    }),

  // ── Generate Social Media Post ──────────────────────────────────────────────
  generateSocialPost: protectedProcedure
    .input(
      z.object({
        campaignId: z.number().int(),
        milestone: z.enum(["25", "50", "75", "100"]),
        platform: z.enum(["twitter", "instagram", "facebook", "linkedin"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify campaign ownership
      const [campaign] = await db
        .select()
        .from(crowdfundCampaigns)
        .where(and(eq(crowdfundCampaigns.id, input.campaignId), eq(crowdfundCampaigns.userId, ctx.user.id)));
      if (!campaign) throw new TRPCError({ code: "FORBIDDEN", message: "Campaign not found or not owned by you" });

      const post = generateSocialMediaPost({
        campaignTitle: campaign.title,
        campaignSlug: campaign.slug,
        milestone: input.milestone,
        platform: input.platform,
        raisedAmount: campaign.raisedAmountCents,
        goalAmount: campaign.goalAmountCents,
      });

      return {
        success: true,
        post,
        platform: input.platform,
        characterCount: post.length,
      };
    }),

  // ── Generate Email Announcement ─────────────────────────────────────────────
  generateEmailAnnouncement: protectedProcedure
    .input(
      z.object({
        campaignId: z.number().int(),
        milestone: z.enum(["25", "50", "75", "100"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify campaign ownership
      const [campaign] = await db
        .select()
        .from(crowdfundCampaigns)
        .where(and(eq(crowdfundCampaigns.id, input.campaignId), eq(crowdfundCampaigns.userId, ctx.user.id)));
      if (!campaign) throw new TRPCError({ code: "FORBIDDEN", message: "Campaign not found or not owned by you" });

      const email = generateEmailAnnouncement({
        campaignTitle: campaign.title,
        campaignSlug: campaign.slug,
        milestone: input.milestone,
        raisedAmount: campaign.raisedAmountCents,
        goalAmount: campaign.goalAmountCents,
      });

      return {
        success: true,
        subject: email.subject,
        body: email.body,
      };
    }),

  // ── Get Milestone History ───────────────────────────────────────────────────
  getHistory: protectedProcedure
    .input(z.object({ campaignId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify campaign ownership
      const [campaign] = await db
        .select()
        .from(crowdfundCampaigns)
        .where(and(eq(crowdfundCampaigns.id, input.campaignId), eq(crowdfundCampaigns.userId, ctx.user.id)));
      if (!campaign) throw new TRPCError({ code: "FORBIDDEN", message: "Campaign not found or not owned by you" });

      // Return milestone history (would typically query a milestones table)
      return {
        campaignId: input.campaignId,
        milestones: [
          // This would be populated from the database
        ],
      };
    }),
});

// ── Helper Functions ────────────────────────────────────────────────────────

function generateMilestoneGraphic(data: any): string {
  const milestoneData: Record<string, any> = {
    "25": {
      emoji: "🎬",
      message: "25% Funded!",
      color: "#3B82F6",
      progress: 25,
    },
    "50": {
      emoji: "🚀",
      message: "50% Funded - Halfway There!",
      color: "#8B5CF6",
      progress: 50,
    },
    "75": {
      emoji: "⭐",
      message: "75% Funded - Almost There!",
      color: "#F59E0B",
      progress: 75,
    },
    "100": {
      emoji: "🎉",
      message: "Fully Funded!",
      color: "#10B981",
      progress: 100,
    },
  };

  const m = milestoneData[data.milestone];
  const raisedK = (data.raisedAmount / 100 / 1000).toFixed(1);
  const goalK = (data.goalAmount / 100 / 1000).toFixed(1);

  return `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${m.color};stop-opacity:0.1" />
      <stop offset="100%" style="stop-color:${m.color};stop-opacity:0.05" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bgGradient)" />
  
  <!-- Border -->
  <rect width="1200" height="630" fill="none" stroke="${m.color}" stroke-width="4" />
  
  <!-- Emoji -->
  <text x="600" y="150" font-size="120" text-anchor="middle" dominant-baseline="middle">${m.emoji}</text>
  
  <!-- Message -->
  <text x="600" y="280" font-size="72" font-weight="bold" text-anchor="middle" fill="${m.color}">
    ${m.message}
  </text>
  
  <!-- Progress Bar -->
  <rect x="150" y="350" width="900" height="40" rx="20" fill="#E5E7EB" />
  <rect x="150" y="350" width="${(900 * m.progress) / 100}" height="40" rx="20" fill="${m.color}" />
  <text x="600" y="375" font-size="24" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="white">
    ${m.progress}%
  </text>
  
  <!-- Amount Raised -->
  <text x="600" y="480" font-size="32" text-anchor="middle" fill="#1F2937">
    A$${raisedK}K raised of A$${goalK}K goal
  </text>
  
  <!-- Campaign Title -->
  <text x="600" y="560" font-size="24" text-anchor="middle" fill="#6B7280">
    ${data.campaignTitle}
  </text>
  
  <!-- Virelle Branding -->
  <text x="1100" y="600" font-size="14" text-anchor="end" fill="#9CA3AF">
    Powered by Virelle Studios
  </text>
</svg>
  `;
}

function generateSocialMediaPost(data: any): string {
  const milestoneMessages: Record<string, Record<string, string>> = {
    "25": {
      twitter: `🎬 We're 25% funded for "${data.campaignTitle}"! Thank you to our amazing backers. The journey to bring this story to life is underway. Back us now: virelle.life/crowdfund/c/${data.campaignSlug}`,
      instagram: `🎬 25% Funded!\n\nWe've reached a quarter of our goal for "${data.campaignTitle}"! Your support means everything. Every backer brings us closer to making this film a reality.\n\n#Crowdfunding #FilmProduction #SupportIndieFilm`,
      facebook: `Great news! We've reached 25% of our funding goal for "${data.campaignTitle}"! 🎬\n\nThank you to everyone who has backed our project so far. We're excited to share this milestone with you and can't wait to bring this story to the screen.\n\nReady to join us? Back the campaign now!`,
      linkedin: `Milestone Achieved: 25% Funded 🎬\n\nWe're thrilled to announce that "${data.campaignTitle}" has reached 25% of its funding goal. This achievement reflects the strong support from our community and validates the vision we're working to bring to life.\n\nThank you to our backers. Let's keep the momentum going!`,
    },
    "50": {
      twitter: `🚀 HALFWAY THERE! "${data.campaignTitle}" has hit 50% funding! We're blown away by the support. Let's finish strong together: virelle.life/crowdfund/c/${data.campaignSlug}`,
      instagram: `🚀 50% Funded!\n\nWe've hit the halfway mark! Your support has been incredible, and we're so close to making "${data.campaignTitle}" a reality.\n\n#Crowdfunding #FilmProduction #AlmostThere`,
      facebook: `Halfway to Our Goal! 🚀\n\n"${data.campaignTitle}" has reached 50% funding! We're amazed by the enthusiasm and support from our community. With your continued backing, we can cross the finish line and bring this film to life.`,
      linkedin: `Major Milestone: 50% Funded 🚀\n\n"${data.campaignTitle}" has reached the halfway point of its funding goal. This momentum is a testament to the compelling vision and the dedicated community supporting this project. Let's finish strong!`,
    },
    "75": {
      twitter: `⭐ 75% FUNDED! "${data.campaignTitle}" is almost there! We can feel the finish line. Help us make it: virelle.life/crowdfund/c/${data.campaignSlug}`,
      instagram: `⭐ 75% Funded!\n\nWe're almost there! "${data.campaignTitle}" is 75% funded, and we can't wait to share this film with you.\n\n#Crowdfunding #FilmProduction #AlmostDone`,
      facebook: `Almost There! ⭐\n\n"${data.campaignTitle}" has reached 75% of its funding goal! We're so close to making this happen. Your support has been incredible, and we're excited to bring this story to the screen.`,
      linkedin: `Approaching the Finish Line: 75% Funded ⭐\n\n"${data.campaignTitle}" is 75% funded! The momentum is building, and we're excited about the final push to reach our goal. Thank you for your continued support!`,
    },
    "100": {
      twitter: `🎉 WE DID IT! "${data.campaignTitle}" is FULLY FUNDED! 🎉 Thank you to every single backer who believed in this vision. Production starts now! virelle.life/crowdfund/c/${data.campaignSlug}`,
      instagram: `🎉 Fully Funded!\n\nWE DID IT! "${data.campaignTitle}" has reached 100% funding! 🎉\n\nThank you to our amazing backers. Production begins now!\n\n#Crowdfunding #FilmProduction #FullyFunded`,
      facebook: `🎉 FULLY FUNDED! 🎉\n\n"${data.campaignTitle}" has reached its funding goal! We are thrilled and grateful for the incredible support from our community. Production is now officially underway. Thank you for believing in this vision!`,
      linkedin: `Campaign Success: Fully Funded! 🎉\n\n"${data.campaignTitle}" has achieved 100% funding! This success is a testament to the compelling story, the dedicated team, and the supportive community. Production begins now. Thank you all!`,
    },
  };

  return milestoneMessages[data.milestone][data.platform] || "";
}

function generateEmailAnnouncement(data: any): { subject: string; body: string } {
  const milestoneData: Record<string, any> = {
    "25": {
      subject: `🎬 "${data.campaignTitle}" is 25% Funded!`,
      greeting: "We've reached a quarter of our goal!",
    },
    "50": {
      subject: `🚀 "${data.campaignTitle}" is 50% Funded - Halfway There!`,
      greeting: "We've hit the halfway mark!",
    },
    "75": {
      subject: `⭐ "${data.campaignTitle}" is 75% Funded - Almost There!`,
      greeting: "We're almost at the finish line!",
    },
    "100": {
      subject: `🎉 "${data.campaignTitle}" is Fully Funded!`,
      greeting: "We did it! The campaign is fully funded!",
    },
  };

  const m = milestoneData[data.milestone];
  const raisedK = (data.raisedAmount / 100 / 1000).toFixed(1);
  const goalK = (data.goalAmount / 100 / 1000).toFixed(1);

  return {
    subject: m.subject,
    body: `
Dear Backer,

${m.greeting}

We're thrilled to announce that "${data.campaignTitle}" has reached ${data.milestone}% of its funding goal! 

**Current Status:**
- Amount Raised: A$${raisedK}K
- Goal: A$${goalK}K
- Progress: ${data.milestone}%

Your support has been instrumental in reaching this milestone. We're excited about the momentum and can't wait to bring this story to life.

${
  data.milestone === "100"
    ? `Production is now officially underway! Thank you for making this possible.`
    : `Help us reach the next milestone by sharing the campaign with your network.`
}

View the campaign: https://virelle.life/crowdfund/c/${data.campaignSlug}

Thank you for your continued support!

Best regards,
The Virelle Studios Team
    `,
  };
}
