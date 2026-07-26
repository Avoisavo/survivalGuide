"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  RouteEndpoint,
  RouteMatrixResponse,
  RoutePreferences,
  RouteResponse,
  TravelMode,
} from "@/types/route";

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error?.message ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export interface RoutePlanInput {
  origin: RouteEndpoint | null;
  destination: RouteEndpoint | null;
  departureTime?: string;
  travelMode: TravelMode;
  preferences?: RoutePreferences;
}

function endpointReady(endpoint: RouteEndpoint | null): endpoint is RouteEndpoint {
  return (
    endpoint !== null &&
    (endpoint.placeId !== undefined ||
      (endpoint.lat !== undefined && endpoint.lng !== undefined))
  );
}

export function useRoutePlan(input: RoutePlanInput) {
  const ready = endpointReady(input.origin) && endpointReady(input.destination);
  return useQuery({
    queryKey: [
      "routes",
      input.origin,
      input.destination,
      input.travelMode,
      input.departureTime ?? "now",
      input.preferences ?? {},
    ],
    enabled: ready,
    staleTime: 4 * 60_000,
    queryFn: ({ signal }) =>
      postJson<RouteResponse>(
        "/api/routes",
        {
          origin: input.origin,
          destination: input.destination,
          departureTime: input.departureTime,
          travelMode: input.travelMode,
          preferences: input.preferences,
        },
        signal,
      ),
  });
}

export function useRouteMatrix(input: {
  origins: RouteEndpoint[];
  destinations: RouteEndpoint[];
  travelMode: "drive" | "transit" | "walk" | "ride-hailing";
  departureTime?: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ["route-matrix", input.origins, input.destinations, input.travelMode],
    enabled: input.enabled && input.origins.length > 0,
    staleTime: 4 * 60_000,
    queryFn: ({ signal }) =>
      postJson<RouteMatrixResponse>(
        "/api/routes/matrix",
        {
          origins: input.origins,
          destinations: input.destinations,
          travelMode: input.travelMode,
          departureTime: input.departureTime,
        },
        signal,
      ),
  });
}
