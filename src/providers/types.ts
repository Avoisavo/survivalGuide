import type { LatLng, Place, PlaceCategory } from "@/types/place";
import type {
  RouteEndpoint,
  RouteLeg,
  RouteMatrixCell,
  RoutePreferences,
  TravelMode,
} from "@/types/route";

/** Candidate returned by autocomplete / text search against an external provider. */
export interface ExternalPlaceCandidate {
  externalId: string;
  name: string;
  address?: string;
  location?: LatLng;
}

export interface ExternalPlaceDetails {
  externalId: string;
  name: string;
  address?: string;
  location: LatLng;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  openNow?: boolean;
  closingTime?: string;
  types?: string[];
}

export interface ExternalNearbyOptions {
  center: LatLng;
  radiusMeters: number;
  category?: PlaceCategory;
  limit?: number;
}

/**
 * PlacesProvider wraps an external places service (Google Places for the
 * MVP). All calls are server-side only.
 */
export interface PlacesProvider {
  searchText(query: string, bias?: LatLng): Promise<ExternalPlaceCandidate[]>;
  getDetails(externalId: string): Promise<ExternalPlaceDetails | null>;
  searchNearby(options: ExternalNearbyOptions): Promise<ExternalPlaceDetails[]>;
}

export interface ProviderRoute {
  legs: RouteLeg[];
  totalDurationMinutes: number;
  totalDistanceMeters?: number;
  polyline?: string;
  hasTrafficDelay?: boolean;
}

export interface ComputeRoutesOptions {
  origin: RouteEndpoint;
  destination: RouteEndpoint;
  travelMode: Exclude<TravelMode, "recommended" | "mixed">;
  departureTime?: string;
  preferences?: RoutePreferences;
  alternatives?: boolean;
}

export interface ComputeMatrixOptions {
  origins: RouteEndpoint[];
  destinations: RouteEndpoint[];
  travelMode: Exclude<TravelMode, "recommended" | "mixed">;
  departureTime?: string;
}

/**
 * RoutingProvider wraps an external routing service (Google Routes API for
 * the MVP). All calls are server-side only.
 */
export interface RoutingProvider {
  computeRoutes(options: ComputeRoutesOptions): Promise<ProviderRoute[]>;
  computeRouteMatrix(options: ComputeMatrixOptions): Promise<RouteMatrixCell[]>;
}

/**
 * PlaceStore abstracts the curated internal database (Supabase for the MVP,
 * or in-memory demo data when no keys are configured).
 */
export interface PlaceStore {
  listPlaces(filter: {
    category?: PlaceCategory;
    bounds?: { north: number; south: number; east: number; west: number };
    verified?: boolean;
    q?: string;
    limit: number;
    offset: number;
  }): Promise<Place[]>;
  getPlaceByIdOrSlug(idOrSlug: string): Promise<Place | null>;
  listNearby(options: {
    center: LatLng;
    radiusMeters: number;
    category?: PlaceCategory;
    limit: number;
  }): Promise<(Place & { distanceMeters: number })[]>;
}
