import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  calculateAge,
  isPaidMatureAccessUser,
  legalNamesMatch,
  normalizeLegalName,
} from "./_core/matureAccess";
import { assertSwappysCreativePolicy } from "./_core/swappysPolicy";

describe("verified mature access", () => {
  it("normalizes and matches legal cardholder names without accepting unrelated names", () => {
    expect(normalizeLegalName(" José  da-Silva ")).toBe("jose da silva");
    expect(legalNamesMatch("José da Silva", "JOSE DA SILVA")).toBe(true);
    expect(legalNamesMatch("Alexandra Mary Chen", "Alexandra Chen")).toBe(true);
    expect(legalNamesMatch("Alexandra Chen", "Alexandra Jones")).toBe(false);
  });

  it("calculates the 18-year boundary exactly", () => {
    const now = new Date("2026-07-22T12:00:00Z");
    expect(calculateAge("2008-07-22", now)).toBe(18);
    expect(calculateAge("2008-07-23", now)).toBe(17);
  });

  it("requires an active paid membership and excludes beta/free access", () => {
    expect(isPaidMatureAccessUser({ role: "user", subscriptionTier: "indie", subscriptionStatus: "active" } as any)).toBe(true);
    expect(isPaidMatureAccessUser({ role: "user", subscriptionTier: "beta", subscriptionStatus: "active" } as any)).toBe(false);
    expect(isPaidMatureAccessUser({ role: "user", subscriptionTier: "free", subscriptionStatus: "active" } as any)).toBe(false);
    expect(isPaidMatureAccessUser({ role: "admin", subscriptionTier: "free", subscriptionStatus: "none" } as any)).toBe(true);
  });

  it("allows verified mature non-explicit styling but keeps explicit sexual acts blocked", () => {
    expect(() => assertSwappysCreativePolicy({
      user: { isAdultVerified: true },
      contentMode: "open_adult",
      consentConfirmed: true,
      allSubjectsAdultsConfirmed: true,
      targetAge: 30,
      targetPresentation: "mature glamour editorial styling between consenting adults",
    })).not.toThrow();

    expect(() => assertSwappysCreativePolicy({
      user: { isAdultVerified: true },
      contentMode: "open_adult",
      consentConfirmed: true,
      allSubjectsAdultsConfirmed: true,
      targetAge: 30,
      targetPresentation: "graphic explicit sex act",
    })).toThrow(TRPCError);
  });

  it("blocks all minor-coded and age-regression requests in mature mode", () => {
    expect(() => assertSwappysCreativePolicy({
      user: { isAdultVerified: true },
      contentMode: "open_adult",
      consentConfirmed: true,
      allSubjectsAdultsConfirmed: true,
      transformGoal: "adult_to_child",
      targetAge: 16,
      targetPresentation: "younger schoolgirl styling",
    })).toThrow(TRPCError);
  });
});
