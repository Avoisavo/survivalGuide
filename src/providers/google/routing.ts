import "server-only";
import { getServerEnv } from "@/config/env";
import type { RouteLeg, RouteMatrixCell } from "@/types/route";
import type {
  ComputeMatrixOptions,
  ComputeRoutesOptions,
  ProviderRoute,
  RoutingProvider,
} from "@/providers/types";

const ROUTES_BASE = "https://routes.googleapis.com";
const REQUEST_TIMEOUT_MS = 10_000;

const ROUTES_FIELD_MASK =
  "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.duration,routes.legs.distanceMeters,routes.legs.polyline.encodedPolyline,routes.legs.steps.travelMode,routes.legs.steps.staticDuration,routes.legs.steps.distanceMeters,routes.legs.steps.transitDetails,routes.travelAdvisory";
const MATRIX_FIELD_MASK = "originIndex,destinationIndex,duration,distanceMeters,condition";

const TRAVEL_MODE_MAP: Record<string, string> = {
  drive: "DRIVE",
  "ride-hailing": "DRIVE",
  transit: "TRANSIT",
  walk: "WALK",
};

interface GoogleWaypoint {
  placeId?: string;
  location?: { latLng: { latitude: number; longitude: number } };
}

function toWaypoint(endpoint: {
  placeId?: string;
  lat?: number;
  lng?: number;
}): GoogleWaypoint {
  if (endpoint.placeId) return { placeId: endpoint.placeId };
  return {
    location: { latLng: { latitude: endpoint.lat ?? 0, longitude: endpoint.lng ?? 0 } },
  };
}

function parseDurationSeconds(duration: string | undefined): number {
  if (!duration) return 0;
  const match = /^(\d+(?:\.\d+)?)s$/.exec(duration);
  return match ? Number(match[1]) : 0;
}

interface GoogleStep {
  travelMode?: string;
  staticDuration?: string;
  distanceMeters?: number;
  transitDetails?: {
    transitLine?: { name?: string; vehicle?: { type?: string } };
    stopDetails?: {
      departureStop?: { name?: string };
      arrivalStop?: { name?: string };
    };
  };
}

interface GoogleRouteLeg {
  duration?: string;
  distanceMeters?: number;
  polyline?: { encodedPolyline?: string };
  steps?: GoogleStep[];
}

interface GoogleRoute {
  duration?: string;
  distanceMeters?: number;
  polyline?: { encodedPolyline?: string };
  legs?: GoogleRouteLeg[];
  travelAdvisory?: { tollInfo?: unknown };
}

async function routesFetch<T>(path: string, body: unknown, fieldMask: string): Promise<T> {
  const { GOOGLE_MAPS_SERVER_API_KEY } = getServerEnv();
  if (!GOOGLE_MAPS_SERVER_API_KEY) {
    throw new Error("GOOGLE_MAPS_SERVER_API_KEY is not configured");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${ROUTES_BASE}${path}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_SERVER_API_KEY,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Routes API ${response.status}: ${text.slice(0, 500)}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function stepToLegMode(step: GoogleStep): RouteLeg["mode"] {
  switch (step.travelMode) {
    case "WALK":
      return "walk";
    case "TRANSIT": {
      const vehicle = step.transitDetails?.transitLine?.vehicle?.type;
      if (vehicle === "BUS") return "bus";
      if (vehicle && ["HEAVY_RAIL", "COMMUTER_TRAIN", "SUBWAY", "RAIL", "METRO_RAIL", "MONORAIL"].includes(vehicle)) {
        return "train";
      }
      return "transit";
    }
    default:
      return "drive";
  }
}

function googleRouteToProviderRoute(
  route: GoogleRoute,
  options: ComputeRoutesOptions,
  index: number,
): ProviderRoute {
  const originName = options.origin.name ?? "Origin";
  const destinationName = options.destination.name ?? "Destination";
  const legs: RouteLeg[] = [];

  const googleLeg = route.legs?.[0];
  const steps = googleLeg?.steps ?? [];
  const isTransit = options.travelMode === "transit";

  if (isTransit && steps.length > 0) {
    // Collapse consecutive same-mode steps into readable legs.
    let current: RouteLeg | null = null;
    let stepIndex = 0;
    for (const step of steps) {
      const mode = stepToLegMode(step);
      const minutes = Math.max(1, Math.round(parseDurationSeconds(step.staticDuration) / 60));
      const lineName = step.transitDetails?.transitLine?.name;
      const fromStop = step.transitDetails?.stopDetails?.departureStop?.name;
      const toStop = step.transitDetails?.stopDetails?.arrivalStop?.name;

      if (current && current.mode === mode && mode === "walk") {
        current.durationMinutes += minutes;
        current.distanceMeters = (current.distanceMeters ?? 0) + (step.distanceMeters ?? 0);
      } else {
        if (current) legs.push(current);
        current = {
          id: `g-${index}-${stepIndex}`,
          mode,
          title:
            mode === "walk"
              ? "Walk"
              : lineName
                ? `Board ${lineName}`
                : mode === "bus"
                  ? "Board bus"
                  : "Board train",
          description:
            mode === "walk"
              ? "Walking segment"
              : [fromStop && `From ${fromStop}`, toStop && `to ${toStop}`]
                  .filter(Boolean)
                  .join(" ") || "Transit segment",
          originName: fromStop ?? (legs.length === 0 ? originName : "Previous stop"),
          destinationName: toStop ?? destinationName,
          durationMinutes: minutes,
          distanceMeters: step.distanceMeters,
          source: "google",
        };
      }
      stepIndex += 1;
    }
    if (current) legs.push(current);
  }

  if (legs.length === 0) {
    const mode: RouteLeg["mode"] =
      options.travelMode === "walk"
        ? "walk"
        : options.travelMode === "ride-hailing"
          ? "ride-hailing"
          : options.travelMode === "transit"
            ? "transit"
            : "drive";
    legs.push({
      id: `g-${index}-0`,
      mode,
      title:
        mode === "walk"
          ? `Walk to ${destinationName}`
          : mode === "ride-hailing"
            ? `Ride to ${destinationName}`
            : mode === "transit"
              ? `Transit to ${destinationName}`
              : `Drive to ${destinationName}`,
      description: `${originName} to ${destinationName}`,
      originName,
      destinationName,
      durationMinutes: Math.max(1, Math.round(parseDurationSeconds(route.duration) / 60)),
      distanceMeters: route.distanceMeters,
      polyline: route.polyline?.encodedPolyline,
      source: "google",
    });
  }

  return {
    legs,
    totalDurationMinutes: Math.max(1, Math.round(parseDurationSeconds(route.duration) / 60)),
    totalDistanceMeters: route.distanceMeters,
    polyline: route.polyline?.encodedPolyline,
  };
}

export class GoogleRoutingProvider implements RoutingProvider {
  async computeRoutes(options: ComputeRoutesOptions): Promise<ProviderRoute[]> {
    const travelMode = TRAVEL_MODE_MAP[options.travelMode] ?? "DRIVE";
    const body: Record<string, unknown> = {
      origin: toWaypoint(options.origin),
      destination: toWaypoint(options.destination),
      travelMode,
      computeAlternativeRoutes: options.alternatives ?? false,
      languageCode: "en",
      units: "METRIC",
    };
    if (travelMode === "DRIVE") {
      body.routingPreference = "TRAFFIC_AWARE";
      if (options.preferences?.avoidTolls) {
        body.routeModifiers = { avoidTolls: true };
      }
    }
    if (options.departureTime && new Date(options.departureTime) > new Date()) {
      body.departureTime = options.departureTime;
    }

    const data = await routesFetch<{ routes?: GoogleRoute[] }>(
      "/directions/v2:computeRoutes",
      body,
      ROUTES_FIELD_MASK,
    );
    return (data.routes ?? []).map((r, i) => googleRouteToProviderRoute(r, options, i));
  }

  async computeRouteMatrix(options: ComputeMatrixOptions): Promise<RouteMatrixCell[]> {
    const travelMode = TRAVEL_MODE_MAP[options.travelMode] ?? "DRIVE";
    const body: Record<string, unknown> = {
      origins: options.origins.map((o) => ({ waypoint: toWaypoint(o) })),
      destinations: options.destinations.map((d) => ({ waypoint: toWaypoint(d) })),
      travelMode,
    };
    if (travelMode === "DRIVE") {
      body.routingPreference = "TRAFFIC_AWARE";
      if (options.departureTime && new Date(options.departureTime) > new Date()) {
        body.departureTime = options.departureTime;
      }
    }

    const data = await routesFetch<
      Array<{
        originIndex?: number;
        destinationIndex?: number;
        duration?: string;
        distanceMeters?: number;
        condition?: string;
      }>
    >("/distanceMatrix/v2:computeRouteMatrix", body, MATRIX_FIELD_MASK);

    return data.map((cell) => ({
      originIndex: cell.originIndex ?? 0,
      destinationIndex: cell.destinationIndex ?? 0,
      durationMinutes: cell.duration
        ? Math.round(parseDurationSeconds(cell.duration) / 60)
        : undefined,
      distanceMeters: cell.distanceMeters,
      status: cell.condition === "ROUTE_EXISTS" ? "ok" : "unavailable",
    }));
  }
}
