import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("Adult Studio product boundary", () => {
  it("keeps broadcast promotion and broadcast routes off the public landing page", () => {
    const landing = source("client/src/pages/Landing.tsx");
    expect(landing).not.toContain("Open Broadcast");
    expect(landing).not.toContain("Broadcast setup");
    expect(landing).not.toContain("/virelle-broadcast-render");
  });

  it("removes standard broadcast navigation and exposes only the Adult Studio route", () => {
    const layout = source("client/src/components/DashboardLayout.tsx");
    const app = source("client/src/App.tsx");
    expect(layout).not.toContain("Swappys & Broadcast");
    expect(layout).not.toContain('/virelle-broadcast-render');
    expect(source("client/src/components/ProjectToolHub.tsx")).not.toContain("Swappys & Broadcast");
    expect(source("client/src/pages/VFXSuite.tsx")).not.toContain("Standard Broadcast");
    expect(source("client/src/components/NotificationBell.tsx")).not.toContain("18+ Studio");
    expect(source("client/src/components/GoldWatermarkLaunch.tsx")).not.toContain("data-virelle-adult-access");
    expect(fs.existsSync(path.join(root, "client/src/pages/SwappysBroadcastHub.tsx"))).toBe(false);
    expect(app).toContain('path="/adult-studio"');
  });

  it("requires activation payment as part of mature access", () => {
    const access = source("server/_core/matureAccess.ts");
    expect(access).toContain("activationPaid");
    expect(access).toContain("one-time Adult Studio activation fee");
  });

  it("rejects non-adult broadcast sessions at the server boundary", () => {
    const router = source("server/virelle-broadcast-render-router.ts");
    expect(router).toContain('resolved.contentMode !== "open_adult"');
    expect(router).toContain("Broadcasting is available only inside the verified Adult Studio portal.");
    expect(router).toContain("Adult Studio broadcasts must use managed relay so the required recording and compliance copy can be retained.");
  });

  it("provides simultaneous outlet screen and chat tiles", () => {
    const page = source("client/src/pages/VirelleBroadcastRender.tsx");
    expect(page).toContain("Adult Studio Control Room");
    expect(page).toContain("Channel chat URL");
    expect(page).toContain("Live screen / dashboard URL");
    expect(page).toContain("Companion window");
  });

  it("keeps free Swappys short-form, watermarked and without broadcasting", () => {
    const landing = source("client/src/pages/Landing.tsx");
    const mobile = source("server/_core/securityHeaders.ts");
    expect(landing).toContain("Free Swappys app");
    expect(landing).toContain("visibly watermarked and censored");
    expect(landing).toContain("no broadcasting controls");
    expect(mobile).toContain("broadcastMode: false");
    expect(mobile).toContain("rtmpBroadcast: false");
  });

  it("leaves only the supplied Adult Studio logo asset pending", () => {
    const button = source("client/src/components/AdultStudioAccessButton.tsx");
    expect(button).toContain('/adult-studio-access-logo.png');
    expect(button).toContain('setLocation("/adult-studio")');
  });
});
