import { Suspense } from "react";
import { MapApp } from "@/components/map-app";
import { Skeleton } from "@/components/ui/skeleton";

function PageSkeleton() {
  return (
    <div className="flex h-dvh flex-col gap-2 p-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="min-h-0 flex-1" />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MapApp />
    </Suspense>
  );
}
