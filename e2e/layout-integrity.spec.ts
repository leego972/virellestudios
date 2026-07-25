import { expect, test, type Page } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";
const PUBLIC_ROUTES = [
  "/welcome",
  "/login",
  "/register",
  "/pricing",
  "/about",
  "/faq",
  "/solutions",
  "/how-it-works",
  "/download",
  "/contact",
  "/blog",
  "/press",
  "/changelog",
  "/terms",
  "/privacy",
  "/acceptable-use",
  "/ai-content-policy",
  "/ip-policy",
  "/showcase",
];

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
  { name: "wide", width: 1536, height: 960 },
];

type LayoutIssue = {
  kind: string;
  selector: string;
  text: string;
  detail: string;
};

async function collectLayoutIssues(page: Page): Promise<LayoutIssue[]> {
  return page.evaluate(() => {
    const issues: LayoutIssue[] = [];
    const viewportWidth = document.documentElement.clientWidth;
    const selector = [
      "button",
      "a[href]",
      "input",
      "select",
      "textarea",
      "[role=button]",
      "[role=tab]",
      "[role=dialog]",
      "h1",
      "h2",
      "h3",
    ].join(",");
    const elements = [...document.querySelectorAll<HTMLElement>(selector)].filter(element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rect.width > 1 && rect.height > 1;
    });

    const describe = (element: HTMLElement) => {
      const role = element.getAttribute("role");
      const name = element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent || "";
      return `${element.tagName.toLowerCase()}${role ? `[role=${role}]` : ""}`;
    };

    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const text = (element.getAttribute("aria-label") || element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100);
      if (rect.left < -2 || rect.right > viewportWidth + 2) {
        issues.push({ kind: "viewport-overflow", selector: describe(element), text, detail: `left=${Math.round(rect.left)} right=${Math.round(rect.right)} viewport=${viewportWidth}` });
      }
      const clipsHorizontally = element.scrollWidth > element.clientWidth + 2;
      const allowsHorizontalScroll = ["auto", "scroll"].includes(style.overflowX);
      const intentionallyTruncated = style.textOverflow === "ellipsis" || element.classList.contains("truncate") || element.classList.contains("line-clamp-1") || element.classList.contains("line-clamp-2") || element.classList.contains("line-clamp-3");
      if (clipsHorizontally && !allowsHorizontalScroll && !intentionallyTruncated) {
        issues.push({ kind: "clipped-content", selector: describe(element), text, detail: `scrollWidth=${element.scrollWidth} clientWidth=${element.clientWidth}` });
      }
    }

    const interactive = elements.filter(element => element.matches("button,a[href],input,select,textarea,[role=button],[role=tab]"));
    for (let firstIndex = 0; firstIndex < interactive.length; firstIndex += 1) {
      const first = interactive[firstIndex];
      const firstRect = first.getBoundingClientRect();
      for (let secondIndex = firstIndex + 1; secondIndex < interactive.length; secondIndex += 1) {
        const second = interactive[secondIndex];
        if (first.contains(second) || second.contains(first)) continue;
        const secondRect = second.getBoundingClientRect();
        const overlapWidth = Math.min(firstRect.right, secondRect.right) - Math.max(firstRect.left, secondRect.left);
        const overlapHeight = Math.min(firstRect.bottom, secondRect.bottom) - Math.max(firstRect.top, secondRect.top);
        if (overlapWidth <= 4 || overlapHeight <= 4) continue;
        const overlapArea = overlapWidth * overlapHeight;
        const smallerArea = Math.min(firstRect.width * firstRect.height, secondRect.width * secondRect.height);
        if (smallerArea <= 0 || overlapArea / smallerArea < 0.18) continue;
        issues.push({
          kind: "interactive-overlap",
          selector: `${describe(first)} ↔ ${describe(second)}`,
          text: `${(first.textContent || first.getAttribute("aria-label") || "").trim().slice(0, 50)} | ${(second.textContent || second.getAttribute("aria-label") || "").trim().slice(0, 50)}`,
          detail: `${Math.round(overlapWidth)}×${Math.round(overlapHeight)} overlap`,
        });
      }
    }

    return issues.slice(0, 50);
  });
}

for (const viewport of VIEWPORTS) {
  test.describe(`layout integrity — ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of PUBLIC_ROUTES) {
      test(`${route} has no clipped or overlapping controls`, async ({ page }) => {
        const browserErrors: string[] = [];
        page.on("pageerror", error => browserErrors.push(error.message));
        await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(400);
        const issues = await collectLayoutIssues(page);
        expect(issues, `${route} at ${viewport.width}px:\n${JSON.stringify(issues, null, 2)}`).toEqual([]);
        expect(browserErrors.filter(error => !error.includes("ResizeObserver")), `Browser errors on ${route}`).toEqual([]);
      });
    }
  });
}

test("authenticated routes use the responsive shell when credentials are configured", async ({ page }) => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "Set E2E_EMAIL and E2E_PASSWORD to audit authenticated pages.");
  await page.goto(`${BASE_URL}/login`);
  await page.locator('input[type="email"]').fill(process.env.E2E_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.E2E_PASSWORD!);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(url => !url.pathname.includes("login"));
  for (const route of ["/projects", "/funding", "/credits", "/settings", "/assistant", "/marketplace"]) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    expect(await collectLayoutIssues(page), `Authenticated layout issues on ${route}`).toEqual([]);
  }
});
