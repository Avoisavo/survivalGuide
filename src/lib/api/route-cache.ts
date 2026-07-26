import { ROUTE_CACHE_TTL_MS, ROUTE_DEPARTURE_BUCKET_MINUTES } from "@/config/site";

/**
 * Short-lived in-memory route cache. Departure times are bucketed to
 * 15-minute windows so near-identical requests (the common case when a user
 * tweaks preferences) reuse one upstream Routes API call.
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const MAX_ENTRIES = 500;

export function bucketDepartureTime(iso: string | undefined): string {
  if (!iso) return "now";
  const date = new Date(iso);
  const bucketMs = ROUTE_DEPARTURE_BUCKET_MINUTES * 60_000;
  return String(Math.floor(date.getTime() / bucketMs));
}

export function routeCacheKey(parts: Record<string, unknown>): string {
  return JSON.stringify(parts);
}

export function getCachedRoute<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCachedRoute<T>(key: string, value: T): void {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + ROUTE_CACHE_TTL_MS });
}
