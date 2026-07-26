"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { isPlaceSaved, toggleSavedPlace } from "@/lib/saved-places";
import type { PlaceSummary } from "@/types/place";

function subscribe(callback: () => void): () => void {
  window.addEventListener("saved-places-changed", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("saved-places-changed", callback);
    window.removeEventListener("storage", callback);
  };
}

export function SaveButton({
  place,
  size = "sm",
}: {
  place: Pick<PlaceSummary, "id" | "slug" | "name" | "category">;
  size?: "sm" | "icon";
}) {
  const getSnapshot = useCallback(() => isPlaceSaved(place.id), [place.id]);
  const saved = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const Icon = saved ? BookmarkCheck : Bookmark;
  return (
    <Button
      variant="outline"
      size={size}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${place.name} from saved` : `Save ${place.name}`}
      onClick={() =>
        toggleSavedPlace({
          id: place.id,
          slug: place.slug,
          name: place.name,
          category: place.category,
        })
      }
    >
      <Icon className="h-4 w-4" aria-hidden />
      {size !== "icon" && (saved ? "Saved" : "Save")}
    </Button>
  );
}
