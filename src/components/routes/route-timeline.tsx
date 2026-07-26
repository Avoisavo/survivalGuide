"use client";

import { Bus, Car, Footprints, TrainFront, TramFront, CarTaxiFront } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistance } from "@/lib/geo/distance";
import type { RouteLeg } from "@/types/route";

const LEG_ICONS: Record<RouteLeg["mode"], typeof Footprints> = {
  walk: Footprints,
  drive: Car,
  transit: TramFront,
  train: TrainFront,
  bus: Bus,
  shuttle: Bus,
  "ride-hailing": CarTaxiFront,
};

function formatTime(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-MY", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RouteTimeline({ legs }: { legs: RouteLeg[] }) {
  return (
    <ol className="space-y-0" aria-label="Route steps">
      {legs.map((leg, index) => {
        const Icon = LEG_ICONS[leg.mode];
        const time = formatTime(leg.departureTime);
        const isLast = index === legs.length - 1;
        return (
          <li key={leg.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-[13px] top-7 h-full w-px bg-border"
              />
            )}
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background">
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                {time && (
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    {time}
                  </span>
                )}
                <span className="text-sm font-medium">{leg.title}</span>
                {leg.source === "curated" && (
                  <Badge variant="outline" className="text-[10px]">
                    Curated
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{leg.description}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {leg.durationMinutes} min
                {leg.distanceMeters !== undefined &&
                  ` · ${formatDistance(leg.distanceMeters)}`}
                {leg.estimatedCostMin !== undefined &&
                  ` · est. ${leg.currency ?? "MYR"} ${leg.estimatedCostMin}${
                    leg.estimatedCostMax !== undefined &&
                    leg.estimatedCostMax !== leg.estimatedCostMin
                      ? `–${leg.estimatedCostMax}`
                      : ""
                  }`}
              </p>
              {leg.warning && (
                <p className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  {leg.warning}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
