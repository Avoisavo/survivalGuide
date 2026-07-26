# Sepang Race Map

Unofficial, map-first travel and transport planner for international visitors attending a major motorsport race at **Sepang International Circuit**. The map is the product: pick where to stay, see what's nearby, and compare race-day routes to the circuit — fastest, cheapest, least walking, fewest transfers, or the curated race-day shuttle route.

> This project is not affiliated with Formula 1, Sepang International Circuit, or any race promoter. No official branding is used.

## Stack

| Layer | Technology |
| --- | --- |
| App | Next.js (App Router), React, TypeScript (strict), Tailwind CSS, shadcn/ui, Lucide |
| Client data | TanStack Query, Zod-validated API routes |
| Maps & routing | Google Maps JavaScript API, Places API (New), Routes API (`computeRoutes`, `computeRouteMatrix`) behind a provider abstraction |
| Database | Supabase (PostgreSQL + PostGIS, RLS), Supabase Auth (admin only), Supabase Storage |
| Testing | Vitest + Testing Library (unit/component), Playwright (e2e) |
| Deploy | Vercel + Supabase |

## Quick start (demo mode — no API keys needed)

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_DEMO_MODE=true is the default
npm run dev
```

Open http://localhost:3000. Demo mode serves clearly-labelled fictional data ("Demo Airport Hotel", "Demo Transit Hub", …), simulates route alternatives including a curated mixed race-day route, and shows a "Demo data" badge. All production provider interfaces stay intact.

## Going live

1. **Google Maps Platform** — create two API keys:
   - *Browser key* (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`): enable Maps JavaScript API; restrict to your site origins.
   - *Server key* (`GOOGLE_MAPS_SERVER_API_KEY`): enable Places API (New) + Routes API; restrict by IP where possible. This key never reaches the browser.
2. **Supabase** — create a project, then:
   ```bash
   supabase link --project-ref <ref>
   supabase db push          # applies supabase/migrations/*
   psql $DATABASE_URL -f supabase/seed.sql   # optional demo seed
   ```
3. Fill `.env.local`, set `NEXT_PUBLIC_DEMO_MODE=false`.
4. **Admin access** — create a Supabase Auth user, add its email to `ADMIN_EMAILS`.

## Deploying

- **Vercel**: import the repo, set every variable from `.env.example` in Project Settings → Environment Variables. `SUPABASE_SERVICE_ROLE_KEY` and `GOOGLE_MAPS_SERVER_API_KEY` must be server-side only (default in Vercel).
- **Supabase**: run the migrations (`supabase db push`). RLS is enabled on every table; public visitors read only active, in-window rows. All writes go through server-side admin routes gated by the `ADMIN_EMAILS` allowlist.

## Architecture

```
src/
  app/            # App Router pages + API route handlers
    api/          # /api/places, /api/places/nearby, /api/routes, /api/routes/matrix, /api/deals, /api/advisories
    place/[slug]/ # shareable, server-rendered place pages
    admin/        # Supabase-Auth-protected admin dashboard
  components/     # map/, places/, routes/, filters/, layout/, ui/ (shadcn)
  features/       # map/, places/, routing/, deals/ feature logic + hooks
  lib/            # geo math, route scoring/composition, validation, supabase clients, rate limiting, caching
  providers/      # MapProvider / PlacesProvider / RoutingProvider abstraction
    google/       # Google Places + Routes adapters (server-only)
    demo/         # keyless demo implementations
  config/         # site constants, Zod-validated env
  types/          # shared domain types
supabase/
  migrations/     # PostGIS schema, RLS policies, search/nearby RPCs
  seed.sql
tests/            # unit, component, e2e
```

### Key design decisions (Google API cost control)

- **All Places/Routes calls are server-side** with field masks, so billing stays at the lowest SKU and the server key never leaks.
- **No fetch on map move** — a debounced "Search this area" button triggers bounded searches; bounds are capped server-side.
- **Short-lived route cache** with departure times bucketed to 15-minute windows, so preference tweaks reuse one upstream call.
- **Rate limiting** per IP on `/api/routes`, `/api/routes/matrix` and place search.
- **Compact marker data first**; full place details are fetched only on selection.
- **Route matrix capped** at 4 origins × 3 destinations (the hotel-comparison maximum).

### Route intelligence

Provider routes (traffic-aware driving, transit, walking) are combined with **curated race-day route templates** stored in `route_templates` (event shuttles, gate walks, cost estimates in MYR). A composition utility merges Google-generated legs with curated legs, then transparent scoring (0–100 per factor: travel time, reliability, cost, walking, transfers, race-day suitability) ranks alternatives with a human-readable "why this route" explanation. Scores are presented as estimates, never guarantees.

## Scripts

```bash
npm run dev          # develop
npm run build        # production build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run test         # vitest unit + component tests
npm run test:e2e     # playwright (needs `npx playwright install` once)
```

## Content policy

- Halal status is shown only when manually verified (`halal-certified` / `muslim-friendly` / `not-specified`) — never guessed.
- Deals and advisories are manually curated, carry verification dates, and expire automatically.
- Event shuttles come exclusively from the curated database, never invented from provider responses.
- No third-party reviews, photos or provider content is stored permanently.
