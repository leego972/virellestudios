import { describe, expect, it } from "vitest";
import { TOOL_ICONS } from "./hollywoodIcons";
import {
  NAV_LABEL_TO_VIRELLE_CINEMA_ICON,
  TOOL_TO_VIRELLE_CINEMA_ICON,
} from "./virelleCinemaIconMap";
import {
  VIRELLE_CINEMA_FRAMES,
  VIRELLE_CINEMA_FRAME_SIZE,
  VIRELLE_CINEMA_SPRITE,
  VIRELLE_CINEMA_SPRITE_SIZE,
} from "./virelleCinemaIcons";

describe("Virelle cinema icon system", () => {
  it("contains the complete twenty-icon cinema collection", () => {
    expect(Object.keys(VIRELLE_CINEMA_FRAMES)).toHaveLength(20);
    expect(VIRELLE_CINEMA_SPRITE.startsWith("data:image/webp;base64,")).toBe(true);
  });

  it("keeps every crop inside the sprite sheet", () => {
    for (const frame of Object.values(VIRELLE_CINEMA_FRAMES)) {
      expect(frame.x).toBeGreaterThanOrEqual(0);
      expect(frame.y).toBeGreaterThanOrEqual(0);
      expect(frame.x + VIRELLE_CINEMA_FRAME_SIZE).toBeLessThanOrEqual(
        VIRELLE_CINEMA_SPRITE_SIZE.width,
      );
      expect(frame.y + VIRELLE_CINEMA_FRAME_SIZE).toBeLessThanOrEqual(
        VIRELLE_CINEMA_SPRITE_SIZE.height,
      );
    }
  });

  it("replaces every existing Hollywood tool icon with a cinema icon", () => {
    expect(Object.keys(TOOL_TO_VIRELLE_CINEMA_ICON).sort()).toEqual(
      Object.keys(TOOL_ICONS).sort(),
    );
  });

  it("covers all primary sidebar and business navigation labels", () => {
    for (const required of [
      "Projects",
      "Director's AI",
      "VFX & Sound",
      "Swappys & Broadcast",
      "Marketplace",
      "Credits",
      "Settings",
    ]) {
      expect(NAV_LABEL_TO_VIRELLE_CINEMA_ICON[required]).toBeDefined();
    }
  });
});
