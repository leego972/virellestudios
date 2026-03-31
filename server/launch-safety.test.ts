import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit } from "./_core/rateLimit";
import { TRPCError } from "@trpc/server";

// Mock Redis for rate limit tests
vi.mock("ioredis", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      multi: vi.fn().mockReturnThis(),
      incr: vi.fn().mockReturnThis(),
      pexpire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([[null, 1], [null, "OK"]]),
      pttl: vi.fn().mockResolvedValue(60000),
    })),
  };
});

describe("Launch Safety & Backend Hardening", () => {
  
  describe("Rate Limiting Logic", () => {
    it("should allow requests within limit", async () => {
      // Should not throw
      await expect(checkRateLimit(1, "test-action", 5, 60000)).resolves.not.toThrow();
    });

    it("should throw TOO_MANY_REQUESTS when limit exceeded (in-memory fallback)", async () => {
      const userId = 999;
      const action = "heavy-task";
      const max = 2;
      
      // First two should pass
      await checkRateLimit(userId, action, max, 60000);
      await checkRateLimit(userId, action, max, 60000);
      
      // Third should throw
      await expect(checkRateLimit(userId, action, max, 60000)).rejects.toThrow(
        expect.objectContaining({ code: "TOO_MANY_REQUESTS" })
      );
    });
  });

  describe("Admin Role Security", () => {
    it("should verify that admin emails are no longer hardcoded in logic", async () => {
      // This is a structural check - we've already removed ADMIN_EMAILS from db.ts
      // If we try to import it and it's gone, the test environment will fail to compile or we can check the file content
      const dbModule = await import("./db");
      expect((dbModule as any).ADMIN_EMAILS).toBeUndefined();
    });
  });
});
