"use client";

import { MapPin, Moon, Route, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistance } from "@/lib/geo/distance";
import type { NearbyPlace, Place, PlaceSummary } from "@/types/place";
import { MARKER_STYLES } from "@/components/map/marker-style";
import { SaveButton } from "./save-button";
import { VerificationBadge } from "./verification-badge";

const HALAL_LABELS: Record<string, string> = {
  "halal-certified": "Halal certified",
  "muslim-friendly": "Muslim friendly",
};

function priceLevelText(level?: number): string | null {
  if (level === undefined || level <= 0) return null;
  return "RM".repeat(Math.min(level, 4));
}

export interface PlaceCardProps {
  place: PlaceSummary & Partial<Place> & Partial<Pick<NearbyPlace, "distanceMeters" | "walkingMinutes">>;
  isHighlighted: boolean;
  onHover: (id: string | null) => void;
  onViewDetails: (place: PlaceSummary) => void;
  onRouteFromHere: (place: PlaceSummary) => void;
}

export function PlaceCard({
  place,
  isHighlighted,
  onHover,
  onViewDetails,
  onRouteFromHere,
}: PlaceCardProps) {
  const style = MARKER_STYLES[place.category];
  const price = priceLevelText(place.priceLevel);

  return (
    <div
      data-testid={`place-card-${place.slug}`}
      className={cn(
        "rounded-lg border bg-card p-3 transition-colors",
        isHighlighted && "border-primary bg-accent/50",
      )}
      onMouseEnter={() => onHover(place.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: style.color }}
              aria-hidden
            />
            <button
              type="button"
              className="truncate text-left text-sm font-semibold hover:underline"
              onClick={() => onViewDetails(place)}
            >
              {place.name}
            </button>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span>{style.label}</span>
            {place.subcategory && <span>· {place.subcategory.replace(/-/g, " ")}</span>}
            {price && <span>· {price}</span>}
            {place.rating !== undefined && (
              <span className="inline-flex items-center gap-0.5">
                · <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                {place.rating.toFixed(1)}
                {place.reviewCount !== undefined && ` (${place.reviewCount})`}
              </span>
            )}
          </div>
        </div>
        {place.isDemo && (
          <Badge variant="outline" className="shrink-0 text-[10px]">
            Demo data
          </Badge>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {place.distanceMeters !== undefined && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" aria-hidden />
            {formatDistance(place.distanceMeters)}
            {place.walkingMinutes !== undefined && ` · ~${place.walkingMinutes} min walk`}
          </span>
        )}
        {place.isOpenLate && (
          <span className="inline-flex items-center gap-1">
            <Moon className="h-3 w-3" aria-hidden /> Open late
          </span>
        )}
        {place.halalStatus && HALAL_LABELS[place.halalStatus] && (
          <span>{HALAL_LABELS[place.halalStatus]}</span>
        )}
        {place.vegetarianFriendly && <span>Vegetarian friendly</span>}
      </div>

      {place.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {place.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] font-normal">
              {tag.replace(/-/g, " ")}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <VerificationBadge verified={place.verified} lastVerifiedAt={place.lastVerifiedAt} />
        <div className="flex gap-1.5">
          <SaveButton place={place} />
          {place.category !== "circuit" && (
            <Button size="sm" onClick={() => onRouteFromHere(place)}>
              <Route className="h-3.5 w-3.5" aria-hidden />
              Route to circuit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
