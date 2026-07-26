"use client";

import { Crosshair, List, Map as MapIcon, RotateCcw, Scale, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { CategoryFilter } from "@/components/filters/category-filter";
import { AppHeader } from "@/components/layout/app-header";
import { BottomSheet } from "@/components/layout/bottom-sheet";
import { MapView } from "@/components/map/map-view";
import { HotelCompare } from "@/components/places/hotel-compare";
import { PlaceCard } from "@/components/places/place-card";
import { PlaceDetails } from "@/components/places/place-details";
import { RoutePlanner } from "@/components/routes/route-planner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CIRCUIT, MAX_COMPARE_HOTELS, RACE_DAY_WARNING } from "@/config/site";
import { useMapUrlState } from "@/features/map/url-state";
import { useDeals, usePlaces } from "@/features/places/queries";
import type { MapBounds, PlaceCategory, PlaceSummary } from "@/types/place";
import type { RouteEndpoint, RouteOption, RoutePreferences, TravelMode } from "@/types/route";

const CIRCUIT_ENDPOINT: RouteEndpoint = {
  lat: CIRCUIT.lat,
  lng: CIRCUIT.lng,
  name: CIRCUIT.name,
};

function parseOriginParam(param: string | null): RouteEndpoint | null {
  if (!param) return null;
  const coordMatch = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(param);
  if (coordMatch) {
    return {
      lat: Number(coordMatch[1]),
      lng: Number(coordMatch[2]),
      name: "Shared location",
    };
  }
  return { placeId: param, name: "Shared origin" };
}

function originToParam(endpoint: RouteEndpoint | null): string | null {
  if (!endpoint) return null;
  if (endpoint.placeId) return endpoint.placeId;
  if (endpoint.lat !== undefined && endpoint.lng !== undefined) {
    return `${endpoint.lat.toFixed(5)},${endpoint.lng.toFixed(5)}`;
  }
  return null;
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MapApp() {
  const [urlState, updateUrl] = useMapUrlState();

  const [origin, setOrigin] = useState<RouteEndpoint | null>(() =>
    parseOriginParam(urlState.origin),
  );
  const [destination, setDestination] = useState<RouteEndpoint>(CIRCUIT_ENDPOINT);
  const [departureDate, setDepartureDate] = useState(todayISODate);
  const [departureTime, setDepartureTime] = useState("08:00");
  const [preferences, setPreferences] = useState<RoutePreferences>({});
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [movedBounds, setMovedBounds] = useState<MapBounds | null>(null);
  const [activeBounds, setActiveBounds] = useState<MapBounds | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  const category = urlState.category;
  const selectedPlaceSlug = urlState.place;

  const placesQuery = usePlaces({
    category: category === "deal" ? undefined : (category ?? undefined),
    bounds: activeBounds ?? undefined,
  });
  const dealsQuery = useDeals();

  const places = useMemo(() => placesQuery.data?.items ?? [], [placesQuery.data]);

  const visiblePlaces = useMemo(() => {
    if (category !== "deal") return places;
    const dealPlaceIds = new Set((dealsQuery.data?.items ?? []).map((d) => d.placeId));
    return places.filter((p) => dealPlaceIds.has(p.id));
  }, [places, category, dealsQuery.data]);

  const compareHotels = useMemo(
    () => places.filter((p) => compareIds.includes(p.id)),
    [places, compareIds],
  );

  const setCategory = useCallback(
    (next: PlaceCategory | null) => updateUrl({ category: next }),
    [updateUrl],
  );

  const openPlace = useCallback(
    (slugOrId: string) => updateUrl({ place: slugOrId }),
    [updateUrl],
  );

  const closePlace = useCallback(() => updateUrl({ place: null }), [updateUrl]);

  const handleOriginChange = useCallback(
    (endpoint: RouteEndpoint | null) => {
      setOrigin(endpoint);
      setSelectedRoute(null);
      updateUrl({ origin: originToParam(endpoint) });
    },
    [updateUrl],
  );

  const handleTravelModeChange = useCallback(
    (mode: TravelMode) => {
      setSelectedRoute(null);
      updateUrl({ mode });
    },
    [updateUrl],
  );

  const routeFromPlace = useCallback(
    (place: PlaceSummary) => {
      handleOriginChange({
        lat: place.location.lat,
        lng: place.location.lng,
        name: place.name,
      });
      setDestination(CIRCUIT_ENDPOINT);
      setMobileView("map");
    },
    [handleOriginChange],
  );

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleOriginChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: "Current location",
        });
      },
      () => {
        // Permission denied or unavailable — the search box remains usable.
      },
      { timeout: 8000 },
    );
  }, [handleOriginChange]);

  const toggleCompare = useCallback((placeId: string) => {
    setCompareIds((current) => {
      if (current.includes(placeId)) return current.filter((id) => id !== placeId);
      if (current.length >= MAX_COMPARE_HOTELS) return current;
      return [...current, placeId];
    });
  }, []);

  const routeEndpoints = useMemo(() => {
    if (!origin || origin.lat === undefined || origin.lng === undefined) return null;
    return {
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat ?? CIRCUIT.lat, lng: destination.lng ?? CIRCUIT.lng },
    };
  }, [origin, destination]);

  const sidePanel = selectedPlaceSlug ? (
    <PlaceDetails
      placeIdOrSlug={selectedPlaceSlug}
      onBack={closePlace}
      onRouteFromHere={routeFromPlace}
      onSelectNearby={(place) => openPlace(place.slug)}
    />
  ) : (
    <div className="space-y-4">
      <RoutePlanner
        origin={origin}
        destination={destination}
        travelMode={urlState.mode}
        departureDate={departureDate}
        departureTime={departureTime}
        preferences={preferences}
        selectedRouteId={selectedRoute?.id ?? null}
        onOriginChange={handleOriginChange}
        onTravelModeChange={handleTravelModeChange}
        onDepartureDateChange={setDepartureDate}
        onDepartureTimeChange={setDepartureTime}
        onPreferencesChange={setPreferences}
        onRouteSelect={setSelectedRoute}
        onUseCurrentLocation={useCurrentLocation}
      />

      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {category ? `${category.charAt(0).toUpperCase()}${category.slice(1)} results` : "In this area"}
            {visiblePlaces.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {visiblePlaces.length}
              </span>
            )}
          </h2>
          {category === "hotel" && compareIds.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setCompareOpen(true)}>
              <Scale className="h-3.5 w-3.5" aria-hidden />
              Compare ({compareIds.length})
            </Button>
          )}
        </div>

        {placesQuery.isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        )}

        {placesQuery.isError && (
          <div className="rounded-lg border p-3 text-sm text-muted-foreground">
            Could not load places.
            <Button size="sm" variant="outline" className="ml-2" onClick={() => placesQuery.refetch()}>
              Retry
            </Button>
          </div>
        )}

        {!placesQuery.isLoading && visiblePlaces.length === 0 && !placesQuery.isError && (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            No places in view{category ? ` for ${category}` : ""}. Move the map and use
            &ldquo;Search this area&rdquo;, or clear the filter.
          </p>
        )}

        <ul className="space-y-2">
          {visiblePlaces.map((place) => (
            <li key={place.id}>
              <PlaceCard
                place={place}
                isHighlighted={hoveredPlaceId === place.id}
                onHover={setHoveredPlaceId}
                onViewDetails={(p) => openPlace(p.slug)}
                onRouteFromHere={routeFromPlace}
              />
              {category === "hotel" && (
                <label className="mt-1 flex cursor-pointer items-center gap-2 px-1 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-primary"
                    checked={compareIds.includes(place.id)}
                    disabled={
                      !compareIds.includes(place.id) && compareIds.length >= MAX_COMPARE_HOTELS
                    }
                    onChange={() => toggleCompare(place.id)}
                  />
                  Add to comparison (max {MAX_COMPARE_HOTELS})
                </label>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader onOpenPlace={openPlace} />

      <div className="flex items-center gap-2 border-b bg-background px-3 py-2 sm:px-4">
        <CategoryFilter value={category} onChange={setCategory} />
        <div className="ml-auto md:hidden">
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => setMobileView((v) => (v === "map" ? "list" : "map"))}
            aria-label={mobileView === "map" ? "Show list" : "Show map"}
          >
            {mobileView === "map" ? (
              <List className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <MapIcon className="h-3.5 w-3.5" aria-hidden />
            )}
            {mobileView === "map" ? "List" : "Map"}
          </Button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <MapView
            places={visiblePlaces}
            selectedPlaceId={
              visiblePlaces.find((p) => p.slug === selectedPlaceSlug)?.id ?? null
            }
            hoveredPlaceId={hoveredPlaceId}
            onMarkerClick={(place) => openPlace(place.slug)}
            onMarkerHover={setHoveredPlaceId}
            onUserMovedMap={setMovedBounds}
            routePolyline={selectedRoute?.polyline}
            routeEndpoints={routeEndpoints}
            recenterSignal={recenterSignal}
          />

          {movedBounds && (
            <Button
              size="sm"
              className="absolute left-1/2 top-3 z-10 -translate-x-1/2 shadow-md"
              onClick={() => {
                setActiveBounds(movedBounds);
                setMovedBounds(null);
              }}
            >
              <Search className="h-3.5 w-3.5" aria-hidden />
              Search this area
            </Button>
          )}

          <div className="absolute bottom-20 right-3 z-10 flex flex-col gap-2 md:bottom-6">
            <Button
              size="icon"
              variant="outline"
              className="bg-background shadow-md"
              aria-label="Recenter map on the circuit area"
              title="Recenter map"
              onClick={() => {
                setActiveBounds(null);
                setMovedBounds(null);
                setRecenterSignal((n) => n + 1);
              }}
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="bg-background shadow-md"
              aria-label="Use current location as origin"
              title="Use current location"
              onClick={useCurrentLocation}
            >
              <Crosshair className="h-4 w-4" aria-hidden />
            </Button>
          </div>

          <div className="pointer-events-none absolute bottom-20 left-3 z-10 max-w-xs md:bottom-6">
            <Badge variant="secondary" className="whitespace-normal text-[10px] leading-snug">
              {RACE_DAY_WARNING}
            </Badge>
          </div>
        </div>

        {/* Desktop right panel (~32%) */}
        <aside
          className="hidden w-[440px] max-w-[35%] shrink-0 overflow-y-auto border-l bg-background p-4 md:block"
          aria-label="Route planner and results"
        >
          {sidePanel}
        </aside>
      </div>

      {/* Mobile: bottom sheet, or full-screen list when toggled */}
      <div className="md:hidden">
        {mobileView === "list" ? (
          <div className="fixed inset-x-0 bottom-0 top-[6.75rem] z-20 overflow-y-auto bg-background p-4">
            {sidePanel}
          </div>
        ) : (
          <BottomSheet>{sidePanel}</BottomSheet>
        )}
      </div>

      <HotelCompare
        hotels={compareHotels}
        open={compareOpen}
        onOpenChange={setCompareOpen}
        onRemoveHotel={(id) => setCompareIds((c) => c.filter((x) => x !== id))}
      />
    </div>
  );
}
