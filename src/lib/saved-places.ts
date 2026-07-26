"use client";

/** localStorage-backed saved places for the MVP (no public accounts). */
const STORAGE_KEY = "sepang-race-map:saved-places";

export interface SavedPlace {
  id: string;
  slug: string;
  name: string;
  category: string;
  savedAt: string;
}

function read(): SavedPlace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(places: SavedPlace[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
    window.dispatchEvent(new CustomEvent("saved-places-changed"));
  } catch {
    // Storage may be unavailable (private browsing); saving is best-effort.
  }
}

export function getSavedPlaces(): SavedPlace[] {
  return read();
}

export function isPlaceSaved(id: string): boolean {
  return read().some((p) => p.id === id);
}

export function toggleSavedPlace(place: Omit<SavedPlace, "savedAt">): boolean {
  const places = read();
  const existing = places.findIndex((p) => p.id === place.id);
  if (existing >= 0) {
    places.splice(existing, 1);
    write(places);
    return false;
  }
  places.push({ ...place, savedAt: new Date().toISOString() });
  write(places);
  return true;
}
