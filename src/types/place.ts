export type PlaceCategory =
  | "hotel"
  | "food"
  | "transit"
  | "deal"
  | "essential"
  | "circuit";

export const PLACE_CATEGORIES: PlaceCategory[] = [
  "hotel",
  "food",
  "transit",
  "deal",
  "essential",
  "circuit",
];

export type HalalStatus = "halal-certified" | "muslim-friendly" | "not-specified";

export type TransitMode =
  | "airport-rail"
  | "lrt"
  | "mrt"
  | "ktm"
  | "monorail"
  | "bus"
  | "event-shuttle"
  | "ride-hailing-pickup"
  | "taxi"
  | "parking"
  | "park-and-ride";

export type FoodSubcategory =
  | "restaurant"
  | "cafe"
  | "convenience-food"
  | "late-night"
  | "food-court"
  | "local-malaysian"
  | "fast-food";

export type EssentialSubcategory =
  | "clinic"
  | "pharmacy"
  | "convenience-store"
  | "atm"
  | "fuel"
  | "police"
  | "toilet"
  | "prayer-room"
  | "parking"
  | "circuit-entrance"
  | "shuttle-pickup"
  | "meeting-point";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** Compact shape loaded for map markers and list rows. */
export interface PlaceSummary {
  id: string;
  slug: string;
  name: string;
  category: PlaceCategory;
  subcategory?: string;
  location: LatLng;
  priceLevel?: number;
  rating?: number;
  reviewCount?: number;
  verified: boolean;
  isOpenLate: boolean;
  isRaceDayRecommended: boolean;
  tags: string[];
  isDemo?: boolean;
}

/** Full detail shape, fetched lazily when a place is selected. */
export interface Place extends PlaceSummary {
  googlePlaceId?: string;
  description?: string;
  address?: string;
  lastVerifiedAt?: string;
  halalStatus?: HalalStatus;
  vegetarianFriendly?: boolean;
  wheelchairAccessible?: boolean;
  openNow?: boolean;
  closingTime?: string;
  transitMode?: TransitMode;
  firstMileNote?: string;
  lastMileNote?: string;
  requiresTransfer?: boolean;
  raceDayAvailability?: string;
  advisoryMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface NearbyPlace extends PlaceSummary {
  distanceMeters: number;
  walkingMinutes?: number;
  drivingMinutes?: number;
  openNow?: boolean;
}

export interface HotelInsights {
  distanceToCircuitMeters: number;
  raceDayDriveMinutes?: number;
  transitMinutes?: number;
  nearestHubName?: string;
  nearestHubDistanceMeters?: number;
  foodOptionsNearby?: number;
  hasLateNightFood?: boolean;
}
