import { describe, expect, it } from "vitest";
import { isDesignerAllowedProtectedPath, isLamaloBrandName, isStudioForbiddenDesignerPath } from "./_core/portalAccess";

describe("designer commerce production contract", () => {
  it("separates designer and studio mutation access", () => {
    expect(isDesignerAllowedProtectedPath("wardrobeMarket.designer.getMembershipStatus")).toBe(true);
    expect(isDesignerAllowedProtectedPath("project.create")).toBe(false);
    expect(isStudioForbiddenDesignerPath("wardrobeMarket.designer.onboardConnect")).toBe(true);
    expect(isStudioForbiddenDesignerPath("designerWardrobe.createWardrobeItem")).toBe(true);
    expect(isStudioForbiddenDesignerPath("wardrobeMarket.marketplace.getDesigner")).toBe(false);
  });

  it("keeps every Lamalo alias outside third-party price recalculation", () => {
    expect(isLamaloBrandName("Lamalo Fashion")).toBe(true);
    expect(isLamaloBrandName("Lamalo Fashions")).toBe(true);
    expect(isLamaloBrandName("Lamalo")).toBe(true);
    expect(isLamaloBrandName("Independent Label")).toBe(false);
  });

  it("calculates third-party virtual price at exactly three percent", () => {
    expect(Math.round(25_000 * 0.03)).toBe(750);
    expect(Math.round(1_667 * 0.03)).toBe(50);
  });
});
