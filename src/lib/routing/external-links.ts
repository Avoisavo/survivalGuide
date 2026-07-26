import type { RouteEndpoint, TravelMode } from "@/types/route";

function endpointToGoogleParam(endpoint: RouteEndpoint): string {
  if (endpoint.lat !== undefined && endpoint.lng !== undefined) {
    return `${endpoint.lat},${endpoint.lng}`;
  }
  return endpoint.name ?? "";
}

const GOOGLE_TRAVEL_MODE: Record<TravelMode, string> = {
  recommended: "driving",
  drive: "driving",
  transit: "transit",
  walk: "walking",
  "ride-hailing": "driving",
  mixed: "transit",
};

export function googleMapsDirectionsUrl(
  origin: RouteEndpoint,
  destination: RouteEndpoint,
  mode: TravelMode = "drive",
): string {
  const params = new URLSearchParams({
    api: "1",
    origin: endpointToGoogleParam(origin),
    destination: endpointToGoogleParam(destination),
    travelmode: GOOGLE_TRAVEL_MODE[mode],
  });
  if (origin.placeId) params.set("origin_place_id", origin.placeId);
  if (destination.placeId) params.set("destination_place_id", destination.placeId);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function wazeUrl(destination: RouteEndpoint): string {
  if (destination.lat !== undefined && destination.lng !== undefined) {
    return `https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes`;
  }
  const q = encodeURIComponent(destination.name ?? "");
  return `https://waze.com/ul?q=${q}&navigate=yes`;
}
