# Build progress — Sepang Race Map

_Last updated: 2026-07-27. **Status: MVP complete** — all phases built and verified._

## ✅ Verification results

| Check | Result |
| --- | --- |
| `npm run typecheck` (TS strict) | ✅ clean |
| `npm run lint` | ✅ clean |
| `npm run test` (Vitest) | ✅ 41/41 passing (6 files) |
| `npm run test:e2e` (Playwright, demo mode) | ✅ 2/2 passing |
| `npm run build` (production) | ✅ 14 routes compiled |
| Demo-mode API smoke test | ✅ 5 route alternatives incl. curated race-day mixed route |

## ✅ Completed work

| Area | Where |
| --- | --- |
| Next.js 16 App Router + TS strict + Tailwind 4 + shadcn/ui + TanStack Query + Zod | `package.json`, `src/components/ui/` |
| Config, Zod-validated env (client/server split), site constants | `src/config/` |
| Shared domain types (places, routes, deals, advisories, API errors) | `src/types/` |
| Geo math, route scoring (0–100 normalized factors, 35/25/15/10/10/5 weights), route composition (Google + curated legs), Google Maps/Waze deep links | `src/lib/geo/`, `src/lib/routing/` |
| Deal expiry + advisory window/severity filtering | `src/lib/deals.ts`, `src/lib/advisories.ts` |
| Provider abstraction + factory: Google Places (New)/Routes adapters (server-only, field-masked, timeouts) and keyless demo providers with fictional "Demo …" data | `src/providers/` |
| Supabase: browser/server/admin clients, PostGIS place store, migrations (RLS, GIST index, search/nearby/template/admin RPCs, storage bucket), seed | `src/lib/supabase/`, `supabase/` |
| Routing service: multi-mode alternatives, curated race-day mixed routes, preference-aware weighting, 15-min-bucketed route cache | `src/features/routing/` |
| API: places (+bounds/nearby/search/detail), routes, matrix (4×3 cap), deals, advisories, admin CRUD — all Zod-validated, rate-limited, safe errors | `src/app/api/` |
| Map UI: Google map (clustering, hover sync, polylines, click-to-place) + keyless schematic demo map, category marker system | `src/components/map/` |
| Main page `/`: split-screen (map ~66% / panel ~33%), category filters, URL-shareable state, "Search this area", recenter, geolocation, mobile bottom sheet + map/list toggle | `src/components/map-app.tsx` |
| Route planner: origin autocomplete, race day/time, mode, walking/transfer preferences, ranked route cards with "Why this route?", expandable timeline, warnings, Google Maps/Waze links | `src/components/routes/` |
| Places UI: cards, detail panel (nearby food/transit/essentials with radius presets, deals, advisories), save (localStorage) + share, verification badges, hotel comparison (≤4, matrix-driven, preference-gated winner) | `src/components/places/` |
| `/place/[slug]` server-rendered shareable page with client map island | `src/app/place/[slug]/` |
| Admin: Supabase Auth login + `ADMIN_EMAILS` allowlist, places/deals/advisories CRUD, route-template leg builder with live mixed-route preview, needs-verification filter, click-map marker placement, demo-mode read-only guard | `src/app/admin/`, `src/features/admin/` |
| Tests: scoring, composition, validation, deal expiry, advisory filtering, RouteCard component, hotel→route e2e | `tests/` |
| Docs: README (setup, deploy, cost-control design decisions), `.env.example` | repo root |

## Git

- Branch: `feature/sepang-race-map-mvp` (branched from `main`; merge when ready)
- Commit 1: backend foundation (providers, routing engine, API, DB schema)
- Commit 2: full UI, admin, tests, verification fixes

## Next steps (post-MVP, optional)

- Fill Supabase + Google keys, flip `NEXT_PUBLIC_DEMO_MODE=false`, deploy to Vercel
- Curate real verified places/shuttles/deals via `/admin`
- Swap in Redis/Upstash for the in-memory rate limiter when scaling beyond one region
