export const SITE_NAME = "Sepang Race Map";
export const SITE_DESCRIPTION =
  "Unofficial map-first travel and transport planner for race weekend at Sepang International Circuit.";

export const CIRCUIT = {
  slug: "sepang-international-circuit",
  name: "Sepang International Circuit",
  lat: 2.760889,
  lng: 101.738056,
  googlePlaceId: "ChIJv9orJULIzTERj5trHKcy_V4",
} as const;

export const KLIA = {
  slug: "klia-terminal-1",
  name: "KLIA Terminal 1",
  lat: 2.743333,
  lng: 101.698056,
} as const;

/** Initial viewport covering Sepang, KLIA, Putrajaya and the southern Klang Valley. */
export const DEFAULT_MAP_CENTER = { lat: 2.83, lng: 101.71 } as const;
export const DEFAULT_MAP_ZOOM = 11;

export const DEFAULT_MAP_BOUNDS = {
  north: 3.05,
  south: 2.6,
  east: 101.95,
  west: 101.45,
} as const;

/** Hard cap for bounded place searches, in degrees of lat/lng span. */
export const MAX_BOUNDS_SPAN_DEGREES = 1.5;

export const NEARBY_RADIUS_PRESETS_METERS = [500, 1000, 3000, 5000] as const;
export type NearbyRadiusPreset = (typeof NEARBY_RADIUS_PRESETS_METERS)[number];

export const MAX_COMPARE_HOTELS = 4;
export const PLACES_PAGE_LIMIT = 60;
export const NEARBY_RESULT_LIMIT = 30;

/** Route cache TTL. Departure times are bucketed so near-identical requests share a cache entry. */
export const ROUTE_CACHE_TTL_MS = 5 * 60 * 1000;
export const ROUTE_DEPARTURE_BUCKET_MINUTES = 15;

/** Rate limiting for expensive route endpoints (per IP, sliding window). */
export const ROUTE_RATE_LIMIT = { windowMs: 60_000, max: 30 } as const;
export const MATRIX_RATE_LIMIT = { windowMs: 60_000, max: 10 } as const;

export const RACE_DAY_WARNING =
  "Race-day travel times may be significantly longer. Allow additional time for security checks and walking.";

export const COST_ESTIMATE_DISCLAIMER = "Cost is an estimate and may change.";
