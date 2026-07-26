-- Admin listing RPC: returns all places (including inactive/unverified) with
-- extracted coordinates. Executed with the service-role key only; SECURITY
-- INVOKER + RLS keeps it inert for anon callers.

create or replace function public.admin_list_places()
returns table (
  id uuid, slug text, google_place_id text, name text, category text,
  subcategory text, description text, address text,
  lat double precision, lng double precision,
  price_level integer, verified boolean, last_verified_at timestamptz,
  is_active boolean, is_open_late boolean, is_race_day_recommended boolean,
  halal_status text, vegetarian_friendly boolean, wheelchair_accessible boolean,
  tags text[], metadata jsonb, updated_at timestamptz
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
    p.tags, p.metadata, p.updated_at
  from public.places p
  order by p.updated_at desc
  limit 500;
$$;
