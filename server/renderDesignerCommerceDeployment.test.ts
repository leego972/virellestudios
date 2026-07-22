import { expect, test } from "vitest";

const BASE_URL = "https://virelle.life";
const RELEASE_PATH = "/deploy/designer-commerce-shipping-v1.json";

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

test("Render serves the integrated designer commerce release", async () => {
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
        release?.release === "designer-commerce-shipping-v1" &&
        release?.deployment === "render" &&
        release?.portalSeparation === true &&
        release?.standardSignupAddressRequired === true &&
        release?.designerSignupSeparate === true &&
        release?.designerPayouts === "stripe-connect-95-5" &&
        release?.thirdPartyVirtualPricePercent === 3 &&
        release?.lamaloPricingLocked === true &&
        release?.physicalPurchaseAddsVirtualInventoryCopy === true &&
        release?.savedDeliveryAddressCrud === true &&
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
  expect(release).toMatchObject({
    deployment: "render",
    release: "designer-commerce-shipping-v1",
    portalSeparation: true,
    standardSignupAddressRequired: true,
    designerSignupSeparate: true,
    designerPayouts: "stripe-connect-95-5",
    thirdPartyVirtualPricePercent: 3,
    lamaloPricingLocked: true,
    physicalPurchaseAddsVirtualInventoryCopy: true,
    savedDeliveryAddressCrud: true,
  });

  expect(health, "Render health response was not available").toBeTruthy();
  expect(health?.status === "ok" || health?.success === true).toBe(true);
  expect(health?.database === undefined || health?.database === "ok").toBe(true);
}, 480_000);
