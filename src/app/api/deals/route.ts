import { NextRequest, NextResponse } from "next/server";
import { safeInternalError, validationError } from "@/lib/api/errors";
import { dealsQuerySchema } from "@/lib/validation/deals";
import { listActiveDeals } from "@/features/deals/service";
import { usingDemoData } from "@/providers";

export async function GET(request: NextRequest) {
  const parsed = dealsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) return validationError(parsed.error);

  try {
    const deals = await listActiveDeals(parsed.data);
    return NextResponse.json(
      { items: deals, isDemo: usingDemoData() },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
    );
  } catch (error) {
    return safeInternalError(error);
  }
}
