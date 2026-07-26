import { NextRequest, NextResponse } from "next/server";
import { notFoundError, safeInternalError } from "@/lib/api/errors";
import { getPlaceStore, usingDemoData } from "@/providers";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id || id.length > 200) return notFoundError("Place");

  try {
    const store = getPlaceStore();
    const place = await store.getPlaceByIdOrSlug(id);
    if (!place) return notFoundError("Place");
    return NextResponse.json(
      { place, isDemo: usingDemoData() },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=120" } },
    );
  } catch (error) {
    return safeInternalError(error);
  }
}
