import type { Deal } from "@/types/deal";

/**
 * A deal is publicly visible only while active, verified-or-not, and inside
 * its validity window. Expired deals disappear automatically.
 */
export function isDealCurrentlyValid(deal: Deal, now: Date = new Date()): boolean {
  if (!deal.isActive) return false;
  if (deal.validFrom && new Date(deal.validFrom) > now) return false;
  if (deal.validUntil && new Date(deal.validUntil) < now) return false;
  return true;
}

export function filterActiveDeals(deals: Deal[], now: Date = new Date()): Deal[] {
  return deals.filter((d) => isDealCurrentlyValid(d, now));
}
