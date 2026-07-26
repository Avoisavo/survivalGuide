"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SheetPosition = "collapsed" | "half" | "full";

const POSITION_HEIGHTS: Record<SheetPosition, string> = {
  collapsed: "4.25rem",
  half: "48vh",
  full: "88vh",
};

/**
 * Mobile draggable bottom sheet with three snap points. Drag the handle (or
 * swipe) to move between collapsed, half and full; content scrolls when full.
 */
export function BottomSheet({ children }: { children: ReactNode }) {
  const [position, setPosition] = useState<SheetPosition>("half");
  const dragState = useRef<{ startY: number; startPosition: SheetPosition } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      dragState.current = { startY: event.clientY, startPosition: position };
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    },
    [position],
  );

  const onPointerUp = useCallback((event: React.PointerEvent) => {
    const state = dragState.current;
    dragState.current = null;
    if (!state) return;
    const delta = event.clientY - state.startY;
    if (Math.abs(delta) < 40) return;
    const order: SheetPosition[] = ["collapsed", "half", "full"];
    const currentIndex = order.indexOf(state.startPosition);
    const nextIndex = delta < 0 ? Math.min(currentIndex + 1, 2) : Math.max(currentIndex - 1, 0);
    setPosition(order[nextIndex]);
  }, []);

  useEffect(() => {
    // Reset scroll when snapping down so the handle stays reachable.
    if (position !== "full" && sheetRef.current) sheetRef.current.scrollTop = 0;
  }, [position]);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl border-t bg-background shadow-[0_-4px_16px_rgba(0,0,0,0.1)] transition-[height] duration-200 md:hidden"
      style={{ height: POSITION_HEIGHTS[position] }}
    >
      <div
        className="flex shrink-0 cursor-grab touch-none justify-center py-2.5 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        role="button"
        tabIndex={0}
        aria-label={`Bottom sheet, currently ${position}. Drag or press Enter to cycle size.`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setPosition((p) => (p === "collapsed" ? "half" : p === "half" ? "full" : "collapsed"));
          }
        }}
      >
        <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
      </div>
      <div
        ref={sheetRef}
        className={cn(
          "min-h-0 flex-1 px-4 pb-6",
          position === "collapsed" ? "overflow-hidden" : "overflow-y-auto",
        )}
      >
        {children}
      </div>
    </div>
  );
}
