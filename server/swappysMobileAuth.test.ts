import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./_core/env", () => ({
  ENV: { cookieSecret: "test-cookie-secret-at-least-32-characters-long" },
}));
vi.mock("./_core/rateLimit", () => ({ registerAdminForRateLimit: vi.fn() }));

import {
  authenticateSwappysMobileRequest,
  createSessionToken,
  createSwappysMobileToken,
} from "./_core/context";

const user = {
  id: 7,
  openId: "email_user@example.com",
  email: "user@example.com",
  name: "Test User",
  role: "user",
  passwordChangedAt: null,
};

function bearer(token: string) {
  return { headers: { authorization: `Bearer ${token}` } } as any;
}

describe("Swappys scoped mobile authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getUserById.mockResolvedValue(user);
    dbMocks.getUserByOpenId.mockResolvedValue(undefined);
  });

  it("accepts a valid Swappys-only bearer token", async () => {
    const token = await createSwappysMobileToken(user.id, user.name);

    await expect(authenticateSwappysMobileRequest(bearer(token))).resolves.toEqual(user);
    expect(dbMocks.getUserById).toHaveBeenCalledWith(user.id);
  });

  it("rejects a normal Virelle session token at the mobile bearer boundary", async () => {
    const sessionToken = await createSessionToken(user.id, user.name);

    await expect(authenticateSwappysMobileRequest(bearer(sessionToken))).resolves.toBeNull();
    expect(dbMocks.getUserById).not.toHaveBeenCalled();
  });

  it("rejects missing and malformed bearer values", async () => {
    await expect(authenticateSwappysMobileRequest({ headers: {} } as any)).resolves.toBeNull();
    await expect(authenticateSwappysMobileRequest(bearer("not-a-jwt"))).resolves.toBeNull();
  });

  it("rejects a token after a password change invalidates earlier credentials", async () => {
    const token = await createSwappysMobileToken(user.id, user.name);
    dbMocks.getUserById.mockResolvedValue({
      ...user,
      passwordChangedAt: new Date(Date.now() + 60_000),
    });

    await expect(authenticateSwappysMobileRequest(bearer(token))).resolves.toBeNull();
  });
});
