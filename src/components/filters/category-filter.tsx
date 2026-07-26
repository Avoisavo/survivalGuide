"use client";

import { BedDouble, Cross, Flag, TicketPercent, TramFront, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlaceCategory } from "@/types/place";

const FILTERS: { value: PlaceCategory; label: string; icon: typeof BedDouble }[] = [
  { value: "hotel", label: "Hotels", icon: BedDouble },
  { value: "food", label: "Food", icon: Utensils },
  { value: "transit", label: "Transit", icon: TramFront },
  { value: "deal", label: "Deals", icon: TicketPercent },
  { value: "essential", label: "Essentials", icon: Cross },
  { value: "circuit", label: "Circuit", icon: Flag },
];

export function CategoryFilter({
  value,
  onChange,
}: {
  value: PlaceCategory | null;
  onChange: (category: PlaceCategory | null) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Filter by category">
      {FILTERS.map((filter) => {
        const active = value === filter.value;
        const Icon = filter.icon;
        return (
          <Button
            key={filter.value}
            size="sm"
            variant={active ? "default" : "outline"}
            className={cn("h-8 shrink-0 rounded-full px-3", !active && "bg-background")}
            aria-pressed={active}
            onClick={() => onChange(active ? null : filter.value)}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {filter.label}
          </Button>
        );
      })}
    </div>
  );
}
