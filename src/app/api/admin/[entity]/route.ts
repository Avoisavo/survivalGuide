import { NextRequest, NextResponse } from "next/server";
import type { ZodTypeAny } from "zod";
import { hasSupabase, isDemoMode } from "@/config/env";
import { apiError, safeInternalError, validationError } from "@/lib/api/errors";
import {
  adminAdvisorySchema,
  adminDealSchema,
  adminPlaceSchema,
  adminRouteTemplateSchema,
} from "@/lib/validation/admin";
import { createSupabaseAdminClient, isAdminUser } from "@/lib/supabase/server";

const ENTITIES = ["places", "deals", "advisories", "route-templates"] as const;
type Entity = (typeof ENTITIES)[number];

const TABLE_BY_ENTITY: Record<Entity, string> = {
  places: "places",
  deals: "deals",
  advisories: "advisories",
  "route-templates": "route_templates",
};

const SCHEMA_BY_ENTITY: Record<Entity, ZodTypeAny> = {
  places: adminPlaceSchema,
  deals: adminDealSchema,
  advisories: adminAdvisorySchema,
  "route-templates": adminRouteTemplateSchema,
};

function toRow(entity: Entity, input: Record<string, unknown>): Record<string, unknown> {
  switch (entity) {
    case "places":
      return {
        slug: input.slug,
        google_place_id: input.googlePlaceId || null,
        name: input.name,
        category: input.category,
        subcategory: input.subcategory || null,
        description: input.description || null,
        address: input.address || null,
        location: `SRID=4326;POINT(${input.lng} ${input.lat})`,
        price_level: input.priceLevel ?? null,
        verified: input.verified,
        last_verified_at: input.verified ? new Date().toISOString() : null,
        is_active: input.isActive,
        is_open_late: input.isOpenLate,
        is_race_day_recommended: input.isRaceDayRecommended,
        halal_status: input.halalStatus ?? null,
        vegetarian_friendly: input.vegetarianFriendly ?? null,
        wheelchair_accessible: input.wheelchairAccessible ?? null,
        tags: input.tags ?? [],
      };
    case "deals":
      return {
        place_id: input.placeId,
        title: input.title,
        description: input.description || null,
        code: input.code || null,
        valid_from: input.validFrom ?? null,
        valid_until: input.validUntil ?? null,
        redemption_instructions: input.redemptionInstructions || null,
        terms: input.terms || null,
        source_url: input.sourceUrl || null,
        verified: input.verified,
        last_checked_at: new Date().toISOString(),
        is_active: input.isActive,
      };
    case "advisories":
      return {
        title: input.title,
        description: input.description,
        severity: input.severity,
        place_id: input.placeId ?? null,
        starts_at: input.startsAt ?? null,
        ends_at: input.endsAt ?? null,
        source_url: input.sourceUrl || null,
        verified: input.verified,
        is_active: input.isActive,
      };
    case "route-templates":
      return {
        name: input.name,
        slug: input.slug,
        origin_place_id: input.originPlaceId,
        destination_place_id: input.destinationPlaceId,
        route_type: input.routeType,
        active_from: input.activeFrom ?? null,
        active_until: input.activeUntil ?? null,
        steps: input.steps,
        estimated_cost_min: input.estimatedCostMin ?? null,
        estimated_cost_max: input.estimatedCostMax ?? null,
        reliability_score: input.reliabilityScore,
        race_day_suitability_score: input.raceDaySuitabilityScore,
        warning: input.warning || null,
        verified: input.verified,
        last_verified_at: input.verified ? new Date().toISOString() : null,
        is_active: input.isActive,
      };
  }
}

async function guard(entity: string): Promise<NextResponse | Entity> {
  if (!ENTITIES.includes(entity as Entity)) {
    return apiError("NOT_FOUND", "Unknown admin entity", 404);
  }
  if (isDemoMode() || !hasSupabase()) {
    return apiError(
      "DEMO_MODE",
      "Admin mutations are disabled in demo mode. Configure Supabase to manage records.",
      403,
    );
  }
  const { isAdmin } = await isAdminUser();
  if (!isAdmin) {
    return apiError("FORBIDDEN", "Admin access required", 403);
  }
  return entity as Entity;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ entity: string }> },
) {
  const { entity } = await context.params;
  const guarded = await guard(entity);
  if (guarded instanceof NextResponse) return guarded;

  try {
    const supabase = createSupabaseAdminClient();
    const table = TABLE_BY_ENTITY[guarded];
    const query =
      guarded === "places"
        ? supabase.rpc("admin_list_places")
        : supabase.from(table).select("*").order("updated_at", { ascending: false }).limit(200);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    return safeInternalError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ entity: string }> },
) {
  const { entity } = await context.params;
  const guarded = await guard(entity);
  if (guarded instanceof NextResponse) return guarded;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = SCHEMA_BY_ENTITY[guarded].safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const supabase = createSupabaseAdminClient();
    const table = TABLE_BY_ENTITY[guarded];
    const row = toRow(guarded, parsed.data as Record<string, unknown>);
    const id = (parsed.data as { id?: string }).id;

    const result = id
      ? await supabase.from(table).update(row).eq("id", id).select("id").single()
      : await supabase.from(table).insert(row).select("id").single();

    if (result.error) throw new Error(result.error.message);
    return NextResponse.json({ id: result.data.id }, { status: id ? 200 : 201 });
  } catch (error) {
    return safeInternalError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ entity: string }> },
) {
  const { entity } = await context.params;
  const guarded = await guard(entity);
  if (guarded instanceof NextResponse) return guarded;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return apiError("VALIDATION_ERROR", "id query parameter is required", 400);

  try {
    const supabase = createSupabaseAdminClient();
    const table = TABLE_BY_ENTITY[guarded];
    // Soft-deactivate rather than hard delete so records stay auditable.
    const { error } = await supabase.from(table).update({ is_active: false }).eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeInternalError(error);
  }
}
