"use client";

import { ExternalLink, LocateFixed, Navigation } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { COST_ESTIMATE_DISCLAIMER } from "@/config/site";
import { useRoutePlan, type RoutePlanInput } from "@/features/routing/queries";
import {
  googleMapsDirectionsUrl,
  wazeUrl,
} from "@/lib/routing/external-links";
import type { RouteEndpoint, RouteOption, RoutePreferences, TravelMode } from "@/types/route";
import { OriginSearch } from "./origin-search";
import { RouteCard } from "./route-card";

const TRAVEL_MODES: { value: TravelMode; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "drive", label: "Driving" },
  { value: "transit", label: "Transit" },
  { value: "walk", label: "Walking" },
  { value: "ride-hailing", label: "Ride-hailing" },
  { value: "mixed", label: "Mixed route" },
];

export interface RoutePlannerProps {
  origin: RouteEndpoint | null;
  destination: RouteEndpoint | null;
  travelMode: TravelMode;
  departureDate: string;
  departureTime: string;
  preferences: RoutePreferences;
  selectedRouteId: string | null;
  onOriginChange: (endpoint: RouteEndpoint | null) => void;
  onTravelModeChange: (mode: TravelMode) => void;
  onDepartureDateChange: (date: string) => void;
  onDepartureTimeChange: (time: string) => void;
  onPreferencesChange: (preferences: RoutePreferences) => void;
  onRouteSelect: (route: RouteOption) => void;
  onUseCurrentLocation: () => void;
}

function departureIso(date: string, time: string): string | undefined {
  if (!date || !time) return undefined;
  const value = new Date(`${date}T${time}`);
  return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
}

export function RoutePlanner(props: RoutePlannerProps) {
  const departure = departureIso(props.departureDate, props.departureTime);
  const planInput: RoutePlanInput = {
    origin: props.origin,
    destination: props.destination,
    departureTime: departure,
    travelMode: props.travelMode,
    preferences: props.preferences,
  };
  const { data, isLoading, isError, refetch, isFetching } = useRoutePlan(planInput);

  const routes = data?.routes ?? [];
  const ready = props.origin !== null && props.destination !== null;
  const selectedRoute =
    routes.find((r) => r.id === props.selectedRouteId) ?? routes[0] ?? null;

  return (
    <section aria-label="Route planner" className="flex flex-col gap-4">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="origin-search">From</Label>
          <div className="flex gap-2">
            <OriginSearch
              id="origin-search"
              value={props.origin}
              onChange={props.onOriginChange}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={props.onUseCurrentLocation}
              aria-label="Use current location"
              title="Use current location"
            >
              <LocateFixed className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>To</Label>
          <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
            <Navigation className="mr-2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {props.destination?.name ?? "Sepang International Circuit"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="departure-date">Race day</Label>
            <Input
              id="departure-date"
              type="date"
              value={props.departureDate}
              onChange={(e) => props.onDepartureDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="departure-time">Leave at</Label>
            <Input
              id="departure-time"
              type="time"
              value={props.departureTime}
              onChange={(e) => props.onDepartureTimeChange(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="travel-mode">Travel mode</Label>
          <Select
            value={props.travelMode}
            onValueChange={(value) => props.onTravelModeChange(value as TravelMode)}
          >
            <SelectTrigger id="travel-mode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRAVEL_MODES.map((mode) => (
                <SelectItem key={mode.value} value={mode.value}>
                  {mode.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={props.preferences.lessWalking ?? false}
              onCheckedChange={(checked) =>
                props.onPreferencesChange({ ...props.preferences, lessWalking: checked })
              }
            />
            Less walking
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={props.preferences.fewerTransfers ?? false}
              onCheckedChange={(checked) =>
                props.onPreferencesChange({ ...props.preferences, fewerTransfers: checked })
              }
            />
            Fewer transfers
          </label>
        </div>
      </div>

      {!ready && (
        <Alert>
          <AlertDescription>
            Choose a starting point — search above, tap a hotel on the map, or use your
            current location — to see race-day route options to the circuit.
          </AlertDescription>
        </Alert>
      )}

      {ready && (isLoading || isFetching) && (
        <div className="space-y-3" aria-label="Loading routes">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      )}

      {ready && isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-2">
            Route lookup failed.
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {ready && !isLoading && !isFetching && !isError && routes.length === 0 && (
        <Alert>
          <AlertDescription>
            No verified route is currently available for this combination. Try a
            different travel mode.
          </AlertDescription>
        </Alert>
      )}

      {ready && !isLoading && routes.length > 0 && (
        <div className="space-y-3">
          {data?.advisories.map((advisory) => (
            <p key={advisory} className="text-xs text-muted-foreground">
              {advisory}
            </p>
          ))}
          {routes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              isSelected={selectedRoute?.id === route.id}
              onSelect={props.onRouteSelect}
            />
          ))}
          <p className="text-xs text-muted-foreground">{COST_ESTIMATE_DISCLAIMER}</p>

          {selectedRoute && props.origin && props.destination && (
            <div className="flex gap-2 border-t pt-3">
              <Button asChild variant="outline" size="sm" className="flex-1">
                <a
                  href={googleMapsDirectionsUrl(
                    props.origin,
                    props.destination,
                    selectedRoute.travelMode,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Google Maps
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </Button>
              <Button asChild variant="outline" size="sm" className="flex-1">
                <a
                  href={wazeUrl(props.destination)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Waze
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
