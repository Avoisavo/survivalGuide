"use client";

import { Bookmark, MapPinned } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { clientEnv } from "@/config/env";
import { SITE_NAME } from "@/config/site";
import {
  getSavedPlacesSnapshot,
  getServerSavedPlacesSnapshot,
  subscribeSavedPlaces,
} from "@/lib/saved-places";

function SavedPlacesSheet({ onOpenPlace }: { onOpenPlace: (slug: string) => void }) {
  const saved = useSyncExternalStore(
    subscribeSavedPlaces,
    getSavedPlacesSnapshot,
    getServerSavedPlacesSnapshot,
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Saved places">
          <Bookmark className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Saved</span>
          {saved.length > 0 && (
            <Badge variant="secondary" className="px-1.5 text-[10px]">
              {saved.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Saved places</SheetTitle>
        </SheetHeader>
        <div className="space-y-1.5 overflow-y-auto px-4 pb-4">
          {saved.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing saved yet. Use the Save button on any place to keep it here (stored
              on this device only).
            </p>
          )}
          {saved.map((place) => (
            <button
              key={place.id}
              type="button"
              className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => onOpenPlace(place.slug)}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{place.name}</span>
                <span className="text-xs capitalize text-muted-foreground">{place.category}</span>
              </span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AppHeader({ onOpenPlace }: { onOpenPlace: (slug: string) => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background px-3 sm:px-4">
      <Link href="/" className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <MapPinned className="h-4.5 w-4.5" aria-hidden />
        </span>
        <span className="truncate text-sm font-semibold sm:text-base">{SITE_NAME}</span>
        <Badge variant="outline" className="hidden text-[10px] font-normal sm:inline-flex">
          Unofficial
        </Badge>
        {clientEnv.NEXT_PUBLIC_DEMO_MODE && (
          <Badge className="bg-amber-500 text-[10px] text-white hover:bg-amber-500">
            Demo data
          </Badge>
        )}
      </Link>
      <SavedPlacesSheet onOpenPlace={onOpenPlace} />
    </header>
  );
}
