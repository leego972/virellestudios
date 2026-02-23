import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: any[] } {
  const clearedCookies: any[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "director@viba.studio",
    name: "Test Director",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns the authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeTruthy();
    expect(result?.name).toBe("Test Director");
    expect(result?.email).toBe("director@viba.studio");
  });

  it("returns null for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });
});

describe("project router", () => {
  it("requires authentication for project.list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.project.list()).rejects.toThrow();
  });

  it("requires authentication for project.create", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.project.create({ title: "Test", mode: "quick" })
    ).rejects.toThrow();
  });

  it("validates project.create input - title required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.project.create({ title: "", mode: "quick" })
    ).rejects.toThrow();
  });

  it("validates project.create input - mode must be quick or manual", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.project.create({ title: "Test", mode: "invalid" as any })
    ).rejects.toThrow();
  });

  it("validates project.create input - rating enum", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.project.create({ title: "Test", mode: "quick", rating: "X" as any })
    ).rejects.toThrow();
  });

  it("validates project.create input - duration range", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.project.create({ title: "Test", mode: "quick", duration: 0 })
    ).rejects.toThrow();
    await expect(
      caller.project.create({ title: "Test", mode: "quick", duration: 999 })
    ).rejects.toThrow();
  });
});

describe("character router", () => {
  it("requires authentication for character.listLibrary", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.character.listLibrary()).rejects.toThrow();
  });

  it("validates character.create input - name required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.character.create({ name: "", projectId: null })
    ).rejects.toThrow();
  });

  it("validates character.create input - name max length", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.character.create({ name: "a".repeat(200), projectId: null })
    ).rejects.toThrow();
  });
});

describe("scene router", () => {
  it("requires authentication for scene.listByProject", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.scene.listByProject({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("validates scene.create input - projectId required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      (caller.scene.create as any)({ title: "Test" })
    ).rejects.toThrow();
  });

  it("validates scene.create input - timeOfDay enum", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.scene.create({ projectId: 1, timeOfDay: "midnight" as any })
    ).rejects.toThrow();
  });

  it("validates scene.create input - weather enum", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.scene.create({ projectId: 1, weather: "tornado" as any })
    ).rejects.toThrow();
  });

  it("validates scene.create input - lighting enum", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.scene.create({ projectId: 1, lighting: "flashlight" as any })
    ).rejects.toThrow();
  });

  it("validates scene.create input - cameraAngle enum", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.scene.create({ projectId: 1, cameraAngle: "selfie" as any })
    ).rejects.toThrow();
  });

  it("validates scene.create input - duration range", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.scene.create({ projectId: 1, duration: 0 })
    ).rejects.toThrow();
    await expect(
      caller.scene.create({ projectId: 1, duration: 999 })
    ).rejects.toThrow();
  });
});

describe("generation router", () => {
  it("requires authentication for generation.quickGenerate", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.generation.quickGenerate({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("requires authentication for generation.generateTrailer", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.generation.generateTrailer({ projectId: 1 })
    ).rejects.toThrow();
  });
});

describe("upload router", () => {
  it("requires authentication for upload.image", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.upload.image({ base64: "abc", filename: "test.jpg", contentType: "image/jpeg" })
    ).rejects.toThrow();
  });
});

describe("script router", () => {
  it("requires authentication for script.listByProject", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.script.listByProject({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("requires authentication for script.get", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.script.get({ id: 1 })
    ).rejects.toThrow();
  });

  it("requires authentication for script.create", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.script.create({ projectId: 1, title: "Test Script" })
    ).rejects.toThrow();
  });

  it("requires authentication for script.update", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.script.update({ id: 1, title: "Updated" })
    ).rejects.toThrow();
  });

  it("requires authentication for script.delete", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.script.delete({ id: 1 })
    ).rejects.toThrow();
  });

  it("requires authentication for script.aiGenerate", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.script.aiGenerate({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("requires authentication for script.aiAssist", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.script.aiAssist({ scriptId: 1, action: "continue" })
    ).rejects.toThrow();
  });

  it("validates script.aiAssist action enum", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.script.aiAssist({ scriptId: 1, action: "invalid" as any })
    ).rejects.toThrow();
  });

  it("validates script.create input - title max length", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.script.create({ projectId: 1, title: "a".repeat(256) })
    ).rejects.toThrow();
  });
});

describe("soundtrack router", () => {
  it("requires authentication for soundtrack.listByProject", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.soundtrack.listByProject({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("requires authentication for soundtrack.create", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.soundtrack.create({ projectId: 1, title: "Main Theme" })
    ).rejects.toThrow();
  });

  it("requires authentication for soundtrack.delete", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.soundtrack.delete({ id: 1 })
    ).rejects.toThrow();
  });

  it("validates soundtrack.create input - title required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.soundtrack.create({ projectId: 1, title: "" })
    ).rejects.toThrow();
  });

  it("validates soundtrack.create input - volume range", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.soundtrack.create({ projectId: 1, title: "Test", volume: 2 })
    ).rejects.toThrow();
    await expect(
      caller.soundtrack.create({ projectId: 1, title: "Test", volume: -1 })
    ).rejects.toThrow();
  });

  it("requires authentication for soundtrack.uploadAudio", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.soundtrack.uploadAudio({ base64: "abc", filename: "test.mp3", contentType: "audio/mpeg" })
    ).rejects.toThrow();
  });
});

describe("character.aiGenerate", () => {
  it("requires authentication for character.aiGenerate", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.character.aiGenerate({
        name: "Test",
        projectId: null,
        features: {
          ageRange: "30s",
          gender: "male",
          ethnicity: "Caucasian",
          hairColor: "black",
          hairStyle: "short cropped",
          eyeColor: "brown",
        },
      })
    ).rejects.toThrow();
  });

  it("validates aiGenerate input - name required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.character.aiGenerate({
        name: "",
        projectId: null,
        features: {
          ageRange: "30s",
          gender: "male",
          ethnicity: "Caucasian",
          hairColor: "black",
          hairStyle: "short cropped",
          eyeColor: "brown",
        },
      })
    ).rejects.toThrow();
  });

  it("validates aiGenerate input - features required fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.character.aiGenerate({
        name: "Test",
        projectId: null,
        features: {
          ageRange: "",
          gender: "male",
          ethnicity: "Caucasian",
          hairColor: "black",
          hairStyle: "short cropped",
          eyeColor: "brown",
        },
      })
    ).rejects.toThrow();
  });
});
