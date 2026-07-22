import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  calculateAge,
  isPaidMatureAccessUser,
  legalNamesMatch,
  normalizeLegalName,
} from "./_core/matureAccess";
import { assertSwappysCreativePolicy } from "./_core/swappysPolicy";
import { classifyContentRequest } from "./_core/contentCompliance";

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
    expect(isPaidMatureAccessUser({
      role: "user",
      subscriptionTier: "indie",
      subscriptionStatus: "active",
    } as any)).toBe(true);
    expect(isPaidMatureAccessUser({
      role: "user",
      subscriptionTier: "beta",
      subscriptionStatus: "active",
    } as any)).toBe(false);
    expect(isPaidMatureAccessUser({
      role: "user",
      subscriptionTier: "free",
      subscriptionStatus: "active",
    } as any)).toBe(false);
    expect(isPaidMatureAccessUser({
      role: "admin",
      subscriptionTier: "free",
      subscriptionStatus: "none",
    } as any)).toBe(true);
  });

  it("allows explicit adult content only in the verified Adult Studio", () => {
    expect(() => assertSwappysCreativePolicy({
      user: { isAdultVerified: true },
      contentMode: "open_adult",
      consentConfirmed: true,
      allSubjectsAdultsConfirmed: true,
      targetAge: 30,
      targetPresentation: "cinematic explicit sex scene between two consenting 30-year-old adults",
      publicFigureLikeness: false,
    })).not.toThrow();

    expect(() => assertSwappysCreativePolicy({
      user: { isAdultVerified: true },
      contentMode: "standard",
      consentConfirmed: true,
      targetAge: 30,
      targetPresentation: "cinematic explicit sex scene between consenting adults",
    })).toThrow(TRPCError);
  });

  it("allows an age-appropriate non-sexual teenage romance scene in Standard Studio", () => {
    expect(() => assertSwappysCreativePolicy({
      user: { isAdultVerified: false },
      contentMode: "standard",
      consentConfirmed: true,
      targetAge: 16,
      targetPresentation: "tasteful romantic movie scene where two sixteen-year-old characters share a brief kiss",
    })).not.toThrow();

    expect(classifyContentRequest({
      workspace: "standard",
      targetAge: 16,
      text: "tasteful romantic movie scene where two sixteen-year-old characters share a brief kiss",
    })).toBeNull();
  });

  it("blocks explicit or sexualised content involving minors", () => {
    const classification = classifyContentRequest({
      workspace: "standard",
      targetAge: 16,
      text: "graphic explicit sex act involving a sixteen-year-old character",
    });
    expect(classification?.category).toBe("suspected_csam_request");
    expect(classification?.severity).toBe("critical");

    expect(() => assertSwappysCreativePolicy({
      user: { isAdultVerified: false },
      contentMode: "standard",
      consentConfirmed: true,
      targetAge: 16,
      targetPresentation: "graphic explicit sex act involving a sixteen-year-old character",
    })).toThrow(TRPCError);
  });

  it("blocks every minor, teenage and age-regression request in Adult Studio", () => {
    expect(classifyContentRequest({
      workspace: "adult",
      targetAge: 17,
      text: "non-sexual teenage character",
    })?.category).toBe("adult_workspace_minor_reference");

    expect(() => assertSwappysCreativePolicy({
      user: { isAdultVerified: true },
      contentMode: "open_adult",
      consentConfirmed: true,
      allSubjectsAdultsConfirmed: true,
      transformGoal: "adult_to_child",
      targetAge: 16,
      targetPresentation: "younger character styling",
    })).toThrow(TRPCError);
  });

  it("blocks non-consensual adult content and public-figure adult likenesses", () => {
    expect(classifyContentRequest({
      workspace: "adult",
      targetAge: 30,
      text: "secretly record them without their knowledge",
    })?.category).toBe("non_consensual_sexual_content");

    expect(classifyContentRequest({
      workspace: "adult",
      targetAge: 30,
      text: "adult studio scene",
      publicFigureLikeness: true,
    })?.category).toBe("adult_public_figure_likeness");

    expect(() => assertSwappysCreativePolicy({
      user: { isAdultVerified: true },
      contentMode: "open_adult",
      consentConfirmed: true,
      allSubjectsAdultsConfirmed: true,
      targetAge: 30,
      targetPresentation: "adult studio scene",
      publicFigureLikeness: true,
    })).toThrow(TRPCError);
  });

  it("permits fully synthetic adult characters without a real-person consent claim", () => {
    expect(() => assertSwappysCreativePolicy({
      user: { isAdultVerified: true },
      contentMode: "open_adult",
      consentConfirmed: false,
      aiGeneratedCharactersOnly: true,
      allSubjectsAdultsConfirmed: true,
      targetAge: 25,
      targetPresentation: "explicit scene using original fictional AI characters aged 25",
    })).not.toThrow();
  });
});
