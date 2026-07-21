#!/usr/bin/env node

// Final combined release validation trigger: web, Render, desktop, Swappys mobile, and downloads.
const baseUrl = (process.argv[2] || process.env.VIRELLE_BASE_URL || "https://virelle.life").replace(/\/$/, "");

async function requestJson(path, init = {}) {
  const url = `${baseUrl}${path}`;
  const started = Date.now();
  const response = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...(init.headers || {}) },
    signal: AbortSignal.timeout(15_000),
  });
  const elapsedMs = Date.now() - started;
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { url, status: response.status, ok: response.ok, elapsedMs, json, text };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  console.log(`Checking Swappys Mobile -> Virelle connection at ${baseUrl}`);

  const health = await requestJson("/api/health");
  console.log(`health: ${health.status} ${health.elapsedMs}ms`);
  assert(health.ok, `/api/health failed with HTTP ${health.status}`);
  assert(health.json && (health.json.status === "ok" || health.json.success === true), "/api/health did not return an ok/success payload");

  const features = await requestJson("/api/mobile/features");
  console.log(`features: ${features.status} ${features.elapsedMs}ms`);
  assert(features.ok, `/api/mobile/features failed with HTTP ${features.status}`);
  assert(features.json?.ok === true, "/api/mobile/features missing ok:true");
  const capabilities = features.json?.flags ?? features.json?.features ?? {};
  assert(capabilities.creatorUpgrade === true, "creatorUpgrade capability missing");
  assert(capabilities.swappysStudio === true, "swappysStudio capability missing");
  assert(capabilities.watermarkControls === true, "watermarkControls capability missing");
  assert(capabilities.byokVideoRequired === true, "byokVideoRequired capability missing");

  const downloads = await requestJson("/api/mobile/downloads");
  console.log(`downloads: ${downloads.status} ${downloads.elapsedMs}ms`);
  assert(downloads.ok, `/api/mobile/downloads failed with HTTP ${downloads.status}`);
  assert(typeof downloads.json?.ios?.available === "boolean", "iOS availability missing");
  assert(typeof downloads.json?.android?.available === "boolean", "Android availability missing");
  assert(typeof downloads.json?.desktop?.available === "boolean", "Desktop availability missing");

  // Probe the tRPC route with deliberately invalid input. A validation response
  // proves the route is mounted without spending generation credits or sending media.
  const route = await requestJson("/api/trpc/vfxSfx.swappysMobileSwap", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Swappys-Client": "connection-check" },
    body: JSON.stringify({ json: { consentConfirmed: false } }),
  });
  console.log(`swap route: ${route.status} ${route.elapsedMs}ms`);
  assert(route.status >= 400 && route.status < 500, `Swappys route probe returned unexpected HTTP ${route.status}`);
  assert(route.status !== 404, "Swappys tRPC route is not mounted");
  assert(route.json || route.text, "Swappys route returned an empty validation response");

  console.log("PASS: health, mobile capabilities, downloads, and the Swappys transformation route are reachable.");
  process.exit(0);
} catch (error) {
  console.error("FAIL:", error?.message || error);
  process.exit(1);
}
