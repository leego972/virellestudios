#!/usr/bin/env node

const baseUrl = (process.argv[2] || process.env.VIRELLE_BASE_URL || "https://virelle.life").replace(/\/$/, "");

async function getJson(path) {
  const url = `${baseUrl}${path}`;
  const started = Date.now();
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const elapsedMs = Date.now() - started;
  let json = null;
  try {
    json = await response.json();
  } catch {
    // non-JSON response handled below
  }
  return { url, status: response.status, ok: response.ok, elapsedMs, json };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  console.log(`Checking Swappys Mobile -> Virelle connection at ${baseUrl}`);

  const health = await getJson("/api/health");
  console.log(`health: ${health.status} ${health.elapsedMs}ms`);
  assert(health.ok, `/api/health failed with HTTP ${health.status}`);
  assert(health.json && (health.json.status === "ok" || health.json.success === true), "/api/health did not return an ok/success health payload");

  const features = await getJson("/api/mobile/features");
  console.log(`features: ${features.status} ${features.elapsedMs}ms`);
  assert(features.ok, `/api/mobile/features failed with HTTP ${features.status}`);
  assert(features.json?.ok === true, "/api/mobile/features missing ok:true");
  assert(features.json?.features?.creatorUpgrade === true, "creatorUpgrade flag missing");
  assert(features.json?.features?.swappysStudio === true, "swappysStudio flag missing");
  assert(features.json?.features?.watermarkControls === true, "watermarkControls flag missing");
  assert(features.json?.features?.broadcastMode === true, "broadcastMode flag missing");
  assert(features.json?.features?.rtmpBroadcast === true, "rtmpBroadcast flag missing");
  assert(features.json?.features?.studioRenderQueue === true, "studioRenderQueue flag missing");
  assert(features.json?.features?.byokVideoRequired === true, "byokVideoRequired flag missing");
  assert(features.json?.costPolicy?.noPlatformFundedUserVideo === true, "noPlatformFundedUserVideo policy missing");
  assert(Array.isArray(features.json?.byokProviders) && features.json.byokProviders.includes("runway"), "byokProviders missing runway");
  assert(Array.isArray(features.json?.transformGoals) && features.json.transformGoals.includes("adult_to_child"), "transformGoals missing adult_to_child");

  console.log("PASS: Swappys Mobile can verify Virelle health, BYOK broadcast policy, and mobile feature manifest.");
  process.exit(0);
} catch (error) {
  console.error("FAIL:", error?.message || error);
  process.exit(1);
}
