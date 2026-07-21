import { expect, test } from "vitest";

const BASE_URL = "https://virelle.life";
const DEPLOYMENT_MARKERS = [
  "virelle-verified-apps-override",
  "Verified Apps & Install Options",
  "10 real Lamalo collection pieces",
];

async function fetchWithTimeout(path: string, init: RequestInit = {}) {
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

async function deployedBundleContainsMarkers(): Promise<boolean> {
  const page = await fetchWithTimeout(`/?deployment_probe=${Date.now()}`);
  if (!page.ok) return false;
  const html = await page.text();
  const scriptSources = Array.from(
    html.matchAll(/<script[^>]+src=["']([^"']+\.js[^"']*)["']/gi),
  ).map(match => match[1]);

  for (const source of scriptSources) {
    const url = new URL(source, BASE_URL);
    url.searchParams.set("deployment_probe", String(Date.now()));
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) continue;
    const bundle = await response.text();
    if (DEPLOYMENT_MARKERS.every(marker => bundle.includes(marker))) return true;
  }
  return false;
}

test("Render serves the final Virelle app, Swappys and Lamalo release", async () => {
  let deployed = false;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 42; attempt += 1) {
    try {
      deployed = await deployedBundleContainsMarkers();
      if (deployed) break;
    } catch (error) {
      lastError = error;
    }
    await sleep(10_000);
  }

  expect(
    deployed,
    `Render did not expose the final client bundle. Last error: ${String(lastError || "none")}`,
  ).toBe(true);

  const healthResponse = await fetchWithTimeout(`/api/health?deployment_probe=${Date.now()}`, {
    headers: { Accept: "application/json" },
  });
  expect(healthResponse.ok).toBe(true);
  const health = await healthResponse.json() as any;
  console.log("LIVE_HEALTH", JSON.stringify(health));
  expect(health?.status === "ok" || health?.success === true).toBe(true);

  const featuresResponse = await fetchWithTimeout(`/api/mobile/features?deployment_probe=${Date.now()}`, {
    headers: { Accept: "application/json" },
  });
  expect(featuresResponse.ok).toBe(true);
  const features = await featuresResponse.json() as any;
  console.log("LIVE_FEATURES", JSON.stringify(features));
  expect(features?.ok).toBe(true);
  expect(features?.flags?.swappysStudio, JSON.stringify(features)).toBe(true);
  expect(features?.flags?.creatorUpgrade, JSON.stringify(features)).toBe(true);
  expect(features?.flags?.watermarkControls, JSON.stringify(features)).toBe(true);
  expect(features?.flags?.byokVideoRequired, JSON.stringify(features)).toBe(true);

  const downloadsResponse = await fetchWithTimeout(`/api/mobile/downloads?deployment_probe=${Date.now()}`, {
    headers: { Accept: "application/json" },
  });
  expect(downloadsResponse.ok).toBe(true);
  const downloads = await downloadsResponse.json() as any;
  console.log("LIVE_DOWNLOADS", JSON.stringify(downloads));
  expect(typeof downloads?.ios?.available).toBe("boolean");
  expect(typeof downloads?.android?.available).toBe("boolean");
  expect(typeof downloads?.desktop?.available).toBe("boolean");

  const downloadPage = await fetchWithTimeout(`/download?deployment_probe=${Date.now()}`);
  expect(downloadPage.status).toBeLessThan(500);

  const hubResponse = await fetchWithTimeout(`/swappys-broadcast?deployment_probe=${Date.now()}`);
  expect(hubResponse.status).toBeLessThan(500);
}, 480_000);
