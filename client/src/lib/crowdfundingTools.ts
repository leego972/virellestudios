export type CrowdfundingBrief = {
  format: string;
  genre: string;
  audience: string;
  tone: string;
  premise: string;
  goal: string;
  currency: string;
  duration: string;
  useOfFunds?: string;
  filmmakerStory?: string;
};

export type RewardTemplate = {
  title: string;
  amountCents: number;
  description: string;
  estimatedDelivery: string;
  limitCount?: number;
};

export type CampaignReadinessInput = {
  title?: string | null;
  tagline?: string | null;
  description?: string | null;
  posterUrl?: string | null;
  videoUrl?: string | null;
  goalAmountCents?: number | null;
  fundingModel?: string | null;
  stripeConnectOnboarded?: boolean | null;
};

export function parseAmount(value: unknown): number {
  const amount = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

export function crowdfundingEconomics(
  grossGoalCents: number,
  platformFeeBps = 700,
) {
  const gross = Math.max(0, Math.round(grossGoalCents));
  const feeRate = Math.max(0, platformFeeBps) / 10_000;
  const platformFeeCents = Math.floor(gross * feeRate);
  const netBeforePaymentProcessingCents = Math.max(0, gross - platformFeeCents);
  const grossRequiredForNetCents =
    feeRate >= 1 ? gross : Math.ceil(gross / Math.max(0.0001, 1 - feeRate));

  return {
    grossGoalCents: gross,
    platformFeeBps,
    platformFeeCents,
    netBeforePaymentProcessingCents,
    grossRequiredForNetCents,
  };
}

export function campaignReadiness(
  campaign: CampaignReadinessInput,
  rewards: Array<{ estimatedDelivery?: string | null }> = [],
) {
  const checks = [
    {
      key: "title",
      label: "Campaign title",
      points: 8,
      complete: String(campaign.title || "").trim().length >= 3,
    },
    {
      key: "tagline",
      label: "Clear audience-facing tagline",
      points: 8,
      complete: String(campaign.tagline || "").trim().length >= 15,
    },
    {
      key: "description",
      label: "Detailed campaign story",
      points: 16,
      complete: String(campaign.description || "").trim().length >= 180,
    },
    {
      key: "poster",
      label: "Campaign poster or hero image",
      points: 10,
      complete: Boolean(String(campaign.posterUrl || "").trim()),
    },
    {
      key: "video",
      label: "Pitch video",
      points: 10,
      complete: Boolean(String(campaign.videoUrl || "").trim()),
    },
    {
      key: "goal",
      label: "Funding goal",
      points: 10,
      complete: Number(campaign.goalAmountCents || 0) >= 100,
    },
    {
      key: "model",
      label: "Funding model selected",
      points: 5,
      complete: ["all_or_nothing", "keep_it_all"].includes(
        String(campaign.fundingModel || ""),
      ),
    },
    {
      key: "rewards",
      label: "At least three reward tiers",
      points: 13,
      complete: rewards.length >= 3,
    },
    {
      key: "delivery",
      label: "Reward delivery dates",
      points: 5,
      complete:
        rewards.length > 0 &&
        rewards.every((reward) => Boolean(String(reward.estimatedDelivery || "").trim())),
    },
    {
      key: "payouts",
      label: "Payout account configured",
      points: 15,
      complete: Boolean(campaign.stripeConnectOnboarded),
    },
  ];

  const score = checks.reduce(
    (total, check) => total + (check.complete ? check.points : 0),
    0,
  );
  const missing = checks.filter((check) => !check.complete);
  const warnings: string[] = [];

  if (campaign.fundingModel === "keep_it_all") {
    warnings.push(
      "Keep-it-All campaigns should explain what will be delivered if the full goal is not reached.",
    );
  }
  if (rewards.length > 8) {
    warnings.push(
      "Too many reward tiers can reduce conversion. Keep the main choice set easy to scan.",
    );
  }

  return { score, checks, missing, warnings, launchReady: score >= 85 && missing.length === 0 };
}

export function createRewardTemplates(goalAud: number): RewardTemplate[] {
  const highTier = Math.max(500, Math.round(Math.max(goalAud, 5_000) * 0.05));
  return [
    {
      title: "Supporter",
      amountCents: 1_000,
      description: "Digital thank-you and backer updates throughout production.",
      estimatedDelivery: "Within 7 days of campaign close",
    },
    {
      title: "Early Access",
      amountCents: 3_500,
      description: "Supporter benefits plus private early access to the finished film.",
      estimatedDelivery: "At picture lock",
    },
    {
      title: "Behind the Scenes",
      amountCents: 7_500,
      description: "Early access plus a digital production diary and behind-the-scenes pack.",
      estimatedDelivery: "During post-production",
    },
    {
      title: "Premiere Circle",
      amountCents: 15_000,
      description: "All digital rewards plus an invitation to an online premiere and filmmaker Q&A.",
      estimatedDelivery: "At release",
      limitCount: 100,
    },
    {
      title: "Associate Supporter",
      amountCents: highTier * 100,
      description: "Prominent supporter acknowledgement, premiere access and a private project briefing. No creative control or investment return is implied.",
      estimatedDelivery: "During production and at release",
      limitCount: 10,
    },
  ];
}

export function createCampaignPack(
  brief: CrowdfundingBrief,
  projectTitle: string,
) {
  const title = projectTitle.trim() || "Untitled Film";
  const premise = brief.premise.trim() || "Add the project premise before publishing.";
  const audience = brief.audience.trim() || "film audiences who connect with this story";
  const useOfFunds =
    brief.useOfFunds?.trim() ||
    "production, post-production, accessibility deliverables, music and audience release materials";
  const filmmakerStory =
    brief.filmmakerStory?.trim() ||
    "Explain why you and your team are the right people to make this film now.";

  const pitch = `${title} is a ${brief.genre || "distinctive"} ${brief.format.toLowerCase()} created for ${audience}.

${premise}

Why this film, why now
${filmmakerStory}

What your support makes possible
Funds will be directed to ${useOfFunds}. The campaign target is ${brief.goal || "0"} ${brief.currency} over ${brief.duration} days. We will publish clear progress updates and explain any material change to schedule, scope or reward delivery.

Join the production
Back the campaign, choose a reward that suits you, and share the project with people who want to see this story reach the screen.`;

  const videoScript = `0–10 seconds — Hook
VISUAL: Strongest image, concept art or filmmaker direct-to-camera.
AUDIO: “We are making ${title}, a ${brief.genre || "new"} ${brief.format.toLowerCase()} about ${premise}”

10–35 seconds — Story and emotional promise
VISUAL: Mood board, characters, locations and short production examples.
AUDIO: Explain the central conflict, audience and why the story matters now.

35–60 seconds — Filmmaker and plan
VISUAL: Filmmaker on camera, project workflow and team materials.
AUDIO: ${filmmakerStory}

60–80 seconds — Funding ask
VISUAL: Simple budget categories and campaign goal.
AUDIO: “Your support funds ${useOfFunds}.”

80–90 seconds — Call to action
VISUAL: Campaign page, reward highlights and project title.
AUDIO: “Back ${title}, choose a reward and help us bring this film to the screen.”`;

  return {
    pitch,
    videoScript,
    rewards: createRewardTemplates(parseAmount(brief.goal)),
  };
}

export function isCrowdfundingPlatform(source: any): boolean {
  if (String(source?.sourceCategory || "").toLowerCase() === "crowdfunding") {
    return true;
  }
  const type = String(source?.type || "").toLowerCase();
  const supports = String(source?.supports || "").toLowerCase();
  return type.includes("crowd") || supports.includes("crowdfund");
}
