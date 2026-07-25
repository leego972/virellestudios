import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { VIRELLE_CINEMA_FRAMES } from "./virelleCinemaIcons";
import { resolveSiteBrand } from "./siteBranding";

const appPath = fileURLToPath(new URL("../App.tsx", import.meta.url));
const layoutPath = fileURLToPath(new URL("../components/DashboardLayout.tsx", import.meta.url));

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

  it("maps the funding family consistently", () => {
    for (const route of ["/funding", "/funding-pro", "/tax-incentives", "/projects/12/pitch-deck", "/projects/12/budget"]) {
      expect(resolveSiteBrand(route).icon).toBe("reports");
    }
  });

  it("keeps action controls separate from product branding", () => {
    const funding = readFileSync(fileURLToPath(new URL("../pages/FundingCommandCentre.tsx", import.meta.url)), "utf8");
    expect(funding).toContain("HollywoodIcon");
    expect(funding).toContain("Save");
    expect(funding).toContain("Download");
  });
});
