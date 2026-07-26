# Build progress — Sepang Race Map

_Last updated: 2026-07-27 (work in progress; this file is updated as the build advances)._

## ✅ Done

| Area | Status | Where |
| --- | --- | --- |
| Project scaffold | Next.js 16 (App Router) + TypeScript strict + Tailwind 4 + shadcn/ui + Lucide + TanStack Query + Zod | `package.json`, `src/components/ui/` |
| Config & env | Site constants (circuit/KLIA coords, viewport, limits) + Zod-validated client/server env split | `src/config/` |
| Shared types | `PlaceCategory`, `HalalStatus`, `TransitMode`, `RouteLeg`, `RouteOption`, scoring types, API error shape | `src/types/` |
| Geo utilities | Haversine, bounds checks, walking-time estimates, formatting | `src/lib/geo/` |
| Route scoring | Normalized 0–100 factors, default weights (35/25/15/10/10/5), hedged explanations | `src/lib/routing/scoring.ts` |
| Route composition | Merges Google + curated legs → totals, transfers, cost range, arrival time, warnings; route-kind assignment | `src/lib/routing/compose.ts` |
| External nav links | Google Maps / Waze deep links | `src/lib/routing/external-links.ts` |
| Deals/advisories logic | Expiry + active-window filtering, severity sort | `src/lib/deals.ts`, `src/lib/advisories.ts` |
| Provider abstraction | `PlacesProvider`, `RoutingProvider`, `PlaceStore` interfaces + factory (demo fallback) | `src/providers/` |
| Google adapters | Places API (New) + Routes API `computeRoutes`/`computeRouteMatrix`, field masks, timeouts, server-only | `src/providers/google/` |
| Demo providers | Full keyless demo data (fictional "Demo …" places, deals, advisories, shuttle template) + simulated routing | `src/providers/demo/` |
| Supabase layer | Browser/server/admin clients, PostGIS place store via RPCs | `src/lib/supabase/` |
| Database schema | PostGIS migration: places, deals, route_templates, advisories, route_cache; GIST index; RLS; storage bucket; search/nearby/template RPCs | `supabase/migrations/`, `supabase/seed.sql` |
| Routing service | Multi-mode alternatives + mixed race-day routes from curated templates, caching, preference weighting | `src/features/routing/service.ts` |
| API routes | `GET /api/places`, `/api/places/[id]`, `/api/places/nearby`, `/api/places/search`, `POST /api/routes`, `/api/routes/matrix`, `GET /api/deals`, `/api/advisories` — all Zod-validated, rate-limited where expensive | `src/app/api/` |
| Client data hooks | TanStack Query hooks for places, nearby, deals, advisories, routes, matrix | `src/features/*/queries.ts` |
| Docs & env | `README.md`, `.env.example` (demo mode on by default) | repo root |

## 🔄 In progress

- Map components (Google map + keyless demo map fallback, category markers, clustering, hover sync, "Search this area")
- Main page `/` — split-screen layout, URL state, mobile bottom sheet

## ⏳ Remaining

1. Route planner panel: route cards, expandable timeline, external nav links, warnings
2. Place cards (hotel/food/transit), nearby groups with radius presets, hotel comparison (max 4)
3. `/place/[slug]` server-rendered detail page
4. `/admin` dashboard (Supabase Auth + `ADMIN_EMAILS` allowlist): places/deals/advisories/route-template CRUD
5. Tests: unit (scoring, composition, validation, deal expiry, advisory filtering), component (route card), e2e (select hotel → route)
6. Final verification: `tsc`, lint, tests, production build
