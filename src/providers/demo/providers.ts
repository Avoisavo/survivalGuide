import { haversineMeters, estimateWalkingMinutes } from "@/lib/geo/distance";
import type { LatLng, Place, PlaceCategory } from "@/types/place";
import type { RouteLeg, RouteMatrixCell } from "@/types/route";
import type {
  ComputeMatrixOptions,
  ComputeRoutesOptions,
  ExternalNearbyOptions,
  ExternalPlaceCandidate,
  ExternalPlaceDetails,
  PlacesProvider,
  PlaceStore,
  ProviderRoute,
  RoutingProvider,
} from "@/providers/types";
import { DEMO_PLACES } from "./demo-data";

/** Average speeds used to simulate believable demo travel times. */
const SPEED_METERS_PER_MINUTE = {
  drive: 600, // ~36 km/h with local roads and junctions
  "ride-hailing": 600,
  transit: 450,
  walk: 80,
} as const;

/** Roads are never straight lines; inflate straight-line distance. */
const ROAD_DISTANCE_FACTOR = 1.35;

function resolveEndpoint(endpoint: {
  placeId?: string;
  lat?: number;
  lng?: number;
  name?: string;
}): { location: LatLng; name: string } | null {
  if (endpoint.lat !== undefined && endpoint.lng !== undefined) {
    return {
      location: { lat: endpoint.lat, lng: endpoint.lng },
      name: endpoint.name ?? "Selected point",
    };
  }
  if (endpoint.placeId) {
    const match = DEMO_PLACES.find(
      (p) => p.id === endpoint.placeId || p.slug === endpoint.placeId,
    );
    if (match) return { location: match.location, name: match.name };
  }
  return null;
}

export class DemoPlacesProvider implements PlacesProvider {
  async searchText(query: string): Promise<ExternalPlaceCandidate[]> {
    const q = query.toLowerCase();
    return DEMO_PLACES.filter((p) => p.name.toLowerCase().includes(q)).map((p) => ({
      externalId: p.id,
      name: p.name,
      address: p.address,
      location: p.location,
    }));
  }

  async getDetails(externalId: string): Promise<ExternalPlaceDetails | null> {
    const place = DEMO_PLACES.find((p) => p.id === externalId || p.slug === externalId);
    if (!place) return null;
    return {
      externalId: place.id,
      name: place.name,
      address: place.address,
      location: place.location,
      rating: place.rating,
      reviewCount: place.reviewCount,
      priceLevel: place.priceLevel,
      openNow: place.openNow,
    };
  }

  async searchNearby(options: ExternalNearbyOptions): Promise<ExternalPlaceDetails[]> {
    return DEMO_PLACES.filter((p) => {
      if (options.category && p.category !== options.category) return false;
      return haversineMeters(options.center, p.location) <= options.radiusMeters;
    })
      .slice(0, options.limit ?? 20)
      .map((p) => ({
        externalId: p.id,
        name: p.name,
        address: p.address,
        location: p.location,
        rating: p.rating,
        reviewCount: p.reviewCount,
        priceLevel: p.priceLevel,
        openNow: p.openNow,
      }));
  }
}

export class DemoRoutingProvider implements RoutingProvider {
  async computeRoutes(options: ComputeRoutesOptions): Promise<ProviderRoute[]> {
    const origin = resolveEndpoint(options.origin);
    const destination = resolveEndpoint(options.destination);
    if (!origin || !destination) return [];

    const straight = haversineMeters(origin.location, destination.location);
    const roadMeters = Math.round(straight * ROAD_DISTANCE_FACTOR);
    const speed = SPEED_METERS_PER_MINUTE[options.travelMode];
    const baseMinutes = Math.max(1, Math.round(roadMeters / speed));

    const buildRoute = (
      minutes: number,
      variant: number,
      legs: RouteLeg[],
    ): ProviderRoute => ({
      legs,
      totalDurationMinutes: minutes,
      totalDistanceMeters: roadMeters + variant * 900,
    });

    if (options.travelMode === "walk") {
      if (roadMeters > 8000) return [];
      return [
        buildRoute(baseMinutes, 0, [
          {
            id: "demo-walk-0",
            mode: "walk",
            title: `Walk to ${destination.name}`,
            description: "Simulated walking route (demo data).",
            originName: origin.name,
            destinationName: destination.name,
            durationMinutes: baseMinutes,
            distanceMeters: roadMeters,
            source: "google",
          },
        ]),
      ];
    }

    if (options.travelMode === "transit") {
      const walkToStation = 7;
      const rideMinutes = Math.max(5, baseMinutes - 4);
      const walkFromStation = 9;
      return [
        buildRoute(walkToStation + rideMinutes + walkFromStation, 0, [
          {
            id: "demo-transit-0",
            mode: "walk",
            title: "Walk to Demo Transit Hub",
            description: "Simulated walk to the nearest rail hub (demo data).",
            originName: origin.name,
            destinationName: "Demo Transit Hub",
            durationMinutes: walkToStation,
            distanceMeters: walkToStation * 80,
            source: "google",
          },
          {
            id: "demo-transit-1",
            mode: "train",
            title: "Board demo airport rail",
            description: "Simulated rail segment (demo data).",
            originName: "Demo Transit Hub",
            destinationName: "Demo North Station",
            durationMinutes: rideMinutes,
            distanceMeters: roadMeters - 1200,
            estimatedCostMin: 5,
            estimatedCostMax: 15,
            currency: "MYR",
            source: "google",
          },
          {
            id: "demo-transit-2",
            mode: "walk",
            title: `Walk to ${destination.name}`,
            description: "Simulated final walk (demo data).",
            originName: "Demo North Station",
            destinationName: destination.name,
            durationMinutes: walkFromStation,
            distanceMeters: walkFromStation * 80,
            source: "google",
          },
        ]),
      ];
    }

    const driveTitle =
      options.travelMode === "ride-hailing"
        ? `Ride to ${destination.name}`
        : `Drive to ${destination.name}`;
    const costs =
      options.travelMode === "ride-hailing"
        ? { estimatedCostMin: Math.max(8, Math.round(roadMeters / 550)), estimatedCostMax: Math.max(15, Math.round(roadMeters / 300)), currency: "MYR" }
        : {};

    const primary = buildRoute(baseMinutes, 0, [
      {
        id: "demo-drive-0",
        mode: options.travelMode === "ride-hailing" ? "ride-hailing" : "drive",
        title: driveTitle,
        description: "Simulated traffic-aware road route (demo data).",
        originName: origin.name,
        destinationName: destination.name,
        durationMinutes: baseMinutes,
        distanceMeters: roadMeters,
        source: "google",
        ...costs,
      },
    ]);

    if (!options.alternatives) return [primary];

    const slowerMinutes = Math.round(baseMinutes * 1.25) + 3;
    const alternative = buildRoute(slowerMinutes, 1, [
      {
        id: "demo-drive-alt-0",
        mode: options.travelMode === "ride-hailing" ? "ride-hailing" : "drive",
        title: `${driveTitle} (via demo trunk road)`,
        description: "Simulated alternative avoiding the demo expressway (demo data).",
        originName: origin.name,
        destinationName: destination.name,
        durationMinutes: slowerMinutes,
        distanceMeters: roadMeters + 900,
        source: "google",
        ...costs,
      },
    ]);
    return [primary, alternative];
  }

  async computeRouteMatrix(options: ComputeMatrixOptions): Promise<RouteMatrixCell[]> {
    const cells: RouteMatrixCell[] = [];
    const speed = SPEED_METERS_PER_MINUTE[options.travelMode];
    options.origins.forEach((o, oi) => {
      options.destinations.forEach((d, di) => {
        const origin = resolveEndpoint(o);
        const destination = resolveEndpoint(d);
        if (!origin || !destination) {
          cells.push({ originIndex: oi, destinationIndex: di, status: "unavailable" });
          return;
        }
        const meters = Math.round(
          haversineMeters(origin.location, destination.location) * ROAD_DISTANCE_FACTOR,
        );
        cells.push({
          originIndex: oi,
          destinationIndex: di,
          durationMinutes: Math.max(1, Math.round(meters / speed)),
          distanceMeters: meters,
          status: "ok",
        });
      });
    });
    return cells;
  }
}

export class DemoPlaceStore implements PlaceStore {
  async listPlaces(filter: {
    category?: PlaceCategory;
    bounds?: { north: number; south: number; east: number; west: number };
    verified?: boolean;
    q?: string;
    limit: number;
    offset: number;
  }): Promise<Place[]> {
    let places = DEMO_PLACES.filter((p) => p.category !== "deal");
    if (filter.category) places = places.filter((p) => p.category === filter.category);
    if (filter.verified !== undefined) {
      places = places.filter((p) => p.verified === filter.verified);
    }
    if (filter.q) {
      const q = filter.q.toLowerCase();
      places = places.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (filter.bounds) {
      const b = filter.bounds;
      places = places.filter(
        (p) =>
          p.location.lat <= b.north &&
          p.location.lat >= b.south &&
          p.location.lng <= b.east &&
          p.location.lng >= b.west,
      );
    }
    return places.slice(filter.offset, filter.offset + filter.limit);
  }

  async getPlaceByIdOrSlug(idOrSlug: string): Promise<Place | null> {
    return DEMO_PLACES.find((p) => p.id === idOrSlug || p.slug === idOrSlug) ?? null;
  }

  async listNearby(options: {
    center: LatLng;
    radiusMeters: number;
    category?: PlaceCategory;
    limit: number;
  }): Promise<(Place & { distanceMeters: number })[]> {
    return DEMO_PLACES.map((p) => ({
      ...p,
      distanceMeters: Math.round(haversineMeters(options.center, p.location)),
    }))
      .filter((p) => {
        if (p.distanceMeters > options.radiusMeters) return false;
        if (options.category && p.category !== options.category) return false;
        return p.distanceMeters > 0;
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, options.limit)
      .map((p) => ({
        ...p,
        walkingMinutes: estimateWalkingMinutes(p.distanceMeters),
      }));
  }
}
