"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { PlaceCategory } from "@/types/place";
import type { TravelMode } from "@/types/route";

const CATEGORIES: PlaceCategory[] = ["hotel", "food", "transit", "deal", "essential", "circuit"];
const MODES: TravelMode[] = ["recommended", "drive", "transit", "walk", "ride-hailing", "mixed"];

export interface MapUrlState {
  category: PlaceCategory | null;
  place: string | null;
  origin: string | null;
  mode: TravelMode;
}

/**
 * Meaningful state (filters, selected place, origin, travel mode) lives in
 * URL search params so links are shareable. Updates are debounced and use
 * router.replace to avoid history spam; map movement never touches the URL.
 */
export function useMapUrlState(): [MapUrlState, (next: Partial<MapUrlState>) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pendingRef = useRef<Partial<MapUrlState>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const state = useMemo<MapUrlState>(() => {
    const category = searchParams.get("category") as PlaceCategory | null;
    const mode = searchParams.get("mode") as TravelMode | null;
    return {
      category: category && CATEGORIES.includes(category) ? category : null,
      place: searchParams.get("place"),
      origin: searchParams.get("origin"),
      mode: mode && MODES.includes(mode) ? mode : "recommended",
    };
  }, [searchParams]);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const update = useCallback(
    (next: Partial<MapUrlState>) => {
      pendingRef.current = { ...pendingRef.current, ...next };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const merged = { ...stateRef.current, ...pendingRef.current };
        pendingRef.current = {};
        const params = new URLSearchParams();
        if (merged.category) params.set("category", merged.category);
        if (merged.place) params.set("place", merged.place);
        if (merged.origin) params.set("origin", merged.origin);
        if (merged.mode && merged.mode !== "recommended") params.set("mode", merged.mode);
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      }, 250);
    },
    [pathname, router],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return [state, update];
}
