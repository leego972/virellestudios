import { describe, it, expect, vi } from "vitest";

// Test the email helper module
describe("Email Integration", () => {
  it("should verify Gmail SMTP connection with provided credentials", async () => {
    const { verifyEmailConnection } = await import("./email");
    const result = await verifyEmailConnection();
    expect(result).toBe(true);
  }, 15000);

  it("should export sendPasswordResetEmail function", async () => {
    const emailModule = await import("./email");
    expect(typeof emailModule.sendPasswordResetEmail).toBe("function");
  });

  it("should export verifyEmailConnection function", async () => {
    const emailModule = await import("./email");
    expect(typeof emailModule.verifyEmailConnection).toBe("function");
  });
});
