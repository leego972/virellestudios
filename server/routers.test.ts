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
    email: "leego972@gmail.com",
    name: "Test Director",
    passwordHash: null,
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
    expect(result?.email).toBe("leego972@gmail.com");
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

  it("validates aiGenerate input - features object required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      (caller.character.aiGenerate as any)({
        name: "Test",
        projectId: null,
      })
    ).rejects.toThrow();
  });
});

describe("credit router", () => {
  it("requires authentication for credit.listByProject", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.credit.listByProject({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("requires authentication for credit.create", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.credit.create({ projectId: 1, role: "Director", name: "John", section: "opening", orderIndex: 0 })
    ).rejects.toThrow();
  });

  it("requires authentication for credit.delete", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.credit.delete({ id: 1 })
    ).rejects.toThrow();
  });

  it("validates credit.create input - role required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.credit.create({ projectId: 1, role: "", name: "John", section: "opening", orderIndex: 0 })
    ).rejects.toThrow();
  });

  it("validates credit.create input - name required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.credit.create({ projectId: 1, role: "Director", name: "", section: "opening", orderIndex: 0 })
    ).rejects.toThrow();
  });

  it("validates credit.create input - section enum", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.credit.create({ projectId: 1, role: "Director", name: "John", section: "middle" as any, orderIndex: 0 })
    ).rejects.toThrow();
  });
});

describe("projectDuplicate router", () => {
  it("requires authentication for projectDuplicate.duplicate", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.projectDuplicate.duplicate({ projectId: 1 })
    ).rejects.toThrow();
  });
});

describe("shotList router", () => {
  it("requires authentication for shotList.generate", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.shotList.generate({ projectId: 1 })
    ).rejects.toThrow();
  });
});

describe("continuity router", () => {
  it("requires authentication for continuity.check", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.continuity.check({ projectId: 1 })
    ).rejects.toThrow();
  });
});

describe("project.update with colorGrading", () => {
  it("requires authentication for project.update", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.project.update({ id: 1, colorGrading: "warm-vintage" })
    ).rejects.toThrow();
  });

  it("validates project.update input - id required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      (caller.project.update as any)({ colorGrading: "warm-vintage" })
    ).rejects.toThrow();
  });
});

describe("location router", () => {
  it("requires authentication for location.listByProject", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.location.listByProject({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("requires authentication for location.create", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.location.create({ projectId: 1, name: "Central Park" })
    ).rejects.toThrow();
  });

  it("requires authentication for location.delete", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.location.delete({ id: 1 })
    ).rejects.toThrow();
  });

  it("validates location.create input - name required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.location.create({ projectId: 1, name: "" })
    ).rejects.toThrow();
  });

  it("requires authentication for location.aiSuggest", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.location.aiSuggest({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("requires authentication for location.generateImage", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.location.generateImage({ description: "A dark alley" })
    ).rejects.toThrow();
  });
});

describe("moodBoard router", () => {
  it("requires authentication for moodBoard.listByProject", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.moodBoard.listByProject({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("requires authentication for moodBoard.create", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.moodBoard.create({ projectId: 1, type: "text", text: "Dark moody" })
    ).rejects.toThrow();
  });

  it("requires authentication for moodBoard.delete", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.moodBoard.delete({ id: 1 })
    ).rejects.toThrow();
  });

  it("validates moodBoard.create input - type enum", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.moodBoard.create({ projectId: 1, type: "invalid" as any })
    ).rejects.toThrow();
  });

  it("requires authentication for moodBoard.generateImage", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.moodBoard.generateImage({ prompt: "Moody noir scene" })
    ).rejects.toThrow();
  });
});

describe("subtitle router", () => {
  it("requires authentication for subtitle.listByProject", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.subtitle.listByProject({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("requires authentication for subtitle.create", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.subtitle.create({ projectId: 1, language: "en", languageName: "English" })
    ).rejects.toThrow();
  });

  it("requires authentication for subtitle.update", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.subtitle.update({ id: 1, entries: [] })
    ).rejects.toThrow();
  });

  it("requires authentication for subtitle.delete", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.subtitle.delete({ id: 1 })
    ).rejects.toThrow();
  });

  it("validates subtitle.create input - language required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.subtitle.create({ projectId: 1, language: "", languageName: "English" })
    ).rejects.toThrow();
  });

  it("validates subtitle.create input - languageName required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.subtitle.create({ projectId: 1, language: "en", languageName: "" })
    ).rejects.toThrow();
  });

  it("requires authentication for subtitle.aiGenerate", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.subtitle.aiGenerate({ projectId: 1, language: "en", languageName: "English" })
    ).rejects.toThrow();
  });

  it("requires authentication for subtitle.aiTranslate", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.subtitle.aiTranslate({ subtitleId: 1, targetLanguage: "es", targetLanguageName: "Spanish" })
    ).rejects.toThrow();
  });
});

// ─── Dialogue Router Tests ───
describe("dialogue router", () => {
  it("requires authentication for dialogue.list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.dialogue.list({ projectId: 1 })
    ).rejects.toThrow();
  });
  it("requires authentication for dialogue.create", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.dialogue.create({ projectId: 1, characterName: "John", line: "Hello world" })
    ).rejects.toThrow();
  });
  it("validates required fields for dialogue.create", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.dialogue.create({ projectId: 1, characterName: "", line: "" })
    ).rejects.toThrow();
  });
  it("requires authentication for dialogue.update", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.dialogue.update({ id: 1, line: "Updated line" })
    ).rejects.toThrow();
  });
  it("requires authentication for dialogue.delete", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.dialogue.delete({ id: 1 })
    ).rejects.toThrow();
  });
  it("requires authentication for dialogue.aiSuggest", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.dialogue.aiSuggest({ projectId: 1, characterName: "John", context: "A tense scene" })
    ).rejects.toThrow();
  });
});

// ─── Budget Router Tests ───
describe("budget router", () => {
  it("requires authentication for budget.list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.budget.list({ projectId: 1 })
    ).rejects.toThrow();
  });
  it("requires authentication for budget.get", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.budget.get({ id: 1 })
    ).rejects.toThrow();
  });
  it("requires authentication for budget.generate", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.budget.generate({ projectId: 1 })
    ).rejects.toThrow();
  });
  it("requires authentication for budget.delete", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.budget.delete({ id: 1 })
    ).rejects.toThrow();
  });
});

// ─── Sound Effect Router Tests ───
describe("soundEffect router", () => {
  it("requires authentication for soundEffect.list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.soundEffect.list({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("requires authentication for soundEffect.listByScene", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.soundEffect.listByScene({ sceneId: 1 })
    ).rejects.toThrow();
  });

  it("requires authentication for soundEffect.create", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.soundEffect.create({ projectId: 1, name: "Thunder", category: "weather" })
    ).rejects.toThrow();
  });

  it("validates soundEffect.create input - name required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.soundEffect.create({ projectId: 1, name: "", category: "weather" })
    ).rejects.toThrow();
  });

  it("validates soundEffect.create input - category required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.soundEffect.create({ projectId: 1, name: "Thunder", category: "" })
    ).rejects.toThrow();
  });

  it("validates soundEffect.create input - volume range", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.soundEffect.create({ projectId: 1, name: "Thunder", category: "weather", volume: 2 })
    ).rejects.toThrow();
    await expect(
      caller.soundEffect.create({ projectId: 1, name: "Thunder", category: "weather", volume: -1 })
    ).rejects.toThrow();
  });

  it("requires authentication for soundEffect.upload", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.soundEffect.upload({ projectId: 1, fileName: "test.mp3", fileData: "abc", contentType: "audio/mpeg" })
    ).rejects.toThrow();
  });

  it("requires authentication for soundEffect.update", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.soundEffect.update({ id: 1, volume: 0.5 })
    ).rejects.toThrow();
  });

  it("validates soundEffect.update input - volume range", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.soundEffect.update({ id: 1, volume: 2 })
    ).rejects.toThrow();
  });

  it("requires authentication for soundEffect.delete", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.soundEffect.delete({ id: 1 })
    ).rejects.toThrow();
  });

  it("returns preset sound effects library", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const presets = await caller.soundEffect.presets();
    expect(Array.isArray(presets)).toBe(true);
    expect(presets.length).toBeGreaterThan(50);
    // Verify preset structure
    const first = presets[0];
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("category");
    expect(first).toHaveProperty("tags");
    expect(Array.isArray(first.tags)).toBe(true);
  });
});

// ─── Collaboration Router Tests ───
describe("collaboration router", () => {
  it("requires authentication for collaboration.list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.collaboration.list({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("requires authentication for collaboration.invite", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.collaboration.invite({ projectId: 1, role: "editor" })
    ).rejects.toThrow();
  });

  it("validates collaboration.invite input - role enum", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.collaboration.invite({ projectId: 1, role: "admin" as any })
    ).rejects.toThrow();
  });

  it("requires authentication for collaboration.accept", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.collaboration.accept({ token: "test-token" })
    ).rejects.toThrow();
  });

  it("requires authentication for collaboration.decline", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.collaboration.decline({ token: "test-token" })
    ).rejects.toThrow();
  });

  it("requires authentication for collaboration.updateRole", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.collaboration.updateRole({ id: 1, role: "producer" })
    ).rejects.toThrow();
  });

  it("validates collaboration.updateRole input - role enum", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.collaboration.updateRole({ id: 1, role: "superadmin" as any })
    ).rejects.toThrow();
  });

  it("requires authentication for collaboration.remove", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.collaboration.remove({ id: 1 })
    ).rejects.toThrow();
  });
});

// ─── Auth (any authenticated user can access protected procedures) ───
describe("auth access control", () => {
  it("allows any authenticated user to access protected procedures", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeTruthy();
    expect(result?.email).toBe("leego972@gmail.com");
  });

  it("blocks unauthenticated users from protected procedures", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.movie.list()).rejects.toThrow();
  });
});

// ─── My Movies ───
describe("movie router", () => {
  it("requires authentication for movie.list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.movie.list()).rejects.toThrow();
  });

  it("requires authentication for movie.get", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.movie.get({ id: 1 })).rejects.toThrow();
  });

  it("requires authentication for movie.create", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.movie.create({ title: "Test", type: "scene" })
    ).rejects.toThrow();
  });

  it("validates movie.create input - title required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.movie.create({ title: "", type: "scene" })
    ).rejects.toThrow();
  });

  it("validates movie.create input - type enum", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.movie.create({ title: "Test", type: "documentary" as any })
    ).rejects.toThrow();
  });

  it("validates movie.create input - valid types accepted", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // Valid types should pass validation and succeed (DB is available in test)
    const result = await caller.movie.create({ title: "Test Movie", type: "scene" });
    expect(result).toBeTruthy();
    expect(result.title).toBe("Test Movie");
    expect(result.type).toBe("scene");
  });

  it("requires authentication for movie.upload", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.movie.upload({
        movieId: 1,
        fileName: "test.mp4",
        fileBase64: "dGVzdA==",
        contentType: "video/mp4",
      })
    ).rejects.toThrow();
  });

  it("requires authentication for movie.uploadThumbnail", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.movie.uploadThumbnail({
        movieId: 1,
        fileName: "thumb.jpg",
        fileBase64: "dGVzdA==",
        contentType: "image/jpeg",
      })
    ).rejects.toThrow();
  });

  it("requires authentication for movie.update", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.movie.update({ id: 1, title: "Updated" })
    ).rejects.toThrow();
  });

  it("validates movie.update input - type enum", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.movie.update({ id: 1, type: "miniseries" as any })
    ).rejects.toThrow();
  });

  it("requires authentication for movie.delete", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.movie.delete({ id: 1 })).rejects.toThrow();
  });
});


describe("directorChat router", () => {
  it("requires authentication for directorChat.history", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.directorChat.history({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("requires authentication for directorChat.send", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.directorChat.send({ projectId: 1, message: "Hello" })
    ).rejects.toThrow();
  });

  it("validates directorChat.send input - message required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.directorChat.send({ projectId: 1, message: "" })
    ).rejects.toThrow();
  });

  it("validates directorChat.send input - message max length", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.directorChat.send({ projectId: 1, message: "a".repeat(5001) })
    ).rejects.toThrow();
  });

  it("requires authentication for directorChat.uploadAttachment", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.directorChat.uploadAttachment({
        projectId: 1,
        fileName: "test.png",
        fileData: "dGVzdA==",
        mimeType: "image/png",
      })
    ).rejects.toThrow();
  });

  it("requires authentication for directorChat.clear", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.directorChat.clear({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("requires authentication for directorChat.transcribeVoice", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.directorChat.transcribeVoice({
        projectId: 1,
        audioData: "dGVzdA==",
        mimeType: "audio/webm",
      })
    ).rejects.toThrow();
  });

  it("validates directorChat.transcribeVoice input - projectId required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      (caller.directorChat.transcribeVoice as any)({
        audioData: "dGVzdA==",
        mimeType: "audio/webm",
      })
    ).rejects.toThrow();
  });

  it("validates directorChat.transcribeVoice input - audioData required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      (caller.directorChat.transcribeVoice as any)({
        projectId: 1,
        mimeType: "audio/webm",
      })
    ).rejects.toThrow();
  });

  it("validates directorChat.transcribeVoice input - mimeType required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      (caller.directorChat.transcribeVoice as any)({
        projectId: 1,
        audioData: "dGVzdA==",
      })
    ).rejects.toThrow();
  });

  it("accepts valid directorChat.send input with optional imageUrls", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // This will fail at the DB/LLM level but validates input schema passes
    try {
      await caller.directorChat.send({
        projectId: 999999,
        message: "Test message",
        imageUrls: ["https://example.com/img.jpg"],
      });
    } catch (e: any) {
      // Should not be a Zod validation error
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  }, 15000);

  // ─── voiceEditText tests ───
  it("requires authentication for directorChat.voiceEditText", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.directorChat.voiceEditText({
        currentText: "Hello world",
        editCommand: "replace world with universe",
      })
    ).rejects.toThrow();
  });

  it("validates directorChat.voiceEditText input - currentText required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.directorChat.voiceEditText({
        currentText: "",
        editCommand: "replace world with universe",
      })
    ).rejects.toThrow();
  });

  it("validates directorChat.voiceEditText input - editCommand required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.directorChat.voiceEditText({
        currentText: "Hello world",
        editCommand: "",
      })
    ).rejects.toThrow();
  });

  it("validates directorChat.voiceEditText input - currentText max length", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.directorChat.voiceEditText({
        currentText: "a".repeat(10001),
        editCommand: "fix grammar",
      })
    ).rejects.toThrow();
  });

  it("validates directorChat.voiceEditText input - editCommand max length", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.directorChat.voiceEditText({
        currentText: "Hello world",
        editCommand: "a".repeat(2001),
      })
    ).rejects.toThrow();
  });

  it("validates directorChat.voiceEditText input - missing fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      (caller.directorChat.voiceEditText as any)({
        currentText: "Hello world",
      })
    ).rejects.toThrow();
    await expect(
      (caller.directorChat.voiceEditText as any)({
        editCommand: "fix grammar",
      })
    ).rejects.toThrow();
  });

  // ─── Command chaining tests ───
  it("accepts chained voice edit commands (long editCommand string)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // Chained commands should pass validation — the LLM handles parsing
    // This will fail at the LLM call level but validates input schema passes
    try {
      await caller.directorChat.voiceEditText({
        currentText: "The sunset was beautiful over the mountains.",
        editCommand: "Replace sunset with sunrise and add dramatic music at the end and make it shorter",
      });
    } catch (e: any) {
      // Should not be a Zod validation error — it should reach the LLM call
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("accepts complex chained commands with commas and periods", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.directorChat.voiceEditText({
        currentText: "A long film script about nature and wildlife.",
        editCommand: "Delete the first sentence, then make it more dramatic. Also fix the grammar and add a new ending.",
      });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("validates voiceEditText still rejects empty chained commands", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.directorChat.voiceEditText({
        currentText: "Some text",
        editCommand: "",
      })
    ).rejects.toThrow();
  });

  // ─── Preset edit command tests ───
  it("accepts preset 'Fix grammar' command via voiceEditText", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.directorChat.voiceEditText({
        currentText: "The quick brown fox jump over the lazy dog.",
        editCommand: "Fix all grammar and spelling errors",
      });
    } catch (e: any) {
      // Should not be a Zod validation error
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("accepts preset 'Make shorter' command via voiceEditText", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.directorChat.voiceEditText({
        currentText: "This is a very long and detailed description of a beautiful sunset over the ocean with waves crashing on the shore.",
        editCommand: "Make it significantly shorter and more concise",
      });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("accepts preset 'More dramatic' command via voiceEditText", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.directorChat.voiceEditText({
        currentText: "A person walks through a forest.",
        editCommand: "Rewrite to be more dramatic and cinematic",
      });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("accepts preset 'Professional' command via voiceEditText", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.directorChat.voiceEditText({
        currentText: "hey so like we need to get this done asap ok?",
        editCommand: "Rewrite in a more professional and polished tone",
      });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("accepts preset 'Simplify' command via voiceEditText", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.directorChat.voiceEditText({
        currentText: "The cinematographic methodology employed herein utilizes a multifaceted approach.",
        editCommand: "Simplify the language to be clearer and easier to understand",
      });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });
});


// ─── Email Auth Tests ───
describe("auth.register", () => {
  it("rejects registration with missing fields", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.register({ email: "", password: "12345678", name: "Test" })
    ).rejects.toThrow();
  });

  it("rejects registration with short password", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.register({ email: "test@test.com", password: "short", name: "Test" })
    ).rejects.toThrow();
  });

  it("rejects registration with invalid email", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.register({ email: "not-an-email", password: "12345678", name: "Test" })
    ).rejects.toThrow();
  });
});

describe("auth.login", () => {
  it("rejects login with missing fields", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.login({ email: "", password: "12345678" })
    ).rejects.toThrow();
  });

  it("rejects login with invalid email format", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.login({ email: "not-an-email", password: "12345678" })
    ).rejects.toThrow();
  });
});

describe("auth.requestPasswordReset", () => {
  it("returns success message even for non-existent email (no info leak)", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.requestPasswordReset({ email: "nonexistent@test.com", origin: "https://virelle.life" });
    expect(result.success).toBe(true);
    expect(result.message).toContain("If an account");
  });

  it("rejects invalid email format", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.requestPasswordReset({ email: "not-an-email", origin: "https://virelle.life" })
    ).rejects.toThrow();
  });
});

describe("auth.validateResetToken", () => {
  it("returns invalid for non-existent token", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.validateResetToken({ token: "fake-token-12345" });
    expect(result.valid).toBe(false);
  });

  it("rejects empty token", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.validateResetToken({ token: "" })
    ).rejects.toThrow();
  });
});

describe("auth.resetPassword", () => {
  it("rejects invalid token", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.resetPassword({ token: "fake-token", newPassword: "newpass123" })
    ).rejects.toThrow("Invalid or expired reset token");
  });

  it("rejects short password", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.resetPassword({ token: "some-token", newPassword: "short" })
    ).rejects.toThrow();
  });
});

describe("admin.listUsers", () => {
  it("allows admin to list users", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.listUsers();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects non-admin users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.listUsers()).rejects.toThrow("Admin access required");
  });

  it("rejects unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.listUsers()).rejects.toThrow();
  });
});

describe("admin.updateUserRole", () => {
  it("rejects non-admin users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.updateUserRole({ userId: 2, role: "admin" })
    ).rejects.toThrow("Admin access required");
  });

  it("prevents admin from changing own role", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.updateUserRole({ userId: 1, role: "user" })
    ).rejects.toThrow("Cannot change your own role");
  });

  it("rejects unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.updateUserRole({ userId: 2, role: "admin" })
    ).rejects.toThrow();
  });

  it("rejects invalid role values", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.updateUserRole({ userId: 2, role: "superadmin" as any })
    ).rejects.toThrow();
  });
});

function createAdminContext(): { ctx: TrpcContext; clearedCookies: any[] } {
  const clearedCookies: any[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user-123",
    email: "admin@virelle.life",
    name: "Admin Director",
    passwordHash: null,
    loginMethod: "email",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createPublicContext(): { ctx: TrpcContext; setCookies: any[] } {
  const setCookies: any[] = [];
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, value, options });
      },
    } as unknown as TrpcContext["res"],
  };
  return { ctx, setCookies };
}
