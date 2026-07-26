"use client";

import { Route } from "lucide-react";
import Link from "next/link";
import { MapView } from "@/components/map/map-view";
import { Button } from "@/components/ui/button";
import type { Place } from "@/types/place";
import { PlaceDetails } from "./place-details";
import { useRouter } from "next/navigation";

/**
 * Client island for the server-rendered place page: interactive mini-map,
 * nearby groups, deals, advisories, save/share/route actions.
 */
export function PlaceDetailClient({ place }: { place: Place }) {
  const router = useRouter();

  return (
    <div className="mt-6 space-y-6">
      <div className="h-64 overflow-hidden rounded-xl border">
        <MapView
          places={[place]}
          selectedPlaceId={place.id}
          hoveredPlaceId={null}
          onMarkerClick={() => {}}
          onMarkerHover={() => {}}
          onUserMovedMap={() => {}}
          routeEndpoints={null}
          recenterSignal={0}
        />
      </div>

      {place.category !== "circuit" && (
        <Button asChild>
          <Link
            href={`/?origin=${place.location.lat.toFixed(5)},${place.location.lng.toFixed(5)}&place=${place.slug}`}
          >
            <Route className="h-4 w-4" aria-hidden />
            Plan route to circuit
          </Link>
        </Button>
      )}

      <PlaceDetails
        placeIdOrSlug={place.slug}
        onBack={() => router.push("/")}
        onRouteFromHere={(p) =>
          router.push(
            `/?origin=${p.location.lat.toFixed(5)},${p.location.lng.toFixed(5)}`,
          )
        }
        onSelectNearby={(p) => router.push(`/place/${p.slug}`)}
      />
    </div>
  );
}
