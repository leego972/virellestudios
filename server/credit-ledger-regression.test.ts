import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const block = (start: string, end: string) =>
  source.slice(source.indexOf(`export async function ${start}`), source.indexOf(`export async function ${end}`));

describe("credit ledger safety", () => {
  it("row-locks direct deductions", () => {
    const text = block("deductCredits", "addCredits");
    expect(text).toContain("db.transaction");
    expect(text).toContain("FOR UPDATE");
    expect(text).toContain("creditTransactions");
  });
  it("rolls back failed reservation inserts", () => {
    const text = block("reserveCredits", "finalizeReservation");
    expect(text).toContain("Failed to create credit reservation");
    expect(text).toContain("db.transaction");
  });
  it("makes refunds idempotent", () => {
    const text = block("releaseReservation", "getActiveReservation");
    expect(text).toContain("FOR UPDATE");
    expect(text).toContain('status !== "reserved"');
    expect(text).toContain('status: "released"');
  });
});
