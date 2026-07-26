-- Seed data for local development. The circuit itself is real reference
-- geography; every other record is fictional demo data ("Demo ..." names).

insert into public.places (slug, name, category, subcategory, description, address, location, verified, last_verified_at, is_race_day_recommended, tags, metadata)
values
  (
    'sepang-international-circuit',
    'Sepang International Circuit',
    'circuit',
    null,
    'The race venue. Multiple gates operate on race day; allow extra time for security checks and walking from drop-off points.',
    'Jalan Pekeliling, 64000 Sepang, Selangor, Malaysia',
    st_setsrid(st_makepoint(101.738056, 2.760889), 4326)::geography,
    true, now(), true,
    array['race-venue'],
    '{}'::jsonb
  ),
  (
    'demo-airport-hotel',
    'Demo Airport Hotel',
    'hotel',
    null,
    'Demo hotel connected to the airport terminal. Short shuttle or taxi hop to the circuit on race day.',
    'Demo Terminal Road, KLIA (demo data)',
    st_setsrid(st_makepoint(101.7072, 2.7456), 4326)::geography,
    true, now(), true,
    array['near-klia','near-airport-rail','easier-race-day-route'],
    '{"rating": 4.3, "review_count": 1240}'::jsonb
  ),
  (
    'demo-trackside-inn',
    'Demo Trackside Inn',
    'hotel',
    null,
    'Demo budget inn a short drive from the circuit gates.',
    'Demo Circuit Road, Sepang (demo data)',
    st_setsrid(st_makepoint(101.7205, 2.7761), 4326)::geography,
    true, now(), true,
    array['closest-to-circuit','budget-friendly'],
    '{"rating": 3.7, "review_count": 210}'::jsonb
  ),
  (
    'demo-local-restaurant',
    'Demo Local Restaurant',
    'food',
    'local-malaysian',
    'Demo 24-hour style local restaurant near the airport hotels.',
    null,
    st_setsrid(st_makepoint(101.7101, 2.7488), 4326)::geography,
    true, now(), false,
    array['local-malaysian','late-night'],
    '{"rating": 4.5, "review_count": 320, "closing_time": "02:00"}'::jsonb
  ),
  (
    'demo-transit-hub',
    'Demo Transit Hub',
    'transit',
    'airport-rail',
    'Demo airport rail hub where race-day shuttles depart.',
    null,
    st_setsrid(st_makepoint(101.7016, 2.7431), 4326)::geography,
    true, now(), true,
    array['airport-rail'],
    '{"transit_mode": "airport-rail", "first_mile_note": "Follow signs from the arrivals hall to the rail platform.", "last_mile_note": "On race days, follow event signage to the shuttle marshalling area.", "requires_transfer": true, "race_day_availability": "Trains every 20 minutes (demo)."}'::jsonb
  ),
  (
    'demo-event-shuttle',
    'Demo Event Shuttle Pickup',
    'transit',
    'event-shuttle',
    'Demo race-week shuttle pickup point. Curated record — not from a places API.',
    null,
    st_setsrid(st_makepoint(101.7035, 2.7442), 4326)::geography,
    true, now(), true,
    array['event-shuttle','race-week-only'],
    '{"transit_mode": "event-shuttle", "first_mile_note": "Shuttle bay is beside the Demo Transit Hub taxi rank.", "last_mile_note": "Drops at the circuit shuttle apron, about 8 minutes walk to the gates.", "requires_transfer": false, "race_day_availability": "Race weekend only, every 15 minutes from 07:00 (demo)."}'::jsonb
  ),
  (
    'demo-convenience-store',
    'Demo Convenience Store',
    'essential',
    'convenience-store',
    'Demo 24-hour convenience store near the trackside inns.',
    null,
    st_setsrid(st_makepoint(101.7212, 2.7768), 4326)::geography,
    false, null, false,
    array['convenience-store','24-hours'],
    '{}'::jsonb
  )
on conflict (slug) do nothing;

update public.places set is_open_late = true
where slug in ('demo-local-restaurant', 'demo-convenience-store');

insert into public.deals (place_id, title, description, code, valid_from, valid_until, redemption_instructions, terms, source_url, verified, last_checked_at)
select p.id,
  'Race-week late checkout (demo)',
  'Demo deal: free late checkout until 4 PM on race Sunday for direct bookings.',
  'DEMO-LATE',
  now() - interval '10 days',
  now() + interval '14 days',
  'Quote the demo code at check-in.',
  'Demo terms: subject to availability. Sample data, not a real offer.',
  'https://example.com/demo-deal',
  true, now()
from public.places p where p.slug = 'demo-airport-hotel'
on conflict do nothing;

insert into public.advisories (title, description, severity, place_id, starts_at, ends_at, source_url, verified)
select
  'Race-day road restrictions around the circuit (demo)',
  'Demo advisory: the southern approach road operates one-way towards the circuit from 06:00 to 12:00 on race day.',
  'warning',
  p.id,
  now() - interval '1 day',
  now() + interval '10 days',
  'https://example.com/demo-advisory',
  true
from public.places p where p.slug = 'sepang-international-circuit'
on conflict do nothing;

insert into public.route_templates (name, slug, origin_place_id, destination_place_id, route_type, steps, estimated_cost_min, estimated_cost_max, reliability_score, race_day_suitability_score, warning, verified, last_verified_at, active_from, active_until)
select
  'Demo Transit Hub to circuit via event shuttle',
  'demo-hub-shuttle-route',
  hub.id,
  circuit.id,
  'mixed',
  '[
    {"mode": "shuttle", "title": "Board race-day shuttle", "description": "Demo event shuttle from the hub shuttle bay to the circuit apron.", "originName": "Demo Transit Hub", "destinationName": "Circuit shuttle apron", "durationMinutes": 32, "estimatedCostMin": 0, "estimatedCostMax": 10, "currency": "MYR", "warning": "Queues peak 90 minutes before the race start (demo)."},
    {"mode": "walk", "title": "Walk to circuit gate", "description": "Follow event signage from the shuttle apron to the main gates.", "originName": "Circuit shuttle apron", "destinationName": "Sepang International Circuit", "durationMinutes": 8, "distanceMeters": 640}
  ]'::jsonb,
  0, 10, 70, 90,
  'Shuttle operates on race weekend only (demo).',
  true, now(),
  now() - interval '7 days',
  now() + interval '30 days'
from public.places hub, public.places circuit
where hub.slug = 'demo-transit-hub' and circuit.slug = 'sepang-international-circuit'
on conflict (slug) do nothing;
