-- Commercial Cleaning for Claude Code: a cleaning contractor in plain tables.
-- Clients and their sites, the scope of works, cleaners and their site inductions, the visit roster,
-- periodical work, quality inspections and the faults they find, complaints, keys and access cards,
-- contract changes (who takes the cleaners when a site changes hands), extras, supplies, invoices,
-- and an append-only activity log.
-- Visit times are wall-clock times at the site (timestamp without time zone); region_zone()
-- turns a site's region into its time zone so "now" is always the site's own now.

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function region_zone(region text) returns text language sql immutable as $$
  select case region
    when 'NZ' then 'Pacific/Auckland' when 'NSW' then 'Australia/Sydney' when 'ACT' then 'Australia/Sydney'
    when 'VIC' then 'Australia/Melbourne' when 'TAS' then 'Australia/Hobart' when 'QLD' then 'Australia/Brisbane'
    when 'SA' then 'Australia/Adelaide' when 'NT' then 'Australia/Darwin' when 'WA' then 'Australia/Perth'
  end
$$;

create or replace function region_now(region text) returns timestamp language sql stable as $$
  select (now() at time zone region_zone(region))
$$;

-- House rules and contract defaults, changed with `set`. Laws live in docs/compliance.md.
create table settings (
  key text primary key,
  value text not null,
  note text not null default ''
);

create or replace function setting_num(k text, dflt numeric) returns numeric language sql stable as $$
  select coalesce((select value::numeric from settings where key = k), dflt)
$$;

create table clients (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{2,12}$'),
  name text not null check (length(trim(name)) > 0),
  country text not null check (country in ('NZ', 'AU')),
  currency text not null check (currency in ('NZD', 'AUD')),
  contact_name text,
  contact_email text,
  invoice_days int not null default 20 check (invoice_days between 0 and 120),
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((country = 'NZ' and currency = 'NZD') or (country = 'AU' and currency = 'AUD'))
);

create table sites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{2,16}$'),
  client_id uuid not null references clients(id),
  name text not null check (length(trim(name)) > 0),
  address text,
  region text not null check (region_zone(region) is not null),
  sector text not null default 'office' check (sector in ('office', 'education', 'medical', 'retail', 'industrial', 'hospitality', 'residential')),
  -- The contract: what the client pays each month and the cleaning hours that price was built on.
  monthly_fee_cents int not null check (monthly_fee_cents > 0),
  budget_hours_week numeric(6,2) not null default 0 check (budget_hours_week >= 0),
  contract_start date,
  contract_end date,
  induction_required boolean not null default true,
  -- A contract term: every cleaner on this site has a police vet on file (schools, medical, data rooms).
  vetting_required boolean not null default false,
  -- Days a week the site is cleaned, for pricing daily tasks.
  days_a_week int not null default 5 check (days_a_week between 1 and 7),
  -- Floor area sets the award's minimum engagement in Australia (Cleaning Services Award 2020 cl 13.5(c)).
  floor_area_m2 int check (floor_area_m2 > 0),
  instructions text,
  active boolean not null default true,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (contract_end is null or contract_start is null or contract_end > contract_start)
);

create table cleaners (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{2,12}$'),
  name text not null check (length(trim(name)) > 0),
  phone text,
  email text,
  -- AU: full-time, part-time or casual under the Cleaning Services Award 2020. NZ: the same words, for the roster.
  employment text not null default 'part-time' check (employment in ('full-time', 'part-time', 'casual')),
  award_level int check (award_level between 1 and 3),
  pay_rate_cents int not null default 0 check (pay_rate_cents >= 0),
  vetted_on date,
  status text not null default 'active' check (status in ('active', 'on-leave', 'left')),
  started_on date,
  left_on date,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'left') = (left_on is not null))
);

create table inductions (
  cleaner_id uuid not null references cleaners(id),
  site_id uuid not null references sites(id),
  inducted_on date not null,
  primary key (cleaner_id, site_id)
);

-- The scope of works: every task the contract promises, by area and how often.
-- daily and weekly tasks happen on each visit; monthly and longer are periodicals, tracked one by one.
create table scope_tasks (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id),
  area text not null check (length(trim(area)) > 0),
  task text not null check (length(trim(task)) > 0),
  frequency text not null check (frequency in ('daily', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'six-monthly', 'annual')),
  minutes int not null default 0 check (minutes >= 0),
  last_done_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, area, task)
);

create or replace function frequency_days(f text) returns int language sql immutable as $$
  select case f when 'daily' then 1 when 'weekly' then 7 when 'fortnightly' then 14 when 'monthly' then 30
    when 'quarterly' then 91 when 'six-monthly' then 182 when 'annual' then 365 end
$$;

-- How many times a week a task happens, for pricing a site from its scope.
create or replace function frequency_per_week(f text, days_a_week int) returns numeric language sql immutable as $$
  select case f when 'daily' then days_a_week::numeric else 7.0 / frequency_days(f) end
$$;

create table periodic_done (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references scope_tasks(id),
  done_on date not null,
  cleaner_id uuid references cleaners(id),
  note text,
  created_at timestamptz not null default now(),
  unique (task_id, done_on)
);

create sequence visit_ref_seq start 1001;
create table visits (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('V-' || nextval('visit_ref_seq')),
  site_id uuid not null references sites(id),
  cleaner_id uuid references cleaners(id),
  starts_at timestamp not null,
  ends_at timestamp not null,
  status text not null default 'open' check (status in ('open', 'planned', 'on-site', 'done', 'missed', 'cancelled')),
  clock_in_at timestamp,
  clock_out_at timestamp,
  override_reason text,
  cancel_reason text,
  note text,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at <= starts_at + interval '16 hours'),
  check ((status = 'open') = (cleaner_id is null) or status = 'cancelled'),
  check (status not in ('on-site', 'done') or clock_in_at is not null),
  check (status <> 'done' or (clock_out_at is not null and clock_out_at > clock_in_at))
);
create index visits_site_starts on visits (site_id, starts_at);
create index visits_cleaner_starts on visits (cleaner_id, starts_at);

-- A quality inspection: how many items were checked, and every fault found, each with a fix-by date.
create sequence inspection_ref_seq start 301;
create table inspections (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('QA-' || nextval('inspection_ref_seq')),
  site_id uuid not null references sites(id),
  inspected_on date not null,
  inspector text not null,
  with_client boolean not null default false,
  items_checked int not null check (items_checked > 0),
  note text,
  created_at timestamptz not null default now()
);

create table faults (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references inspections(id),
  area text not null,
  item text not null,
  fix_by date not null,
  fixed_on date,
  fixed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence complaint_ref_seq start 201;
create table complaints (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('CMP-' || nextval('complaint_ref_seq')),
  site_id uuid not null references sites(id),
  received_at timestamp not null,
  from_name text,
  category text not null check (category in ('missed-clean', 'quality', 'supplies', 'damage', 'security', 'conduct', 'other')),
  summary text not null check (length(trim(summary)) > 0),
  visit_id uuid references visits(id),
  responded_at timestamp,
  resolved_on date,
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence incident_ref_seq start 601;
create table incidents (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('INC-' || nextval('incident_ref_seq')),
  site_id uuid not null references sites(id),
  cleaner_id uuid references cleaners(id),
  occurred_at timestamp not null,
  kind text not null check (kind in ('slip-trip-fall', 'chemical', 'sharps', 'manual-handling', 'property-damage', 'security', 'other')),
  summary text not null check (length(trim(summary)) > 0),
  injury boolean not null default false,
  notifiable boolean not null default false,
  regulator_notified_at timestamp,
  regulator_reference text,
  client_notified_at timestamp,
  closed_on date,
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (regulator_notified_at is null or notifiable)
);

-- Keys, access cards, fobs and alarm codes the business holds for each site, and who has them.
create table keys (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id),
  label text not null check (length(trim(label)) > 0),
  kind text not null default 'key' check (kind in ('key', 'card', 'fob', 'alarm-code')),
  cleaner_id uuid references cleaners(id),
  issued_on date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, label),
  check ((cleaner_id is null) = (issued_on is null))
);

-- A site changing hands. losing: we hand the site to another contractor. winning: we take it over.
-- In New Zealand, cleaners on the site may elect to transfer to the incoming contractor
-- (Employment Relations Act 2000, Part 6A subpart 1). See docs/compliance.md.
create table contract_changes (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id),
  direction text not null check (direction in ('losing', 'winning')),
  other_contractor text not null,
  takes_effect_on date not null,
  cleaners_told_on date,
  elect_by date,
  transfer_info_on date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, direction, takes_effect_on)
);

-- One-off work outside the scope: a builders' clean, a carpet steam after a flood. Quoted, approved, done, billed.
create sequence extra_ref_seq start 401;
create table extras (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('X-' || nextval('extra_ref_seq')),
  site_id uuid not null references sites(id),
  description text not null check (length(trim(description)) > 0),
  price_cents int not null check (price_cents > 0),
  approved_on date,
  approved_by text,
  done_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (done_on is null or approved_on is not null)
);

-- Consumables delivered to a site. recharge = the client pays for them on the next invoice.
create table supplies (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id),
  item text not null,
  qty numeric(8,2) not null check (qty > 0),
  unit_cents int not null check (unit_cents >= 0),
  recharge boolean not null default true,
  delivered_on date not null,
  created_at timestamptz not null default now()
);

create sequence invoice_ref_seq start 2001;
create table invoices (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('INV-' || nextval('invoice_ref_seq')),
  client_id uuid not null references clients(id),
  month date not null check (extract(day from month) = 1),
  currency text not null check (currency in ('NZD', 'AUD')),
  subtotal_cents int not null check (subtotal_cents >= 0),
  gst_cents int not null check (gst_cents >= 0),
  total_cents int not null,
  issued_on date not null default current_date,
  due_on date not null,
  sent_on date,
  paid_on date,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_cents = subtotal_cents + gst_cents),
  check (paid_on is null or sent_on is not null)
);

create table invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id),
  site_id uuid not null references sites(id),
  kind text not null check (kind in ('fee', 'extra', 'supplies')),
  month date,
  extra_id uuid unique references extras(id),
  supply_id uuid unique references supplies(id),
  description text not null,
  amount_cents int not null check (amount_cents >= 0),
  check ((kind = 'fee') = (month is not null)),
  check ((kind = 'extra') = (extra_id is not null)),
  check ((kind = 'supplies') = (supply_id is not null))
);
-- A site's monthly fee is billed once.
create unique index invoice_lines_fee_once on invoice_lines (site_id, month) where kind = 'fee';

create table activity (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor text not null check (length(trim(actor)) > 0),
  action text not null,
  ref text,
  detail text
);
create or replace function activity_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'activity is append-only';
end $$;
create trigger activity_no_update before update or delete on activity for each row execute function activity_append_only();

create trigger clients_touch before update on clients for each row execute function touch_updated_at();
create trigger sites_touch before update on sites for each row execute function touch_updated_at();
create trigger cleaners_touch before update on cleaners for each row execute function touch_updated_at();
create trigger scope_tasks_touch before update on scope_tasks for each row execute function touch_updated_at();
create trigger visits_touch before update on visits for each row execute function touch_updated_at();
create trigger faults_touch before update on faults for each row execute function touch_updated_at();
create trigger complaints_touch before update on complaints for each row execute function touch_updated_at();
create trigger incidents_touch before update on incidents for each row execute function touch_updated_at();
create trigger keys_touch before update on keys for each row execute function touch_updated_at();
create trigger contract_changes_touch before update on contract_changes for each row execute function touch_updated_at();
create trigger extras_touch before update on extras for each row execute function touch_updated_at();
create trigger invoices_touch before update on invoices for each row execute function touch_updated_at();

-- Read-only to everyone but the owner: a shared installation adds its own grants.
do $$
declare t text;
begin
  foreach t in array array['settings','clients','sites','cleaners','inductions','scope_tasks','periodic_done','visits','inspections','faults',
    'complaints','incidents','keys','contract_changes','extras','supplies','invoices','invoice_lines','activity']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from public', t);
  end loop;
end $$;

-- ------------------------------------------------------------------ views

-- Every visit with its site, client, cleaner, planned and worked hours, and labour cost.
create view v_visits as
select v.id, v.ref, v.status, si.code as site, si.name as site_name, si.region, si.sector, c.code as client, c.currency,
  cl.code as cleaner_code, cl.name as cleaner, cl.employment, cl.status as cleaner_status,
  v.starts_at, v.ends_at, v.clock_in_at, v.clock_out_at, v.note,
  round(extract(epoch from (v.ends_at - v.starts_at)) / 3600.0, 2) as planned_hours,
  case when v.clock_out_at is not null then round(extract(epoch from (v.clock_out_at - v.clock_in_at)) / 3600.0, 2) end as worked_hours,
  case when v.clock_in_at is not null then round(extract(epoch from (v.clock_in_at - v.starts_at)) / 60.0)::int end as late_minutes,
  cl.pay_rate_cents, v.site_id, v.cleaner_id, si.client_id, region_now(si.region) as site_now
from visits v
join sites si on si.id = v.site_id
join clients c on c.id = si.client_id
left join cleaners cl on cl.id = v.cleaner_id;

-- Cleaning Services Award 2020 cl 13.5(c): the shortest part-time or casual engagement, by floor area.
-- 1 hour applies only to a sole cleaner at a stand-alone site of 300 m2 or less; unknown area uses the setting.
create or replace function award_min_hours(area int) returns numeric language sql stable as $$
  select case when area is null then setting_num('au_min_engagement_hours', 2)
    when area <= 300 then 1 when area <= 2000 then 2 when area <= 5000 then 3 else 4 end
$$;

-- Working days (Monday to Friday) between two dates. Public holidays are not taken out: count them yourself.
create or replace function working_days_before(d date, n int) returns date language sql immutable as $$
  select min(x)::date from (select x from generate_series(d - (n * 2 + 14), d - 1, interval '1 day') x
    where extract(isodow from x) < 6 order by x desc limit n) w
$$;

-- Every rule a rostered visit can break. One row per problem.
-- award = a minimum the law sets (docs/compliance.md), refused outright.
-- clash = the cleaner is somewhere else, has left or is on leave, refused outright.
-- contract = a term the client signed up for (police vetting); house = the business's own limit.
-- contract and house problems need an override reason, which is logged.
create view v_visit_problems as
with live as (
  select v.*, si.region, si.induction_required, si.vetting_required, si.floor_area_m2, cl.status as cleaner_status, cl.employment, cl.vetted_on, cl.left_on
  from visits v join sites si on si.id = v.site_id join cleaners cl on cl.id = v.cleaner_id
  where v.status in ('planned', 'on-site', 'done', 'missed')
)
select l.id as visit_id, l.ref, 'award' as kind, 'under the ' || award_min_hours(l.floor_area_m2) || '-hour minimum engagement' as problem,
  'Cleaning Services Award 2020 cl 13.5(c): minimum engagement for part-time and casual employees, set by floor area' as rule
from live l
where l.region <> 'NZ' and l.employment in ('part-time', 'casual')
  and extract(epoch from (l.ends_at - l.starts_at)) / 3600.0 < award_min_hours(l.floor_area_m2)
union all
select l.id, l.ref, 'clash', 'already at ' || xs.code || ' (' || x.ref || ')', 'One cleaner, one place at a time'
from live l
join visits x on x.cleaner_id = l.cleaner_id and x.id <> l.id and x.status not in ('cancelled', 'open', 'missed')
  and x.starts_at < l.ends_at and x.ends_at > l.starts_at
join sites xs on xs.id = x.site_id
union all
select l.id, l.ref, 'clash', 'cleaner is ' || l.cleaner_status, 'Only active cleaners are rostered'
from live l where l.cleaner_status <> 'active' and l.status = 'planned'
union all
select l.id, l.ref, 'contract', 'no police vet on file', 'Site contract: every cleaner on this site is police vetted'
from live l where l.vetting_required and (l.vetted_on is null or l.vetted_on < l.starts_at::date - (setting_num('vet_valid_years', 3) * 365)::int)
union all
select l.id, l.ref, 'house', 'not inducted at this site', 'House rule: site induction before the first visit (duty of care, HSWA 2015 s 36 / WHS Act 2011 s 19)'
from live l
where l.induction_required and not exists (select 1 from inductions i where i.cleaner_id = l.cleaner_id and i.site_id = l.site_id and i.inducted_on <= l.starts_at::date)
union all
select l.id, l.ref, 'house', 'week over ' || setting_num('max_week_hours', 50) || ' hours (' || round(w.hours, 1) || ')', 'House rule: max_week_hours'
from live l
join lateral (select sum(extract(epoch from (x.ends_at - x.starts_at)) / 3600.0) as hours from visits x
  where x.cleaner_id = l.cleaner_id and x.status not in ('cancelled', 'missed', 'open') and date_trunc('week', x.starts_at) = date_trunc('week', l.starts_at)) w on true
where w.hours > setting_num('max_week_hours', 50);

-- Each site this week (Monday to Sunday at the site): the hours the price was built on, rostered, open and worked.
create view v_site_week as
select si.code as site, si.name, c.code as client, si.budget_hours_week,
  coalesce(sum(extract(epoch from (v.ends_at - v.starts_at)) / 3600.0) filter (where v.status not in ('cancelled', 'missed')), 0)::numeric(8,1) as rostered_hours,
  coalesce(sum(extract(epoch from (v.ends_at - v.starts_at)) / 3600.0) filter (where v.status = 'open'), 0)::numeric(8,1) as open_hours,
  coalesce(sum(extract(epoch from (v.clock_out_at - v.clock_in_at)) / 3600.0) filter (where v.status = 'done'), 0)::numeric(8,1) as worked_hours,
  si.id as site_id
from sites si
join clients c on c.id = si.client_id
left join visits v on v.site_id = si.id and date_trunc('week', v.starts_at) = date_trunc('week', region_now(si.region))
where si.active
group by si.id, si.code, si.name, c.code, si.budget_hours_week;

-- Each periodical (monthly or less often): when it was last done, when it is due, how late it is.
create view v_periodicals as
select t.id as task_id, si.code as site, si.name as site_name, c.code as client, t.area, t.task, t.frequency, t.minutes,
  t.last_done_on, (coalesce(t.last_done_on, si.contract_start, current_date) + frequency_days(t.frequency)) as due_on,
  (current_date - (coalesce(t.last_done_on, si.contract_start, current_date) + frequency_days(t.frequency))) as days_late,
  t.site_id
from scope_tasks t join sites si on si.id = t.site_id join clients c on c.id = si.client_id
where t.active and si.active and frequency_days(t.frequency) >= 30;

-- The latest inspection at each site, its score, and the faults still open.
create view v_inspections as
select i.id, i.ref, si.code as site, si.name as site_name, c.code as client, i.inspected_on, i.inspector, i.with_client, i.items_checked,
  (select count(*) from faults f where f.inspection_id = i.id)::int as faults,
  round(100.0 * (i.items_checked - (select count(*) from faults f where f.inspection_id = i.id)) / i.items_checked)::int as score_pct,
  (select count(*) from faults f where f.inspection_id = i.id and f.fixed_on is null)::int as open_faults,
  (select count(*) from faults f where f.inspection_id = i.id and f.fixed_on is null and f.fix_by < current_date)::int as late_faults,
  i.site_id
from inspections i join sites si on si.id = i.site_id join clients c on c.id = si.client_id;

create view v_site_quality as
select si.code as site, si.name, c.code as client,
  (select max(inspected_on) from inspections i where i.site_id = si.id) as last_inspected,
  current_date - (select max(inspected_on) from inspections i where i.site_id = si.id) as days_since,
  (select score_pct from v_inspections v where v.site_id = si.id order by inspected_on desc, ref desc limit 1) as last_score,
  (select round(avg(score_pct))::int from v_inspections v where v.site_id = si.id and v.inspected_on > current_date - 90) as score_90_days,
  (select count(*) from faults f join inspections i on i.id = f.inspection_id where i.site_id = si.id and f.fixed_on is null)::int as open_faults,
  (select count(*) from complaints k where k.site_id = si.id and k.received_at > region_now(si.region) - interval '90 days')::int as complaints_90_days,
  si.id as site_id
from sites si join clients c on c.id = si.client_id where si.active;

create view v_complaints as
select k.id, k.ref, si.code as site, si.name as site_name, c.code as client, si.region, k.received_at, k.from_name, k.category, k.summary,
  k.responded_at, k.resolved_on, k.outcome,
  round(extract(epoch from (coalesce(k.responded_at, region_now(si.region)) - k.received_at)) / 3600.0, 1) as hours_to_respond,
  case when k.resolved_on is not null then 'resolved'
       when k.responded_at is null and region_now(si.region) > k.received_at + make_interval(hours => setting_num('complaint_response_hours', 4)::int) then 'no reply, late'
       when k.responded_at is null then 'no reply yet'
       else 'replied, not resolved' end as standing,
  k.site_id
from complaints k join sites si on si.id = k.site_id join clients c on c.id = si.client_id;

create view v_incidents as
select i.id, i.ref, si.code as site, c.code as client, si.region, i.occurred_at, i.kind, i.summary, i.injury, i.notifiable,
  cl.name as cleaner, i.regulator_notified_at, i.regulator_reference, i.client_notified_at, i.closed_on, i.outcome,
  round(extract(epoch from (region_now(si.region) - i.occurred_at)) / 3600.0)::int as hours_since,
  case when i.closed_on is not null then 'closed'
       when i.notifiable and i.regulator_notified_at is null then 'regulator not notified'
       when i.client_notified_at is null then 'client not told'
       else 'open' end as standing,
  i.site_id
from incidents i join sites si on si.id = i.site_id join clients c on c.id = si.client_id left join cleaners cl on cl.id = i.cleaner_id;

-- Margin on each site over the last 28 days: the fee earned against worked hours at each cleaner's rate plus on-costs.
create view v_site_margin as
select si.code as site, si.name, c.code as client, c.currency, si.monthly_fee_cents,
  round(si.monthly_fee_cents * 12.0 / 365 * 28)::int as fee_28_days_cents,
  coalesce(sum(extract(epoch from (v.clock_out_at - v.clock_in_at)) / 3600.0), 0)::numeric(8,1) as worked_hours,
  round(si.budget_hours_week * 4, 1) as budget_hours,
  round(coalesce(sum(extract(epoch from (v.clock_out_at - v.clock_in_at)) / 3600.0 * cl.pay_rate_cents), 0) * (1 + setting_num('on_cost_pct', 20) / 100))::int as labour_cents,
  si.id as site_id
from sites si join clients c on c.id = si.client_id
left join visits v on v.site_id = si.id and v.status = 'done' and v.starts_at >= region_now(si.region) - interval '28 days'
left join cleaners cl on cl.id = v.cleaner_id
where si.active
group by si.id, si.code, si.name, c.code, c.currency, si.monthly_fee_cents, si.budget_hours_week;

-- Everything earned and not yet on an invoice: monthly fees for months that have started, extras done, supplies to recharge.
create view v_unbilled as
select c.id as client_id, c.code as client, c.currency, si.id as site_id, si.code as site, 'fee' as kind, m.month::date as month,
  null::uuid as extra_id, null::uuid as supply_id,
  si.name || ': contract cleaning ' || to_char(m.month, 'Mon YYYY') as description, si.monthly_fee_cents as amount_cents,
  m.month::date as earned_on
from sites si join clients c on c.id = si.client_id
cross join lateral generate_series(date_trunc('month', coalesce(si.contract_start, current_date - 60)::timestamp),
  date_trunc('month', least(coalesce(si.contract_end, current_date), current_date)::timestamp), interval '1 month') m(month)
-- Billing starts from last month: older months were billed in the system you came from.
where si.active and m.month >= date_trunc('month', current_date::timestamp) - interval '1 month'
  and not exists (select 1 from invoice_lines l where l.site_id = si.id and l.kind = 'fee' and l.month = m.month::date)
union all
select c.id, c.code, c.currency, si.id, si.code, 'extra', null, x.id, null, si.name || ': ' || x.description || ' (' || x.ref || ')', x.price_cents, x.done_on
from extras x join sites si on si.id = x.site_id join clients c on c.id = si.client_id
where x.done_on is not null and not exists (select 1 from invoice_lines l where l.extra_id = x.id)
union all
select c.id, c.code, c.currency, si.id, si.code, 'supplies', null, null, s.id, si.name || ': ' || s.item || ' x ' || trim(to_char(s.qty, 'FM9999990.##')) || ' (' || s.delivered_on || ')',
  round(s.qty * s.unit_cents)::int, s.delivered_on
from supplies s join sites si on si.id = s.site_id join clients c on c.id = si.client_id
where s.recharge and not exists (select 1 from invoice_lines l where l.supply_id = s.id);

-- Contract changes and where each stands on the cleaners' right to transfer (NZ) or handover.
create view v_contract_changes as
select k.id, si.code as site, si.name as site_name, si.region, k.direction, k.other_contractor, k.takes_effect_on,
  k.takes_effect_on - current_date as days_left,
  case when si.region = 'NZ' and k.direction = 'losing' then working_days_before(k.takes_effect_on, 20) end as tell_by,
  k.cleaners_told_on, k.elect_by, k.transfer_info_on,
  (select count(distinct v.cleaner_id) from visits v where v.site_id = si.id and v.status in ('done', 'planned') and v.starts_at > current_date - 28)::int as cleaners_on_site,
  case when k.takes_effect_on < current_date then 'done'
       when si.region = 'NZ' and k.direction = 'losing' and k.cleaners_told_on is null then 'cleaners not told of their right to transfer'
       when si.region = 'NZ' and k.direction = 'losing' and k.transfer_info_on is null then 'transfer information not given to the incoming contractor'
       when si.region = 'NZ' and k.direction = 'winning' and k.transfer_info_on is null then 'transfer information not received from the outgoing contractor'
       when k.direction = 'losing' then 'handover: keys, supplies, final invoice'
       else 'mobilise: inductions, keys, roster' end as standing,
  k.site_id
from contract_changes k join sites si on si.id = k.site_id;

-- Every key, card and code, who holds it, and whether that person still works here.
create view v_keys as
select k.id, si.code as site, k.label, k.kind, cl.code as cleaner_code, cl.name as held_by, cl.status as holder_status, k.issued_on, k.note,
  case when k.cleaner_id is null then 'in the office'
       when cl.status = 'left' then 'held by someone who has left'
       else 'issued' end as standing,
  k.site_id, k.cleaner_id
from keys k join sites si on si.id = k.site_id left join cleaners cl on cl.id = k.cleaner_id;
