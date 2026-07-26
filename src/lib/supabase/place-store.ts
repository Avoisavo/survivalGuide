import "server-only";
import { createSupabaseAnonClient } from "@/lib/supabase/server";
import type { LatLng, Place, PlaceCategory } from "@/types/place";
import type { PlaceStore } from "@/providers/types";

interface PlaceRow {
  id: string;
  slug: string;
  google_place_id: string | null;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  address: string | null;
  lat: number;
  lng: number;
  price_level: number | null;
  verified: boolean;
  last_verified_at: string | null;
  is_active: boolean;
  is_open_late: boolean;
  is_race_day_recommended: boolean;
  halal_status: string | null;
  vegetarian_friendly: boolean | null;
  wheelchair_accessible: boolean | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  distance_meters?: number;
}

function rowToPlace(row: PlaceRow): Place {
  const metadata = row.metadata ?? {};
  return {
    id: row.id,
    slug: row.slug,
    googlePlaceId: row.google_place_id ?? undefined,
    name: row.name,
    category: row.category as PlaceCategory,
    subcategory: row.subcategory ?? undefined,
    description: row.description ?? undefined,
    address: row.address ?? undefined,
    location: { lat: row.lat, lng: row.lng },
    priceLevel: row.price_level ?? undefined,
    verified: row.verified,
    lastVerifiedAt: row.last_verified_at ?? undefined,
    isOpenLate: row.is_open_late,
    isRaceDayRecommended: row.is_race_day_recommended,
    halalStatus: (row.halal_status ?? undefined) as Place["halalStatus"],
    vegetarianFriendly: row.vegetarian_friendly ?? undefined,
    wheelchairAccessible: row.wheelchair_accessible ?? undefined,
    tags: row.tags ?? [],
    transitMode: metadata.transit_mode as Place["transitMode"],
    firstMileNote: metadata.first_mile_note as string | undefined,
    lastMileNote: metadata.last_mile_note as string | undefined,
    requiresTransfer: metadata.requires_transfer as boolean | undefined,
    raceDayAvailability: metadata.race_day_availability as string | undefined,
    advisoryMessage: metadata.advisory_message as string | undefined,
    closingTime: metadata.closing_time as string | undefined,
    rating: metadata.rating as number | undefined,
    reviewCount: metadata.review_count as number | undefined,
    metadata,
  };
}

/**
 * Curated-place store backed by Supabase/PostGIS. Reads go through the anon
 * client so Row Level Security applies (public sees active rows only).
 */
export class SupabasePlaceStore implements PlaceStore {
  async listPlaces(filter: {
    category?: PlaceCategory;
    bounds?: { north: number; south: number; east: number; west: number };
    verified?: boolean;
    q?: string;
    limit: number;
    offset: number;
  }): Promise<Place[]> {
    const supabase = createSupabaseAnonClient();
    const { data, error } = await supabase.rpc("search_places", {
      p_category: filter.category ?? null,
      p_north: filter.bounds?.north ?? null,
      p_south: filter.bounds?.south ?? null,
      p_east: filter.bounds?.east ?? null,
      p_west: filter.bounds?.west ?? null,
      p_verified: filter.verified ?? null,
      p_query: filter.q ?? null,
      p_limit: filter.limit,
      p_offset: filter.offset,
    });
    if (error) throw new Error(`search_places failed: ${error.message}`);
    return ((data ?? []) as PlaceRow[]).map(rowToPlace);
  }

  async getPlaceByIdOrSlug(idOrSlug: string): Promise<Place | null> {
    const supabase = createSupabaseAnonClient();
    const { data, error } = await supabase.rpc("get_place", { p_id_or_slug: idOrSlug });
    if (error) throw new Error(`get_place failed: ${error.message}`);
    const rows = (data ?? []) as PlaceRow[];
    return rows.length ? rowToPlace(rows[0]) : null;
  }

  async listNearby(options: {
    center: LatLng;
    radiusMeters: number;
    category?: PlaceCategory;
    limit: number;
  }): Promise<(Place & { distanceMeters: number })[]> {
    const supabase = createSupabaseAnonClient();
    const { data, error } = await supabase.rpc("nearby_places", {
      p_lat: options.center.lat,
      p_lng: options.center.lng,
      p_radius_meters: options.radiusMeters,
      p_category: options.category ?? null,
      p_limit: options.limit,
    });
    if (error) throw new Error(`nearby_places failed: ${error.message}`);
    return ((data ?? []) as PlaceRow[]).map((row) => ({
      ...rowToPlace(row),
      distanceMeters: Math.round(row.distance_meters ?? 0),
    }));
  }
}
