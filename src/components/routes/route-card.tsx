"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Footprints,
  Repeat,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDistance, formatDuration } from "@/lib/geo/distance";
import type { RouteOption } from "@/types/route";
import { RouteTimeline } from "./route-timeline";

const KIND_LABELS: Record<RouteOption["kind"], string> = {
  "race-day": "Best for race day",
  fastest: "Fastest",
  cheapest: "Lowest estimated cost",
  "least-walking": "Least walking",
  "fewest-transfers": "Fewest transfers",
};

function reliabilityLabel(score: number): { label: string; className: string } {
  if (score >= 75) return { label: "Reliable", className: "text-emerald-600 dark:text-emerald-400" };
  if (score >= 55) return { label: "Moderate", className: "text-amber-600 dark:text-amber-400" };
  return { label: "Variable", className: "text-red-600 dark:text-red-400" };
}

function formatArrival(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit" });
}

export interface RouteCardProps {
  route: RouteOption;
  isSelected: boolean;
  onSelect: (route: RouteOption) => void;
}

export function RouteCard({ route, isSelected, onSelect }: RouteCardProps) {
  const [expanded, setExpanded] = useState(false);
  const reliability = reliabilityLabel(route.reliabilityScore);
  const arrival = formatArrival(route.arrivalTime);
  const hasCost = route.estimatedCostMin !== undefined;

  return (
    <Card
      data-testid="route-card"
      className={cn(
        "gap-3 py-4 transition-colors",
        isSelected && "border-primary ring-1 ring-primary",
      )}
    >
      <CardHeader className="gap-1 px-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={route.kind === "race-day" ? "default" : "secondary"}>
            {KIND_LABELS[route.kind]}
          </Badge>
          <span className="text-lg font-semibold tabular-nums">
            {formatDuration(route.totalDurationMinutes)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{route.title}</span>
          {arrival && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden /> arrive ~{arrival}
            </span>
          )}
          {route.totalDistanceMeters !== undefined && (
            <span>{formatDistance(route.totalDistanceMeters)}</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="flex items-center gap-1.5">
            <Footprints className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <dt className="sr-only">Walking</dt>
            <dd>
              {route.totalWalkingMinutes} min walk
              {route.totalWalkingMeters > 0 && ` (${formatDistance(route.totalWalkingMeters)})`}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Repeat className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <dt className="sr-only">Transfers</dt>
            <dd>
              {route.transfers === 0 ? "No transfers" : `${route.transfers} transfer${route.transfers > 1 ? "s" : ""}`}
              {" · "}
              {route.legs.length} leg{route.legs.length > 1 ? "s" : ""}
            </dd>
          </div>
          {hasCost && (
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              <dt className="sr-only">Estimated cost</dt>
              <dd>
                est. {route.currency ?? "MYR"} {route.estimatedCostMin}
                {route.estimatedCostMax !== undefined &&
                route.estimatedCostMax !== route.estimatedCostMin
                  ? `–${route.estimatedCostMax}`
                  : ""}
              </dd>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <ShieldCheck className={cn("h-3.5 w-3.5", reliability.className)} aria-hidden />
            <dt className="sr-only">Reliability</dt>
            <dd className={reliability.className}>{reliability.label}</dd>
          </div>
        </dl>

        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Why this route?</span>{" "}
          {route.explanation}
        </p>

        {route.warnings.length > 0 && (
          <div className="space-y-1">
            {route.warnings.map((warning) => (
              <p
                key={warning}
                className="flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200"
              >
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                {warning}
              </p>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isSelected ? "secondary" : "default"}
            onClick={() => onSelect(route)}
          >
            {isSelected ? "Selected" : "Select route"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? "Hide steps" : "Show steps"}
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
              aria-hidden
            />
          </Button>
        </div>

        {expanded && (
          <div className="border-t pt-3">
            <RouteTimeline legs={route.legs} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
