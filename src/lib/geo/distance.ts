import type { LatLng, MapBounds } from "@/types/place";

const EARTH_RADIUS_METERS = 6_371_000;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function isWithinBounds(point: LatLng, bounds: MapBounds): boolean {
  return (
    point.lat <= bounds.north &&
    point.lat >= bounds.south &&
    point.lng <= bounds.east &&
    point.lng >= bounds.west
  );
}

export function boundsSpan(bounds: MapBounds): { latSpan: number; lngSpan: number } {
  return {
    latSpan: Math.abs(bounds.north - bounds.south),
    lngSpan: Math.abs(bounds.east - bounds.west),
  };
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

const AVERAGE_WALK_METERS_PER_MINUTE = 80;

export function estimateWalkingMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / AVERAGE_WALK_METERS_PER_MINUTE));
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
