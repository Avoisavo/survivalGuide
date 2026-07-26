"use client";

import { useMemo } from "react";
import { DEFAULT_MAP_BOUNDS } from "@/config/site";
import { cn } from "@/lib/utils";
import type { LatLng } from "@/types/place";
import { MARKER_STYLES } from "./marker-style";
import type { MapViewProps } from "./map-types";

/**
 * Keyless fallback map used in demo mode: a schematic (non-geographic-tiles)
 * view that projects real lat/lng onto a styled canvas so every map
 * interaction — markers, hover sync, selection, route line — works without
 * a Google Maps browser key. Replaced automatically once a key is set.
 */
function project(point: LatLng): { x: number; y: number } {
  const b = DEFAULT_MAP_BOUNDS;
  const x = ((point.lng - b.west) / (b.east - b.west)) * 100;
  const y = ((b.north - point.lat) / (b.north - b.south)) * 100;
  return { x: Math.min(98, Math.max(2, x)), y: Math.min(98, Math.max(2, y)) };
}

export default function DemoMapView({
  places,
  selectedPlaceId,
  hoveredPlaceId,
  onMarkerClick,
  onMarkerHover,
  routeEndpoints,
}: MapViewProps) {
  const routeLine = useMemo(() => {
    if (!routeEndpoints) return null;
    return { from: project(routeEndpoints.origin), to: project(routeEndpoints.destination) };
  }, [routeEndpoints]);

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-[#e8ecef] dark:bg-[#1c2226]"
      role="application"
      aria-label="Demo map of the Sepang area"
    >
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <pattern id="demo-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-black/5 dark:text-white/5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#demo-grid)" />
        {/* Schematic trunk roads */}
        <path d="M 10% 90% Q 40% 60% 52% 38% T 95% 15%" fill="none" stroke="currentColor" strokeWidth="6" className="text-black/10 dark:text-white/10" />
        <path d="M 0% 40% Q 35% 45% 60% 30% T 100% 45%" fill="none" stroke="currentColor" strokeWidth="4" className="text-black/10 dark:text-white/10" />
        {routeLine && (
          <line
            x1={`${routeLine.from.x}%`}
            y1={`${routeLine.from.y}%`}
            x2={`${routeLine.to.x}%`}
            y2={`${routeLine.to.y}%`}
            stroke="#2563eb"
            strokeWidth="3"
            strokeDasharray="8 6"
            strokeLinecap="round"
          />
        )}
      </svg>

      {places.map((place) => {
        const { x, y } = project(place.location);
        const style = MARKER_STYLES[place.category];
        const active = place.id === selectedPlaceId || place.id === hoveredPlaceId;
        return (
          <button
            key={place.id}
            type="button"
            className={cn(
              "absolute -translate-x-1/2 -translate-y-full rounded-full transition-transform focus-visible:outline-2 focus-visible:outline-offset-2",
              active ? "z-20 scale-125" : "z-10 hover:scale-110",
            )}
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-label={`${style.label}: ${place.name}`}
            onClick={() => onMarkerClick(place)}
            onMouseEnter={() => onMarkerHover(place.id)}
            onMouseLeave={() => onMarkerHover(null)}
            onFocus={() => onMarkerHover(place.id)}
            onBlur={() => onMarkerHover(null)}
          >
            <svg width={active ? 42 : 34} height={active ? 42 : 34} viewBox="0 0 36 36">
              <path
                d="M18 2C11.4 2 6 7.4 6 14c0 8.4 10.2 19 12 19s12-10.6 12-19c0-6.6-5.4-12-12-12z"
                fill={style.color}
                stroke="white"
                strokeWidth="2"
              />
              <g
                transform="translate(11 7) scale(0.58)"
                fill="none"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={style.iconPath} />
              </g>
            </svg>
          </button>
        );
      })}

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-background/90 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
        Schematic demo map — set a Google Maps browser key for the full map
      </div>
    </div>
  );
}
