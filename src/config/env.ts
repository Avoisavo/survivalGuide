import { z } from "zod";

/**
 * Client-safe environment. NEXT_PUBLIC_* values are inlined at build time,
 * so they must be referenced statically.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().default(""),
  NEXT_PUBLIC_SUPABASE_URL: z.string().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default(""),
  NEXT_PUBLIC_DEMO_MODE: z
    .string()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
});

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
});

const serverEnvSchema = z.object({
  GOOGLE_MAPS_SERVER_API_KEY: z.string().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(""),
  ADMIN_EMAILS: z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
});

/** Server-only environment. Never import from a client component. */
export function getServerEnv() {
  return serverEnvSchema.parse({
    GOOGLE_MAPS_SERVER_API_KEY: process.env.GOOGLE_MAPS_SERVER_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  });
}

export function isDemoMode(): boolean {
  return clientEnv.NEXT_PUBLIC_DEMO_MODE;
}

/** True when the server has real provider + database credentials. */
export function hasLiveProviders(): boolean {
  const env = getServerEnv();
  return (
    !clientEnv.NEXT_PUBLIC_DEMO_MODE &&
    env.GOOGLE_MAPS_SERVER_API_KEY.length > 0
  );
}

export function hasSupabase(): boolean {
  return (
    clientEnv.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0
  );
}
