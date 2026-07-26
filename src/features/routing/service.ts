import "server-only";
import { RACE_DAY_WARNING } from "@/config/site";
import { haversineMeters } from "@/lib/geo/distance";
import { assignRouteKinds, composeRoute } from "@/lib/routing/compose";
import { explainRoute, scoreRoutes } from "@/lib/routing/scoring";
import {
  bucketDepartureTime,
  getCachedRoute,
  routeCacheKey,
  setCachedRoute,
} from "@/lib/api/route-cache";
import { getRoutingProvider, usingDemoData } from "@/providers";
import type { RouteRequestInput } from "@/lib/validation/routes";
import type {
  RouteLeg,
  RouteOption,
  RouteResponse,
  TravelMode,
} from "@/types/route";
import { getActiveRouteTemplates, type RouteTemplate } from "./templates";

const RIDE_HAILING_BASE_MYR = 5;
const RIDE_HAILING_PER_KM_MIN = 1.2;
const RIDE_HAILING_PER_KM_MAX = 2.2;

/** How close an origin must be to a template's start to use it directly. */
const TEMPLATE_DIRECT_RADIUS_METERS = 800;
/** Max distance to a template start worth connecting to with a first-mile leg. */
const TEMPLATE_CONNECT_RADIUS_METERS = 25_000;

type ConcreteMode = Exclude<TravelMode, "recommended" | "mixed">;

function withRideHailingCost(legs: RouteLeg[]): RouteLeg[] {
  return legs.map((leg) => {
    if (leg.mode !== "ride-hailing" || leg.estimatedCostMin !== undefined) return leg;
    const km = (leg.distanceMeters ?? leg.durationMinutes * 600) / 1000;
    return {
      ...leg,
      estimatedCostMin: Math.round(RIDE_HAILING_BASE_MYR + km * RIDE_HAILING_PER_KM_MIN),
      estimatedCostMax: Math.round(RIDE_HAILING_BASE_MYR + km * RIDE_HAILING_PER_KM_MAX),
      currency: "MYR",
      warning: "Cost is an estimate and may change. Surge pricing is common on race day.",
    };
  });
}

async function computeProviderRoutes(
  request: RouteRequestInput,
  mode: ConcreteMode,
  alternatives: boolean,
): Promise<RouteOption[]> {
  const provider = getRoutingProvider();
  const cacheKey = routeCacheKey({
    o: request.origin,
    d: request.destination,
    mode,
    t: bucketDepartureTime(request.departureTime),
    p: request.preferences ?? {},
    alternatives,
  });

  const cached = getCachedRoute<RouteOption[]>(cacheKey);
  if (cached) return cached;

  let providerRoutes;
  try {
    providerRoutes = await provider.computeRoutes({
      origin: request.origin,
      destination: request.destination,
      travelMode: mode,
      departureTime: request.departureTime,
      preferences: request.preferences,
      alternatives,
    });
  } catch (error) {
    console.error(`[routing] provider failed for mode ${mode}:`, error);
    return [];
  }

  const options = providerRoutes.map((route, index) => {
    const legs = mode === "ride-hailing" ? withRideHailingCost(route.legs) : route.legs;
    const titles: Record<ConcreteMode, string> = {
      drive: index === 0 ? "Drive" : "Drive (alternative)",
      transit: "Public transport",
      walk: "Walk",
      "ride-hailing": "Ride-hailing",
    };
    const composed = composeRoute(legs, {
      id: `${mode}-${index}`,
      kind: "fastest",
      title: titles[mode],
      travelMode: mode,
      departureTime: request.departureTime,
      reliabilityScore: mode === "drive" || mode === "ride-hailing" ? 60 : 75,
      raceDaySuitabilityScore:
        mode === "drive" ? 40 : mode === "ride-hailing" ? 50 : mode === "transit" ? 65 : 55,
      extraWarnings: mode === "drive" || mode === "ride-hailing" ? [RACE_DAY_WARNING] : [],
    });
    composed.polyline = route.polyline ?? composed.polyline;
    if (route.totalDistanceMeters !== undefined) {
      composed.totalDistanceMeters = route.totalDistanceMeters;
    }
    return composed;
  });

  setCachedRoute(cacheKey, options);
  return options;
}

function templateToLegs(template: RouteTemplate): RouteLeg[] {
  return template.steps.map((step, index) => ({
    ...step,
    id: `tpl-${template.id}-${index}`,
    source: "curated" as const,
  }));
}

/**
 * Build a mixed route: provider-generated first-mile legs to the template's
 * start point, then the curated race-day legs (event shuttle, final walk).
 */
async function buildMixedRoutes(
  request: RouteRequestInput,
  originLatLng: { lat: number; lng: number } | null,
): Promise<RouteOption[]> {
  const templates = await getActiveRouteTemplates();
  if (templates.length === 0 || !originLatLng) return [];

  const results: RouteOption[] = [];

  for (const template of templates) {
    const distanceToStart = haversineMeters(originLatLng, template.originLocation);
    if (distanceToStart > TEMPLATE_CONNECT_RADIUS_METERS) continue;

    let firstMileLegs: RouteLeg[] = [];
    if (distanceToStart > TEMPLATE_DIRECT_RADIUS_METERS) {
      const connectorMode: ConcreteMode = distanceToStart < 1600 ? "walk" : "transit";
      const connectors = await computeProviderRoutes(
        {
          ...request,
          destination: {
            lat: template.originLocation.lat,
            lng: template.originLocation.lng,
            name: template.originName,
          },
          travelMode: connectorMode,
        },
        connectorMode,
        false,
      );
      if (connectors.length === 0) continue;
      firstMileLegs = connectors[0].legs;
    }

    const legs = [...firstMileLegs, ...templateToLegs(template)];
    const mixed = composeRoute(legs, {
      id: `mixed-${template.slug}`,
      kind: "race-day",
      title: "Race-day route",
      travelMode: "mixed",
      departureTime: request.departureTime,
      reliabilityScore: template.reliabilityScore,
      raceDaySuitabilityScore: template.raceDaySuitabilityScore,
      extraWarnings: [
        ...(template.warning ? [template.warning] : []),
        ...(template.lastVerifiedAt
          ? [
              `Transport details last verified on ${new Date(template.lastVerifiedAt).toLocaleDateString("en-MY", { year: "numeric", month: "long", day: "numeric" })}.`,
            ]
          : []),
      ],
    });
    results.push(mixed);
  }
  return results;
}

export async function planRoutes(request: RouteRequestInput): Promise<RouteResponse> {
  const isDemo = usingDemoData();
  const originLatLng =
    request.origin.lat !== undefined && request.origin.lng !== undefined
      ? { lat: request.origin.lat, lng: request.origin.lng }
      : null;

  const candidates: RouteOption[] = [];

  if (request.travelMode === "recommended" || request.travelMode === "mixed") {
    const [drive, transit, rideHailing, mixed] = await Promise.all([
      computeProviderRoutes(request, "drive", true),
      computeProviderRoutes(request, "transit", false),
      computeProviderRoutes(request, "ride-hailing", false),
      buildMixedRoutes(request, originLatLng),
    ]);
    candidates.push(...mixed, ...drive, ...transit, ...rideHailing);
  } else {
    const direct = await computeProviderRoutes(
      request,
      request.travelMode,
      request.travelMode === "drive",
    );
    candidates.push(...direct);
    if (request.travelMode === "transit") {
      candidates.push(...(await buildMixedRoutes(request, originLatLng)));
    }
  }

  if (candidates.length === 0) {
    return {
      routes: [],
      isDemo,
      advisories: ["No verified public-transport route is currently available."],
    };
  }

  // Preference adjustments shift weight toward what the traveller asked for.
  const weights = { travelTime: 0.35, reliability: 0.25, raceDaySuitability: 0.15, cost: 0.1, walking: 0.1, transfers: 0.05 };
  if (request.preferences?.lessWalking) {
    weights.walking = 0.25;
    weights.travelTime = 0.25;
    weights.cost = 0.05;
  }
  if (request.preferences?.fewerTransfers) {
    weights.transfers = 0.2;
    weights.travelTime = 0.25;
  }

  const breakdowns = scoreRoutes(candidates, weights);
  const scored = candidates.map((route, i) => ({ ...route, score: breakdowns[i] }));
  scored.sort((a, b) => b.score.finalScore - a.score.finalScore);

  const withKinds = assignRouteKinds(scored);
  const final = withKinds.map((route, index) => ({
    ...route,
    isDemo,
    explanation: explainRoute(route, route.score, index === 0),
  }));

  // Limit alternatives so the panel stays scannable.
  const routes = final.slice(0, 5);

  return {
    routes,
    isDemo,
    advisories: [RACE_DAY_WARNING],
  };
}
