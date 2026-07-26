import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { clientEnv, getServerEnv } from "@/config/env";

/** Cookie-aware client for reading the signed-in admin user in RSC/routes. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component where cookies are read-only.
          }
        },
      },
    },
  );
}

/** Service-role client for admin mutations. Server only — never import client-side. */
export function createSupabaseAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
  return createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Anonymous client for public reads that go through RLS. */
export function createSupabaseAnonClient() {
  return createClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function isAdminUser(): Promise<{ isAdmin: boolean; email?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { isAdmin: false };
  const { ADMIN_EMAILS } = getServerEnv();
  return { isAdmin: ADMIN_EMAILS.includes(user.email.toLowerCase()), email: user.email };
}
