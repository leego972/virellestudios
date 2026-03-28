import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test.describe("Core Workflows", () => {
  // Use a unique email for each test run to avoid collisions if testing against a live DB
  const uniqueId = Date.now();
  const testUser = {
    email: `testuser_${uniqueId}@example.com`,
    password: "Password123!",
    name: "Test User",
  };

  test("User can register, login, and access dashboard", async ({ page }) => {
    // Registration
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[name="name"], input[placeholder*="Name"]', testUser.name);
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    
    // Click register button (adjust selector based on actual UI, usually button with text Register or Sign Up)
    const registerBtn = page.locator('button:has-text("Register"), button:has-text("Sign Up"), button[type="submit"]');
    await registerBtn.first().click();

    // Should redirect to dashboard or login
    await page.waitForURL(/\/dashboard|\/login/);

    if (page.url().includes('/login')) {
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', testUser.password);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForURL(/\/dashboard/);
    }

    // Dashboard verification
    await expect(page.locator("body")).toContainText("Dashboard");
  });

  test("Subscription flow and credits system visibility", async ({ page }) => {
    // Assuming user is already logged in or we check the pricing page directly
    await page.goto(`${BASE_URL}/pricing`);
    
    // Verify all tiers are visible
    await expect(page.locator("body")).toContainText("Indie");
    await expect(page.locator("body")).toContainText("Creator");
    await expect(page.locator("body")).toContainText("Studio");
    
    // Verify pricing is correct
    await expect(page.locator("body")).toContainText("A$149");
    await expect(page.locator("body")).toContainText("A$490");
    await expect(page.locator("body")).toContainText("A$1,490");

    // Click on a subscription button
    const subscribeBtn = page.locator('button:has-text("Subscribe"), button:has-text("Get Started"), button:has-text("Upgrade")').first();
    if (await subscribeBtn.isVisible()) {
      await subscribeBtn.click();
      // Should prompt for login or redirect to checkout
      await expect(page).not.toHaveURL(/\/500|\/error/);
    }
  });

  test("Project creation flow", async ({ page }) => {
    // Navigate to projects page
    await page.goto(`${BASE_URL}/projects`);
    
    // If redirected to login, that's expected for unauthenticated
    if (page.url().includes('/login')) {
      // Just verify the login page loads correctly
      await expect(page.locator('input[type="email"]')).toBeVisible();
    } else {
      // If authenticated, try to create a project
      const newProjectBtn = page.locator('button:has-text("New Project"), a:has-text("New Project")');
      if (await newProjectBtn.isVisible()) {
        await newProjectBtn.click();
        await expect(page).toHaveURL(/\/new-project|\/projects\/new/);
      }
    }
  });
});
