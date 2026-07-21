import { expect, test } from "vitest";

const BASE_URL = "https://virelle.life";
const RELEASE_PATH = "/deploy/lamalo-welcome-contract-v2.json";
const EXPECTED_RELEASE = "lamalo-welcome-contract-v2";
const EXPECTED_SOURCE_MERGE = "5e7cf2e000cb3b0ca7fc0e8e57ae18a8e02180c4";

function sleep(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function request(path: string) {
  const separator = path.includes("?") ? "&" : "?";
  return fetch(`${BASE_URL}${path}${separator}deployment_probe=${Date.now()}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    signal: AbortSignal.timeout(30_000),
  });
}

test("Render serves the verified Lamalo welcome contract release", async () => {
  let release: any | null = null;
  let health: any | null = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 42; attempt += 1) {
    try {
      const [releaseResponse, healthResponse] = await Promise.all([
        request(RELEASE_PATH),
        request("/api/health"),
      ]);

      if (releaseResponse.ok) release = await releaseResponse.json();
      if (healthResponse.ok) health = await healthResponse.json();

      if (
        release?.release === EXPECTED_RELEASE &&
        release?.sourceMerge === EXPECTED_SOURCE_MERGE &&
        release?.deployment === "render" &&
        release?.contract?.starterChoices === 10 &&
        release?.contract?.freeClaims === 2 &&
        release?.contract?.claimMode === "atomic" &&
        release?.contract?.catalogueRepairScope === "lamalo-only" &&
        (health?.status === "ok" || health?.success === true) &&
        (health?.database === undefined || health?.database === "ok")
      ) {
        break;
      }
    } catch (error) {
      lastError = error;
    }

    await sleep(10_000);
  }

  expect(release, `Render release marker was not available: ${String(lastError ?? "none")}`).toBeTruthy();
  expect(release?.release).toBe(EXPECTED_RELEASE);
  expect(release?.sourceMerge).toBe(EXPECTED_SOURCE_MERGE);
  expect(release?.deployment).toBe("render");
  expect(release?.contract).toEqual({
    starterChoices: 10,
    freeClaims: 2,
    claimMode: "atomic",
    catalogueRepairScope: "lamalo-only",
  });

  expect(health, "Render health response was not available").toBeTruthy();
  expect(health?.status === "ok" || health?.success === true).toBe(true);
  expect(health?.database === undefined || health?.database === "ok").toBe(true);
}, 480_000);
