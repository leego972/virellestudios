import { describe, expect, it } from "vitest";
import {
  BROADCAST_MINUTE_PACKS,
  INCLUDED_BROADCAST_MINUTES,
  includedMinutesForUser,
} from "./_core/broadcastMinutes";

describe("broadcast minute commerce", () => {
  it("keeps public package prices and minute grants stable", () => {
    expect(BROADCAST_MINUTE_PACKS).toEqual([
      expect.objectContaining({ id: "relay_120", minutes: 120, priceAudCents: 900 }),
      expect.objectContaining({ id: "relay_600", minutes: 600, priceAudCents: 2900 }),
      expect.objectContaining({ id: "relay_1500", minutes: 1500, priceAudCents: 5900 }),
      expect.objectContaining({ id: "relay_3600", minutes: 3600, priceAudCents: 11900 }),
    ]);
    for (const pack of BROADCAST_MINUTE_PACKS) {
      expect(pack.priceAudCents).toBe(pack.priceAud * 100);
      expect(pack.minutes).toBeGreaterThan(0);
    }
  });

  it("grants the advertised monthly managed-broadcast allowance", () => {
    expect(INCLUDED_BROADCAST_MINUTES.indie).toBe(60);
    expect(INCLUDED_BROADCAST_MINUTES.amateur).toBe(180);
    expect(INCLUDED_BROADCAST_MINUTES.independent).toBe(600);
  });

  it("gives administrators unrestricted internal minutes", () => {
    expect(includedMinutesForUser({ role: "admin" })).toBe(Number.MAX_SAFE_INTEGER);
  });
});
