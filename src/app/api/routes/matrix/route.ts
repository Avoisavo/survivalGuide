import { NextRequest, NextResponse } from "next/server";
import { MATRIX_RATE_LIMIT } from "@/config/site";
import {
  rateLimitedError,
  safeInternalError,
  validationError,
} from "@/lib/api/errors";
import { checkRateLimit, clientIpFromHeaders } from "@/lib/api/rate-limit";
import {
  bucketDepartureTime,
  getCachedRoute,
  routeCacheKey,
  setCachedRoute,
} from "@/lib/api/route-cache";
import { routeMatrixRequestSchema } from "@/lib/validation/routes";
import { getRoutingProvider, usingDemoData } from "@/providers";
import type { RouteMatrixResponse } from "@/types/route";

export async function POST(request: NextRequest) {
  const ip = clientIpFromHeaders(request.headers);
  if (!checkRateLimit(`matrix:${ip}`, MATRIX_RATE_LIMIT)) {
    return rateLimitedError();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
      { status: 400 },
    );
  }

  const parsed = routeMatrixRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const input = parsed.data;
  const cacheKey = routeCacheKey({
    matrix: true,
    o: input.origins,
    d: input.destinations,
    mode: input.travelMode,
    t: bucketDepartureTime(input.departureTime),
  });

  try {
    const cached = getCachedRoute<RouteMatrixResponse>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const provider = getRoutingProvider();
    const cells = await provider.computeRouteMatrix({
      origins: input.origins,
      destinations: input.destinations,
      travelMode: input.travelMode,
      departureTime: input.departureTime,
    });

    const response: RouteMatrixResponse = { cells, isDemo: usingDemoData() };
    setCachedRoute(cacheKey, response);
    return NextResponse.json(response);
  } catch (error) {
    return safeInternalError(error);
  }
}
