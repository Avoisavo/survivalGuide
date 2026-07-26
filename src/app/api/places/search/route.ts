import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_MAP_CENTER, ROUTE_RATE_LIMIT } from "@/config/site";
import {
  rateLimitedError,
  safeInternalError,
  validationError,
} from "@/lib/api/errors";
import { checkRateLimit, clientIpFromHeaders } from "@/lib/api/rate-limit";
import { getPlacesProvider, usingDemoData } from "@/providers";

const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(120),
});

/**
 * Text search against the external places provider, used by the origin /
 * destination search boxes. Rate limited and server-keyed; results are
 * biased to the Sepang area.
 */
export async function GET(request: NextRequest) {
  const ip = clientIpFromHeaders(request.headers);
  if (!checkRateLimit(`place-search:${ip}`, ROUTE_RATE_LIMIT)) {
    return rateLimitedError();
  }

  const parsed = searchQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) return validationError(parsed.error);

  try {
    const provider = getPlacesProvider();
    const candidates = await provider.searchText(parsed.data.q, {
      lat: DEFAULT_MAP_CENTER.lat,
      lng: DEFAULT_MAP_CENTER.lng,
    });
    return NextResponse.json({ items: candidates.slice(0, 8), isDemo: usingDemoData() });
  } catch (error) {
    return safeInternalError(error);
  }
}
