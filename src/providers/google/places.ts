import "server-only";
import { getServerEnv } from "@/config/env";
import type { LatLng, PlaceCategory } from "@/types/place";
import type {
  ExternalNearbyOptions,
  ExternalPlaceCandidate,
  ExternalPlaceDetails,
  PlacesProvider,
} from "@/providers/types";

const PLACES_BASE = "https://places.googleapis.com/v1";
const REQUEST_TIMEOUT_MS = 8000;

/** Field masks keep Places API (New) billing at the lowest applicable SKU. */
const SEARCH_FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.location";
const DETAILS_FIELD_MASK =
  "id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel,currentOpeningHours.openNow,types";
const NEARBY_FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours.openNow,places.types";

const CATEGORY_TO_GOOGLE_TYPES: Partial<Record<PlaceCategory, string[]>> = {
  hotel: ["lodging"],
  food: ["restaurant", "cafe", "meal_takeaway"],
  transit: ["train_station", "subway_station", "bus_station", "transit_station"],
  essential: ["pharmacy", "convenience_store", "atm", "gas_station", "hospital"],
};

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  currentOpeningHours?: { openNow?: boolean };
  types?: string[];
}

async function googleFetch<T>(
  url: string,
  init: RequestInit & { fieldMask: string },
): Promise<T> {
  const { GOOGLE_MAPS_SERVER_API_KEY } = getServerEnv();
  if (!GOOGLE_MAPS_SERVER_API_KEY) {
    throw new Error("GOOGLE_MAPS_SERVER_API_KEY is not configured");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_SERVER_API_KEY,
        "X-Goog-FieldMask": init.fieldMask,
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Places API ${response.status}: ${body.slice(0, 500)}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function toDetails(place: GooglePlace): ExternalPlaceDetails {
  return {
    externalId: place.id,
    name: place.displayName?.text ?? "Unknown place",
    address: place.formattedAddress,
    location: {
      lat: place.location?.latitude ?? 0,
      lng: place.location?.longitude ?? 0,
    },
    rating: place.rating,
    reviewCount: place.userRatingCount,
    priceLevel: place.priceLevel ? PRICE_LEVEL_MAP[place.priceLevel] : undefined,
    openNow: place.currentOpeningHours?.openNow,
    types: place.types,
  };
}

export class GooglePlacesProvider implements PlacesProvider {
  async searchText(query: string, bias?: LatLng): Promise<ExternalPlaceCandidate[]> {
    const body: Record<string, unknown> = { textQuery: query, maxResultCount: 8 };
    if (bias) {
      body.locationBias = {
        circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: 50000 },
      };
    }
    const data = await googleFetch<{ places?: GooglePlace[] }>(
      `${PLACES_BASE}/places:searchText`,
      { method: "POST", body: JSON.stringify(body), fieldMask: SEARCH_FIELD_MASK },
    );
    return (data.places ?? []).map((p) => ({
      externalId: p.id,
      name: p.displayName?.text ?? "Unknown place",
      address: p.formattedAddress,
      location: p.location
        ? { lat: p.location.latitude, lng: p.location.longitude }
        : undefined,
    }));
  }

  async getDetails(externalId: string): Promise<ExternalPlaceDetails | null> {
    try {
      const data = await googleFetch<GooglePlace>(
        `${PLACES_BASE}/places/${encodeURIComponent(externalId)}`,
        { method: "GET", fieldMask: DETAILS_FIELD_MASK },
      );
      return toDetails(data);
    } catch (error) {
      console.error("[google-places] getDetails failed:", error);
      return null;
    }
  }

  async searchNearby(options: ExternalNearbyOptions): Promise<ExternalPlaceDetails[]> {
    const includedTypes = options.category
      ? CATEGORY_TO_GOOGLE_TYPES[options.category]
      : undefined;
    const body: Record<string, unknown> = {
      maxResultCount: Math.min(options.limit ?? 20, 20),
      locationRestriction: {
        circle: {
          center: { latitude: options.center.lat, longitude: options.center.lng },
          radius: options.radiusMeters,
        },
      },
    };
    if (includedTypes) body.includedTypes = includedTypes;
    const data = await googleFetch<{ places?: GooglePlace[] }>(
      `${PLACES_BASE}/places:searchNearby`,
      { method: "POST", body: JSON.stringify(body), fieldMask: NEARBY_FIELD_MASK },
    );
    return (data.places ?? []).map(toDetails);
  }
}
