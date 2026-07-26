import { NextRequest, NextResponse } from "next/server";
import { safeInternalError, validationError } from "@/lib/api/errors";
import { nearbyQuerySchema } from "@/lib/validation/places";
import { estimateWalkingMinutes } from "@/lib/geo/distance";
import { getPlaceStore, usingDemoData } from "@/providers";

export async function GET(request: NextRequest) {
  const parsed = nearbyQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) return validationError(parsed.error);

  const { lat, lng, radius, category, limit } = parsed.data;
  try {
    const store = getPlaceStore();
    const places = await store.listNearby({
      center: { lat, lng },
      radiusMeters: radius,
      category,
      limit,
    });

    const items = places.map((place) => ({
      ...place,
      walkingMinutes: estimateWalkingMinutes(place.distanceMeters),
    }));

    return NextResponse.json(
      { items, isDemo: usingDemoData() },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } },
    );
  } catch (error) {
    return safeInternalError(error);
  }
}
