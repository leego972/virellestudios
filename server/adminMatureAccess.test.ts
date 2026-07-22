import { afterEach, describe, expect, it, vi } from "vitest";
import * as db from "./db";
import { getMatureAccessStatus } from "./_core/matureAccess";

describe("administrator Adult Studio access", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("grants every Adult Studio access flag without a profile, subscription, phone, ID, card, or attestations", async () => {
    const updateUser = vi.spyOn(db, "updateUser").mockResolvedValue(undefined as any);
    const dbConn = {
      execute: vi.fn(() => {
        throw new Error("admin bypass must not query mature_access_profiles");
      }),
    };

    const status = await getMatureAccessStatus(dbConn, {
      id: 1,
      role: "admin",
      subscriptionTier: "none",
      subscriptionStatus: "none",
    } as any);

    expect(dbConn.execute).not.toHaveBeenCalled();
    expect(updateUser).toHaveBeenCalledWith(1, { isAdultVerified: true });
    expect(status).toMatchObject({
      paidMembership: true,
      profileComplete: true,
      adultAgeConfirmed: true,
      adultAttestationAccepted: true,
      phoneVerified: true,
      identityVerified: true,
      cardNameMatched: true,
      responsibilityAccepted: true,
      consentPolicyAccepted: true,
      archiveRetentionAccepted: true,
      accessGranted: true,
      missing: [],
      profile: null,
    });
  });
});
