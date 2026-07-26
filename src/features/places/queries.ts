"use client";

import { useQuery } from "@tanstack/react-query";
import type { Advisory } from "@/types/advisory";
import type { Deal } from "@/types/deal";
import type { MapBounds, NearbyPlace, Place, PlaceCategory } from "@/types/place";

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function usePlaces(filter: {
  category?: PlaceCategory;
  bounds?: MapBounds;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["places", filter.category ?? "all", filter.bounds ?? null],
    enabled: filter.enabled !== false,
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      if (filter.category) params.set("category", filter.category);
      if (filter.bounds) {
        params.set("north", String(filter.bounds.north));
        params.set("south", String(filter.bounds.south));
        params.set("east", String(filter.bounds.east));
        params.set("west", String(filter.bounds.west));
      }
      return fetchJson<{ items: Place[]; isDemo: boolean }>(
        `/api/places?${params.toString()}`,
        signal,
      );
    },
  });
}

export function usePlaceDetails(idOrSlug: string | null) {
  return useQuery({
    queryKey: ["place", idOrSlug],
    enabled: Boolean(idOrSlug),
    queryFn: ({ signal }) =>
      fetchJson<{ place: Place; isDemo: boolean }>(
        `/api/places/${encodeURIComponent(idOrSlug!)}`,
        signal,
      ),
  });
}

export function useNearbyPlaces(options: {
  center: { lat: number; lng: number } | null;
  radius: number;
  category?: PlaceCategory;
}) {
  return useQuery({
    queryKey: ["nearby", options.center, options.radius, options.category ?? "all"],
    enabled: Boolean(options.center),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        lat: String(options.center!.lat),
        lng: String(options.center!.lng),
        radius: String(options.radius),
      });
      if (options.category) params.set("category", options.category);
      return fetchJson<{ items: NearbyPlace[]; isDemo: boolean }>(
        `/api/places/nearby?${params.toString()}`,
        signal,
      );
    },
  });
}

export function useDeals(placeId?: string) {
  return useQuery({
    queryKey: ["deals", placeId ?? "all"],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      if (placeId) params.set("placeId", placeId);
      return fetchJson<{ items: Deal[]; isDemo: boolean }>(
        `/api/deals?${params.toString()}`,
        signal,
      );
    },
  });
}

export function useAdvisories(placeId?: string) {
  return useQuery({
    queryKey: ["advisories", placeId ?? "all"],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      if (placeId) params.set("placeId", placeId);
      return fetchJson<{ items: Advisory[]; isDemo: boolean }>(
        `/api/advisories?${params.toString()}`,
        signal,
      );
    },
  });
}

export interface PlaceSearchCandidate {
  externalId: string;
  name: string;
  address?: string;
  location?: { lat: number; lng: number };
}

export function usePlaceSearch(query: string) {
  return useQuery({
    queryKey: ["place-search", query],
    enabled: query.trim().length >= 2,
    staleTime: 60_000,
    queryFn: ({ signal }) =>
      fetchJson<{ items: PlaceSearchCandidate[]; isDemo: boolean }>(
        `/api/places/search?q=${encodeURIComponent(query.trim())}`,
        signal,
      ),
  });
}
