import { describe, expect, it } from "vitest";
import { filterActiveDeals, isDealCurrentlyValid } from "@/lib/deals";
import type { Deal } from "@/types/deal";

const NOW = new Date("2026-08-01T12:00:00Z");

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "d1",
    placeId: "p1",
    title: "Test deal",
    verified: true,
    isActive: true,
    ...overrides,
  };
}

describe("deal expiry", () => {
  it("keeps a deal inside its validity window", () => {
    const deal = makeDeal({
      validFrom: "2026-07-25T00:00:00Z",
      validUntil: "2026-08-10T00:00:00Z",
    });
    expect(isDealCurrentlyValid(deal, NOW)).toBe(true);
  });

  it("drops an expired deal automatically", () => {
    const deal = makeDeal({ validUntil: "2026-07-31T23:59:59Z" });
    expect(isDealCurrentlyValid(deal, NOW)).toBe(false);
  });

  it("drops a deal that has not started yet", () => {
    const deal = makeDeal({ validFrom: "2026-08-05T00:00:00Z" });
    expect(isDealCurrentlyValid(deal, NOW)).toBe(false);
  });

  it("drops deactivated deals regardless of dates", () => {
    const deal = makeDeal({ isActive: false });
    expect(isDealCurrentlyValid(deal, NOW)).toBe(false);
  });

  it("keeps open-ended deals", () => {
    expect(isDealCurrentlyValid(makeDeal(), NOW)).toBe(true);
  });

  it("filterActiveDeals removes only invalid deals", () => {
    const deals = [
      makeDeal({ id: "valid" }),
      makeDeal({ id: "expired", validUntil: "2026-01-01T00:00:00Z" }),
      makeDeal({ id: "inactive", isActive: false }),
    ];
    expect(filterActiveDeals(deals, NOW).map((d) => d.id)).toEqual(["valid"]);
  });
});
