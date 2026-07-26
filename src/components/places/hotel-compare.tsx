"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CIRCUIT, KLIA } from "@/config/site";
import { useRouteMatrix } from "@/features/routing/queries";
import { formatDuration } from "@/lib/geo/distance";
import { cn } from "@/lib/utils";
import type { PlaceSummary } from "@/types/place";

type ComparePreference =
  | "none"
  | "shortest-commute"
  | "best-transit"
  | "best-food"
  | "lowest-budget"
  | "nightlife";

const PREFERENCES: { value: ComparePreference; label: string }[] = [
  { value: "none", label: "No preference (no winner shown)" },
  { value: "shortest-commute", label: "Shortest race commute" },
  { value: "best-transit", label: "Best public transport" },
  { value: "best-food", label: "Best food access" },
  { value: "lowest-budget", label: "Lowest budget" },
  { value: "nightlife", label: "Best for nightlife" },
];

/** Destinations compared for every hotel: circuit, KLIA, and the transit hub. */
const MATRIX_DESTINATIONS = [
  { lat: CIRCUIT.lat, lng: CIRCUIT.lng, name: CIRCUIT.name },
  { lat: KLIA.lat, lng: KLIA.lng, name: KLIA.name },
];

export interface HotelCompareProps {
  hotels: PlaceSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoveHotel: (id: string) => void;
}

export function HotelCompare({ hotels, open, onOpenChange, onRemoveHotel }: HotelCompareProps) {
  const [preference, setPreference] = useState<ComparePreference>("none");

  const driveMatrix = useRouteMatrix({
    origins: hotels.map((h) => ({ lat: h.location.lat, lng: h.location.lng, name: h.name })),
    destinations: MATRIX_DESTINATIONS,
    travelMode: "drive",
    enabled: open && hotels.length >= 2,
  });
  const transitMatrix = useRouteMatrix({
    origins: hotels.map((h) => ({ lat: h.location.lat, lng: h.location.lng, name: h.name })),
    destinations: [MATRIX_DESTINATIONS[0]],
    travelMode: "transit",
    enabled: open && hotels.length >= 2,
  });

  function cellMinutes(
    matrix: typeof driveMatrix,
    originIndex: number,
    destinationIndex: number,
  ): number | undefined {
    return matrix.data?.cells.find(
      (c) => c.originIndex === originIndex && c.destinationIndex === destinationIndex,
    )?.durationMinutes;
  }

  function winnerIndex(): number | null {
    if (preference === "none" || hotels.length < 2) return null;
    const scores = hotels.map((hotel, index) => {
      switch (preference) {
        case "shortest-commute":
          return -(cellMinutes(driveMatrix, index, 0) ?? Number.MAX_SAFE_INTEGER);
        case "best-transit":
          return -(cellMinutes(transitMatrix, index, 0) ?? Number.MAX_SAFE_INTEGER);
        case "best-food":
          return hotel.tags.includes("many-food-options") ? 1 : 0;
        case "lowest-budget":
          return -(hotel.priceLevel ?? 5);
        case "nightlife":
          return hotel.tags.includes("best-for-nightlife") ? 1 : 0;
        default:
          return 0;
      }
    });
    const best = Math.max(...scores);
    const bestCount = scores.filter((s) => s === best).length;
    if (bestCount !== 1) return null;
    return scores.indexOf(best);
  }

  const winner = winnerIndex();
  const loading = driveMatrix.isLoading || transitMatrix.isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Compare hotels</DialogTitle>
          <DialogDescription>
            Travel times are estimates and may be significantly longer on race day. Pick a
            preference to highlight the strongest match — there is no single &ldquo;best&rdquo;
            hotel otherwise.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-2 max-w-xs">
          <Select value={preference} onValueChange={(v) => setPreference(v as ComparePreference)}>
            <SelectTrigger aria-label="Comparison preference">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PREFERENCES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hotels.length < 2 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Select at least two hotels (checkbox on hotel cards) to compare — up to four.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr>
                  <th className="w-40 py-2 pr-2 text-left align-bottom text-xs font-medium text-muted-foreground">
                    &nbsp;
                  </th>
                  {hotels.map((hotel, index) => (
                    <th key={hotel.id} className="px-2 py-2 text-left align-bottom">
                      <div
                        className={cn(
                          "rounded-md border p-2",
                          winner === index && "border-primary ring-1 ring-primary",
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-semibold leading-tight">
                            {hotel.name}
                          </span>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => onRemoveHotel(hotel.id)}
                            aria-label={`Remove ${hotel.name} from comparison`}
                          >
                            <X className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                        {winner === index && (
                          <Badge className="mt-1 text-[10px]">Best match</Badge>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[&_td]:px-2 [&_td]:py-1.5 [&_th]:py-1.5 [&_th]:pr-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
                <tr className="border-t">
                  <th scope="row">Drive to circuit</th>
                  {hotels.map((hotel, index) => (
                    <td key={hotel.id}>
                      {loading ? (
                        <Skeleton className="h-4 w-14" />
                      ) : (
                        (() => {
                          const minutes = cellMinutes(driveMatrix, index, 0);
                          return minutes !== undefined ? `~${formatDuration(minutes)}` : "—";
                        })()
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-t">
                  <th scope="row">Transit to circuit</th>
                  {hotels.map((hotel, index) => (
                    <td key={hotel.id}>
                      {loading ? (
                        <Skeleton className="h-4 w-14" />
                      ) : (
                        (() => {
                          const minutes = cellMinutes(transitMatrix, index, 0);
                          return minutes !== undefined ? `~${formatDuration(minutes)}` : "—";
                        })()
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-t">
                  <th scope="row">Drive to KLIA</th>
                  {hotels.map((hotel, index) => (
                    <td key={hotel.id}>
                      {loading ? (
                        <Skeleton className="h-4 w-14" />
                      ) : (
                        (() => {
                          const minutes = cellMinutes(driveMatrix, index, 1);
                          return minutes !== undefined ? `~${formatDuration(minutes)}` : "—";
                        })()
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-t">
                  <th scope="row">Price level</th>
                  {hotels.map((hotel) => (
                    <td key={hotel.id}>
                      {hotel.priceLevel ? "RM".repeat(Math.min(hotel.priceLevel, 4)) : "—"}
                    </td>
                  ))}
                </tr>
                <tr className="border-t">
                  <th scope="row">Rating</th>
                  {hotels.map((hotel) => (
                    <td key={hotel.id}>
                      {hotel.rating !== undefined
                        ? `${hotel.rating.toFixed(1)}${hotel.reviewCount !== undefined ? ` (${hotel.reviewCount})` : ""}`
                        : "—"}
                    </td>
                  ))}
                </tr>
                <tr className="border-t">
                  <th scope="row">Tags</th>
                  {hotels.map((hotel) => (
                    <td key={hotel.id}>
                      <div className="flex flex-wrap gap-1">
                        {hotel.tags.length === 0 && "—"}
                        {hotel.tags.slice(0, 4).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] font-normal">
                            {tag.replace(/-/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
