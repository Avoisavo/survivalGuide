import "server-only";
import { hasSupabase, isDemoMode } from "@/config/env";
import { createSupabaseAnonClient } from "@/lib/supabase/server";
import { CIRCUIT } from "@/config/site";
import type { LatLng } from "@/types/place";
import type { RouteLeg } from "@/types/route";

export interface RouteTemplate {
  id: string;
  name: string;
  slug: string;
  originLocation: LatLng;
  originName: string;
  destinationLocation: LatLng;
  destinationName: string;
  steps: Omit<RouteLeg, "id" | "source">[];
  estimatedCostMin?: number;
  estimatedCostMax?: number;
  currency: string;
  reliabilityScore: number;
  raceDaySuitabilityScore: number;
  warning?: string;
  verified: boolean;
  lastVerifiedAt?: string;
}

const DEMO_ROUTE_TEMPLATES: RouteTemplate[] = [
  {
    id: "demo-template-hub-shuttle",
    name: "Demo Transit Hub to circuit via event shuttle",
    slug: "demo-hub-shuttle-route",
    originLocation: { lat: 2.7431, lng: 101.7016 },
    originName: "Demo Transit Hub",
    destinationLocation: { lat: CIRCUIT.lat, lng: CIRCUIT.lng },
    destinationName: CIRCUIT.name,
    steps: [
      {
        mode: "shuttle",
        title: "Board race-day shuttle",
        description: "Demo event shuttle from the hub shuttle bay to the circuit apron.",
        originName: "Demo Transit Hub",
        destinationName: "Circuit shuttle apron",
        durationMinutes: 32,
        estimatedCostMin: 0,
        estimatedCostMax: 10,
        currency: "MYR",
        warning: "Queues peak 90 minutes before the race start (demo).",
      },
      {
        mode: "walk",
        title: "Walk to circuit gate",
        description: "Follow event signage from the shuttle apron to the main gates.",
        originName: "Circuit shuttle apron",
        destinationName: CIRCUIT.name,
        durationMinutes: 8,
        distanceMeters: 640,
      },
    ],
    estimatedCostMin: 0,
    estimatedCostMax: 10,
    currency: "MYR",
    reliabilityScore: 70,
    raceDaySuitabilityScore: 90,
    warning: "Shuttle operates on race weekend only (demo).",
    verified: true,
    lastVerifiedAt: new Date().toISOString(),
  },
];

interface TemplateRow {
  id: string;
  name: string;
  slug: string;
  steps: unknown;
  estimated_cost_min: number | null;
  estimated_cost_max: number | null;
  currency: string;
  reliability_score: number | null;
  race_day_suitability_score: number | null;
  warning: string | null;
  verified: boolean;
  last_verified_at: string | null;
  origin: { name: string; lat: number; lng: number } | null;
  destination: { name: string; lat: number; lng: number } | null;
}

/**
 * Active, in-window route templates whose destination is the circuit.
 * Demo mode serves the curated demo template so the mixed-route flow is
 * fully demonstrable without a database.
 */
export async function getActiveRouteTemplates(): Promise<RouteTemplate[]> {
  if (isDemoMode() || !hasSupabase()) return DEMO_ROUTE_TEMPLATES;

  const supabase = createSupabaseAnonClient();
  const { data, error } = await supabase.rpc("active_route_templates");
  if (error) {
    console.error("[templates] failed to load route templates:", error.message);
    return [];
  }
  return ((data ?? []) as TemplateRow[])
    .filter((row) => row.origin && row.destination)
    .map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      originLocation: { lat: row.origin!.lat, lng: row.origin!.lng },
      originName: row.origin!.name,
      destinationLocation: { lat: row.destination!.lat, lng: row.destination!.lng },
      destinationName: row.destination!.name,
      steps: (Array.isArray(row.steps) ? row.steps : []) as RouteTemplate["steps"],
      estimatedCostMin: row.estimated_cost_min ?? undefined,
      estimatedCostMax: row.estimated_cost_max ?? undefined,
      currency: row.currency,
      reliabilityScore: row.reliability_score ?? 60,
      raceDaySuitabilityScore: row.race_day_suitability_score ?? 60,
      warning: row.warning ?? undefined,
      verified: row.verified,
      lastVerifiedAt: row.last_verified_at ?? undefined,
    }));
}
