import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("Adult Studio audio completion", () => {
  it("preserves existing audio and generates only when no audio stream exists", () => {
    const compliance = source("server/_core/adultMediaCompliance.ts");
    expect(compliance).toContain('stream.codec_type === "audio"');
    expect(compliance).toContain("if (hasAudio)");
    expect(compliance).toContain("else if (fallback)");
    expect(compliance).toContain("anullsrc=channel_layout=stereo");
  });

  it("uses saved ElevenLabs, Suno or Replicate audio keys", () => {
    const helper = source("server/_core/adultAudioCompletion.ts");
    expect(helper).toContain("stored.elevenlabsKey");
    expect(helper).toContain("stored.sunoKey");
    expect(helper).toContain("stored.replicateKey");
    expect(helper).toContain("/v1/sound-generation");
  });

  it("records whether soundtrack completion was generated", () => {
    const worker = source("server/studio-render-worker.ts");
    expect(worker).toContain("metadata.audioCompletion = compliant.audioCompletion");
  });
});
