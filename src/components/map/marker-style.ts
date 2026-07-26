import type { PlaceCategory } from "@/types/place";

/**
 * One consistent visual system for category markers, shared by the Google
 * map (SVG glyphs) and the keyless demo map.
 */
export interface MarkerStyle {
  color: string;
  label: string;
  /** Lucide-compatible SVG path data drawn inside the pin. */
  iconPath: string;
}

export const MARKER_STYLES: Record<PlaceCategory, MarkerStyle> = {
  hotel: {
    color: "#2563eb",
    label: "Hotel",
    iconPath:
      "M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4",
  },
  food: {
    color: "#ea580c",
    label: "Food",
    iconPath: "M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7",
  },
  transit: {
    color: "#0d9488",
    label: "Transit",
    iconPath:
      "M8 3.1V7a4 4 0 0 0 8 0V3.1M9 15h6M10 3h4a7 7 0 0 1 7 7v5a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-5a7 7 0 0 1 7-7zM9 19l-2 3M15 19l2 3",
  },
  deal: {
    color: "#9333ea",
    label: "Deal",
    iconPath:
      "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2zM13 5v2M13 17v2M13 11v2",
  },
  essential: {
    color: "#dc2626",
    label: "Essential",
    iconPath: "M11 3h2v18h-2zM3 11h18v2H3z",
  },
  circuit: {
    color: "#171717",
    label: "Circuit",
    iconPath: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7",
  },
};

export function markerSvg(category: PlaceCategory, highlighted: boolean): string {
  const style = MARKER_STYLES[category];
  const scale = highlighted ? 1.25 : 1;
  const size = Math.round(36 * scale);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 36 36">
  <path d="M18 2C11.4 2 6 7.4 6 14c0 8.4 10.2 19 12 19s12-10.6 12-19c0-6.6-5.4-12-12-12z"
        fill="${style.color}" stroke="white" stroke-width="2"/>
  <g transform="translate(11 7) scale(0.58)" fill="none" stroke="white" stroke-width="2.2"
     stroke-linecap="round" stroke-linejoin="round">
    <path d="${style.iconPath}"/>
  </g>
</svg>`.trim();
}
