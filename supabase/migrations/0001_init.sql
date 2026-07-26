-- Sepang Race Map — initial schema
-- Enables PostGIS, creates core tables, spatial indexes, RLS policies and
-- the search/nearby RPC functions used by the application.

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- places
-- ---------------------------------------------------------------------------
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  google_place_id text,
  name text not null,
  category text not null check (category in ('hotel','food','transit','deal','essential','circuit')),
  subcategory text,
  description text,
  address text,
  location geography(point, 4326) not null,
  price_level integer check (price_level between 0 and 4),
  verified boolean not null default false,
  last_verified_at timestamptz,
  is_active boolean not null default true,
  is_open_late boolean not null default false,
  is_race_day_recommended boolean not null default false,
  halal_status text check (halal_status in ('halal-certified','muslim-friendly','not-specified')),
  vegetarian_friendly boolean,
  wheelchair_accessible boolean,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists places_location_gist on public.places using gist (location);
create index if not exists places_category_idx on public.places (category) where is_active;
create index if not exists places_slug_idx on public.places (slug);

-- ---------------------------------------------------------------------------
-- deals
-- ---------------------------------------------------------------------------
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  title text not null,
  description text,
  code text,
  valid_from timestamptz,
  valid_until timestamptz,
  redemption_instructions text,
  terms text,
  source_url text,
  verified boolean not null default false,
  last_checked_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deals_place_idx on public.deals (place_id) where is_active;
create index if not exists deals_validity_idx on public.deals (valid_until) where is_active;

-- ---------------------------------------------------------------------------
-- route_templates — curated race-day mixed routes
-- ---------------------------------------------------------------------------
create table if not exists public.route_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  origin_place_id uuid references public.places(id) on delete set null,
  destination_place_id uuid references public.places(id) on delete set null,
  route_type text not null default 'mixed',
  active_from timestamptz,
  active_until timestamptz,
  days_of_week integer[] default '{0,1,2,3,4,5,6}',
  steps jsonb not null,
  estimated_cost_min numeric,
  estimated_cost_max numeric,
  currency text not null default 'MYR',
  reliability_score integer check (reliability_score between 0 and 100),
  race_day_suitability_score integer check (race_day_suitability_score between 0 and 100),
  warning text,
  verified boolean not null default false,
  last_verified_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists route_templates_origin_idx on public.route_templates (origin_place_id) where is_active;

-- ---------------------------------------------------------------------------
-- advisories
-- ---------------------------------------------------------------------------
create table if not exists public.advisories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  severity text not null check (severity in ('info','warning','critical')),
  place_id uuid references public.places(id) on delete set null,
  starts_at timestamptz,
  ends_at timestamptz,
  source_url text,
  verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists advisories_window_idx on public.advisories (starts_at, ends_at) where is_active;

-- ---------------------------------------------------------------------------
-- route_cache — short-lived cache of computed routes (no third-party
-- reviews/photos are stored; only computed durations and geometry we are
-- permitted to cache briefly for performance).
-- ---------------------------------------------------------------------------
create table if not exists public.route_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists route_cache_expiry_idx on public.route_cache (expires_at);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists places_updated_at on public.places;
create trigger places_updated_at before update on public.places
  for each row execute function public.set_updated_at();

drop trigger if exists deals_updated_at on public.deals;
create trigger deals_updated_at before update on public.deals
  for each row execute function public.set_updated_at();

drop trigger if exists route_templates_updated_at on public.route_templates;
create trigger route_templates_updated_at before update on public.route_templates
  for each row execute function public.set_updated_at();

drop trigger if exists advisories_updated_at on public.advisories;
create trigger advisories_updated_at before update on public.advisories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Public (anon) may read active rows only. All writes happen server-side
-- with the service-role key (which bypasses RLS) behind the admin allowlist.
-- ---------------------------------------------------------------------------
alter table public.places enable row level security;
alter table public.deals enable row level security;
alter table public.route_templates enable row level security;
alter table public.advisories enable row level security;
alter table public.route_cache enable row level security;

drop policy if exists "public read active places" on public.places;
create policy "public read active places" on public.places
  for select using (is_active = true);

drop policy if exists "public read valid deals" on public.deals;
create policy "public read valid deals" on public.deals
  for select using (
    is_active = true
    and (valid_from is null or valid_from <= now())
    and (valid_until is null or valid_until >= now())
  );

drop policy if exists "public read active route templates" on public.route_templates;
create policy "public read active route templates" on public.route_templates
  for select using (
    is_active = true
    and (active_from is null or active_from <= now())
    and (active_until is null or active_until >= now())
  );

drop policy if exists "public read active advisories" on public.advisories;
create policy "public read active advisories" on public.advisories
  for select using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

-- route_cache: no public policies — service role only.

-- ---------------------------------------------------------------------------
-- Storage bucket for owner-uploaded place images
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('place-images', 'place-images', true)
on conflict (id) do nothing;

drop policy if exists "public read place images" on storage.objects;
create policy "public read place images" on storage.objects
  for select using (bucket_id = 'place-images');

-- ---------------------------------------------------------------------------
-- RPC: bounded place search
-- ---------------------------------------------------------------------------
create or replace function public.search_places(
  p_category text default null,
  p_north double precision default null,
  p_south double precision default null,
  p_east double precision default null,
  p_west double precision default null,
  p_verified boolean default null,
  p_query text default null,
  p_limit integer default 60,
  p_offset integer default 0
)
returns table (
  id uuid, slug text, google_place_id text, name text, category text,
  subcategory text, description text, address text,
  lat double precision, lng double precision,
  price_level integer, verified boolean, last_verified_at timestamptz,
  is_active boolean, is_open_late boolean, is_race_day_recommended boolean,
  halal_status text, vegetarian_friendly boolean, wheelchair_accessible boolean,
  tags text[], metadata jsonb
)
language sql stable security invoker as $$
  select
    p.id, p.slug, p.google_place_id, p.name, p.category,
    p.subcategory, p.description, p.address,
    st_y(p.location::geometry) as lat,
    st_x(p.location::geometry) as lng,
    p.price_level, p.verified, p.last_verified_at,
    p.is_active, p.is_open_late, p.is_race_day_recommended,
    p.halal_status, p.vegetarian_friendly, p.wheelchair_accessible,
    p.tags, p.metadata
  from public.places p
  where p.is_active
    and (p_category is null or p.category = p_category)
    and (p_verified is null or p.verified = p_verified)
    and (p_query is null or p.name ilike '%' || p_query || '%')
    and (
      p_north is null or p_south is null or p_east is null or p_west is null
      or p.location && st_makeenvelope(p_west, p_south, p_east, p_north, 4326)::geography
    )
  order by p.is_race_day_recommended desc, p.verified desc, p.name
  limit least(coalesce(p_limit, 60), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ---------------------------------------------------------------------------
-- RPC: single place by id or slug
-- ---------------------------------------------------------------------------
create or replace function public.get_place(p_id_or_slug text)
returns table (
  id uuid, slug text, google_place_id text, name text, category text,
  subcategory text, description text, address text,
  lat double precision, lng double precision,
  price_level integer, verified boolean, last_verified_at timestamptz,
  is_active boolean, is_open_late boolean, is_race_day_recommended boolean,
  halal_status text, vegetarian_friendly boolean, wheelchair_accessible boolean,
  tags text[], metadata jsonb
)
language sql stable security invoker as $$
  select
    p.id, p.slug, p.google_place_id, p.name, p.category,
    p.subcategory, p.description, p.address,
    st_y(p.location::geometry) as lat,
    st_x(p.location::geometry) as lng,
    p.price_level, p.verified, p.last_verified_at,
    p.is_active, p.is_open_late, p.is_race_day_recommended,
    p.halal_status, p.vegetarian_friendly, p.wheelchair_accessible,
    p.tags, p.metadata
  from public.places p
  where p.is_active
    and (p.slug = p_id_or_slug or p.id::text = p_id_or_slug)
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- RPC: nearby places ordered by true geographic distance
-- ---------------------------------------------------------------------------
create or replace function public.nearby_places(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters integer default 1000,
  p_category text default null,
  p_limit integer default 30
)
returns table (
  id uuid, slug text, google_place_id text, name text, category text,
  subcategory text, description text, address text,
  lat double precision, lng double precision,
  price_level integer, verified boolean, last_verified_at timestamptz,
  is_active boolean, is_open_late boolean, is_race_day_recommended boolean,
  halal_status text, vegetarian_friendly boolean, wheelchair_accessible boolean,
  tags text[], metadata jsonb,
  distance_meters double precision
)
language sql stable security invoker as $$
  select
    p.id, p.slug, p.google_place_id, p.name, p.category,
    p.subcategory, p.description, p.address,
    st_y(p.location::geometry) as lat,
    st_x(p.location::geometry) as lng,
    p.price_level, p.verified, p.last_verified_at,
    p.is_active, p.is_open_late, p.is_race_day_recommended,
    p.halal_status, p.vegetarian_friendly, p.wheelchair_accessible,
    p.tags, p.metadata,
    st_distance(p.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_meters
  from public.places p
  where p.is_active
    and st_dwithin(
      p.location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      least(coalesce(p_radius_meters, 1000), 5000)
    )
    and (p_category is null or p.category = p_category)
  order by distance_meters
  limit least(coalesce(p_limit, 30), 30);
$$;
