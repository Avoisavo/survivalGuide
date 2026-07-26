import type { LatLng, MapBounds, PlaceSummary } from "@/types/place";

export interface MapViewProps {
  places: PlaceSummary[];
  selectedPlaceId: string | null;
  hoveredPlaceId: string | null;
  onMarkerClick: (place: PlaceSummary) => void;
  onMarkerHover: (placeId: string | null) => void;
  onUserMovedMap: (bounds: MapBounds) => void;
  routePolyline?: string;
  routeEndpoints?: { origin: LatLng; destination: LatLng } | null;
  recenterSignal: number;
  onMapClick?: (location: LatLng) => void;
}
