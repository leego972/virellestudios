// v6.67 — Provider policy helper from upgrade-kit Phase 2.
// Centralizes BYOK selection logic so generation services prefer the user's
// keys (and their preferred provider/budget mode) before falling back to the
// platform key. Never returns or logs the actual key strings — only the
// provider id. Read masked status from getMaskedProviderStatus(user).
//
// Usage:
//   import { chooseGenerationProvider, getMaskedProviderStatus } from
//     "./providerPolicy";
//   const provider = chooseGenerationProvider({ user, task: "video",
//     requestedQuality: "high", budgetMode: "balanced" });

type Task = "llm" | "image" | "video" | "voice" | "music";
type BudgetMode = "cheapest" | "balanced" | "best_quality";
type Quality = "standard" | "high" | "ultra";

export interface ProviderPolicyInput {
  user: any;
  task: Task;
  requestedQuality?: Quality;
  budgetMode?: BudgetMode;
}

export interface MaskedProviderStatus {
  openai: boolean;
  runway: boolean;
  replicate: boolean;
  fal: boolean;
  luma: boolean;
  huggingface: boolean;
  elevenlabs: boolean;
  suno: boolean;
  byteplus: boolean;
  anthropic: boolean;
  google: boolean;
  venice: boolean;
}

export function getMaskedProviderStatus(user: any): MaskedProviderStatus {
  return {
    openai: Boolean(user?.userOpenaiKey),
    runway: Boolean(user?.userRunwayKey),
    replicate: Boolean(user?.userReplicateKey),
    fal: Boolean(user?.userFalKey),
    luma: Boolean(user?.userLumaKey),
    huggingface: Boolean(user?.userHfToken),
    elevenlabs: Boolean(user?.userElevenlabsKey),
    suno: Boolean(user?.userSunoKey),
    byteplus: Boolean(user?.userByteplusKey),
    anthropic: Boolean(user?.userAnthropicKey),
    google: Boolean(user?.userGoogleAiKey),
    venice: Boolean(user?.userVeniceKey),
  };
}

export function chooseGenerationProvider(input: ProviderPolicyInput): string {
  const { user, task, budgetMode = "balanced" } = input;
  const has = getMaskedProviderStatus(user);

  if (task === "llm") {
    const preferred = user?.preferredLlmProvider;
    if (preferred === "venice" && has.venice) return "venice";
    if (preferred === "anthropic" && has.anthropic) return "anthropic";
    if (preferred === "google" && has.google) return "google";
    if (preferred === "openai" && has.openai) return "openai";
    if (budgetMode === "cheapest" && has.venice) return "venice";
    if (has.anthropic) return "anthropic";
    if (has.google) return "google";
    if (has.openai) return "openai";
    return "platform";
  }

  if (task === "video") {
    const preferred = user?.preferredVideoProvider;
    if (preferred && (has as any)[preferred]) return preferred;
    if (budgetMode === "cheapest") {
      if (has.huggingface) return "huggingface";
      if (has.fal) return "fal";
      if (has.replicate) return "replicate";
    }
    if (input.requestedQuality === "ultra") {
      if (has.runway) return "runway";
      if (has.openai) return "openai";
      if (has.luma) return "luma";
    }
    if (has.runway) return "runway";
    if (has.fal) return "fal";
    if (has.replicate) return "replicate";
    if (has.openai) return "openai";
    return "platform";
  }

  if (task === "voice") return has.elevenlabs ? "elevenlabs" : has.openai ? "openai" : "platform";
  if (task === "music") return has.suno ? "suno" : "platform";
  if (task === "image") return has.openai ? "openai" : has.fal ? "fal" : "platform";

  return "platform";
}

// Map a SubscriptionTier (or admin) to a credit discount percentage applied to
// generation cost estimates. Mirrors the kit's Phase 4 / autoRecapRouter
// discount table so users on higher plans see lower estimates uniformly.
export function creditDiscountForTier(tier: string | null | undefined): number {
  if (tier === "industry") return 30;
  if (tier === "studio" || tier === "independent" || tier === "creator") return 20;
  if (tier === "amateur") return 10;
  return 0;
}
