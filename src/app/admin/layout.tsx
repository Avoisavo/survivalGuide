import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { hasSupabase, isDemoMode } from "@/config/env";
import { SITE_NAME } from "@/config/site";
import { isAdminUser } from "@/lib/supabase/server";

export const metadata = { title: "Admin" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const demoOnly = isDemoMode() || !hasSupabase();

  if (!demoOnly) {
    const { isAdmin } = await isAdminUser();
    if (!isAdmin) redirect("/admin/login");
  }

  return (
    <div className="min-h-dvh bg-muted/20">
      <header className="flex h-14 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-sm font-semibold hover:underline">
            {SITE_NAME}
          </Link>
          <Badge variant="secondary">Admin</Badge>
          {demoOnly && (
            <Badge className="bg-amber-500 text-white hover:bg-amber-500">
              Demo mode — read only
            </Badge>
          )}
        </div>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          Back to map
        </Link>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
