-- Demo data: Brightwater Commercial Cleaning, a fictional contractor with sites in Auckland, Sydney and Melbourne.
-- Every name and event here is invented. Dates are relative to today, so the attention list always has
-- something to say: a school contract ending with the cleaners not yet told of their right to transfer,
-- a new medical site starting with no transfer information from the outgoing contractor, a cleaner with
-- no police vet rostered at the school, a 90-minute casual visit under the award minimum, a cleaner
-- not inducted at the mall, a missed clean and the complaint it caused, a complaint with no reply,
-- an inspection under the pass mark with faults past their fix-by date, periodicals overdue,
-- a chemical exposure not yet notified, a loading dock key held by a cleaner who has left,
-- an extra done and not billed, and an invoice overdue.
-- Safe to run twice: every row has a natural key.

insert into settings (key, value, note) values
  ('max_week_hours', '50', 'House rule: most hours one cleaner works in a week'),
  ('au_min_engagement_hours', '2', 'Cleaning Services Award 2020 cl 13.5(c): minimum engagement when a site has no floor area recorded (AU)'),
  ('vet_valid_years', '3', 'Contract term: a police vet older than this is treated as missing'),
  ('on_cost_pct', '20', 'Holiday pay, KiwiSaver or super, ACC or workers compensation, on top of the hourly rate'),
  ('inspect_every_days', '30', 'House rule: every active site inspected at least this often'),
  ('pass_score_pct', '85', 'House rule: an inspection under this score is a fail'),
  ('fix_within_days', '2', 'House rule: days to fix a fault found at inspection'),
  ('complaint_response_hours', '4', 'Contract term: reply to a client complaint within this many hours'),
  ('quote_margin_pct', '25', 'Target gross margin when pricing a site from its scope'),
  ('quote_pay_nz_cents', '2750', 'Average hourly pay used to price a New Zealand site'),
  ('quote_pay_au_cents', '3150', 'Average hourly pay used to price an Australian site'),
  ('award_l1_cents', '2708', 'Cleaning Services Award 2020 cl 15.1: level 1 minimum hourly rate from 1 July 2026, before loadings'),
  ('award_l2_cents', '2797', 'Cleaning Services Award 2020 cl 15.1: level 2 minimum hourly rate from 1 July 2026, before loadings'),
  ('award_l3_cents', '2945', 'Cleaning Services Award 2020 cl 15.1: level 3 minimum hourly rate from 1 July 2026, before loadings'),
  ('gst_nz_pct', '15', 'GST in New Zealand'),
  ('gst_au_pct', '10', 'GST in Australia')
on conflict (key) do nothing;

insert into clients (code, name, country, currency, contact_name, contact_email, invoice_days) values
  ('TPG', 'Tasman Property Group Ltd', 'NZ', 'NZD', 'Rachel Moana', 'facilities@tasman-property.example.nz', 20),
  ('KMC', 'Kauri Medical Centres Ltd', 'NZ', 'NZD', 'Dr Ian Hollis', 'practice.manager@kauri-medical.example.nz', 20),
  ('HPS', 'Harbour Point School Board', 'NZ', 'NZD', 'Gareth Pene', 'property@harbourpoint.example.school.nz', 20),
  ('NRC', 'Northbridge Retail Centre Pty Ltd', 'AU', 'AUD', 'Nadia Haddad', 'centre.manager@northbridge-rc.example.com.au', 14),
  ('WDC', 'Westgate Distribution Pty Ltd', 'AU', 'AUD', 'Owen Pike', 'site.admin@westgate-dc.example.com.au', 30)
on conflict (code) do nothing;

insert into sites (code, client_id, name, address, region, sector, monthly_fee_cents, budget_hours_week, contract_start, contract_end, induction_required, vetting_required, days_a_week, floor_area_m2, instructions)
select v.code, c.id, v.name, v.address, v.region, v.sector, v.fee, v.hours, current_date + v.start_in, case when v.end_in is null then null else current_date + v.end_in end,
  true, v.vetting, v.days, v.area, v.instructions
from (values
  ('TPG-QUAY', 'TPG', 'Quay Street Tower, levels 1 to 14', '120 Quay Street, Auckland', 'NZ', 'office', 1480000, 60, -900, null::int, false, 5, 9800, 'Sign in at the security desk. Level 12 boardroom last. Lock the east stairwell door.'),
  ('TPG-NEWM', 'TPG', 'Newmarket Offices', '18 Broadway, Newmarket, Auckland', 'NZ', 'office', 620000, 25, -400, null, false, 5, 1400, 'Alarm off at the side door. Bins out to the lane on Thursdays.'),
  ('KMC-ALB', 'KMC', 'Kauri Medical Albany', '7 Don Street, Albany, Auckland', 'NZ', 'medical', 790000, 30, -700, null, true, 6, 650, 'Clinical rooms with the green-label disinfectant only. Sharps bins are never touched: report a full one.'),
  ('KMC-TAK', 'KMC', 'Kauri Medical Takapuna', '40 Hurstmere Road, Takapuna, Auckland', 'NZ', 'medical', 820000, 30, 12, null, true, 6, 720, 'Starts on the date in the contract change. Same rules as Albany.'),
  ('HPS-SCH', 'HPS', 'Harbour Point School', '2 Point Road, Devonport, Auckland', 'NZ', 'education', 940000, 40, -1100, 20, true, 5, 3200, 'Classrooms after 15:30 only. Hall last. Report anything left behind by children to the office.'),
  ('NRC-MALL', 'NRC', 'Northbridge Retail Centre', '1 Strathallen Avenue, Northbridge NSW', 'NSW', 'retail', 1850000, 84, -800, null, false, 7, 9000, 'Food court done before 10:00. Escalator combs Monday mornings.'),
  ('WDC-DERR', 'WDC', 'Westgate DC amenities and offices', '55 Fitzgerald Road, Derrimut VIC', 'VIC', 'industrial', 490000, 22, -500, null, false, 5, 1200, 'Hi-vis on the warehouse floor. Sign in at gatehouse 2.')
) as v(code, client, name, address, region, sector, fee, hours, start_in, end_in, vetting, days, area, instructions)
join clients c on c.code = v.client
on conflict (code) do nothing;

insert into cleaners (code, name, phone, email, employment, award_level, pay_rate_cents, vetted_on, status, started_on, left_on)
select v.code, v.name, v.phone, v.email, v.employment, v.level, v.pay, case when v.vet is null then null else current_date - v.vet end, v.status,
  current_date - v.since, case when v.status = 'left' then current_date - 10 end
from (values
  ('C-101', 'Losa Tuilagi', '021 555 0101', 'losa@example.nz', 'full-time', null::int, 2850, 400::int, 'active', 1500),
  ('C-102', 'Arjun Patel', '021 555 0102', 'arjun@example.nz', 'part-time', null, 2700, 200, 'active', 900),
  ('C-103', 'Mele Fifita', '021 555 0103', 'mele@example.nz', 'part-time', null, 2700, null, 'active', 300),
  ('C-104', 'Jin Park', '021 555 0104', 'jin@example.nz', 'full-time', null, 2800, 500, 'active', 1200),
  ('C-105', 'Hana Wiremu', '021 555 0105', 'hana@example.nz', 'part-time', null, 2900, 300, 'active', 800),
  ('C-106', 'Rosa Mendes', '021 555 0106', 'rosa@example.nz', 'part-time', null, 2700, 700, 'left', 1000),
  ('C-107', 'Tomasi Vea', '021 555 0107', 'tomasi@example.nz', 'part-time', null, 2650, null, 'active', 60),
  ('C-201', 'Thanh Nguyen', '0412 555 201', 'thanh@example.com.au', 'casual', 1, 3150, null, 'active', 700),
  ('C-202', 'Maria Lopez', '0412 555 202', 'maria@example.com.au', 'part-time', 2, 3050, null, 'active', 950),
  ('C-203', 'Ahmed Karimi', '0412 555 203', 'ahmed@example.com.au', 'casual', 1, 3150, null, 'active', 90),
  ('C-204', 'Grace Kim', '0412 555 204', 'grace@example.com.au', 'full-time', 3, 3300, null, 'active', 1400),
  ('C-205', 'Sam Ellis', '0412 555 205', 'sam.e@example.com.au', 'part-time', 1, 2650, null, 'active', 40)
) as v(code, name, phone, email, employment, level, pay, vet, status, since)
on conflict (code) do nothing;

-- Inductions. Sam Ellis has never been inducted at the mall, and is paid under the award level 1 rate.
insert into inductions (cleaner_id, site_id, inducted_on)
select cl.id, si.id, current_date - v.ago
from (values
  ('C-101', 'TPG-QUAY', 1400), ('C-102', 'TPG-QUAY', 850), ('C-103', 'TPG-QUAY', 280), ('C-104', 'TPG-NEWM', 1100),
  ('C-104', 'HPS-SCH', 600), ('C-105', 'KMC-ALB', 780), ('C-106', 'TPG-QUAY', 990), ('C-107', 'HPS-SCH', 55),
  ('C-201', 'NRC-MALL', 690), ('C-202', 'WDC-DERR', 900), ('C-203', 'WDC-DERR', 85), ('C-204', 'NRC-MALL', 1380)
) as v(cleaner, site, ago)
join cleaners cl on cl.code = v.cleaner join sites si on si.code = v.site
on conflict do nothing;

-- The scope of works. Periodicals are seeded late on purpose.
insert into scope_tasks (site_id, area, task, frequency, minutes, last_done_on)
select si.id, v.area, v.task, v.freq, v.minutes, case when v.ago is null then null else current_date - v.ago end
from (values
  ('TPG-QUAY', 'Workstations', 'Empty bins and recycling', 'daily', 150, null::int),
  ('TPG-QUAY', 'Floors', 'Vacuum all carpet', 'daily', 300, null),
  ('TPG-QUAY', 'Bathrooms', 'Clean and sanitise toilets, basins and mirrors, restock', 'daily', 180, null),
  ('TPG-QUAY', 'Kitchens', 'Wipe benches, load dishwasher, clean sinks', 'daily', 90, null),
  ('TPG-QUAY', 'Lifts', 'Polish lift doors and car interiors', 'weekly', 40, null),
  ('TPG-QUAY', 'Kitchens', 'Degrease rangehood filters', 'monthly', 45, 44),
  ('TPG-QUAY', 'Glass', 'Clean internal glass partitions', 'monthly', 120, 18),
  ('TPG-QUAY', 'Floors', 'Hot-water extraction of all carpet', 'quarterly', 900, 118),
  ('TPG-NEWM', 'Workstations', 'Empty bins and recycling', 'daily', 25, null),
  ('TPG-NEWM', 'Floors', 'Vacuum and mop', 'daily', 60, null),
  ('TPG-NEWM', 'Bathrooms', 'Clean and restock', 'daily', 35, null),
  ('TPG-NEWM', 'Floors', 'Hot-water extraction of all carpet', 'six-monthly', 360, 90),
  ('KMC-ALB', 'Clinical rooms', 'Disinfect touch points, couches and benches', 'daily', 70, null),
  ('KMC-ALB', 'Waiting room', 'Wipe chairs, counters and children''s area', 'daily', 25, null),
  ('KMC-ALB', 'Bathrooms', 'Clean and sanitise, restock', 'daily', 35, null),
  ('KMC-ALB', 'Floors', 'Strip and reseal vinyl', 'six-monthly', 480, 205),
  ('KMC-ALB', 'Clinical rooms', 'Wash privacy curtains', 'quarterly', 90, 60),
  ('HPS-SCH', 'Classrooms', 'Vacuum, empty bins, wipe desks', 'daily', 150, null),
  ('HPS-SCH', 'Toilet blocks', 'Clean and sanitise, restock', 'daily', 60, null),
  ('HPS-SCH', 'Hall', 'Scrub and buff the hall floor', 'monthly', 120, 11),
  ('NRC-MALL', 'Food court', 'Clean tables, chairs and floors', 'daily', 150, null),
  ('NRC-MALL', 'Amenities', 'Clean and restock all amenities', 'daily', 120, null),
  ('NRC-MALL', 'Malls', 'Mop and spot-clean public walkways', 'daily', 120, null),
  ('NRC-MALL', 'Car park', 'Sweep stairwells and lift lobbies', 'weekly', 90, null),
  ('NRC-MALL', 'Escalators', 'Clean combs, steps and balustrades', 'monthly', 120, 36),
  ('NRC-MALL', 'High areas', 'High dusting of vents and signage', 'quarterly', 240, 30),
  ('WDC-DERR', 'Lunchroom', 'Wipe tables, clean microwave and fridge fronts', 'daily', 35, null),
  ('WDC-DERR', 'Amenities', 'Clean and restock', 'daily', 45, null),
  ('WDC-DERR', 'Offices', 'Vacuum and empty bins', 'weekly', 60, null),
  ('WDC-DERR', 'Glass', 'Clean office windows inside', 'quarterly', 150, 100)
) as v(site, area, task, freq, minutes, ago)
join sites si on si.code = v.site
on conflict (site_id, area, task) do nothing;

-- The roster: four weeks back and one ahead. Each slot is a site, a cleaner, a start, hours and the days of the week (1 = Monday).
with slots(site, slot, cleaner, start_time, hrs, days) as (values
  ('TPG-QUAY', 'a', 'C-101', '18:00', 4.0, array[1,2,3,4,5]),
  ('TPG-QUAY', 'b', 'C-102', '18:00', 4.0, array[1,2,3,4,5]),
  ('TPG-QUAY', 'c', 'C-103', '18:00', 4.0, array[1,2,3,4,5]),
  ('TPG-NEWM', 'a', 'C-104', '17:30', 5.0, array[1,2,3,4,5]),
  ('KMC-ALB', 'a', 'C-105', '19:00', 4.0, array[1,2,3,4,5,6]),
  ('HPS-SCH', 'a', 'C-107', '15:30', 5.0, array[1,2,3,4,5]),
  ('HPS-SCH', 'b', 'C-104', '14:00', 3.0, array[1,2,3,4,5]),
  ('NRC-MALL', 'a', 'C-201', '05:00', 6.0, array[1,2,3,4,5,6,7]),
  ('NRC-MALL', 'b', 'C-204', '05:00', 6.0, array[1,2,3,4,5]),
  ('NRC-MALL', 'c', 'C-205', '05:00', 4.0, array[6,7]),
  ('WDC-DERR', 'a', 'C-202', '17:00', 4.0, array[1,2,3,4,5]),
  ('WDC-DERR', 'b', 'C-203', '17:30', 1.5, array[1,2,3,4,5])
),
days as (
  select s.*, si.region, d, (region_now(si.region)::date + d) as day, region_now(si.region) as now_local
  from slots s join sites si on si.code = s.site cross join generate_series(-28, 7) d
),
timed as (
  select *, (day + start_time::time) as starts_at, (day + start_time::time + make_interval(mins => (hrs * 60)::int)) as ends_at
  from days where extract(isodow from day)::int = any(days)
)
insert into visits (site_id, cleaner_id, starts_at, ends_at, status, clock_in_at, clock_out_at, external_id)
select si.id, cl.id, t.starts_at, t.ends_at,
  case when t.site = 'TPG-QUAY' and t.slot = 'c' and t.day = (select max(g)::date from generate_series(region_now('NZ')::date - 9, region_now('NZ')::date - 2, interval '1 day') g where extract(isodow from g) < 6) then 'missed'
       when t.ends_at <= t.now_local then 'done'
       when t.starts_at <= t.now_local then 'on-site'
       else 'planned' end,
  case when t.starts_at <= t.now_local and not (t.site = 'TPG-QUAY' and t.slot = 'c' and t.day = (select max(g)::date from generate_series(region_now('NZ')::date - 9, region_now('NZ')::date - 2, interval '1 day') g where extract(isodow from g) < 6))
       then t.starts_at + make_interval(mins => case when t.cleaner = 'C-103' then 12 + (abs(t.d) * 5) % 15 else (abs(t.d) * 3) % 7 end) end,
  case when t.ends_at <= t.now_local and not (t.site = 'TPG-QUAY' and t.slot = 'c' and t.day = (select max(g)::date from generate_series(region_now('NZ')::date - 9, region_now('NZ')::date - 2, interval '1 day') g where extract(isodow from g) < 6))
       then t.ends_at + make_interval(mins => case when t.site = 'WDC-DERR' then 20 + (abs(t.d) * 7) % 15 else (abs(t.d) * 7) % 12 end) end,
  'seed:' || t.site || ':' || t.slot || ':' || t.day
from timed t
join sites si on si.code = t.site
join cleaners cl on cl.code = t.cleaner
-- Rosa left ten days ago: her old visits are history, nothing after.
on conflict (external_id) do nothing;

-- Rosa's last fortnight at the tower, before she left.
insert into visits (site_id, cleaner_id, starts_at, ends_at, status, clock_in_at, clock_out_at, external_id)
select si.id, cl.id, (region_now('NZ')::date - d) + time '06:00', (region_now('NZ')::date - d) + time '09:00', 'done',
  (region_now('NZ')::date - d) + time '06:02', (region_now('NZ')::date - d) + time '09:01', 'seed:TPG-QUAY:rosa:' || (region_now('NZ')::date - d)
from generate_series(11, 20) d join sites si on si.code = 'TPG-QUAY' join cleaners cl on cl.code = 'C-106'
where extract(isodow from (region_now('NZ')::date - d)) between 1 and 5
on conflict (external_id) do nothing;

-- Open visits: tomorrow's extra morning at Albany and next Saturday afternoon at the mall.
insert into visits (site_id, starts_at, ends_at, status, note, external_id)
select si.id, v.starts_at, v.starts_at + make_interval(hours => v.hrs), 'open', v.note, 'seed:open:' || v.site || ':' || v.starts_at::date
from (values
  ('KMC-ALB', (region_now('NZ')::date + 1) + time '06:00', 3, 'Flu clinic day: extra clean before opening'),
  ('NRC-MALL', (region_now('NSW')::date + (5 - extract(isodow from region_now('NSW'))::int + 7) % 7 + 1) + time '11:00', 4, 'Saturday afternoon cover for the food court')
) as v(site, starts_at, hrs, note)
join sites si on si.code = v.site
on conflict (external_id) do nothing;

-- Inspections and the faults they found.
insert into inspections (site_id, inspected_on, inspector, with_client, items_checked, note)
select si.id, current_date - v.ago, v.inspector, v.with_client, v.items, v.note
from (values
  ('TPG-QUAY', 12, 'Grace Hemi (area manager)', true, 40, 'Walked with Rachel from Tasman Property'),
  ('TPG-NEWM', 25, 'Grace Hemi (area manager)', false, 24, null),
  ('KMC-ALB', 50, 'Grace Hemi (area manager)', false, 36, null),
  ('HPS-SCH', 20, 'Grace Hemi (area manager)', true, 30, 'With the property manager'),
  ('NRC-MALL', 5, 'Grace Kim (supervisor)', true, 50, 'Joint walk with the centre manager after the food court complaint')
) as v(site, ago, inspector, with_client, items, note)
join sites si on si.code = v.site
where not exists (select 1 from inspections i where i.site_id = si.id and i.inspected_on = current_date - v.ago)
order by v.ago desc;

insert into faults (inspection_id, area, item, fix_by, fixed_on, fixed_by)
select i.id, v.area, v.item, i.inspected_on + 2, case when v.fixed then i.inspected_on + 1 end, case when v.fixed then v.who end
from (values
  ('TPG-QUAY', 'Level 12 kitchen', 'Rangehood greasy', false, null),
  ('TPG-QUAY', 'Level 3 bathrooms', 'Mirror smears', true, 'Losa Tuilagi'),
  ('TPG-QUAY', 'Lifts', 'Fingerprints on lift doors', true, 'Arjun Patel'),
  ('HPS-SCH', 'Room 4', 'Cobwebs on window frames', true, 'Tomasi Vea'),
  ('NRC-MALL', 'Food court', 'Table bases sticky', false, null),
  ('NRC-MALL', 'Food court', 'Chair legs not wiped', false, null),
  ('NRC-MALL', 'Amenities level 1', 'Urinal grates stained', false, null),
  ('NRC-MALL', 'Amenities level 1', 'Soap dispenser empty', true, 'Thanh Nguyen'),
  ('NRC-MALL', 'Escalators', 'Grit in the combs', false, null),
  ('NRC-MALL', 'Malls', 'Gum on the walkway near entry 2', true, 'Grace Kim'),
  ('NRC-MALL', 'Malls', 'Spill marks outside the supermarket', true, 'Grace Kim'),
  ('NRC-MALL', 'Car park', 'Stairwell C litter', false, null),
  ('NRC-MALL', 'High areas', 'Dust on directory signs', false, null)
) as v(site, area, item, fixed, who)
join sites si on si.code = v.site
join inspections i on i.site_id = si.id and i.inspected_on = (select max(inspected_on) from inspections x where x.site_id = si.id)
where not exists (select 1 from faults f where f.inspection_id = i.id and f.item = v.item);

-- Complaints: the missed clean, a food court complaint with no reply, a soap outage replied to but not resolved.
insert into complaints (site_id, received_at, from_name, category, summary, visit_id, responded_at, resolved_on, outcome)
select si.id, v.received_at, v.from_name, v.category, v.summary,
  (select id from visits x where x.site_id = si.id and x.status = 'missed' order by starts_at desc limit 1),
  v.responded_at, v.resolved_on, v.outcome
from (values
  ('TPG-QUAY', ((select max(g)::date from generate_series(region_now('NZ')::date - 9, region_now('NZ')::date - 2, interval '1 day') g where extract(isodow from g) < 6) + 1) + time '08:10', 'Rachel Moana', 'missed-clean', 'Levels 9 to 11 not cleaned last night: bins full, kitchens not done',
    ((select max(g)::date from generate_series(region_now('NZ')::date - 9, region_now('NZ')::date - 2, interval '1 day') g where extract(isodow from g) < 6) + 1) + time '08:55', (select max(g)::date from generate_series(region_now('NZ')::date - 9, region_now('NZ')::date - 2, interval '1 day') g where extract(isodow from g) < 6) + 1, 'Arjun and Losa did levels 9 to 11 before 10:00. Mele''s run covered by a spare from next week.'),
  ('NRC-MALL', region_now('NSW') - interval '6 hours', 'Nadia Haddad', 'quality', 'Food court tables still sticky at 11:30, two tenants complained', null, null, null),
  ('KMC-ALB', (region_now('NZ')::date - 2) + time '07:40', 'Dr Ian Hollis', 'supplies', 'Hand soap out in two clinical rooms this morning',
    (region_now('NZ')::date - 2) + time '09:15', null, null),
  ('HPS-SCH', (region_now('NZ')::date - 40) + time '08:30', 'Gareth Pene', 'quality', 'Room 6 carpet not vacuumed',
    (region_now('NZ')::date - 40) + time '10:00', current_date - 39, 'Vacuumed next visit, room added to the checklist photo')
) as v(site, received_at, from_name, category, summary, responded_at, resolved_on, outcome)
join sites si on si.code = v.site
where not exists (select 1 from complaints k where k.site_id = si.id and k.summary = v.summary)
order by v.received_at;

-- Incidents: a slip at the mall (client told), a chemical exposure at Albany not yet notified, a cracked glass panel the client has not heard about.
insert into incidents (site_id, cleaner_id, occurred_at, kind, summary, injury, notifiable, client_notified_at, closed_on, outcome)
select si.id, cl.id, v.occurred_at, v.kind, v.summary, v.injury, v.notifiable, v.told, null, null
from (values
  ('NRC-MALL', 'C-201', (region_now('NSW')::date - 4) + time '06:20', 'slip-trip-fall', 'Slipped on a wet floor near the food court, bruised knee, first aid only', true, false, (region_now('NSW')::date - 4) + time '09:00'),
  ('KMC-ALB', 'C-105', (region_now('NZ')::date - 1) + time '21:40', 'chemical', 'Fumes in the sluice room after a bleach product and an acid cleaner mixed; admitted to hospital overnight for observation', true, true, (region_now('NZ')::date) + time '07:30'),
  ('TPG-QUAY', 'C-102', (region_now('NZ')::date - 2) + time '20:15', 'property-damage', 'Vacuum cord caught a glass panel on level 7, panel cracked', false, false, null)
) as v(site, cleaner, occurred_at, kind, summary, injury, notifiable, told)
join sites si on si.code = v.site join cleaners cl on cl.code = v.cleaner
where not exists (select 1 from incidents i where i.site_id = si.id and i.summary = v.summary)
order by v.occurred_at;

-- Keys. Rosa left ten days ago with the tower's loading dock key.
insert into keys (site_id, label, kind, cleaner_id, issued_on, note)
select si.id, v.label, v.kind, cl.id, case when cl.id is null then null else current_date - v.ago end, v.note
from (values
  ('TPG-QUAY', 'Level 1 swipe card 0412', 'card', 'C-101', 600, null),
  ('TPG-QUAY', 'Loading dock key D7', 'key', 'C-106', 300, null),
  ('TPG-NEWM', 'Side door key', 'key', 'C-104', 900, null),
  ('TPG-NEWM', 'Alarm code', 'alarm-code', 'C-104', 900, 'Code changes every six months'),
  ('KMC-ALB', 'Front door key', 'key', 'C-105', 700, null),
  ('KMC-ALB', 'Spare front door key', 'key', null, null, 'In the office safe'),
  ('HPS-SCH', 'Admin block fob', 'fob', 'C-107', 55, null),
  ('NRC-MALL', 'Cleaners store key', 'key', 'C-204', 1300, null),
  ('WDC-DERR', 'Gatehouse 2 card', 'card', 'C-202', 880, null)
) as v(site, label, kind, cleaner, ago, note)
join sites si on si.code = v.site left join cleaners cl on cl.code = v.cleaner
on conflict (site_id, label) do nothing;

-- Contract changes: the school goes to another contractor in 20 days; Takapuna comes to us in 12.
insert into contract_changes (site_id, direction, other_contractor, takes_effect_on, cleaners_told_on, elect_by, transfer_info_on, note)
select si.id, v.direction, v.other, current_date + v.days, null, null, null, v.note
from (values
  ('HPS-SCH', 'losing', 'Sparkle Facility Services Ltd', 20, 'Board went to tender; new contractor from the start of next term'),
  ('KMC-TAK', 'winning', 'Prime Clean NZ Ltd', 12, 'Three cleaners on site under the outgoing contractor')
) as v(site, direction, other, days, note)
join sites si on si.code = v.site
on conflict do nothing;

-- Extras: one done and not billed, one approved and booked, one quoted and waiting.
insert into extras (site_id, description, price_cents, approved_on, approved_by, done_on)
select si.id, v.descr, v.price, case when v.approved is null then null else current_date - v.approved end, v.by, case when v.done is null then null else current_date - v.done end
from (values
  ('TPG-QUAY', 'After-function clean, level 12 boardroom and terrace', 65000, 12, 'Rachel Moana', 9),
  ('NRC-MALL', 'Pressure wash the loading bay', 120000, 3, 'Nadia Haddad', null::int),
  ('KMC-ALB', 'Steam clean waiting room chairs', 38000, null::int, null, null)
) as v(site, descr, price, approved, by, done)
join sites si on si.code = v.site
where not exists (select 1 from extras x where x.site_id = si.id and x.description = v.descr)
order by v.price;

insert into supplies (site_id, item, qty, unit_cents, recharge, delivered_on)
select si.id, v.item, v.qty, v.unit, v.recharge, current_date - v.ago
from (values
  ('TPG-QUAY', 'Toilet rolls, carton of 48', 6, 5400, true, 8),
  ('TPG-QUAY', 'Hand towel, carton of 16', 4, 6200, true, 8),
  ('KMC-ALB', 'Hand soap, 1 litre', 12, 950, true, 1),
  ('NRC-MALL', 'Bin liners, roll of 50', 20, 1150, false, 5)
) as v(site, item, qty, unit, recharge, ago)
join sites si on si.code = v.site
where not exists (select 1 from supplies s where s.site_id = si.id and s.item = v.item and s.delivered_on = current_date - v.ago);

-- Last month's invoices, one per client, for every site's monthly fee. Tasman and Kauri paid, the school
-- sent and not yet due, Northbridge sent and now overdue. Westgate was never invoiced for last month.
insert into invoices (ref, client_id, month, currency, subtotal_cents, gst_cents, total_cents, issued_on, due_on, sent_on, paid_on, external_id)
select v.ref, c.id, date_trunc('month', current_date - interval '1 month')::date, c.currency, f.sub, round(f.sub * case when c.country = 'NZ' then 0.15 else 0.10 end)::int,
  f.sub + round(f.sub * case when c.country = 'NZ' then 0.15 else 0.10 end)::int,
  current_date - v.issued, current_date - v.issued + c.invoice_days, current_date - v.issued, case when v.paid then current_date - 3 end, 'seed:' || v.ref
from (values
  ('INV-1995', 'TPG', 27, true),
  ('INV-1996', 'KMC', 27, true),
  ('INV-1997', 'HPS', 8, false),
  ('INV-1998', 'NRC', 27, false)
) as v(ref, client, issued, paid)
join clients c on c.code = v.client
cross join lateral (select sum(monthly_fee_cents)::int as sub from sites s where s.client_id = c.id and s.contract_start <= current_date - 30) f
on conflict (ref) do nothing;

insert into invoice_lines (invoice_id, site_id, kind, month, description, amount_cents)
select i.id, si.id, 'fee', i.month, si.name || ': contract cleaning ' || to_char(i.month, 'Mon YYYY'), si.monthly_fee_cents
from invoices i join sites si on si.client_id = i.client_id and si.contract_start <= current_date - 30
where i.ref in ('INV-1995', 'INV-1996', 'INV-1997', 'INV-1998')
on conflict do nothing;

insert into activity (actor, action, ref, detail)
select v.actor, v.action, v.ref, v.detail
from (values
  ('Demo', 'import', null, 'Demo data loaded: 5 clients, 7 sites, 12 cleaners, five weeks of visits'),
  ('Demo', 'note', 'HPS-SCH', 'Board confirmed the tender result by phone; letter to follow'),
  ('Demo', 'note', 'NRC-MALL', 'Centre manager wants a joint walk every fortnight until the food court lifts')
) as v(actor, action, ref, detail)
where not exists (select 1 from activity a where a.actor = 'Demo' and a.detail = v.detail);
