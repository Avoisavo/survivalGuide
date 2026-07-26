-- RPC returning active, in-window route templates with resolved origin and
-- destination coordinates for the route planner.

create or replace function public.active_route_templates()
returns table (
  id uuid,
  name text,
  slug text,
  steps jsonb,
  estimated_cost_min numeric,
  estimated_cost_max numeric,
  currency text,
  reliability_score integer,
  race_day_suitability_score integer,
  warning text,
  verified boolean,
  last_verified_at timestamptz,
  origin jsonb,
  destination jsonb
)
language sql stable security invoker as $$
  select
    t.id, t.name, t.slug, t.steps,
    t.estimated_cost_min, t.estimated_cost_max, t.currency,
    t.reliability_score, t.race_day_suitability_score,
    t.warning, t.verified, t.last_verified_at,
    case when o.id is not null then jsonb_build_object(
      'name', o.name,
      'lat', st_y(o.location::geometry),
      'lng', st_x(o.location::geometry)
    ) end as origin,
    case when d.id is not null then jsonb_build_object(
      'name', d.name,
      'lat', st_y(d.location::geometry),
      'lng', st_x(d.location::geometry)
    ) end as destination
  from public.route_templates t
  left join public.places o on o.id = t.origin_place_id
  left join public.places d on d.id = t.destination_place_id
  where t.is_active
    and (t.active_from is null or t.active_from <= now())
    and (t.active_until is null or t.active_until >= now())
    and extract(dow from now())::integer = any (coalesce(t.days_of_week, '{0,1,2,3,4,5,6}'));
$$;
