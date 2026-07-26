import { NextRequest, NextResponse } from "next/server";
import { safeInternalError, validationError } from "@/lib/api/errors";
import { advisoriesQuerySchema } from "@/lib/validation/deals";
import { listActiveAdvisories } from "@/features/deals/service";
import { usingDemoData } from "@/providers";

export async function GET(request: NextRequest) {
  const parsed = advisoriesQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) return validationError(parsed.error);

  try {
    const advisories = await listActiveAdvisories(parsed.data);
    return NextResponse.json(
      { items: advisories, isDemo: usingDemoData() },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
    );
  } catch (error) {
    return safeInternalError(error);
  }
}
