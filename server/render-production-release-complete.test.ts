import { expect, test } from "vitest";

const BASE_URL = "https://virelle.life";
const CLIENT_MARKERS = [
  "virelle-verified-apps-override",
  "Verified Apps & Install Options",
  "10 real Lamalo collection pieces",
];

async function request(path: string, init: RequestInit = {}) {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "*/*",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function clientReleaseIsLive(): Promise<boolean> {
  const page = await request(`/?deployment_probe=${Date.now()}`);
  if (!page.ok) return false;
  const html = await page.text();
  const scripts = Array.from(
    html.matchAll(/<script[^>]+src=["']([^"']+\.js[^"']*)["']/gi),
  ).map(match => match[1]);

  for (const source of scripts) {
    const url = new URL(source, BASE_URL);
    url.searchParams.set("deployment_probe", String(Date.now()));
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) continue;
    const bundle = await response.text();
    if (CLIENT_MARKERS.every(marker => bundle.includes(marker))) return true;
  }
  return false;
}

async function compatibleFeatureManifestIsLive(): Promise<any | null> {
  const response = await request(`/api/mobile/features?deployment_probe=${Date.now()}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  const manifest = await response.json() as any;
  const features = manifest?.features;
  const flags = manifest?.flags;
  const required = ["creatorUpgrade", "swappysStudio", "watermarkControls", "byokVideoRequired"];
  if (
    manifest?.ok !== true ||
    !features ||
    !flags ||
    !required.every(key => features[key] === true && flags[key] === true)
  ) return null;
  return manifest;
}

test("Render serves the complete Virelle, Swappys, downloads and Lamalo release", async () => {
  let clientReady = false;
  let manifest: any | null = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 42; attempt += 1) {
    try {
      [clientReady, manifest] = await Promise.all([
        clientReleaseIsLive(),
        compatibleFeatureManifestIsLive(),
      ]);
      if (clientReady && manifest) break;
    } catch (error) {
      lastError = error;
    }
    await sleep(10_000);
  }

  expect(clientReady, `Render did not expose the final client bundle: ${String(lastError || "none")}`).toBe(true);
  expect(manifest, "Render did not expose the dual-schema Swappys mobile feature manifest").toBeTruthy();
  expect(manifest.version).toBe("2026.07.swappys-byok-broadcast-v2");
  expect(manifest.features).toEqual(manifest.flags);
  expect(manifest.features.broadcastMode).toBe(true);
  expect(manifest.features.rtmpBroadcast).toBe(true);
  expect(manifest.features.studioRenderQueue).toBe(true);
  expect(manifest.costPolicy?.noPlatformFundedUserVideo).toBe(true);

  const healthResponse = await request(`/api/health?deployment_probe=${Date.now()}`, {
    headers: { Accept: "application/json" },
  });
  expect(healthResponse.ok).toBe(true);
  const health = await healthResponse.json() as any;
  expect(health?.status === "ok" || health?.success === true).toBe(true);
  expect(health?.database === undefined || health?.database === "ok").toBe(true);

  const downloadsResponse = await request(`/api/mobile/downloads?deployment_probe=${Date.now()}`, {
    headers: { Accept: "application/json" },
  });
  expect(downloadsResponse.ok).toBe(true);
  const downloads = await downloadsResponse.json() as any;
  expect(typeof downloads?.ios?.available).toBe("boolean");
  expect(typeof downloads?.android?.available).toBe("boolean");
  expect(typeof downloads?.desktop?.available).toBe("boolean");

  const routeProbe = await request(`/api/trpc/vfxSfx.swappysMobileSwap?deployment_probe=${Date.now()}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Swappys-Client": "final-production-check",
    },
    body: JSON.stringify({ json: { consentConfirmed: false } }),
  });
  expect(routeProbe.status).toBeGreaterThanOrEqual(400);
  expect(routeProbe.status).toBeLessThan(500);
  expect(routeProbe.status).not.toBe(404);

  const downloadPage = await request(`/download?deployment_probe=${Date.now()}`);
  expect(downloadPage.status).toBeLessThan(500);

  const hubPage = await request(`/swappys-broadcast?deployment_probe=${Date.now()}`);
  expect(hubPage.status).toBeLessThan(500);
}, 480_000);
