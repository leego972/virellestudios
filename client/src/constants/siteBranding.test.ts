import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { VIRELLE_CINEMA_FRAMES } from "./virelleCinemaIcons";
import { resolveSiteBrand } from "./siteBranding";

const appPath = fileURLToPath(new URL("../App.tsx", import.meta.url));
const layoutPath = fileURLToPath(new URL("../components/DashboardLayout.tsx", import.meta.url));
const fundingPath = fileURLToPath(new URL("../pages/FundingCommandCentre.tsx", import.meta.url));

function routePaths(source: string): string[] {
  return [...source.matchAll(/<Route\s+path=["']([^"']+)["']/g)].map(match => match[1]);
}

function menuPaths(source: string): string[] {
  return [...source.matchAll(/path:\s*["']([^"']+)["']/g)].map(match => match[1]);
}

describe("site-wide Virelle brand icon coverage", () => {
  it("resolves every registered application route to a real Virelle cinema icon", () => {
    const routes = routePaths(readFileSync(appPath, "utf8"));
    expect(routes.length).toBeGreaterThan(50);
    for (const route of routes) {
      const resolution = resolveSiteBrand(route);
      expect(VIRELLE_CINEMA_FRAMES).toHaveProperty(resolution.icon);
      expect(resolution.group.length).toBeGreaterThan(0);
    }
  });

  it("resolves every sidebar and tool-menu route", () => {
    const routes = menuPaths(readFileSync(layoutPath, "utf8"));
    expect(routes.length).toBeGreaterThan(15);
    for (const route of routes) {
      const resolution = resolveSiteBrand(route);
      expect(VIRELLE_CINEMA_FRAMES).toHaveProperty(resolution.icon);
    }
  });

  it("gives nested project tools their feature brand rather than the generic project icon", () => {
    const expected: Record<string, string> = {
      "/projects/12/pitch-deck": "reports",
      "/projects/12/budget": "reports",
      "/projects/12/wardrobe": "wardrobe",
      "/projects/12/storyboard": "storyboards",
      "/projects/12/crowdfunding": "distribution",
      "/projects/12/voice-studio": "sound",
      "/projects/12/vfx-suite": "vfx",
      "/projects/12": "projects",
    };
    for (const [route, icon] of Object.entries(expected)) {
      expect(resolveSiteBrand(route).icon).toBe(icon);
    }
  });

  it("maps public, legal and account routes to a consistent brand family", () => {
    expect(resolveSiteBrand("/welcome").icon).toBe("studio");
    expect(resolveSiteBrand("/about").icon).toBe("studio");
    expect(resolveSiteBrand("/privacy").icon).toBe("support");
    expect(resolveSiteBrand("/pricing").icon).toBe("billing");
    expect(resolveSiteBrand("/showcase").icon).toBe("distribution");
  });

  it("uses Hollywood icons for product surfaces while retaining action controls", () => {
    const layout = readFileSync(layoutPath, "utf8");
    const funding = readFileSync(fundingPath, "utf8");

    expect(layout).toContain("brandIconForRoute");
    expect(layout).toContain("data-virelle-page-icon");
    expect(layout).not.toContain("<item.icon className");

    expect(funding).toContain("HollywoodIcon");
    expect(funding).toContain('tool="reports"');
    expect(funding).toContain("Save");
    expect(funding).toContain("Download");
    expect(funding).toContain("Bookmark");
  });
});
