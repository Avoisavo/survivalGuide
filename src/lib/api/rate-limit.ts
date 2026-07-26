/**
 * In-memory sliding-window rate limiter, keyed per IP per endpoint group.
 * Suitable for a single-region MVP deployment; swap the store for Redis or
 * Upstash when scaling horizontally — the call sites won't change.
 */
interface WindowState {
  timestamps: number[];
}

const store = new Map<string, WindowState>();
const MAX_KEYS = 10_000;

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export function checkRateLimit(key: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const cutoff = now - config.windowMs;

  if (store.size > MAX_KEYS) store.clear();

  const state = store.get(key) ?? { timestamps: [] };
  state.timestamps = state.timestamps.filter((t) => t > cutoff);

  if (state.timestamps.length >= config.max) {
    store.set(key, state);
    return false;
  }

  state.timestamps.push(now);
  store.set(key, state);
  return true;
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
