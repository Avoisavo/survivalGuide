import "server-only";
import { hasLiveProviders, hasSupabase, isDemoMode } from "@/config/env";
import { GooglePlacesProvider } from "@/providers/google/places";
import { GoogleRoutingProvider } from "@/providers/google/routing";
import {
  DemoPlacesProvider,
  DemoPlaceStore,
  DemoRoutingProvider,
} from "@/providers/demo/providers";
import { SupabasePlaceStore } from "@/lib/supabase/place-store";
import type { PlacesProvider, PlaceStore, RoutingProvider } from "@/providers/types";

/**
 * Provider factory. Demo mode (or missing keys) falls back to clearly
 * labelled demo implementations while keeping every interface intact, so
 * swapping in another provider later only touches this module.
 */
export function getPlacesProvider(): PlacesProvider {
  if (isDemoMode() || !hasLiveProviders()) return new DemoPlacesProvider();
  return new GooglePlacesProvider();
}

export function getRoutingProvider(): RoutingProvider {
  if (isDemoMode() || !hasLiveProviders()) return new DemoRoutingProvider();
  return new GoogleRoutingProvider();
}

export function getPlaceStore(): PlaceStore {
  if (isDemoMode() || !hasSupabase()) return new DemoPlaceStore();
  return new SupabasePlaceStore();
}

export function usingDemoData(): boolean {
  return isDemoMode() || !hasLiveProviders();
}
