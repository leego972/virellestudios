import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  calculateAge,
  getMatureAccessStatus,
  isPaidMatureAccessUser,
} from "./_core/matureAccess";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Adult Studio visibility and verification gate", () => {
  it("uses the exact supplied Adult Studio logo as the authenticated access point", () => {
    const button = source("client/src/components/AdultStudioAccessButton.tsx");
    expect(button).toContain('const ADULT_STUDIO_LOGO = "/adult-studio-access-logo.png"');
    expect(button).toContain('setLocation("/adult-studio")');
    expect(button).not.toContain("Adult Studio · 18+");
    expect(button).not.toContain("rounded-");
  });

  it("renders the verification panel instead of the adult workspace until access is granted", () => {
    const page = source("client/src/pages/VirelleBroadcastRender.tsx");
    expect(page).toContain("if (isAdult && !matureStatus.data?.accessGranted)");
    expect(page).toContain("<MatureAccessPanel user={auth.data} statusQuery={matureStatus} />");
    expect(page).toContain('contentMode: isAdult ? "open_adult" : "standard"');
  });

  it("requires every verification control before access is granted", () => {
    const mature = source("server/_core/matureAccess.ts");
    expect(mature).toContain("const accessGranted = paidMembership");
    for (const required of [
      "profileComplete",
      "adultAgeConfirmed",
      "adultAttestationAccepted",
      "phoneVerified",
      "identityVerified",
      "cardNameMatched",
      "responsibilityAccepted",
      "consentPolicyAccepted",
      "archiveRetentionAccepted",
      "activationPaid",
    ]) {
      expect(mature).toContain(`&& ${required}`);
    }
  });

  it("rejects under-18 dates and inactive memberships", () => {
    expect(calculateAge("2010-01-01", new Date("2026-07-26T00:00:00Z"))).toBe(16);
    expect(isPaidMatureAccessUser({
      role: "user",
      subscriptionTier: "indie",
      subscriptionStatus: "none",
    } as any)).toBe(false);
    expect(isPaidMatureAccessUser({
      role: "user",
      subscriptionTier: "indie",
      subscriptionStatus: "active",
    } as any)).toBe(true);
    expect(typeof getMatureAccessStatus).toBe("function");
  });
});

describe("visible Virelle pricing", () => {
  it("keeps the current membership and top-up values visible in Australian dollars", () => {
    const pricing = source("client/src/pages/Pricing.tsx");
    for (const value of [
      "monthly: 149",
      "monthly: 490",
      "monthly: 1490",
      "credits: 700",
      "credits: 3000",
      "credits: 9000",
      'credits: 200, price: 19',
      'credits: 600, price: 49',
      'credits: 1400, price: 99',
      'credits: 3500, price: 199',
      'credits: 9000, price: 399',
      'credits: 22000, price: 799',
    ]) {
      expect(pricing).toContain(value);
    }
    expect(pricing).toContain('currency: "AUD"');
    expect(pricing).toContain("BYOK provider charges remain separate");
  });
});
