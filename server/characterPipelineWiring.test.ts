import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("character generation and continuity wiring", () => {
  it("keeps description and photo generation connected to every supplied UI input", () => {
    const charactersPage = source("client/src/pages/Characters.tsx");

    expect(charactersPage).toContain('useState<"description" | "photo">("description")');
    expect(charactersPage).toContain("trpc.character.aiGenerate.useMutation()");
    expect(charactersPage).toContain("trpc.character.aiGenerateFromPhoto.useMutation()");
    expect(charactersPage).toContain('photoBase64: dataUrl.split(",")[1] || ""');
    expect(charactersPage).toContain("photoMimeType: photo.type || \"image/jpeg\"");
    expect(charactersPage).toContain("characterRole: role.trim() || undefined");
    expect(charactersPage).toContain("additionalNotes: notes.trim() || undefined");
    expect(charactersPage).toContain("rightsConfirmed");
  });

  it("feeds the reference photo and director input into analysis and stores continuity DNA", () => {
    const routerSource = source("server/routers.ts");

    expect(routerSource).toMatch(/Director notes: \$\{input\.additionalNotes\}/);
    expect(routerSource).toContain("originalImages: [{");
    expect(routerSource).toContain("referencePhotoUrl: refPhotoUrl");
    expect(routerSource).toContain("characterRole: input.characterRole");
    expect(routerSource).toContain("generatedFromPhoto: true");
    expect(routerSource).toContain("faceDnaPrompt: faceDnaPrompt || null");
    expect(routerSource).toContain("bodyDnaPrompt: bodyDnaPrompt || null");
  });

  it("compiles photo analysis and manual profile data into an identity hard-lock", () => {
    const consistencySource = source("server/_core/characterConsistency.ts");

    expect(consistencySource).toContain("parseObject(character.attributes)");
    expect(consistencySource).toContain("attributes.estimatedAge");
    expect(consistencySource).toContain("attributes.additionalNotes");
    expect(consistencySource).toContain("IDENTITY REFERENCE HARD-LOCK");
    expect(consistencySource).toContain("ROLE AND PERFORMANCE");
    expect(consistencySource).toContain("STORY BEHAVIOUR");
    expect(consistencySource).toContain("VOICE AND SPEECH");
    expect(consistencySource).toContain("SCENE WARDROBE HARD-LOCK");
  });

  it("binds each character identity to assigned wardrobe and carries both through scenes", () => {
    const contextSource = source("server/_core/sceneGenerationContext.ts");
    const generatorSource = source("server/_core/extendedSceneGenerator.ts");

    expect(contextSource).toContain("Wardrobe assignment required before generation");
    expect(contextSource).toContain("CONTINUITY CARRY-FORWARD");
    expect(contextSource).toContain("characterReferenceImageUrl");
    expect(contextSource).toContain("wardrobeReferenceImageUrl");
    expect(contextSource).toContain("WARDROBE CHARACTER BINDINGS");

    expect(generatorSource).toContain("buildOpeningReferenceFrame");
    expect(generatorSource).toContain("request.previousSceneLastFrameUrl && !explicitCostumeChange");
    expect(generatorSource).toContain("originalImages: orderedReferences.map");
    expect(generatorSource).toContain("Never swap clothes, faces, bodies or accessories between characters");
    expect(generatorSource).toContain('const policy = request.qualityPolicy ?? (hasBoundWardrobe ? "strict" : "standard")');
    expect(generatorSource).toContain("previousFrame = await extractFrame");
  });
});
