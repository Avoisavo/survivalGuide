import { NextRequest, NextResponse } from "next/server";
import { ROUTE_RATE_LIMIT } from "@/config/site";
import {
  rateLimitedError,
  safeInternalError,
  validationError,
} from "@/lib/api/errors";
import { checkRateLimit, clientIpFromHeaders } from "@/lib/api/rate-limit";
import { routeRequestSchema } from "@/lib/validation/routes";
import { planRoutes } from "@/features/routing/service";

export async function POST(request: NextRequest) {
  const ip = clientIpFromHeaders(request.headers);
  if (!checkRateLimit(`routes:${ip}`, ROUTE_RATE_LIMIT)) {
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

  const parsed = routeRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const response = await planRoutes(parsed.data);
    return NextResponse.json(response);
  } catch (error) {
    return safeInternalError(error);
  }
}
