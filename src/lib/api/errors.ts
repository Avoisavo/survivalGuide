import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { ApiError } from "@/types/api";

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ApiError> {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export function validationError(error: ZodError): NextResponse<ApiError> {
  return apiError(
    "VALIDATION_ERROR",
    "Invalid request parameters",
    400,
    error.flatten(),
  );
}

/**
 * Convert any thrown error into a safe response. Raw third-party provider
 * errors are logged server-side but never exposed to the client.
 */
export function safeInternalError(error: unknown): NextResponse<ApiError> {
  console.error("[api] internal error:", error);
  return apiError("INTERNAL_ERROR", "Something went wrong. Please try again.", 500);
}

export function rateLimitedError(): NextResponse<ApiError> {
  return apiError(
    "RATE_LIMITED",
    "Too many requests. Please wait a moment and try again.",
    429,
  );
}

export function notFoundError(what: string): NextResponse<ApiError> {
  return apiError("NOT_FOUND", `${what} not found`, 404);
}
