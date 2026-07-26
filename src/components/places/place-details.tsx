"use client";

import { ArrowLeft, Route, TicketPercent, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NEARBY_RADIUS_PRESETS_METERS } from "@/config/site";
import {
  useAdvisories,
  useDeals,
  useNearbyPlaces,
  usePlaceDetails,
} from "@/features/places/queries";
import { formatDistance } from "@/lib/geo/distance";
import { cn } from "@/lib/utils";
import type { PlaceCategory, PlaceSummary } from "@/types/place";
import { MARKER_STYLES } from "@/components/map/marker-style";
import { SaveButton } from "./save-button";
import { ShareButton } from "./share-button";
import { VerificationBadge } from "./verification-badge";

const NEARBY_TABS: { value: PlaceCategory; label: string }[] = [
  { value: "food", label: "Food" },
  { value: "transit", label: "Transit" },
  { value: "essential", label: "Essentials" },
];

export interface PlaceDetailsProps {
  placeIdOrSlug: string;
  onBack: () => void;
  onRouteFromHere: (place: PlaceSummary) => void;
  onSelectNearby: (place: PlaceSummary) => void;
}

export function PlaceDetails({
  placeIdOrSlug,
  onBack,
  onRouteFromHere,
  onSelectNearby,
}: PlaceDetailsProps) {
  const [radius, setRadius] = useState<number>(1000);
  const [nearbyCategory, setNearbyCategory] = useState<PlaceCategory>("food");

  const { data, isLoading, isError, refetch } = usePlaceDetails(placeIdOrSlug);
  const place = data?.place ?? null;

  const nearby = useNearbyPlaces({
    center: place?.location ?? null,
    radius,
    category: nearbyCategory,
  });
  const deals = useDeals(place?.id);
  const advisories = useAdvisories(place?.id);

  if (isLoading) {
    return (
      <div className="space-y-3" aria-label="Loading place">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !place) {
    return (
      <div className="space-y-3 text-sm">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </Button>
        <p className="text-muted-foreground">This place could not be loaded.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const style = MARKER_STYLES[place.category];

  return (
    <section aria-label={`Details for ${place.name}`} className="space-y-4">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-1" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to results
        </Button>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold leading-tight">{place.name}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {style.label}
              {place.subcategory && ` · ${place.subcategory.replace(/-/g, " ")}`}
              {place.address && ` · ${place.address}`}
            </p>
          </div>
          {place.isDemo && (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              Demo data
            </Badge>
          )}
        </div>
        <div className="mt-1.5">
          <VerificationBadge verified={place.verified} lastVerifiedAt={place.lastVerifiedAt} />
        </div>
      </div>

      {place.description && <p className="text-sm">{place.description}</p>}

      {place.category === "transit" && (
        <dl className="space-y-1.5 rounded-lg border bg-muted/30 p-3 text-xs">
          {place.transitMode && (
            <div>
              <dt className="font-medium">Mode</dt>
              <dd className="text-muted-foreground">{place.transitMode.replace(/-/g, " ")}</dd>
            </div>
          )}
          {place.firstMileNote && (
            <div>
              <dt className="font-medium">Getting there</dt>
              <dd className="text-muted-foreground">{place.firstMileNote}</dd>
            </div>
          )}
          {place.lastMileNote && (
            <div>
              <dt className="font-medium">At the other end</dt>
              <dd className="text-muted-foreground">{place.lastMileNote}</dd>
            </div>
          )}
          {place.raceDayAvailability && (
            <div>
              <dt className="font-medium">Race-day availability</dt>
              <dd className="text-muted-foreground">{place.raceDayAvailability}</dd>
            </div>
          )}
          {place.requiresTransfer !== undefined && (
            <div>
              <dt className="font-medium">Transfer</dt>
              <dd className="text-muted-foreground">
                {place.requiresTransfer ? "Transfer required" : "No transfer needed"}
              </dd>
            </div>
          )}
          {place.advisoryMessage && (
            <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              {place.advisoryMessage}
            </p>
          )}
        </dl>
      )}

      {(advisories.data?.items.length ?? 0) > 0 && (
        <div className="space-y-2">
          {advisories.data!.items.map((advisory) => (
            <div
              key={advisory.id}
              className={cn(
                "rounded-lg border p-3 text-xs",
                advisory.severity === "critical" &&
                  "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
                advisory.severity === "warning" &&
                  "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
                advisory.severity === "info" && "bg-muted/40",
              )}
            >
              <p className="font-medium">{advisory.title}</p>
              <p className="mt-0.5">{advisory.description}</p>
            </div>
          ))}
        </div>
      )}

      {(deals.data?.items.length ?? 0) > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Race-week deals</h3>
          {deals.data!.items.map((deal) => (
            <div key={deal.id} className="rounded-lg border p-3 text-xs">
              <p className="flex items-center gap-1.5 font-medium">
                <TicketPercent className="h-3.5 w-3.5 text-purple-600" aria-hidden />
                {deal.title}
              </p>
              {deal.description && (
                <p className="mt-0.5 text-muted-foreground">{deal.description}</p>
              )}
              {deal.code && (
                <p className="mt-1">
                  Code: <code className="rounded bg-muted px-1 py-0.5">{deal.code}</code>
                </p>
              )}
              {deal.validUntil && (
                <p className="mt-1 text-muted-foreground">
                  Valid until{" "}
                  {new Date(deal.validUntil).toLocaleDateString("en-MY", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {deal.verified ? " · Verified" : " · Not verified"}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {place.category !== "circuit" && (
          <Button size="sm" onClick={() => onRouteFromHere(place)}>
            <Route className="h-4 w-4" aria-hidden />
            Route to circuit
          </Button>
        )}
        <SaveButton place={place} />
        <ShareButton
          title={place.name}
          url={typeof window !== "undefined" ? `${window.location.origin}/place/${place.slug}` : undefined}
        />
      </div>

      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Nearby</h3>
          <div className="flex gap-1" role="group" aria-label="Search radius">
            {NEARBY_RADIUS_PRESETS_METERS.map((preset) => (
              <Button
                key={preset}
                size="sm"
                variant={radius === preset ? "secondary" : "ghost"}
                className="h-7 px-2 text-xs"
                onClick={() => setRadius(preset)}
              >
                {preset < 1000 ? `${preset} m` : `${preset / 1000} km`}
              </Button>
            ))}
          </div>
        </div>

        <Tabs
          value={nearbyCategory}
          onValueChange={(value) => setNearbyCategory(value as PlaceCategory)}
        >
          <TabsList className="w-full">
            {NEARBY_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {NEARBY_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-2 space-y-1.5">
              {nearby.isLoading && (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              )}
              {!nearby.isLoading && (nearby.data?.items.length ?? 0) === 0 && (
                <p className="py-2 text-xs text-muted-foreground">
                  Nothing in this category within{" "}
                  {radius < 1000 ? `${radius} m` : `${radius / 1000} km`}. Try a larger
                  radius.
                </p>
              )}
              {nearby.data?.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left text-xs hover:bg-accent"
                  onClick={() => onSelectNearby(item)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="text-muted-foreground">
                      {formatDistance(item.distanceMeters)}
                      {item.walkingMinutes !== undefined && ` · ~${item.walkingMinutes} min walk`}
                      {item.openNow === true && " · Open now"}
                      {item.isOpenLate && " · Open late"}
                    </span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {item.verified ? "Verified" : ""}
                  </span>
                </button>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
