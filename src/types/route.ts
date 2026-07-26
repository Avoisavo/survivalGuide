export type RouteLegMode =
  | "walk"
  | "drive"
  | "transit"
  | "train"
  | "bus"
  | "shuttle"
  | "ride-hailing";

export interface RouteLeg {
  id: string;
  mode: RouteLegMode;
  title: string;
  description: string;
  originName: string;
  destinationName: string;
  durationMinutes: number;
  distanceMeters?: number;
  estimatedCostMin?: number;
  estimatedCostMax?: number;
  currency?: string;
  departureTime?: string;
  arrivalTime?: string;
  polyline?: string;
  source: "google" | "curated";
  warning?: string;
}

export type TravelMode =
  | "recommended"
  | "drive"
  | "transit"
  | "walk"
  | "ride-hailing"
  | "mixed";

export type RouteKind =
  | "race-day"
  | "fastest"
  | "cheapest"
  | "least-walking"
  | "fewest-transfers";

export interface RouteScoreBreakdown {
  travelTime: number;
  reliability: number;
  cost: number;
  walking: number;
  transfers: number;
  raceDaySuitability: number;
  finalScore: number;
}

export interface RouteOption {
  id: string;
  kind: RouteKind;
  title: string;
  travelMode: TravelMode;
  legs: RouteLeg[];
  totalDurationMinutes: number;
  totalDistanceMeters?: number;
  totalWalkingMeters: number;
  totalWalkingMinutes: number;
  transfers: number;
  estimatedCostMin?: number;
  estimatedCostMax?: number;
  currency?: string;
  departureTime?: string;
  arrivalTime?: string;
  /** 0–100, higher is more reliable. */
  reliabilityScore: number;
  raceDaySuitabilityScore: number;
  score: RouteScoreBreakdown;
  explanation: string;
  warnings: string[];
  containsCuratedLeg: boolean;
  polyline?: string;
  isDemo?: boolean;
}

export interface RoutePreferences {
  lessWalking?: boolean;
  fewerTransfers?: boolean;
  avoidTolls?: boolean;
}

export interface RouteEndpoint {
  placeId?: string;
  lat?: number;
  lng?: number;
  name?: string;
}

export interface RouteRequest {
  origin: RouteEndpoint;
  destination: RouteEndpoint;
  departureTime?: string;
  travelMode: TravelMode;
  preferences?: RoutePreferences;
}

export interface RouteResponse {
  routes: RouteOption[];
  isDemo: boolean;
  advisories: string[];
}

export interface RouteMatrixRequest {
  origins: RouteEndpoint[];
  destinations: RouteEndpoint[];
  travelMode: Exclude<TravelMode, "recommended" | "mixed">;
  departureTime?: string;
}

export interface RouteMatrixCell {
  originIndex: number;
  destinationIndex: number;
  durationMinutes?: number;
  distanceMeters?: number;
  status: "ok" | "unavailable";
}

export interface RouteMatrixResponse {
  cells: RouteMatrixCell[];
  isDemo: boolean;
}

export interface RouteWeights {
  travelTime: number;
  reliability: number;
  raceDaySuitability: number;
  cost: number;
  walking: number;
  transfers: number;
}

export const DEFAULT_ROUTE_WEIGHTS: RouteWeights = {
  travelTime: 0.35,
  reliability: 0.25,
  raceDaySuitability: 0.15,
  cost: 0.1,
  walking: 0.1,
  transfers: 0.05,
};
