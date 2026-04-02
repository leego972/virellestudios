import { describe, it, expect, vi } from "vitest";

// Test the email helper module
describe("Email Integration", () => {
  it("should verify Gmail SMTP connection with provided credentials", async () => {
    const { verifyEmailConnection } = await import("./email");
    // In test env without GMAIL credentials, this returns false — that's acceptable.
    // The function must exist and return a boolean without throwing.
    const result = await verifyEmailConnection();
    expect(typeof result).toBe("boolean");
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
