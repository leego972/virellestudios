import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  calculateAge,
  isPaidMatureAccessUser,
  legalNamesMatch,
  normalizeLegalName,
  verifiedIdentityMatchesProfile,
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

  it("requires Stripe-verified identity name and DOB to match the registered adult", () => {
    const now = new Date("2026-07-22T12:00:00Z");
    expect(verifiedIdentityMatchesProfile(
      { fullName: "Alexandra Mary Chen", dateOfBirth: "1990-04-12" },
      {
        first_name: "Alexandra",
        last_name: "Chen",
        dob: { year: 1990, month: 4, day: 12 },
      },
      now,
    )).toMatchObject({
      nameMatched: true,
      dobMatched: true,
      adultAgeConfirmed: true,
      verified: true,
    });

    expect(verifiedIdentityMatchesProfile(
      { fullName: "Alexandra Mary Chen", dateOfBirth: "1990-04-12" },
      {
        first_name: "Alexandra",
        last_name: "Chen",
        dob: { year: 2009, month: 4, day: 12 },
      },
      now,
    )).toMatchObject({
      nameMatched: true,
      dobMatched: false,
      adultAgeConfirmed: false,
      verified: false,
    });

    expect(verifiedIdentityMatchesProfile(
      { fullName: "Alexandra Mary Chen", dateOfBirth: "1990-04-12" },
      {
        first_name: "Alexandra",
        last_name: "Jones",
        dob: { year: 1990, month: 4, day: 12 },
      },
      now,
    ).verified).toBe(false);
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

  it("keeps standard film-rating output non-explicit while allowing tasteful teenage story context", () => {
    expect(() => assertSwappysCreativePolicy({
      user: { isAdultVerified: false },
      contentMode: "standard",
      consentConfirmed: true,
      targetAge: 17,
      targetPresentation: "two teenage characters share a brief romantic kiss in a coming-of-age film",
    })).not.toThrow();

    expect(() => assertSwappysCreativePolicy({
      user: { isAdultVerified: false },
      contentMode: "standard",
      consentConfirmed: true,
      targetAge: 30,
      targetPresentation: "graphic explicit sex act",
    })).toThrow(TRPCError);

    expect(() => assertSwappysCreativePolicy({
      user: { isAdultVerified: false },
      contentMode: "standard",
      consentConfirmed: true,
      targetAge: 17,
      targetPresentation: "explicit sexual scene involving a teenager",
    })).toThrow(TRPCError);
  });

  it("blocks all minor-coded and age-regression requests in mature mode without false positives from safety wording", () => {
    expect(() => assertSwappysCreativePolicy({
      user: { isAdultVerified: true },
      contentMode: "open_adult",
      consentConfirmed: true,
      allSubjectsAdultsConfirmed: true,
      targetAge: 25,
      targetPresentation: "adult editorial production, no minors, adults only",
    })).not.toThrow();

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
