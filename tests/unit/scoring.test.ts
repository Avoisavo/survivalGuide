import { describe, expect, it } from "vitest";
import { explainRoute, scoreRoutes, type ScorableRoute } from "@/lib/routing/scoring";
import { DEFAULT_ROUTE_WEIGHTS } from "@/types/route";

function makeRoute(overrides: Partial<ScorableRoute> = {}): ScorableRoute {
  return {
    totalDurationMinutes: 45,
    totalWalkingMeters: 500,
    transfers: 1,
    reliabilityScore: 70,
    raceDaySuitabilityScore: 60,
    ...overrides,
  };
}

describe("scoreRoutes", () => {
  it("returns an empty array for no routes", () => {
    expect(scoreRoutes([])).toEqual([]);
  });

  it("gives the fastest route the best travelTime score", () => {
    const routes = [
      makeRoute({ totalDurationMinutes: 30 }),
      makeRoute({ totalDurationMinutes: 60 }),
      makeRoute({ totalDurationMinutes: 90 }),
    ];
    const scores = scoreRoutes(routes);
    expect(scores[0].travelTime).toBe(100);
    expect(scores[2].travelTime).toBe(0);
    expect(scores[1].travelTime).toBe(50);
  });

  it("normalizes every factor into 0..100", () => {
    const routes = [
      makeRoute({ totalDurationMinutes: 20, totalWalkingMeters: 0, transfers: 0, estimatedCostMin: 5, estimatedCostMax: 10 }),
      makeRoute({ totalDurationMinutes: 120, totalWalkingMeters: 2500, transfers: 4, estimatedCostMin: 80, estimatedCostMax: 120 }),
    ];
    for (const score of scoreRoutes(routes)) {
      for (const value of [score.travelTime, score.reliability, score.cost, score.walking, score.transfers, score.raceDaySuitability]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });

  it("treats cost as neutral when no route has cost data", () => {
    const routes = [makeRoute(), makeRoute({ totalDurationMinutes: 90 })];
    const scores = scoreRoutes(routes);
    expect(scores[0].cost).toBe(100);
    expect(scores[1].cost).toBe(100);
  });

  it("computes the weighted final score", () => {
    const route = makeRoute({ reliabilityScore: 100, raceDaySuitabilityScore: 100 });
    const [score] = scoreRoutes([route]);
    // Single candidate: all relative factors are 100.
    const expected =
      100 * DEFAULT_ROUTE_WEIGHTS.travelTime +
      100 * DEFAULT_ROUTE_WEIGHTS.reliability +
      100 * DEFAULT_ROUTE_WEIGHTS.raceDaySuitability +
      100 * DEFAULT_ROUTE_WEIGHTS.cost +
      100 * DEFAULT_ROUTE_WEIGHTS.walking +
      100 * DEFAULT_ROUTE_WEIGHTS.transfers;
    expect(score.finalScore).toBeCloseTo(expected, 1);
  });

  it("respects custom weights", () => {
    const routes = [
      makeRoute({ totalDurationMinutes: 30, totalWalkingMeters: 3000 }),
      makeRoute({ totalDurationMinutes: 60, totalWalkingMeters: 0 }),
    ];
    const walkHeavy = scoreRoutes(routes, { ...DEFAULT_ROUTE_WEIGHTS, walking: 0.6, travelTime: 0.1 });
    expect(walkHeavy[1].finalScore).toBeGreaterThan(walkHeavy[0].finalScore);
  });
});

describe("explainRoute", () => {
  it("never promises certainty", () => {
    const route = makeRoute();
    const [breakdown] = scoreRoutes([route]);
    const explanation = explainRoute(route, breakdown, true);
    expect(explanation).toMatch(/estimates only/i);
  });

  it("mentions transfer count", () => {
    const route = makeRoute({ transfers: 2 });
    const [breakdown] = scoreRoutes([route]);
    expect(explainRoute(route, breakdown, false)).toMatch(/2 transfers/);
  });
});
