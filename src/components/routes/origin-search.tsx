"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { usePlaceSearch } from "@/features/places/queries";
import { cn } from "@/lib/utils";
import type { RouteEndpoint } from "@/types/route";

export interface OriginSearchProps {
  id?: string;
  value: RouteEndpoint | null;
  onChange: (endpoint: RouteEndpoint | null) => void;
}

/** Debounced place search with a keyboard-navigable suggestion list. */
export function OriginSearch({ id, value, onChange }: OriginSearchProps) {
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text), 350);
    return () => clearTimeout(timer);
  }, [text]);

  const { data, isFetching } = usePlaceSearch(open ? debounced : "");
  const suggestions = data?.items ?? [];

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(candidate: {
    externalId: string;
    name: string;
    location?: { lat: number; lng: number };
  }) {
    onChange({
      placeId: candidate.externalId,
      lat: candidate.location?.lat,
      lng: candidate.location?.lng,
      name: candidate.name,
    });
    setText("");
    setOpen(false);
    setActiveIndex(-1);
  }

  if (value) {
    return (
      <div className="flex h-9 min-w-0 flex-1 items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 text-sm">
        <span className="truncate">{value.name ?? "Selected location"}</span>
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
          onClick={() => onChange(null)}
          aria-label="Clear origin"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        id={id}
        className="pl-8"
        placeholder="Search hotel, station, address…"
        value={text}
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-autocomplete="list"
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && activeIndex >= 0 && suggestions[activeIndex]) {
            e.preventDefault();
            select(suggestions[activeIndex]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && debounced.length >= 2 && (
        <ul
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
          role="listbox"
        >
          {isFetching && (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">Searching…</li>
          )}
          {!isFetching && suggestions.length === 0 && (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">No places found.</li>
          )}
          {suggestions.map((candidate, index) => (
            <li key={candidate.externalId} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                  index === activeIndex && "bg-accent",
                )}
                onClick={() => select(candidate)}
              >
                <span className="block font-medium">{candidate.name}</span>
                {candidate.address && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {candidate.address}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
