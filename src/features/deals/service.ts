import "server-only";
import { hasSupabase, isDemoMode } from "@/config/env";
import { filterActiveDeals } from "@/lib/deals";
import { filterActiveAdvisories } from "@/lib/advisories";
import { createSupabaseAnonClient } from "@/lib/supabase/server";
import { DEMO_ADVISORIES, DEMO_DEALS } from "@/providers/demo/demo-data";
import type { Advisory, AdvisorySeverity } from "@/types/advisory";
import type { Deal } from "@/types/deal";

interface DealRow {
  id: string;
  place_id: string;
  title: string;
  description: string | null;
  code: string | null;
  valid_from: string | null;
  valid_until: string | null;
  redemption_instructions: string | null;
  terms: string | null;
  source_url: string | null;
  verified: boolean;
  last_checked_at: string | null;
  is_active: boolean;
  places: { name: string; slug: string } | null;
}

export async function listActiveDeals(filter: {
  placeId?: string;
  verified?: boolean;
  limit: number;
}): Promise<Deal[]> {
  if (isDemoMode() || !hasSupabase()) {
    let deals = filterActiveDeals(DEMO_DEALS);
    if (filter.placeId) deals = deals.filter((d) => d.placeId === filter.placeId);
    if (filter.verified !== undefined) {
      deals = deals.filter((d) => d.verified === filter.verified);
    }
    return deals.slice(0, filter.limit);
  }

  const supabase = createSupabaseAnonClient();
  let query = supabase
    .from("deals")
    .select("*, places(name, slug)")
    .limit(filter.limit);
  if (filter.placeId) query = query.eq("place_id", filter.placeId);
  if (filter.verified !== undefined) query = query.eq("verified", filter.verified);

  const { data, error } = await query;
  if (error) throw new Error(`deals query failed: ${error.message}`);

  const deals: Deal[] = ((data ?? []) as unknown as DealRow[]).map((row) => ({
    id: row.id,
    placeId: row.place_id,
    placeName: row.places?.name,
    placeSlug: row.places?.slug,
    title: row.title,
    description: row.description ?? undefined,
    code: row.code ?? undefined,
    validFrom: row.valid_from ?? undefined,
    validUntil: row.valid_until ?? undefined,
    redemptionInstructions: row.redemption_instructions ?? undefined,
    terms: row.terms ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    verified: row.verified,
    lastCheckedAt: row.last_checked_at ?? undefined,
    isActive: row.is_active,
  }));
  // RLS already filters validity, but re-filter defensively for clock skew.
  return filterActiveDeals(deals);
}

interface AdvisoryRow {
  id: string;
  title: string;
  description: string;
  severity: string;
  place_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  source_url: string | null;
  verified: boolean;
  is_active: boolean;
  places: { name: string } | null;
}

export async function listActiveAdvisories(filter: {
  placeId?: string;
  severity?: AdvisorySeverity;
  limit: number;
}): Promise<Advisory[]> {
  if (isDemoMode() || !hasSupabase()) {
    let advisories = filterActiveAdvisories(DEMO_ADVISORIES);
    if (filter.placeId) advisories = advisories.filter((a) => a.placeId === filter.placeId);
    if (filter.severity) advisories = advisories.filter((a) => a.severity === filter.severity);
    return advisories.slice(0, filter.limit);
  }

  const supabase = createSupabaseAnonClient();
  let query = supabase
    .from("advisories")
    .select("*, places(name)")
    .limit(filter.limit);
  if (filter.placeId) query = query.eq("place_id", filter.placeId);
  if (filter.severity) query = query.eq("severity", filter.severity);

  const { data, error } = await query;
  if (error) throw new Error(`advisories query failed: ${error.message}`);

  const advisories: Advisory[] = ((data ?? []) as unknown as AdvisoryRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    severity: row.severity as AdvisorySeverity,
    placeId: row.place_id ?? undefined,
    placeName: row.places?.name,
    startsAt: row.starts_at ?? undefined,
    endsAt: row.ends_at ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    verified: row.verified,
    isActive: row.is_active,
  }));
  return filterActiveAdvisories(advisories);
}
