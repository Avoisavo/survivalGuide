import { NextRequest, NextResponse } from "next/server";
import { safeInternalError, validationError } from "@/lib/api/errors";
import { placesQuerySchema } from "@/lib/validation/places";
import { getPlaceStore, usingDemoData } from "@/providers";

export async function GET(request: NextRequest) {
  const parsed = placesQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) return validationError(parsed.error);

  const query = parsed.data;
  try {
    const store = getPlaceStore();
    const places = await store.listPlaces({
      category: query.category,
      verified: query.verified,
      q: query.q,
      bounds:
        query.north !== undefined
          ? {
              north: query.north,
              south: query.south!,
              east: query.east!,
              west: query.west!,
            }
          : undefined,
      limit: query.limit,
      offset: query.offset,
    });

    return NextResponse.json(
      { items: places, isDemo: usingDemoData() },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } },
    );
  } catch (error) {
    return safeInternalError(error);
  }
}
