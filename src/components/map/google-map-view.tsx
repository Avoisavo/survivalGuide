"use client";

import { Loader } from "@googlemaps/js-api-loader";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { useEffect, useRef, useState } from "react";
import { clientEnv } from "@/config/env";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/config/site";
import { markerSvg } from "./marker-style";
import type { MapViewProps } from "./map-types";
import type { PlaceSummary } from "@/types/place";

function markerIcon(place: PlaceSummary, highlighted: boolean): google.maps.Icon {
  const svg = markerSvg(place.category, highlighted);
  const size = highlighted ? 45 : 36;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size),
  };
}

export default function GoogleMapView({
  places,
  selectedPlaceId,
  hoveredPlaceId,
  onMarkerClick,
  onMarkerHover,
  onUserMovedMap,
  routePolyline,
  routeEndpoints,
  recenterSignal,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const straightLineRef = useRef<google.maps.Polyline | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const callbacksRef = useRef({ onMarkerClick, onMarkerHover, onUserMovedMap });
  callbacksRef.current = { onMarkerClick, onMarkerHover, onUserMovedMap };

  useEffect(() => {
    let cancelled = false;
    const loader = new Loader({
      apiKey: clientEnv.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      version: "weekly",
      libraries: ["geometry"],
    });
    loader
      .importLibrary("maps")
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const map = new google.maps.Map(containerRef.current, {
          center: DEFAULT_MAP_CENTER,
          zoom: DEFAULT_MAP_ZOOM,
          clickableIcons: false,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          gestureHandling: "greedy",
        });
        mapRef.current = map;
        clustererRef.current = new MarkerClusterer({ map, markers: [] });
        map.addListener("dragend", () => {
          const bounds = map.getBounds();
          if (bounds) {
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            callbacksRef.current.onUserMovedMap({
              north: ne.lat(),
              south: sw.lat(),
              east: ne.lng(),
              west: sw.lng(),
            });
          }
        });
        setReady(true);
      })
      .catch((error) => {
        console.error("[map] failed to load Google Maps:", error);
        setLoadError("The map could not be loaded. Check your connection and refresh.");
      });
    return () => {
      cancelled = true;
      clustererRef.current?.clearMarkers();
      markersRef.current.clear();
      mapRef.current = null;
    };
  }, []);

  // Sync markers with the visible place set.
  useEffect(() => {
    if (!ready || !mapRef.current || !clustererRef.current) return;
    const clusterer = clustererRef.current;
    const existing = markersRef.current;
    const nextIds = new Set(places.map((p) => p.id));

    for (const [id, marker] of existing) {
      if (!nextIds.has(id)) {
        clusterer.removeMarker(marker);
        marker.setMap(null);
        existing.delete(id);
      }
    }

    const added: google.maps.Marker[] = [];
    for (const place of places) {
      if (existing.has(place.id)) continue;
      const marker = new google.maps.Marker({
        position: place.location,
        icon: markerIcon(place, false),
        title: place.name,
        zIndex: place.category === "circuit" ? 1000 : 1,
      });
      marker.addListener("click", () => callbacksRef.current.onMarkerClick(place));
      marker.addListener("mouseover", () => callbacksRef.current.onMarkerHover(place.id));
      marker.addListener("mouseout", () => callbacksRef.current.onMarkerHover(null));
      existing.set(place.id, marker);
      added.push(marker);
    }
    if (added.length) clusterer.addMarkers(added);
  }, [places, ready]);

  // Highlight hovered/selected markers.
  useEffect(() => {
    if (!ready) return;
    for (const place of places) {
      const marker = markersRef.current.get(place.id);
      if (!marker) continue;
      const highlighted = place.id === hoveredPlaceId || place.id === selectedPlaceId;
      marker.setIcon(markerIcon(place, highlighted));
      marker.setZIndex(highlighted ? 2000 : place.category === "circuit" ? 1000 : 1);
    }
  }, [hoveredPlaceId, selectedPlaceId, places, ready]);

  // Draw the selected route polyline (or a dashed straight line fallback).
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    polylineRef.current?.setMap(null);
    straightLineRef.current?.setMap(null);

    if (routePolyline && google.maps.geometry?.encoding) {
      const path = google.maps.geometry.encoding.decodePath(routePolyline);
      polylineRef.current = new google.maps.Polyline({
        path,
        map: mapRef.current,
        strokeColor: "#2563eb",
        strokeWeight: 5,
        strokeOpacity: 0.85,
      });
      const bounds = new google.maps.LatLngBounds();
      path.forEach((point) => bounds.extend(point));
      mapRef.current.fitBounds(bounds, 60);
    } else if (routeEndpoints) {
      straightLineRef.current = new google.maps.Polyline({
        path: [routeEndpoints.origin, routeEndpoints.destination],
        map: mapRef.current,
        strokeColor: "#2563eb",
        strokeOpacity: 0,
        icons: [
          {
            icon: { path: "M 0,-1 0,1", strokeOpacity: 0.7, strokeWeight: 3, strokeColor: "#2563eb" },
            offset: "0",
            repeat: "12px",
          },
        ],
      });
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(routeEndpoints.origin);
      bounds.extend(routeEndpoints.destination);
      mapRef.current.fitBounds(bounds, 60);
    }
  }, [routePolyline, routeEndpoints, ready]);

  // Recenter button support.
  useEffect(() => {
    if (!ready || !mapRef.current || recenterSignal === 0) return;
    mapRef.current.setCenter(DEFAULT_MAP_CENTER);
    mapRef.current.setZoom(DEFAULT_MAP_ZOOM);
  }, [recenterSignal, ready]);

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center bg-muted p-6 text-center text-sm text-muted-foreground">
        {loadError}
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" aria-label="Map" role="application" />;
}
