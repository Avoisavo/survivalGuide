"use client";

import dynamic from "next/dynamic";
import { clientEnv } from "@/config/env";
import { Skeleton } from "@/components/ui/skeleton";
import type { MapViewProps } from "./map-types";

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <div className="w-full max-w-md space-y-3 p-8">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

/**
 * Dynamically imported so the Google Maps SDK never enters the main bundle.
 * Falls back to the keyless schematic demo map when no browser key is set.
 */
const GoogleMapView = dynamic(() => import("./google-map-view"), {
  ssr: false,
  loading: MapSkeleton,
});
const DemoMapView = dynamic(() => import("./demo-map-view"), {
  ssr: false,
  loading: MapSkeleton,
});

export function MapView(props: MapViewProps) {
  const hasBrowserKey =
    clientEnv.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.length > 0 &&
    !clientEnv.NEXT_PUBLIC_DEMO_MODE;
  return hasBrowserKey ? <GoogleMapView {...props} /> : <DemoMapView {...props} />;
}
