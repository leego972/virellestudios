import { describe, expect, it } from "vitest";

import { hasExactHttpsHostname, validatePublicHttpsUrl } from "./_core/remoteUrlSecurity";
import { sanitizeObject, sanitizeText, stripHtml } from "./_core/sanitize";
import { parseFDX } from "./_core/scriptFormats";

describe("quality and security hardening", () => {
  it("classifies trusted provider hosts by exact HTTPS hostname", () => {
    expect(hasExactHttpsHostname("https://api.openai.com/v1/chat/completions", ["api.openai.com"])).toBe(true);
    expect(hasExactHttpsHostname("https://api.openai.com.attacker.example/v1", ["api.openai.com"])).toBe(false);
    expect(hasExactHttpsHostname("http://api.openai.com/v1", ["api.openai.com"])).toBe(false);
    expect(hasExactHttpsHostname("https://user:pass@api.openai.com/v1", ["api.openai.com"])).toBe(false);
  });

  it("rejects private, local and non-HTTPS media URLs before download", async () => {
    await expect(validatePublicHttpsUrl("http://example.com/audio.mp3")).rejects.toThrow(/HTTPS/);
    await expect(validatePublicHttpsUrl("https://127.0.0.1/audio.mp3")).rejects.toThrow(/Private|reserved/);
    await expect(validatePublicHttpsUrl("https://169.254.169.254/latest/meta-data")).rejects.toThrow(/Private|reserved/);
    await expect(validatePublicHttpsUrl("https://localhost/audio.mp3")).rejects.toThrow(/Local|internal/);
    await expect(validatePublicHttpsUrl("https://8.8.8.8/audio.mp3")).resolves.toBeInstanceOf(URL);
  });

  it("normalises text-only input and blocks prototype-pollution keys", () => {
    expect(stripHtml('<script>alert(1)</script><b>Hello</b> <img src=x onerror="bad">')).toBe("Hello");
    expect(sanitizeText("ＡＢＣ\u0000<script>bad()</script>")).toBe("ABC");

    const unsafe = JSON.parse('{"safe":"<b>value</b>","__proto__":{"polluted":true},"constructor":"bad"}');
    const result = sanitizeObject(unsafe) as Record<string, unknown>;
    expect(result).toEqual({ safe: "value" });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("does not recursively decode escaped FDX entities into markup", () => {
    const scenes = parseFDX(`<?xml version="1.0"?><FinalDraft><Content>
      <Paragraph Type="Scene Heading"><Text>INT. TEST ROOM - DAY</Text></Paragraph>
      <Paragraph Type="Action"><Text>&amp;lt;script&amp;gt;safe text&amp;lt;/script&amp;gt;</Text></Paragraph>
    </Content></FinalDraft>`);

    expect(scenes).toHaveLength(1);
    expect(scenes[0].description).toContain("&lt;script&gt;safe text&lt;/script&gt;");
    expect(scenes[0].description).not.toContain("<script>");
  });
});
