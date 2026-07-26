import { describe, expect, it } from "vitest";
import { filterActiveAdvisories, isAdvisoryCurrentlyActive } from "@/lib/advisories";
import type { Advisory } from "@/types/advisory";

const NOW = new Date("2026-08-01T12:00:00Z");

function makeAdvisory(overrides: Partial<Advisory> = {}): Advisory {
  return {
    id: "a1",
    title: "Test advisory",
    description: "Testing",
    severity: "info",
    verified: true,
    isActive: true,
    ...overrides,
  };
}

describe("advisory filtering", () => {
  it("keeps advisories inside their window", () => {
    const advisory = makeAdvisory({
      startsAt: "2026-07-30T00:00:00Z",
      endsAt: "2026-08-03T00:00:00Z",
    });
    expect(isAdvisoryCurrentlyActive(advisory, NOW)).toBe(true);
  });

  it("drops ended advisories", () => {
    expect(
      isAdvisoryCurrentlyActive(makeAdvisory({ endsAt: "2026-07-31T00:00:00Z" }), NOW),
    ).toBe(false);
  });

  it("drops future advisories", () => {
    expect(
      isAdvisoryCurrentlyActive(makeAdvisory({ startsAt: "2026-08-02T00:00:00Z" }), NOW),
    ).toBe(false);
  });

  it("drops deactivated advisories", () => {
    expect(isAdvisoryCurrentlyActive(makeAdvisory({ isActive: false }), NOW)).toBe(false);
  });

  it("sorts by severity: critical, warning, info", () => {
    const result = filterActiveAdvisories(
      [
        makeAdvisory({ id: "i", severity: "info" }),
        makeAdvisory({ id: "c", severity: "critical" }),
        makeAdvisory({ id: "w", severity: "warning" }),
      ],
      NOW,
    );
    expect(result.map((a) => a.id)).toEqual(["c", "w", "i"]);
  });
});
