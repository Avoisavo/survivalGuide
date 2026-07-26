import {
  DEFAULT_ROUTE_WEIGHTS,
  type RouteOption,
  type RouteScoreBreakdown,
  type RouteWeights,
} from "@/types/route";

export interface ScorableRoute {
  totalDurationMinutes: number;
  totalWalkingMeters: number;
  transfers: number;
  estimatedCostMin?: number;
  estimatedCostMax?: number;
  reliabilityScore: number;
  raceDaySuitabilityScore: number;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Normalize a value against the best/worst observed in the candidate set.
 * Lower raw values are better (duration, walking, cost, transfers) →
 * best gets 100, worst gets 0, linear in between.
 */
function normalizeLowerIsBetter(value: number, best: number, worst: number): number {
  if (worst <= best) return 100;
  return clamp(((worst - value) / (worst - best)) * 100);
}

function midCost(route: ScorableRoute): number | undefined {
  if (route.estimatedCostMin === undefined && route.estimatedCostMax === undefined) {
    return undefined;
  }
  const min = route.estimatedCostMin ?? route.estimatedCostMax ?? 0;
  const max = route.estimatedCostMax ?? route.estimatedCostMin ?? 0;
  return (min + max) / 2;
}

/**
 * Score a set of candidate routes relative to each other. Every factor is
 * normalized to 0–100 (higher is better) before weighting, so the breakdown
 * stays interpretable. When no candidate has cost data, the cost factor is
 * neutral (100 for all) rather than penalizing anyone.
 */
export function scoreRoutes<T extends ScorableRoute>(
  routes: T[],
  weights: RouteWeights = DEFAULT_ROUTE_WEIGHTS,
): RouteScoreBreakdown[] {
  if (routes.length === 0) return [];

  const durations = routes.map((r) => r.totalDurationMinutes);
  const walks = routes.map((r) => r.totalWalkingMeters);
  const transfers = routes.map((r) => r.transfers);
  const costs = routes.map(midCost).filter((c): c is number => c !== undefined);

  const bestDuration = Math.min(...durations);
  const worstDuration = Math.max(...durations);
  const bestWalk = Math.min(...walks);
  const worstWalk = Math.max(...walks);
  const bestTransfers = Math.min(...transfers);
  const worstTransfers = Math.max(...transfers);
  const bestCost = costs.length ? Math.min(...costs) : 0;
  const worstCost = costs.length ? Math.max(...costs) : 0;

  return routes.map((route) => {
    const cost = midCost(route);
    const travelTime = normalizeLowerIsBetter(
      route.totalDurationMinutes,
      bestDuration,
      worstDuration,
    );
    const walking = normalizeLowerIsBetter(route.totalWalkingMeters, bestWalk, worstWalk);
    const transferScore = normalizeLowerIsBetter(
      route.transfers,
      bestTransfers,
      worstTransfers,
    );
    const costScore =
      cost === undefined || costs.length === 0
        ? 100
        : normalizeLowerIsBetter(cost, bestCost, worstCost);
    const reliability = clamp(route.reliabilityScore);
    const raceDaySuitability = clamp(route.raceDaySuitabilityScore);

    const finalScore =
      travelTime * weights.travelTime +
      reliability * weights.reliability +
      raceDaySuitability * weights.raceDaySuitability +
      costScore * weights.cost +
      walking * weights.walking +
      transferScore * weights.transfers;

    return {
      travelTime: Math.round(travelTime),
      reliability: Math.round(reliability),
      cost: Math.round(costScore),
      walking: Math.round(walking),
      transfers: Math.round(transferScore),
      raceDaySuitability: Math.round(raceDaySuitability),
      finalScore: Math.round(finalScore * 10) / 10,
    };
  });
}

/**
 * Human-readable, hedged explanation of why a route ranks where it does.
 * Never presents the score as guaranteed truth.
 */
export function explainRoute(
  route: ScorableRoute & { containsCuratedLeg?: boolean },
  breakdown: RouteScoreBreakdown,
  isTopRanked: boolean,
): string {
  const parts: string[] = [];

  if (isTopRanked) {
    if (breakdown.raceDaySuitability >= 80 && route.containsCuratedLeg) {
      parts.push("Recommended because it uses a race-day shuttle that avoids the most congested approach roads");
    } else if (breakdown.travelTime >= 90) {
      parts.push("Recommended as the quickest option based on current estimates");
    } else if (breakdown.reliability >= 80) {
      parts.push("Recommended for its more predictable travel time");
    } else {
      parts.push("Balances travel time, reliability and walking better than the alternatives");
    }
  } else {
    if (breakdown.travelTime >= 90 && breakdown.walking < 50) {
      parts.push("Fastest option, but includes a longer final walk");
    } else if (breakdown.transfers >= 90 && breakdown.travelTime < 70) {
      parts.push("Slightly slower, but has fewer transfers");
    } else if (breakdown.cost >= 90 && breakdown.reliability < 60) {
      parts.push("Estimated cost is lower, but service frequency may be limited");
    } else if (breakdown.walking >= 90) {
      parts.push("Requires the least walking — a good option for travellers carrying luggage");
    } else {
      parts.push("A workable alternative depending on your priorities");
    }
  }

  if (route.transfers === 0) parts.push("no transfers needed");
  else if (route.transfers === 1) parts.push("one transfer");
  else parts.push(`${route.transfers} transfers`);

  return parts.join("; ") + ". Estimates only — conditions vary on race day.";
}
