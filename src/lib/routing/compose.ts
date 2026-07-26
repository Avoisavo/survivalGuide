import type { RouteKind, RouteLeg, RouteOption, TravelMode } from "@/types/route";

export interface ComposeOptions {
  id: string;
  kind: RouteKind;
  title: string;
  travelMode: TravelMode;
  departureTime?: string;
  reliabilityScore?: number;
  raceDaySuitabilityScore?: number;
  extraWarnings?: string[];
}

const WALKING_MODES: ReadonlySet<string> = new Set(["walk"]);
const VEHICLE_BOARDING_MODES: ReadonlySet<string> = new Set([
  "transit",
  "train",
  "bus",
  "shuttle",
]);

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

/**
 * Combine an ordered list of route legs (Google-generated and/or curated)
 * into a single RouteOption with aggregate duration, walking, cost,
 * transfers, arrival time, reliability and warnings.
 */
export function composeRoute(legs: RouteLeg[], options: ComposeOptions): RouteOption {
  if (legs.length === 0) {
    throw new Error("composeRoute requires at least one leg");
  }

  const totalDurationMinutes = legs.reduce((sum, l) => sum + l.durationMinutes, 0);

  const totalWalkingMeters = legs
    .filter((l) => WALKING_MODES.has(l.mode))
    .reduce((sum, l) => sum + (l.distanceMeters ?? l.durationMinutes * 80), 0);

  const totalWalkingMinutes = legs
    .filter((l) => WALKING_MODES.has(l.mode))
    .reduce((sum, l) => sum + l.durationMinutes, 0);

  const distances = legs.map((l) => l.distanceMeters).filter((d): d is number => d !== undefined);
  const totalDistanceMeters = distances.length
    ? distances.reduce((a, b) => a + b, 0)
    : undefined;

  // A transfer is each vehicle boarding after the first.
  const boardings = legs.filter((l) => VEHICLE_BOARDING_MODES.has(l.mode)).length;
  const transfers = Math.max(0, boardings - 1);

  const costLegs = legs.filter(
    (l) => l.estimatedCostMin !== undefined || l.estimatedCostMax !== undefined,
  );
  const estimatedCostMin = costLegs.length
    ? costLegs.reduce((sum, l) => sum + (l.estimatedCostMin ?? l.estimatedCostMax ?? 0), 0)
    : undefined;
  const estimatedCostMax = costLegs.length
    ? costLegs.reduce((sum, l) => sum + (l.estimatedCostMax ?? l.estimatedCostMin ?? 0), 0)
    : undefined;
  const currency = costLegs.find((l) => l.currency)?.currency;

  const departureTime = options.departureTime ?? legs[0].departureTime;
  const arrivalTime = departureTime
    ? addMinutes(departureTime, totalDurationMinutes)
    : undefined;

  // Stamp per-leg departure/arrival if a departure anchor exists.
  let cursor = departureTime;
  const stampedLegs = legs.map((leg) => {
    if (!cursor) return leg;
    const legDeparture = leg.departureTime ?? cursor;
    const legArrival = addMinutes(legDeparture, leg.durationMinutes);
    cursor = legArrival;
    return { ...leg, departureTime: legDeparture, arrivalTime: legArrival };
  });

  const containsCuratedLeg = legs.some((l) => l.source === "curated");
  const warnings = [
    ...legs.map((l) => l.warning).filter((w): w is string => Boolean(w)),
    ...(options.extraWarnings ?? []),
  ];
  if (containsCuratedLeg) {
    warnings.push("This route contains a manually curated event-shuttle leg.");
  }

  // Reliability defaults: curated legs carry event-specific uncertainty,
  // pure driving is traffic-dependent, transit is schedule-bound.
  const reliabilityScore =
    options.reliabilityScore ??
    (containsCuratedLeg ? 70 : options.travelMode === "drive" ? 60 : 75);

  const raceDaySuitabilityScore =
    options.raceDaySuitabilityScore ?? (containsCuratedLeg ? 85 : 50);

  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    travelMode: options.travelMode,
    legs: stampedLegs,
    totalDurationMinutes,
    totalDistanceMeters,
    totalWalkingMeters: Math.round(totalWalkingMeters),
    totalWalkingMinutes,
    transfers,
    estimatedCostMin,
    estimatedCostMax,
    currency,
    departureTime,
    arrivalTime,
    reliabilityScore,
    raceDaySuitabilityScore,
    score: {
      travelTime: 0,
      reliability: 0,
      cost: 0,
      walking: 0,
      transfers: 0,
      raceDaySuitability: 0,
      finalScore: 0,
    },
    explanation: "",
    warnings: [...new Set(warnings)],
    containsCuratedLeg,
    polyline: legs.find((l) => l.polyline)?.polyline,
  };
}

/**
 * Assign each alternative a unique, data-backed card label. Curated
 * race-day routes keep their label; the quickest remaining route becomes
 * "fastest"; the rest are labelled by their strongest attribute — and
 * "cheapest" is only ever used when cost data actually exists.
 */
export function assignRouteKinds(routes: RouteOption[]): RouteOption[] {
  if (routes.length === 0) return [];
  const result = routes.map((r) => ({ ...r }));
  const unassigned = new Set(result.filter((r) => r.kind !== "race-day"));

  const take = (
    candidates: RouteOption[],
    compare: (a: RouteOption, b: RouteOption) => number,
    kind: RouteOption["kind"],
  ) => {
    if (candidates.length === 0) return;
    const winner = [...candidates].sort(compare)[0];
    winner.kind = kind;
    unassigned.delete(winner);
  };

  take(
    [...unassigned],
    (a, b) => a.totalDurationMinutes - b.totalDurationMinutes,
    "fastest",
  );
  take(
    [...unassigned].filter((r) => r.estimatedCostMin !== undefined),
    (a, b) => (a.estimatedCostMin ?? 0) - (b.estimatedCostMin ?? 0),
    "cheapest",
  );
  take([...unassigned], (a, b) => a.totalWalkingMeters - b.totalWalkingMeters, "least-walking");
  take([...unassigned], (a, b) => a.transfers - b.transfers, "fewest-transfers");

  return result;
}
