// The rules of the cleaning contract desk. scripts/cleaning.mjs is a thin shell over run().
// Every write names an actor and leaves a row in the append-only activity log.
// Visit times are wall-clock times at the site: "2026-10-21 18:00" means 6 pm where the site is.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './db.mjs';
import { parseCsv, pick, yesNo } from './csv.mjs';
import { price as money } from './format.mjs';

export const today = () => new Date().toISOString().slice(0, 10);

export function date(v, label) {
  const s = String(v ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw Error(`--${label} must be a date (YYYY-MM-DD)`);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw Error(`--${label} must be a date (YYYY-MM-DD)`);
  return s;
}

// "2026-10-21 18:00" (or with a T) -> "2026-10-21 18:00:00", a site wall-clock time.
export function stamp(v, label) {
  const s = String(v ?? '').trim().replace('T', ' ');
  const m = s.match(/^(\d{4}-\d{2}-\d{2}) (\d{1,2}):(\d{2})(?::00)?$/);
  if (!m) throw Error(`--${label} must be a date and time like 2026-10-21 18:00`);
  date(m[1], label);
  const h = Number(m[2]);
  const min = Number(m[3]);
  if (h > 23 || min > 59) throw Error(`--${label} has an impossible time`);
  return `${m[1]} ${String(h).padStart(2, '0')}:${m[3]}:00`;
}

// "46.50" or "$1,200" -> cents. Never guesses at a blank.
export function cents(v, label, { zero = false } = {}) {
  const s = String(v ?? '').replace(/[$,\s]/g, '').replace(/^(NZD|AUD)/i, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw Error(`--${label} must be an amount like 46.50`);
  const n = Math.round(parseFloat(s) * 100);
  if (n <= 0 && !zero) throw Error(`--${label} must be more than zero`);
  return n;
}

function num(v, label, { min = 0, max = Infinity } = {}) {
  const n = Number(v);
  if (v === undefined || v === true || String(v).trim() === '' || !Number.isFinite(n) || n < min || n > max) throw Error(`--${label} must be a number from ${min} to ${max}`);
  return n;
}
function need(flags, ...keys) {
  for (const k of keys) if (flags[k] === undefined || flags[k] === true || String(flags[k]).trim() === '') throw Error(`--${k} is required`);
}
function oneOf(v, allowed, label) {
  if (!allowed.includes(v)) throw Error(`--${label} must be one of: ${allowed.join(', ')}`);
  return v;
}
// Wall-clock stamps compared as if UTC: both sides are the same site's clock.
const ms = (v) => Date.parse(String(v).replace(' ', 'T').slice(0, 19) + 'Z');
const text = (v) => (v === undefined || v === true ? null : String(v).trim() || null);
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

const REGIONS = ['NZ', 'NSW', 'ACT', 'VIC', 'TAS', 'QLD', 'SA', 'NT', 'WA'];
const SECTORS = ['office', 'education', 'medical', 'retail', 'industrial', 'hospitality', 'residential'];
const FREQUENCIES = ['daily', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'six-monthly', 'annual'];
const EMPLOYMENT = ['full-time', 'part-time', 'casual'];
const COMPLAINTS = ['missed-clean', 'quality', 'supplies', 'damage', 'security', 'conduct', 'other'];
const INCIDENTS = ['slip-trip-fall', 'chemical', 'sharps', 'manual-handling', 'property-damage', 'security', 'other'];
const KEY_KINDS = ['key', 'card', 'fob', 'alarm-code'];

async function tx(db, fn) {
  await db.exec('begin');
  try { const r = await fn(); await db.exec('commit'); return r; } catch (e) { await db.exec('rollback'); throw e; }
}
async function log(db, actor, action, ref, detail) {
  await db.query('insert into activity (actor, action, ref, detail) values ($1,$2,$3,$4)', [actor, action, ref, detail]);
}
function actorOf(flags) {
  need(flags, 'actor');
  return String(flags.actor).trim();
}

// Resolve one record from a code, reference, id prefix or name. Exact (case-insensitive) beats
// partial; more than one partial match lists the candidates and fails.
function choose(rows, term, what, label) {
  const t = String(term ?? '').trim().toLowerCase();
  if (!t || t === 'true') throw Error(`Name the ${what.toLowerCase()}`);
  const exact = rows.filter((r) => label(r).some((x) => x && String(x).toLowerCase() === t));
  if (exact.length === 1) return exact[0];
  const partial = exact.length ? exact : rows.filter((r) => label(r).some((x) => x && String(x).toLowerCase().includes(t)));
  if (partial.length === 1) return partial[0];
  if (!partial.length) throw Error(`${what} "${term}" not found`);
  throw Error(`"${term}" is ambiguous: ${partial.map((r) => label(r).filter(Boolean).slice(0, 2).join(' / ')).join('; ')}`);
}
export const client = async (db, term) => choose(await db.query('select * from clients order by code'), term, 'Client', (r) => [r.code, r.name, r.id]);
export const site = async (db, term) => choose(await db.query('select s.*, c.code as client, c.currency, c.country from sites s join clients c on c.id = s.client_id order by s.code'), term, 'Site', (r) => [r.code, r.name, r.id]);
export const cleaner = async (db, term) => choose(await db.query('select * from cleaners order by code'), term, 'Cleaner', (r) => [r.code, r.name, r.id]);
export const visit = async (db, term) => choose(await db.query('select * from v_visits order by starts_at'), term, 'Visit', (r) => [r.ref, r.id]);
const inspection = async (db, term) => choose(await db.query('select * from v_inspections order by ref'), term, 'Inspection', (r) => [r.ref, r.id]);
const complaint = async (db, term) => choose(await db.query('select * from v_complaints order by ref'), term, 'Complaint', (r) => [r.ref, r.id]);
const incident = async (db, term) => choose(await db.query('select * from incidents order by ref'), term, 'Incident', (r) => [r.ref, r.id]);
const invoice = async (db, term) => choose(await db.query('select * from invoices order by ref'), term, 'Invoice', (r) => [r.ref, r.id]);
const extra = async (db, term) => choose(await db.query('select * from extras order by ref'), term, 'Extra', (r) => [r.ref, r.id]);
const setting = async (db, key, dflt) => Number((await db.query('select value from settings where key = $1', [key]))[0]?.value ?? dflt);
const siteNow = async (db, region) => (await db.query('select region_now($1)::text as now', [region]))[0].now.slice(0, 19);

function draftFile(name, body) {
  const dir = path.join(process.env.OUTPUT_DIR || REPO_ROOT, 'drafts');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  writeFileSync(file, body);
  return path.relative(process.env.OUTPUT_DIR || REPO_ROOT, file).replace(/\\/g, '/');
}

// ------------------------------------------------------------------ the gate on every roster change

// Problems the visit would have with this cleaner on it, worked out inside a savepoint so nothing sticks.
async function problemsWith(db, v, cleanerId) {
  await db.exec('savepoint probe');
  try {
    await db.query(`update visits set cleaner_id = $2, status = case when status = 'open' then 'planned' else status end where id = $1`, [v.id, cleanerId]);
    return await db.query('select kind, problem, rule from v_visit_problems where visit_id = $1 order by kind, problem', [v.id]);
  } finally {
    await db.exec('rollback to savepoint probe');
  }
}

// award and clash refuse outright. contract and house refuse unless --override names the reason.
function gate(problems, f, ref, who) {
  const hard = problems.filter((p) => p.kind === 'award' || p.kind === 'clash');
  if (hard.length) throw Error(`${who} cannot do ${ref}: ${hard.map((p) => `${p.problem} (${p.rule})`).join('; ')}`);
  if (problems.length && !(typeof f.override === 'string' && f.override.trim())) {
    throw Error(`${who} on ${ref} breaks a ${problems.map((p) => p.kind).filter((k, i, a) => a.indexOf(k) === i).join(' and ')} rule: ${problems.map((p) => p.problem).join('; ')}. Pick someone else (cover ${ref}) or add --override="<reason>"`);
  }
}

const VERDICT = { 'can do it': 0, 'needs a reason': 1, cannot: 2 };

export const reads = {
  async attention(db) {
    const rows = await db.query(`
      select 1 as rank, 'open visit' as item, ref, site || ' ' || to_char(starts_at, 'Dy DD Mon HH24:MI') || ' for ' || planned_hours || 'h' as detail
        from v_visits where status = 'open' and starts_at < site_now + interval '7 days' and ends_at > site_now
      union all
      select 1, 'rostered under the award', p.ref, p.problem || ' (' || v.cleaner || ', ' || v.site || ' ' || to_char(v.starts_at, 'Dy DD Mon HH24:MI') || ')'
        from v_visit_problems p join v_visits v on v.id = p.visit_id where p.kind = 'award' and v.status = 'planned' and v.starts_at < v.site_now + interval '14 days'
      union all
      select 2, 'double booked', p.ref, p.problem || ' (' || v.cleaner || ', ' || to_char(v.starts_at, 'Dy DD Mon HH24:MI') || ')'
        from v_visit_problems p join v_visits v on v.id = p.visit_id where p.kind = 'clash' and v.status = 'planned' and v.starts_at < v.site_now + interval '14 days'
      union all
      select 2, 'contract term broken', p.ref, p.problem || ' (' || v.cleaner || ', ' || v.site || ' ' || to_char(v.starts_at, 'Dy DD Mon HH24:MI') || ')'
        from v_visit_problems p join visits x on x.id = p.visit_id join v_visits v on v.id = p.visit_id
        where p.kind = 'contract' and x.override_reason is null and v.status = 'planned' and v.starts_at < v.site_now + interval '7 days'
      union all
      select 3, 'house rule broken', p.ref, p.problem || ' (' || v.cleaner || ', ' || v.site || ' ' || to_char(v.starts_at, 'Dy DD Mon HH24:MI') || ')'
        from v_visit_problems p join visits x on x.id = p.visit_id join v_visits v on v.id = p.visit_id
        where p.kind = 'house' and x.override_reason is null and v.status = 'planned' and v.starts_at < v.site_now + interval '7 days'
      union all
      select 1, 'not clocked in', ref, cleaner || ' due at ' || site || ' ' || to_char(starts_at, 'HH24:MI')
        from v_visits where status = 'planned' and starts_at + interval '20 minutes' < site_now and ends_at > site_now
      union all
      select 2, 'not clocked out', ref, cleaner || ' at ' || site || ', visit ended ' || to_char(ends_at, 'Dy HH24:MI')
        from v_visits where status = 'on-site' and ends_at + interval '60 minutes' < site_now
      union all
      select 1, 'regulator not notified', ref, site || ': ' || summary || ' (' || hours_since || 'h ago)'
        from v_incidents where standing = 'regulator not notified'
      union all
      select 2, 'client not told of incident', ref, site || ': ' || summary
        from v_incidents where standing = 'client not told'
      union all
      select 1, 'complaint with no reply', ref, site || ' ' || from_name || ': ' || summary || ' (' || hours_to_respond || 'h)'
        from v_complaints where standing = 'no reply, late'
      union all
      select 3, 'complaint not resolved', ref, site || ': ' || summary
        from v_complaints where standing = 'replied, not resolved'
      union all
      select 1, 'cleaners not told of their right to transfer', site, 'Site goes to ' || other_contractor || ' on ' || takes_effect_on || '; notice was due by ' || tell_by || ' (ERA 2000 s 69G: 20 working days before)'
        from v_contract_changes where standing = 'cleaners not told of their right to transfer'
      union all
      select 2, 'contract change', site, standing || ' (' || direction || ', ' || other_contractor || ', ' || takes_effect_on || ', ' || days_left || ' days)'
        from v_contract_changes where standing not in ('done', 'cleaners not told of their right to transfer') and days_left <= 30
      union all
      select 2, 'key held by someone who has left', site, label || ' (' || held_by || ')'
        from v_keys where standing = 'held by someone who has left'
      union all
      select 2, 'inspection under the pass mark', ref, site || ' scored ' || score_pct || '% on ' || inspected_on || ', ' || open_faults || ' faults open'
        from v_inspections v where score_pct < setting_num('pass_score_pct', 85)
          and inspected_on = (select max(inspected_on) from inspections i where i.site_id = v.site_id)
      union all
      select 2, 'fault past its fix-by date', i.ref, i.site || ' ' || f.area || ': ' || f.item || ' (due ' || f.fix_by || ')'
        from faults f join v_inspections i on i.id = f.inspection_id where f.fixed_on is null and f.fix_by < current_date
      union all
      select 3, 'inspection due', q.site, coalesce('last inspected ' || last_inspected || ' (' || days_since || ' days)', 'never inspected')
        from v_site_quality q join sites s on s.id = q.site_id
        where (days_since is null or days_since > setting_num('inspect_every_days', 30)) and (s.contract_start is null or s.contract_start <= current_date)
      union all
      select 3, 'periodical overdue', site, area || ': ' || task || ' (' || frequency || ', due ' || due_on || ', ' || days_late || ' days late)'
        from v_periodicals where days_late > 0
      union all
      select 4, 'over budget hours this week', site, rostered_hours || 'h rostered against ' || budget_hours_week || 'h priced'
        from v_site_week where rostered_hours > budget_hours_week * 1.05
      union all
      select 4, 'under budget hours this week', w.site, (w.rostered_hours - w.open_hours) || 'h covered of ' || w.budget_hours_week || 'h priced' || case when w.open_hours > 0 then ', ' || w.open_hours || 'h still open' else '' end
        from v_site_week w join sites s on s.id = w.site_id where w.rostered_hours - w.open_hours < w.budget_hours_week * 0.95 and (s.contract_start is null or s.contract_start <= current_date)
      union all
      select 3, 'invoice overdue', i.ref, c.code || ' ' || i.currency || ' ' || to_char(i.total_cents / 100.0, 'FM999,999,990.00') || ' due ' || i.due_on
        from invoices i join clients c on c.id = i.client_id where i.paid_on is null and i.sent_on is not null and i.due_on < current_date
      union all
      select 3, 'month not invoiced', client, site || ' ' || to_char(month, 'Mon YYYY') || ' fee ' || currency || ' ' || to_char(amount_cents / 100.0, 'FM999,999,990.00')
        from v_unbilled where kind = 'fee' and month < date_trunc('month', current_date)
      union all
      select 4, 'extra done, not invoiced', client, description || ' ' || currency || ' ' || to_char(amount_cents / 100.0, 'FM999,999,990.00')
        from v_unbilled where kind = 'extra'
      order by 1, 2, 3`);
    return rows.map(({ rank, ...r }) => r);
  },

  async roster(db, args, f) {
    const days = f.days ? num(f.days, 'days', { min: 1, max: 62 }) : 7;
    const from = f.from ? date(f.from, 'from') : null;
    const params = [days];
    let where = '';
    if (f.site) { params.push((await site(db, f.site)).id); where += ` and v.site_id = $${params.length}`; }
    if (f.cleaner) { params.push((await cleaner(db, f.cleaner)).id); where += ` and v.cleaner_id = $${params.length}`; }
    if (from) params.push(from);
    const start = from ? `$${params.length}::date` : 'site_now::date';
    return db.query(`select v.ref, to_char(v.starts_at, 'Dy DD Mon') as day, to_char(v.starts_at, 'HH24:MI') || '-' || to_char(v.ends_at, 'HH24:MI') as hours,
        v.site, coalesce(v.cleaner, '(open)') as cleaner, v.status,
        (select string_agg(p.problem, '; ') from v_visit_problems p where p.visit_id = v.id) as problems
      from v_visits v where v.status <> 'cancelled' and v.starts_at >= ${start} and v.starts_at < ${start} + make_interval(days => $1) ${where}
      order by v.starts_at, v.site`, params);
  },

  async 'open-visits'(db, args, f) {
    const days = f.days ? num(f.days, 'days', { min: 1, max: 62 }) : 14;
    return db.query(`select ref, site, region, to_char(starts_at, 'Dy DD Mon HH24:MI') as starts, planned_hours as hours, note
      from v_visits where status = 'open' and ends_at > site_now and starts_at < site_now + make_interval(days => $1) order by starts_at`, [days]);
  },

  // Who can take this visit: every active cleaner checked against the award, clashes, vetting, induction and weekly hours.
  async cover(db, args) {
    const v = await visit(db, args[0]);
    if (['done', 'cancelled', 'missed'].includes(v.status)) throw Error(`${v.ref} is ${v.status}`);
    const candidates = await db.query(`select c.id, c.code, c.name, c.employment,
        coalesce((select sum(extract(epoch from (x.ends_at - x.starts_at)) / 3600.0) from visits x where x.cleaner_id = c.id and x.status not in ('cancelled', 'missed', 'open')
          and date_trunc('week', x.starts_at) = date_trunc('week', $2::timestamp)), 0)::numeric(6,1) as week_hours,
        exists (select 1 from inductions i where i.cleaner_id = c.id and i.site_id = $3) as inducted
      from cleaners c where c.status = 'active' and c.id is distinct from $1
        -- Only cleaners who work in the same country (or have no history yet).
        and not exists (select 1 from visits x join sites xs on xs.id = x.site_id where x.cleaner_id = c.id and (xs.region = 'NZ') <> ($4 = 'NZ'))
      order by c.code`, [v.cleaner_id, v.starts_at, v.site_id, v.region]);
    const out = [];
    await db.exec('begin');
    try {
      for (const c of candidates) {
        const p = await problemsWith(db, v, c.id);
        out.push({ cleaner: c.name, code: c.code, employment: c.employment, week_hours: c.week_hours, knows_site: c.inducted,
          verdict: p.some((x) => x.kind === 'award' || x.kind === 'clash') ? 'cannot' : p.length ? 'needs a reason' : 'can do it', why: p.map((x) => x.problem).join('; ') });
      }
    } finally { await db.exec('rollback'); }
    return out.sort((a, b) => VERDICT[a.verdict] - VERDICT[b.verdict] || Number(b.knows_site) - Number(a.knows_site) || Number(a.week_hours) - Number(b.week_hours) || a.code.localeCompare(b.code));
  },

  async check(db, args, f) {
    const v = await visit(db, args[0]);
    if (f.cleaner) {
      const c = await cleaner(db, f.cleaner);
      await db.exec('begin');
      try { return await problemsWith(db, v, c.id); } finally { await db.exec('rollback'); }
    }
    return db.query('select kind, problem, rule from v_visit_problems where visit_id = $1 order by kind, problem', [v.id]);
  },

  // The roster, pay rates, incidents and contract changes against the rules in docs/compliance.md.
  async compliance(db, args, f) {
    const ahead = f.days ? num(f.days, 'days', { min: 1, max: 90 }) : 14;
    const back = f.past ? num(f.past, 'past', { min: 0, max: 365 }) : 28;
    const visitRows = await db.query(`select p.kind, p.problem, p.rule, count(*)::int as count, min(p.ref) as first, min(v.starts_at)::text as earliest
      from v_visit_problems p join v_visits v on v.id = p.visit_id join visits x on x.id = v.id
      where v.starts_at >= v.site_now - make_interval(days => $2) and v.starts_at < v.site_now + make_interval(days => $1)
        and not (p.kind in ('contract', 'house') and x.override_reason is not null)
      group by p.kind, p.problem, p.rule`, [ahead, back]);
    const other = await db.query(`
      select 'award' as kind, 'paid under the level ' || c.award_level || ' minimum rate' as problem,
        'Cleaning Services Award 2020 cl 15.1: minimum hourly rate before part-time and casual loadings' as rule, count(*)::int as count, min(c.code) as first, null::text as earliest
        from cleaners c where c.status = 'active' and c.award_level is not null
          and c.pay_rate_cents < setting_num('award_l' || c.award_level || '_cents', 0)
          and exists (select 1 from visits v join sites s on s.id = v.site_id where v.cleaner_id = c.id and s.region <> 'NZ')
        group by c.award_level
      union all
      select 'award', 'Australian cleaner with no award level recorded', 'Cleaning Services Award 2020 Schedule A: every employee is classified at a level',
        count(*)::int, min(c.code), null from cleaners c where c.status = 'active' and c.award_level is null
          and exists (select 1 from visits v join sites s on s.id = v.site_id where v.cleaner_id = c.id and s.region <> 'NZ') having count(*) > 0
      union all
      select 'law', 'cleaners not told of their right to transfer, 20 working days out', 'Employment Relations Act 2000 s 69G (NZ)',
        count(*)::int, min(site), min(tell_by)::text from v_contract_changes where standing = 'cleaners not told of their right to transfer' and tell_by < current_date having count(*) > 0
      union all
      select 'law', 'transfer information for the incoming contractor due within 7 days', 'Employment Relations Act 2000 s 69OEA (NZ): by the date the change takes effect',
        count(*)::int, min(site), min(takes_effect_on)::text from v_contract_changes where standing = 'transfer information not given to the incoming contractor' and days_left <= 7 having count(*) > 0
      union all
      select 'law', 'notifiable event not reported to the regulator', 'HSWA 2015 s 56 (NZ) / WHS Act 2011 s 38 (AU): notify as soon as possible',
        count(*)::int, min(ref), min(occurred_at)::text from v_incidents where standing = 'regulator not notified' having count(*) > 0
      union all
      select 'contract', 'complaint not answered within ' || setting_num('complaint_response_hours', 4) || ' hours', 'Contract term: complaint_response_hours',
        count(*)::int, min(ref), min(received_at)::text from v_complaints where standing = 'no reply, late' having count(*) > 0
      union all
      select 'house', 'key or card held by someone who has left', 'House rule: every key back on the last day',
        count(*)::int, min(site), null from v_keys where standing = 'held by someone who has left' having count(*) > 0`);
    const order = { law: 0, award: 0, clash: 1, contract: 2, house: 3 };
    return [...visitRows, ...other].sort((a, b) => order[a.kind] - order[b.kind] || b.count - a.count);
  },

  async hours(db) {
    return db.query(`select w.site, w.client, w.budget_hours_week as priced, w.rostered_hours as rostered, w.open_hours as open, w.worked_hours as worked_so_far,
        (w.rostered_hours - w.budget_hours_week)::numeric(8,1) as rostered_minus_priced
      from v_site_week w join sites s on s.id = w.site_id where s.contract_start is null or s.contract_start <= current_date order by w.rostered_hours - w.budget_hours_week desc, w.site`);
  },

  async margins(db) {
    return db.query(`select site, client, currency, fee_28_days_cents, worked_hours, budget_hours, labour_cents,
        (fee_28_days_cents - labour_cents) as margin_cents,
        case when fee_28_days_cents > 0 then round(100.0 * (fee_28_days_cents - labour_cents) / fee_28_days_cents)::int end as margin_pct
      from v_site_margin m join sites s on s.id = m.site_id where s.contract_start is null or s.contract_start <= current_date - 28
      order by margin_pct nulls last, site`);
  },

  async periodicals(db, args, f) {
    const params = [];
    let where = '';
    if (f.site) { params.push((await site(db, f.site)).id); where = `and site_id = $1`; }
    return db.query(`select site, area, task, frequency, minutes, last_done_on, due_on, days_late,
        case when days_late > 0 then 'overdue' when days_late > -14 then 'due within 14 days' else 'scheduled' end as standing
      from v_periodicals where true ${where} order by days_late desc, site`, params);
  },

  async quality(db) {
    return db.query(`select site, client, last_inspected, days_since, last_score, score_90_days, open_faults, complaints_90_days
      from v_site_quality order by last_score nulls first, site`);
  },

  async inspections(db, args, f) {
    const params = [];
    let where = '';
    if (f.site) { params.push((await site(db, f.site)).id); where = 'where site_id = $1'; }
    return db.query(`select ref, site, inspected_on, inspector, with_client, items_checked, faults, score_pct, open_faults, late_faults from v_inspections ${where} order by inspected_on desc`, params);
  },

  async inspection(db, args) {
    const i = await inspection(db, args[0]);
    const faults = await db.query(`select area, item, fix_by, fixed_on, fixed_by,
        case when fixed_on is not null then 'fixed' when fix_by < current_date then 'late' else 'open' end as standing
      from faults where inspection_id = $1 order by area, item`, [i.id]);
    return { inspection: { ref: i.ref, site: i.site, inspected_on: i.inspected_on, inspector: i.inspector, with_client: i.with_client, items_checked: i.items_checked, score_pct: i.score_pct }, faults };
  },

  // Open complaints; --all adds the resolved ones.
  async complaints(db, args, f) {
    return db.query(`select ref, site, to_char(received_at, 'DD Mon HH24:MI') as received, from_name, category, summary, hours_to_respond, standing
      from v_complaints where ($1 or standing <> 'resolved') order by received_at desc`, [f.all === true]);
  },

  async incidents(db) {
    return db.query(`select ref, site, to_char(occurred_at, 'DD Mon HH24:MI') as occurred, kind, cleaner, summary, injury, notifiable, standing from v_incidents order by occurred_at desc`);
  },

  async sites(db) {
    return db.query(`select s.code, s.name, c.code as client, s.region, s.sector, s.monthly_fee_cents, c.currency, s.budget_hours_week as priced_hours,
        s.contract_start, s.contract_end, s.vetting_required as vetting, s.active
      from sites s join clients c on c.id = s.client_id order by s.active desc, s.code`);
  },

  async site(db, args) {
    const s = await site(db, args[0]);
    const [week] = await db.query('select budget_hours_week as priced, rostered_hours, open_hours, worked_hours from v_site_week where site_id = $1', [s.id]);
    const [quality] = await db.query('select last_inspected, last_score, open_faults, complaints_90_days from v_site_quality where site_id = $1', [s.id]);
    const scope = await db.query('select area, task, frequency, minutes, last_done_on from scope_tasks where site_id = $1 and active order by frequency_days(frequency), area, task', [s.id]);
    const team = await db.query(`select c.code, c.name, i.inducted_on, c.vetted_on from inductions i join cleaners c on c.id = i.cleaner_id where i.site_id = $1 and c.status = 'active' order by c.code`, [s.id]);
    const keys = await db.query('select label, kind, held_by, standing from v_keys where site_id = $1 order by label', [s.id]);
    return { site: { code: s.code, name: s.name, client: s.client, address: s.address, region: s.region, sector: s.sector, monthly_fee_cents: s.monthly_fee_cents, currency: s.currency,
      floor_area_m2: s.floor_area_m2, contract_start: s.contract_start, contract_end: s.contract_end, vetting_required: s.vetting_required, instructions: s.instructions },
      this_week: week, quality, scope, team, keys };
  },

  async cleaners(db) {
    return db.query(`select c.code, c.name, c.employment, c.award_level, c.status, c.phone, c.vetted_on,
        (select string_agg(s.code, ', ' order by s.code) from inductions i join sites s on s.id = i.site_id where i.cleaner_id = c.id) as inducted_at,
        (select count(*) from keys k where k.cleaner_id = c.id)::int as keys_held
      from cleaners c order by c.status, c.code`);
  },

  async cleaner(db, args) {
    const c = await cleaner(db, args[0]);
    const visits = await db.query(`select ref, site, to_char(starts_at, 'Dy DD Mon HH24:MI') as starts, planned_hours, worked_hours, late_minutes, status
      from v_visits where cleaner_id = $1 and starts_at > site_now - interval '14 days' and starts_at < site_now + interval '7 days' and status <> 'cancelled' order by starts_at`, [c.id]);
    const keys = await db.query('select site, label, kind, issued_on from v_keys where cleaner_id = $1 order by site', [c.id]);
    const [cur] = await db.query(`select cl.currency from visits v join sites s on s.id = v.site_id join clients cl on cl.id = s.client_id where v.cleaner_id = $1 order by v.starts_at desc limit 1`, [c.id]);
    return { cleaner: { code: c.code, name: c.name, phone: c.phone, email: c.email, employment: c.employment, award_level: c.award_level, pay_rate_cents: c.pay_rate_cents,
      currency: cur?.currency || 'NZD', status: c.status, vetted_on: c.vetted_on, started_on: c.started_on, left_on: c.left_on }, keys, visits };
  },

  async keys(db) {
    return db.query('select site, label, kind, held_by, issued_on, standing from v_keys order by standing desc, site, label');
  },

  async changes(db) {
    return db.query(`select site, direction, other_contractor, takes_effect_on, days_left, tell_by, cleaners_told_on, elect_by, transfer_info_on, cleaners_on_site, standing
      from v_contract_changes order by takes_effect_on`);
  },

  async unbilled(db, args, f) {
    const params = [];
    let where = '';
    if (args[0]) { params.push((await client(db, args[0])).id); where = 'where client_id = $1'; }
    return db.query(`select client, site, kind, description, currency, amount_cents, earned_on from v_unbilled ${where} order by client, kind, earned_on`, params);
  },

  async invoices(db) {
    return db.query(`select i.ref, c.code as client, to_char(i.month, 'Mon YYYY') as month, i.currency, i.total_cents, i.issued_on, i.due_on, i.sent_on, i.paid_on,
        case when i.paid_on is not null then 'paid' when i.sent_on is null then 'not sent' when i.due_on < current_date then 'overdue' else 'sent' end as standing
      from invoices i join clients c on c.id = i.client_id order by i.issued_on desc, i.ref desc`);
  },

  async extras(db) {
    return db.query(`select x.ref, s.code as site, x.description, c.currency, x.price_cents, x.approved_on, x.approved_by, x.done_on,
        case when exists (select 1 from invoice_lines l where l.extra_id = x.id) then 'invoiced' when x.done_on is not null then 'done, not invoiced'
             when x.approved_on is not null then 'approved, to do' else 'quoted, waiting' end as standing
      from extras x join sites s on s.id = x.site_id join clients c on c.id = s.client_id order by x.ref`);
  },

  // Price a site from its scope: weekly minutes, the labour behind them, and the monthly fee at the target margin.
  async price(db, args) {
    const s = await site(db, args[0]);
    const tasks = await db.query(`select area, task, frequency, minutes, round(minutes * frequency_per_week(frequency, $2) / 60.0, 2) as hours_a_week
      from scope_tasks where site_id = $1 and active order by frequency_days(frequency), area, task`, [s.id, s.days_a_week]);
    if (!tasks.length) throw Error(`${s.code} has no scope of works yet (add-task ${s.code} ...)`);
    const hoursWeek = tasks.reduce((t, x) => t + Number(x.hours_a_week), 0);
    const pay = await setting(db, s.country === 'NZ' ? 'quote_pay_nz_cents' : 'quote_pay_au_cents', s.country === 'NZ' ? 2750 : 3150);
    const onCost = await setting(db, 'on_cost_pct', 20);
    const margin = await setting(db, 'quote_margin_pct', 25);
    const labourMonth = Math.round(hoursWeek * 52 / 12 * pay * (1 + onCost / 100));
    const fee = Math.round(labourMonth / (1 - margin / 100) / 100) * 100;
    return { site: s.code, hours_a_week: hoursWeek.toFixed(1), labour_a_month: money(labourMonth, s.currency), at_margin_pct: margin, monthly_fee: money(fee, s.currency),
      current_fee: money(s.monthly_fee_cents, s.currency), current_priced_hours: s.budget_hours_week, tasks };
  },

  async activity(db, args, f) {
    const n = f.days ? num(f.days, 'days', { min: 1, max: 365 }) : 7;
    return db.query(`select to_char(at, 'YYYY-MM-DD HH24:MI') as at, actor, action, ref, detail from activity where at > now() - make_interval(days => $1) order by at desc limit 200`, [n]);
  },

  async insights(db) {
    const out = [];
    for (const q of QUESTIONS) out.push({ question: q.question, rows: await db.query(q.sql) });
    return out;
  },
};

// Ten questions the vendor's dashboard does not answer. Each runs today against the records.
export const QUESTIONS = [
  { question: 'Which sites earn the least after labour, over the last 28 days?', sql: `select site, client, currency, fee_28_days_cents, labour_cents,
      round(100.0 * (fee_28_days_cents - labour_cents) / nullif(fee_28_days_cents, 0))::int as margin_pct
    from v_site_margin m join sites s on s.id = m.site_id where s.contract_start <= current_date - 28 order by margin_pct limit 5` },
  { question: 'Which sites ran over the hours their price was built on, over the last 4 weeks?', sql: `select site, budget_hours as priced_hours, worked_hours,
      (worked_hours - budget_hours)::numeric(8,1) as over_by from v_site_margin m join sites s on s.id = m.site_id
    where s.contract_start <= current_date - 28 and worked_hours > budget_hours order by worked_hours - budget_hours desc` },
  { question: 'Who clocks in late, and by how many minutes on average, over the last 28 days?', sql: `select cleaner, count(*) filter (where late_minutes > 10)::int as late_visits, count(*)::int as visits,
      round(avg(late_minutes))::int as avg_minutes from v_visits where status = 'done' and starts_at > site_now - interval '28 days'
    group by cleaner having count(*) filter (where late_minutes > 10) > 0 order by late_visits desc, avg_minutes desc` },
  { question: 'Which sites draw the most complaints per 100 hours worked, over 90 days?', sql: `select q.site, q.complaints_90_days as complaints,
      coalesce((select sum(worked_hours) from v_visits v where v.site_id = q.site_id and v.status = 'done' and v.starts_at > v.site_now - interval '90 days'), 0)::numeric(8,1) as hours,
      round(100.0 * q.complaints_90_days / nullif((select sum(worked_hours) from v_visits v where v.site_id = q.site_id and v.status = 'done' and v.starts_at > v.site_now - interval '90 days'), 0), 2) as per_100_hours
    from v_site_quality q where q.complaints_90_days > 0 order by per_100_hours desc nulls last` },
  { question: 'Which sites are under the pass mark, or have not been inspected in time?', sql: `select site, last_inspected, days_since, last_score, open_faults from v_site_quality q join sites s on s.id = q.site_id
    where (s.contract_start is null or s.contract_start <= current_date) and (last_score is null or last_score < setting_num('pass_score_pct', 85) or days_since > setting_num('inspect_every_days', 30)) order by last_score nulls first` },
  { question: 'How much is earned and not on an invoice yet, by client?', sql: `select client, currency, count(*)::int as lines, sum(amount_cents)::int as amount_cents, min(earned_on) as oldest
    from v_unbilled where earned_on <= current_date group by client, currency order by amount_cents desc` },
  { question: 'Which periodicals are late, and how many cleaning hours do they owe?', sql: `select site, area, task, days_late, round(minutes / 60.0, 1) as hours_owed
    from v_periodicals where days_late > 0 order by days_late desc` },
  { question: 'Who holds keys or cards, to how many sites, and does anyone who has left still have one?', sql: `select held_by, holder_status, count(*)::int as keys, string_agg(site || ' ' || label, '; ' order by site) as what
    from v_keys where held_by is not null group by held_by, holder_status order by holder_status = 'left' desc, keys desc` },
  { question: 'How many different cleaners worked each site over the last 28 days?', sql: `select site, count(distinct cleaner_id)::int as cleaners, count(*)::int as visits
    from v_visits where status = 'done' and starts_at > site_now - interval '28 days' group by site order by cleaners desc, site` },
  { question: 'Which visits were missed over the last 28 days, and did a complaint follow?', sql: `select v.ref, v.site, v.cleaner, to_char(v.starts_at, 'Dy DD Mon') as day,
      (select string_agg(k.ref, ', ') from complaints k where k.site_id = v.site_id and k.received_at between v.starts_at and v.starts_at + interval '48 hours') as complaint
    from v_visits v where v.status = 'missed' and v.starts_at > v.site_now - interval '28 days' order by v.starts_at desc` },
];

// ------------------------------------------------------------------ writes

const writes = {
  async 'add-client'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'code', 'name', 'country');
    const country = oneOf(String(f.country).toUpperCase(), ['NZ', 'AU'], 'country');
    const [c] = await db.query(`insert into clients (code, name, country, currency, contact_name, contact_email, invoice_days) values ($1,$2,$3,$4,$5,$6,$7)
      returning code, name, country, currency, invoice_days`, [String(f.code).toUpperCase(), String(f.name).trim(), country, country === 'NZ' ? 'NZD' : 'AUD',
      text(f.contact), text(f.email), f['invoice-days'] ? num(f['invoice-days'], 'invoice-days', { min: 0, max: 120 }) : 20]);
    await log(db, actor, 'add-client', c.code, c.name);
    return c;
  },

  async 'add-site'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'code', 'name', 'client', 'region', 'fee');
    const c = await client(db, f.client);
    const region = oneOf(String(f.region).toUpperCase(), REGIONS, 'region');
    if ((c.country === 'NZ') !== (region === 'NZ')) throw Error(`${c.code} is an ${c.country} client and ${region} is ${region === 'NZ' ? 'in New Zealand' : 'in Australia'}`);
    const [s] = await db.query(`insert into sites (code, client_id, name, address, region, sector, monthly_fee_cents, budget_hours_week, contract_start, contract_end,
        induction_required, vetting_required, days_a_week, floor_area_m2, instructions, active)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning code, name, region, sector, monthly_fee_cents, budget_hours_week, active`,
      [String(f.code).toUpperCase(), c.id, String(f.name).trim(), text(f.address), region, oneOf(f.sector || 'office', SECTORS, 'sector'), cents(f.fee, 'fee'),
        f.hours ? num(f.hours, 'hours', { min: 0, max: 1000 }) : 0, f.start ? date(f.start, 'start') : null, f.end ? date(f.end, 'end') : null,
        f.induction === undefined ? true : yesNo(f.induction, true), f.vetting === true || yesNo(f.vetting), f.days ? num(f.days, 'days', { min: 1, max: 7 }) : 5,
        f.area ? num(f.area, 'area', { min: 1, max: 1000000 }) : null, text(f.instructions), f.prospect !== true]);
    await log(db, actor, 'add-site', s.code, `${s.name} for ${c.code}${f.prospect ? ' (prospect: price it from the scope)' : ''}`);
    return s;
  },

  async 'add-task'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'area', 'task', 'every');
    const s = await site(db, args[0]);
    const [t] = await db.query(`insert into scope_tasks (site_id, area, task, frequency, minutes, last_done_on) values ($1,$2,$3,$4,$5,$6)
      on conflict (site_id, area, task) do update set frequency = excluded.frequency, minutes = excluded.minutes, active = true
      returning area, task, frequency, minutes, last_done_on`,
      [s.id, String(f.area).trim(), String(f.task).trim(), oneOf(f.every, FREQUENCIES, 'every'), f.minutes ? num(f.minutes, 'minutes', { min: 0, max: 6000 }) : 0, f.last ? date(f.last, 'last') : null]);
    await log(db, actor, 'add-task', s.code, `${t.area}: ${t.task} (${t.frequency}, ${t.minutes} min)`);
    return { site: s.code, ...t };
  },

  async 'add-cleaner'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'code', 'name');
    const [c] = await db.query(`insert into cleaners (code, name, phone, email, employment, award_level, pay_rate_cents, vetted_on, started_on)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning code, name, employment, award_level, pay_rate_cents`,
      [String(f.code).toUpperCase(), String(f.name).trim(), text(f.phone), text(f.email), oneOf(f.employment || 'part-time', EMPLOYMENT, 'employment'),
        f.level ? num(f.level, 'level', { min: 1, max: 3 }) : null, f.pay ? cents(f.pay, 'pay') : 0, f.vetted ? date(f.vetted, 'vetted') : null, f.started ? date(f.started, 'started') : today()]);
    await log(db, actor, 'add-cleaner', c.code, c.name);
    return c;
  },

  // A cleaner leaves or goes on leave: lists the visits that now need someone else and the keys to collect.
  async 'cleaner-status'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'status');
    const c = await cleaner(db, args[0]);
    const status = oneOf(f.status, ['active', 'on-leave', 'left'], 'status');
    const leftOn = status === 'left' ? (f.date ? date(f.date, 'date') : today()) : null;
    await db.query('update cleaners set status = $2, left_on = $3 where id = $1', [c.id, status, leftOn]);
    await log(db, actor, 'cleaner-status', c.code, `${status}${leftOn ? ` from ${leftOn}` : ''}${f.reason ? `: ${f.reason}` : ''}`);
    const visits = await db.query(`select ref, site, to_char(starts_at, 'Dy DD Mon HH24:MI') as starts from v_visits where cleaner_id = $1 and status = 'planned' and starts_at > site_now order by starts_at`, [c.id]);
    const keys = await db.query('select site, label, kind from v_keys where cleaner_id = $1', [c.id]);
    return { cleaner: c.name, status, visits_to_cover: visits, keys_to_collect: keys };
  },

  async induct(db, args, f) {
    const actor = actorOf(f);
    const c = await cleaner(db, args[0]);
    const s = await site(db, args[1] ?? f.site);
    const d = f.date ? date(f.date, 'date') : today();
    await db.query('insert into inductions (cleaner_id, site_id, inducted_on) values ($1,$2,$3) on conflict (cleaner_id, site_id) do update set inducted_on = excluded.inducted_on', [c.id, s.id, d]);
    await log(db, actor, 'induct', c.code, `Inducted at ${s.code} on ${d}`);
    return { cleaner: c.name, site: s.code, inducted_on: d };
  },

  async vet(db, args, f) {
    const actor = actorOf(f);
    const c = await cleaner(db, args[0]);
    const d = f.date ? date(f.date, 'date') : today();
    await db.query('update cleaners set vetted_on = $2 where id = $1', [c.id, d]);
    await log(db, actor, 'vet', c.code, `Police vet on file dated ${d}${f.reference ? `, reference ${f.reference}` : ''}`);
    return { cleaner: c.name, vetted_on: d };
  },

  // Add visits: one, or the same time on chosen days for a number of weeks (--repeat=4 --days=1,2,3,4,5).
  async 'add-visit'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'start', 'hours');
    const s = await site(db, args[0]);
    const start = stamp(f.start, 'start');
    const len = num(f.hours, 'hours', { min: 0.25, max: 16 });
    const weeks = f.repeat ? num(f.repeat, 'repeat', { min: 1, max: 26 }) : 0;
    const dows = f.days ? String(f.days).split(',').map((d) => num(d, 'days', { min: 1, max: 7 })) : null;
    const c = f.cleaner ? await cleaner(db, f.cleaner) : null;
    const day0 = start.slice(0, 10);
    const starts = [];
    if (!weeks) starts.push(start);
    else for (let i = 0; i < weeks * 7; i++) {
      const d = addDays(day0, i);
      const dow = ((new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
      if (!dows || dows.includes(dow)) starts.push(`${d}${start.slice(10)}`);
    }
    return tx(db, async () => {
      const made = [];
      for (const st of starts) {
        const [v] = await db.query(`insert into visits (site_id, starts_at, ends_at, status, note) values ($1, $2::timestamp, $2::timestamp + make_interval(mins => $3), 'open', $4) returning id, ref, starts_at`,
          [s.id, st, Math.round(len * 60), text(f.note)]);
        if (c) {
          const p = await problemsWith(db, { id: v.id }, c.id);
          gate(p, f, v.ref, c.name);
          await db.query(`update visits set cleaner_id = $2, status = 'planned', override_reason = $3 where id = $1`, [v.id, c.id, p.length ? String(f.override) : null]);
        }
        made.push(v.ref);
      }
      await log(db, actor, 'add-visit', s.code, `${made.length} visit(s) from ${start}, ${len}h${c ? ` for ${c.name}` : ', open'}${f.override ? `; override: ${f.override}` : ''}`);
      return db.query(`select ref, site, to_char(starts_at, 'Dy DD Mon HH24:MI') as starts, planned_hours as hours, coalesce(cleaner, '(open)') as cleaner, status
        from v_visits where ref = any($1) order by starts_at`, [made]);
    });
  },

  async fill(db, args, f) {
    const actor = actorOf(f);
    const v = await visit(db, args[0]);
    const c = await cleaner(db, args[1] ?? f.cleaner);
    if (!['open', 'planned'].includes(v.status)) throw Error(`${v.ref} is ${v.status}`);
    return tx(db, async () => {
      const p = await problemsWith(db, v, c.id);
      gate(p, f, v.ref, c.name);
      await db.query(`update visits set cleaner_id = $2, status = 'planned', override_reason = $3 where id = $1`, [v.id, c.id, p.length ? String(f.override) : null]);
      await log(db, actor, 'fill', v.ref, `${c.name}${v.cleaner ? ` replacing ${v.cleaner}` : ''}${p.length ? `; override: ${f.override} (${p.map((x) => x.problem).join('; ')})` : ''}`);
      return { visit: v.ref, site: v.site, starts: v.starts_at, cleaner: c.name, overridden: p.map((x) => x.problem).join('; ') || 'none' };
    });
  },

  async unassign(db, args, f) {
    const actor = actorOf(f);
    need(f, 'reason');
    const v = await visit(db, args[0]);
    if (v.status !== 'planned') throw Error(`${v.ref} is ${v.status}; only a planned visit can be opened again`);
    await db.query(`update visits set cleaner_id = null, status = 'open', override_reason = null where id = $1`, [v.id]);
    await log(db, actor, 'unassign', v.ref, `${v.cleaner} taken off: ${f.reason}`);
    return { visit: v.ref, status: 'open', was: v.cleaner };
  },

  async cancel(db, args, f) {
    const actor = actorOf(f);
    need(f, 'reason');
    const v = await visit(db, args[0]);
    if (!['open', 'planned'].includes(v.status)) throw Error(`${v.ref} is ${v.status}`);
    await db.query(`update visits set status = 'cancelled', cancel_reason = $2 where id = $1`, [v.id, String(f.reason)]);
    await log(db, actor, 'cancel', v.ref, String(f.reason));
    return { visit: v.ref, status: 'cancelled' };
  },

  // Clock in. A clash refuses; a contract term (police vetting) refuses unless the visit carries an override.
  async 'clock-in'(db, args, f) {
    const actor = actorOf(f);
    const v = await visit(db, args[0]);
    if (v.status !== 'planned') throw Error(`${v.ref} is ${v.status}`);
    const at = f.at ? stamp(f.at, 'at') : await siteNow(db, v.region);
    if (ms(at) < ms(v.starts_at) - 2 * 3600000) throw Error(`${at} is more than two hours before ${v.ref} starts`);
    if (ms(at) >= ms(v.ends_at)) throw Error(`${at} is after ${v.ref} ends`);
    const [x] = await db.query('select override_reason from visits where id = $1', [v.id]);
    const problems = await db.query('select kind, problem from v_visit_problems where visit_id = $1', [v.id]);
    const stop = problems.filter((p) => p.kind === 'clash' || (p.kind === 'contract' && !x.override_reason));
    if (stop.length) throw Error(`${v.ref} cannot start: ${stop.map((p) => p.problem).join('; ')}. Fill it with someone who can (cover ${v.ref}).`);
    await db.query(`update visits set status = 'on-site', clock_in_at = $2 where id = $1`, [v.id, at]);
    await log(db, actor, 'clock-in', v.ref, `${v.cleaner} in at ${at}`);
    const award = problems.filter((p) => p.kind === 'award').map((p) => `${p.problem}: pay the minimum engagement`);
    return { visit: v.ref, cleaner: v.cleaner, clock_in_at: at, late_minutes: Math.round((ms(at) - ms(v.starts_at)) / 60000), warning: award.join('; ') || 'none' };
  },

  async 'clock-out'(db, args, f) {
    const actor = actorOf(f);
    const v = await visit(db, args[0]);
    if (v.status !== 'on-site') throw Error(`${v.ref} is ${v.status}`);
    const at = f.at ? stamp(f.at, 'at') : await siteNow(db, v.region);
    if (ms(at) <= ms(v.clock_in_at)) throw Error('--at must be after the clock-in');
    await db.query(`update visits set status = 'done', clock_out_at = $2 where id = $1`, [v.id, at]);
    await log(db, actor, 'clock-out', v.ref, `${v.cleaner} out at ${at}`);
    const [r] = await db.query('select worked_hours from v_visits where id = $1', [v.id]);
    return { visit: v.ref, cleaner: v.cleaner, clock_out_at: at, worked_hours: r.worked_hours };
  },

  // The cleaner did not turn up: mark it missed and open a cover visit for what is left of it.
  async missed(db, args, f) {
    const actor = actorOf(f);
    const v = await visit(db, args[0]);
    if (v.status !== 'planned') throw Error(`${v.ref} is ${v.status}`);
    return tx(db, async () => {
      await db.query(`update visits set status = 'missed' where id = $1`, [v.id]);
      const [cover] = await db.query(`insert into visits (site_id, starts_at, ends_at, note) select site_id, greatest(starts_at, date_trunc('minute', region_now($2))), ends_at, 'Cover for missed visit ' || ref
        from visits where id = $1 and ends_at > region_now($2) + interval '30 minutes' returning ref`, [v.id, v.region]);
      await log(db, actor, 'missed', v.ref, `${v.cleaner} did not arrive${f.note ? `: ${f.note}` : ''}${cover ? `; open cover visit ${cover.ref}` : ''}`);
      return { visit: v.ref, cleaner: v.cleaner, status: 'missed', cover_visit: cover?.ref || 'visit already over', next: cover ? `cover ${cover.ref}` : `Tell ${v.client} before they find it (log-complaint is for when they tell you)` };
    });
  },

  async 'periodic-done'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'task');
    const s = await site(db, args[0]);
    const t = choose(await db.query(`select * from scope_tasks where site_id = $1 and active and frequency_days(frequency) >= 30 order by area, task`, [s.id]),
      f.task, 'Periodical', (r) => [r.task, `${r.area}: ${r.task}`, r.area, r.id]);
    const d = f.date ? date(f.date, 'date') : today();
    const c = f.cleaner ? await cleaner(db, f.cleaner) : null;
    return tx(db, async () => {
      await db.query('insert into periodic_done (task_id, done_on, cleaner_id, note) values ($1,$2,$3,$4) on conflict (task_id, done_on) do nothing', [t.id, d, c?.id || null, text(f.note)]);
      await db.query('update scope_tasks set last_done_on = greatest(coalesce(last_done_on, $2), $2) where id = $1', [t.id, d]);
      await log(db, actor, 'periodic-done', s.code, `${t.area}: ${t.task} done ${d}${c ? ` by ${c.name}` : ''}`);
      const [p] = await db.query('select due_on from v_periodicals where task_id = $1', [t.id]);
      return { site: s.code, task: `${t.area}: ${t.task}`, done_on: d, next_due: p.due_on };
    });
  },

  // Record an inspection: items checked and the faults found ("Area: item; Area: item"). Each fault gets a fix-by date.
  async inspect(db, args, f) {
    const actor = actorOf(f);
    need(f, 'checked');
    const s = await site(db, args[0]);
    const d = f.date ? date(f.date, 'date') : today();
    const checked = num(f.checked, 'checked', { min: 1, max: 1000 });
    const faults = text(f.faults) ? String(f.faults).split(';').map((x) => x.trim()).filter(Boolean).map((x) => {
      const i = x.indexOf(':');
      return i > 0 ? { area: x.slice(0, i).trim(), item: x.slice(i + 1).trim() } : { area: 'General', item: x };
    }) : [];
    if (faults.length > checked) throw Error(`${faults.length} faults but only ${checked} items checked`);
    const within = await setting(db, 'fix_within_days', 2);
    return tx(db, async () => {
      const [i] = await db.query(`insert into inspections (site_id, inspected_on, inspector, with_client, items_checked, note) values ($1,$2,$3,$4,$5,$6) returning id, ref`,
        [s.id, d, text(f.by) || actor, f['with-client'] === true || yesNo(f['with-client']), checked, text(f.note)]);
      for (const x of faults) await db.query('insert into faults (inspection_id, area, item, fix_by) values ($1,$2,$3,$4)', [i.id, x.area, x.item, addDays(d, within)]);
      const [v] = await db.query('select score_pct from v_inspections where id = $1', [i.id]);
      const pass = await setting(db, 'pass_score_pct', 85);
      await log(db, actor, 'inspect', i.ref, `${s.code}: ${checked} items, ${faults.length} faults, ${v.score_pct}%`);
      return { inspection: i.ref, site: s.code, score_pct: v.score_pct, result: v.score_pct >= pass ? 'pass' : `fail (under ${pass}%)`, faults: faults.length, fix_by: faults.length ? addDays(d, within) : '' };
    });
  },

  async fix(db, args, f) {
    const actor = actorOf(f);
    need(f, 'item');
    const i = await inspection(db, args[0]);
    const flt = choose(await db.query('select * from faults where inspection_id = $1 and fixed_on is null order by area, item', [i.id]), f.item, 'Open fault', (r) => [r.item, `${r.area}: ${r.item}`, r.id]);
    const d = f.date ? date(f.date, 'date') : today();
    await db.query('update faults set fixed_on = $2, fixed_by = $3 where id = $1', [flt.id, d, text(f.by) || actor]);
    await log(db, actor, 'fix', i.ref, `${flt.area}: ${flt.item} fixed ${d}`);
    return { inspection: i.ref, fault: `${flt.area}: ${flt.item}`, fixed_on: d, on_time: d <= String(flt.fix_by).slice(0, 10) };
  },

  async 'log-complaint'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'site', 'summary');
    const s = await site(db, f.site);
    const at = f.at ? stamp(f.at, 'at') : await siteNow(db, s.region);
    const [miss] = await db.query(`select id, ref from visits where site_id = $1 and status = 'missed' and starts_at between $2::timestamp - interval '48 hours' and $2::timestamp order by starts_at desc limit 1`, [s.id, at]);
    const [k] = await db.query(`insert into complaints (site_id, received_at, from_name, category, summary, visit_id) values ($1,$2,$3,$4,$5,$6) returning ref, category, summary`,
      [s.id, at, text(f.from), oneOf(f.category || 'quality', COMPLAINTS, 'category'), String(f.summary).trim(), miss?.id || null]);
    await log(db, actor, 'complaint', k.ref, `${s.code}: ${k.summary}`);
    const hours = await setting(db, 'complaint_response_hours', 4);
    return { ...k, site: s.code, linked_to_missed_visit: miss?.ref || 'none', reply_by: new Date(ms(at) + hours * 3600000).toISOString().slice(0, 16).replace('T', ' '), next: `draft-complaint-reply ${k.ref}` };
  },

  async respond(db, args, f) {
    const actor = actorOf(f);
    const k = await complaint(db, args[0]);
    const at = f.at ? stamp(f.at, 'at') : await siteNow(db, k.region);
    if (ms(at) < ms(k.received_at)) throw Error('--at is before the complaint came in');
    await db.query('update complaints set responded_at = $2 where id = $1', [k.id, at]);
    await log(db, actor, 'respond', k.ref, `Replied at ${at}${f.note ? `: ${f.note}` : ''}`);
    return { complaint: k.ref, responded_at: at, hours: ((ms(at) - ms(k.received_at)) / 3600000).toFixed(1) };
  },

  async resolve(db, args, f) {
    const actor = actorOf(f);
    need(f, 'outcome');
    const k = await complaint(db, args[0]);
    if (!k.responded_at) throw Error(`${k.ref}: reply to the client first (respond ${k.ref})`);
    const d = f.date ? date(f.date, 'date') : today();
    await db.query('update complaints set resolved_on = $2, outcome = $3 where id = $1', [k.id, d, String(f.outcome)]);
    await log(db, actor, 'resolve', k.ref, String(f.outcome));
    return { complaint: k.ref, resolved_on: d, outcome: f.outcome };
  },

  async 'log-incident'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'site', 'at', 'kind', 'summary');
    const s = await site(db, f.site);
    const at = stamp(f.at, 'at');
    if (at > (await siteNow(db, s.region))) throw Error('--at cannot be in the future');
    const c = f.cleaner ? await cleaner(db, f.cleaner) : null;
    const [i] = await db.query(`insert into incidents (site_id, cleaner_id, occurred_at, kind, summary, injury, notifiable) values ($1,$2,$3,$4,$5,$6,$7)
      returning ref, kind, summary, injury, notifiable`, [s.id, c?.id || null, at, oneOf(f.kind, INCIDENTS, 'kind'), String(f.summary).trim(),
      f.injury === true || yesNo(f.injury), f.notifiable === true || yesNo(f.notifiable)]);
    await log(db, actor, 'incident', i.ref, `${i.kind} at ${s.code}: ${i.summary}`);
    const next = [`Tell ${s.client} (notify-client ${i.ref})`];
    if (i.notifiable) next.unshift(`Notify ${s.region === 'NZ' ? 'WorkSafe (HSWA 2015 s 56)' : 'the state WHS regulator (WHS Act 2011 s 38)'} as soon as possible and leave the site as it is (s ${s.region === 'NZ' ? '55' : '39'}) (notify-regulator ${i.ref})`);
    return { ...i, site: s.code, next: next.join('. ') };
  },

  async 'notify-client'(db, args, f) {
    const actor = actorOf(f);
    const i = await incident(db, args[0]);
    const s = await site(db, i.site_id);
    const at = f.at ? stamp(f.at, 'at') : await siteNow(db, s.region);
    if (ms(at) < ms(i.occurred_at)) throw Error('--at is before the incident');
    await db.query('update incidents set client_notified_at = $2 where id = $1', [i.id, at]);
    await log(db, actor, 'notify-client', i.ref, `Client told at ${at}${f.note ? `: ${f.note}` : ''}`);
    return { incident: i.ref, client_notified_at: at };
  },

  async 'notify-regulator'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'reference');
    const i = await incident(db, args[0]);
    if (!i.notifiable) throw Error(`${i.ref} is not marked notifiable`);
    const s = await site(db, i.site_id);
    const at = f.at ? stamp(f.at, 'at') : await siteNow(db, s.region);
    await db.query('update incidents set regulator_notified_at = $2, regulator_reference = $3 where id = $1', [i.id, at, String(f.reference)]);
    await log(db, actor, 'notify-regulator', i.ref, `Regulator notified at ${at}, reference ${f.reference}`);
    return { incident: i.ref, regulator_notified_at: at, reference: f.reference };
  },

  async 'close-incident'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'outcome');
    const i = await incident(db, args[0]);
    if (i.closed_on) throw Error(`${i.ref} closed on ${i.closed_on}`);
    if (i.notifiable && !i.regulator_notified_at) throw Error(`${i.ref} is notifiable and the regulator has not been notified`);
    if (!i.client_notified_at) throw Error(`${i.ref}: tell the client first (notify-client ${i.ref})`);
    await db.query('update incidents set closed_on = current_date, outcome = $2 where id = $1', [i.id, String(f.outcome)]);
    await log(db, actor, 'close-incident', i.ref, String(f.outcome));
    return { incident: i.ref, closed_on: today(), outcome: f.outcome };
  },

  async 'issue-key'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'label');
    const s = await site(db, args[0]);
    const c = await cleaner(db, f.cleaner || args[1]);
    if (c.status === 'left') throw Error(`${c.name} has left`);
    const d = f.date ? date(f.date, 'date') : today();
    const [k] = await db.query(`insert into keys (site_id, label, kind, cleaner_id, issued_on) values ($1,$2,$3,$4,$5)
      on conflict (site_id, label) do update set cleaner_id = excluded.cleaner_id, issued_on = excluded.issued_on returning label, kind`,
      [s.id, String(f.label).trim(), oneOf(f.kind || 'key', KEY_KINDS, 'kind'), c.id, d]);
    await log(db, actor, 'issue-key', s.code, `${k.label} to ${c.name}`);
    return { site: s.code, ...k, held_by: c.name, issued_on: d };
  },

  async 'return-key'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'label');
    const s = await site(db, args[0]);
    const k = choose(await db.query('select * from v_keys where site_id = $1 order by label', [s.id]), f.label, 'Key', (r) => [r.label, r.id]);
    if (!k.cleaner_id) throw Error(`${k.label} is already in the office`);
    await db.query('update keys set cleaner_id = null, issued_on = null where id = $1', [k.id]);
    await log(db, actor, 'return-key', s.code, `${k.label} back from ${k.held_by}`);
    return { site: s.code, label: k.label, returned_by: k.held_by };
  },

  // A site changing hands. For a New Zealand site we are losing, says the date the cleaners must be told by (s 69G).
  async 'contract-change'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'direction', 'other', 'date');
    const s = await site(db, args[0]);
    const direction = oneOf(f.direction, ['losing', 'winning'], 'direction');
    const d = date(f.date, 'date');
    return tx(db, async () => {
      await db.query(`insert into contract_changes (site_id, direction, other_contractor, takes_effect_on, note) values ($1,$2,$3,$4,$5)`, [s.id, direction, String(f.other).trim(), d, text(f.note)]);
      if (direction === 'losing') await db.query('update sites set contract_end = $2 where id = $1', [s.id, d]);
      else await db.query('update sites set contract_start = coalesce(contract_start, $2) where id = $1', [s.id, d]);
      await log(db, actor, 'contract-change', s.code, `${direction} to/from ${f.other} on ${d}`);
      const [k] = await db.query(`select tell_by, standing from v_contract_changes where site_id = $1 and direction = $2 and takes_effect_on = $3`, [s.id, direction, d]);
      const next = s.region === 'NZ'
        ? direction === 'losing'
          ? `Tell every cleaner on the site of their right to transfer by ${k.tell_by} (draft-transfer-notice ${s.code}), and give the incoming contractor the transfer information by ${d} (transfer-info ${s.code})`
          : `Ask ${f.other} for the transfer information for each cleaner electing to transfer, due by ${d} (transfer-info ${s.code} when it arrives)`
        : direction === 'losing' ? 'Plan the handover: keys, supplies, final invoice' : 'Mobilise: inductions, keys, roster';
      return { site: s.code, direction, other_contractor: f.other, takes_effect_on: d, tell_by: k.tell_by || '', next };
    });
  },

  async 'told-cleaners'(db, args, f) {
    const actor = actorOf(f);
    const s = await site(db, args[0]);
    const [k] = await db.query(`select * from contract_changes where site_id = $1 and direction = 'losing' and takes_effect_on >= current_date order by takes_effect_on limit 1`, [s.id]);
    if (!k) throw Error(`No contract change on ${s.code} that we are losing`);
    const d = f.date ? date(f.date, 'date') : today();
    // s 69G: the election deadline defaults to 10 working days after the information is given.
    const [{ last }] = await db.query(`select max(x)::date::text as last from (select x from generate_series($1::date + 1, $1::date + 30, interval '1 day') x
      where extract(isodow from x) < 6 order by x limit 10) w`, [d]);
    const electBy = f['elect-by'] ? date(f['elect-by'], 'elect-by') : last;
    await db.query('update contract_changes set cleaners_told_on = $2, elect_by = $3 where id = $1', [k.id, d, electBy]);
    await log(db, actor, 'told-cleaners', s.code, `Cleaners told of the right to transfer on ${d}, election by ${electBy}`);
    const [v] = await db.query('select tell_by from v_contract_changes where id = $1', [k.id]);
    return { site: s.code, told_on: d, elect_by: electBy, in_time: !v.tell_by || d <= String(v.tell_by).slice(0, 10) };
  },

  async 'transfer-info'(db, args, f) {
    const actor = actorOf(f);
    const s = await site(db, args[0]);
    const [k] = await db.query(`select * from contract_changes where site_id = $1 and takes_effect_on >= current_date order by takes_effect_on limit 1`, [s.id]);
    if (!k) throw Error(`No upcoming contract change on ${s.code}`);
    const d = f.date ? date(f.date, 'date') : today();
    await db.query('update contract_changes set transfer_info_on = $2 where id = $1', [k.id, d]);
    await log(db, actor, 'transfer-info', s.code, `Transfer information ${k.direction === 'losing' ? 'given to' : 'received from'} ${k.other_contractor} on ${d}`);
    return { site: s.code, direction: k.direction, other_contractor: k.other_contractor, transfer_info_on: d };
  },

  async 'add-extra'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'description', 'price');
    const s = await site(db, args[0]);
    const [x] = await db.query('insert into extras (site_id, description, price_cents) values ($1,$2,$3) returning ref, description, price_cents', [s.id, String(f.description).trim(), cents(f.price, 'price')]);
    await log(db, actor, 'add-extra', x.ref, `${s.code}: ${x.description} quoted ${money(x.price_cents, s.currency)}`);
    return { ...x, site: s.code, currency: s.currency, next: `approve-extra ${x.ref} --by="<who at the client said yes>"` };
  },

  async 'approve-extra'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'by');
    const x = await extra(db, args[0]);
    const d = f.date ? date(f.date, 'date') : today();
    await db.query('update extras set approved_on = $2, approved_by = $3 where id = $1', [x.id, d, String(f.by)]);
    await log(db, actor, 'approve-extra', x.ref, `Approved by ${f.by} on ${d}`);
    return { extra: x.ref, approved_on: d, approved_by: f.by };
  },

  async 'extra-done'(db, args, f) {
    const actor = actorOf(f);
    const x = await extra(db, args[0]);
    if (!x.approved_on) throw Error(`${x.ref} has not been approved by the client (approve-extra ${x.ref})`);
    const d = f.date ? date(f.date, 'date') : today();
    await db.query('update extras set done_on = $2 where id = $1', [x.id, d]);
    await log(db, actor, 'extra-done', x.ref, `Done ${d}`);
    return { extra: x.ref, done_on: d, next: 'It goes on the next invoice for this client' };
  },

  async 'add-supplies'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'item', 'qty', 'unit');
    const s = await site(db, args[0]);
    const d = f.date ? date(f.date, 'date') : today();
    const [r] = await db.query(`insert into supplies (site_id, item, qty, unit_cents, recharge, delivered_on) values ($1,$2,$3,$4,$5,$6) returning item, qty, unit_cents, recharge, delivered_on`,
      [s.id, String(f.item).trim(), num(f.qty, 'qty', { min: 0.01, max: 100000 }), cents(f.unit, 'unit', { zero: true }), f.recharge === undefined ? true : yesNo(f.recharge, true), d]);
    await log(db, actor, 'add-supplies', s.code, `${r.item} x ${r.qty}${r.recharge ? ' (recharge)' : ''}`);
    return { site: s.code, ...r, currency: s.currency };
  },

  // One invoice per client for a month: every site's monthly fee not yet billed up to that month, plus extras done and supplies to recharge.
  async invoice(db, args, f) {
    const actor = actorOf(f);
    const c = await client(db, args[0]);
    const month = f.month ? String(f.month) : today().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) throw Error('--month must look like 2026-10');
    const first = date(`${month}-01`, 'month');
    return tx(db, async () => {
      const lines = await db.query(`select * from v_unbilled where client_id = $1 and (kind <> 'fee' or month <= $2::date) and earned_on <= current_date order by site, kind, earned_on`, [c.id, first]);
      if (!lines.length) throw Error(`Nothing to invoice for ${c.code} up to ${month}`);
      const gstPct = await setting(db, c.country === 'NZ' ? 'gst_nz_pct' : 'gst_au_pct', c.country === 'NZ' ? 15 : 10);
      const subtotal = lines.reduce((t, l) => t + Number(l.amount_cents), 0);
      const gst = Math.round((subtotal * gstPct) / 100);
      const [inv] = await db.query(`insert into invoices (client_id, month, currency, subtotal_cents, gst_cents, total_cents, due_on)
        values ($1,$2,$3,$4,$5,$6, current_date + $7::int) returning id, ref, currency, subtotal_cents, gst_cents, total_cents, due_on`,
        [c.id, first, c.currency, subtotal, gst, subtotal + gst, c.invoice_days]);
      for (const l of lines) {
        await db.query('insert into invoice_lines (invoice_id, site_id, kind, month, extra_id, supply_id, description, amount_cents) values ($1,$2,$3,$4,$5,$6,$7,$8)',
          [inv.id, l.site_id, l.kind, l.month, l.extra_id, l.supply_id, l.description, l.amount_cents]);
      }
      await log(db, actor, 'invoice', inv.ref, `${c.code} to ${month}: ${lines.length} lines, ${money(inv.total_cents, c.currency)} incl GST`);
      const { id, ...out } = inv;
      return { ...out, client: c.code, lines: lines.length, next: `npm run docs -- invoice, check it, send it from your accounts system, then invoice-sent ${inv.ref}` };
    });
  },

  async 'invoice-sent'(db, args, f) {
    const actor = actorOf(f);
    const i = await invoice(db, args[0]);
    const d = f.date ? date(f.date, 'date') : today();
    await db.query('update invoices set sent_on = $2 where id = $1', [i.id, d]);
    await log(db, actor, 'invoice-sent', i.ref, `Sent ${d}`);
    return { invoice: i.ref, sent_on: d };
  },

  async 'invoice-paid'(db, args, f) {
    const actor = actorOf(f);
    const i = await invoice(db, args[0]);
    const d = f.date ? date(f.date, 'date') : today();
    if (!i.sent_on) throw Error(`${i.ref} has not been sent`);
    await db.query('update invoices set paid_on = $2 where id = $1', [i.id, d]);
    await log(db, actor, 'invoice-paid', i.ref, `Paid ${d}`);
    return { invoice: i.ref, paid_on: d };
  },

  async set(db, args, f) {
    const actor = actorOf(f);
    const [key, value] = args;
    const known = (await db.query('select key from settings')).map((r) => r.key);
    if (!known.includes(key)) throw Error(`Unknown setting "${key}". Settings: ${known.join(', ')}`);
    num(value, 'value', { min: 0, max: 100000 });
    await db.query('update settings set value = $2 where key = $1', [key, String(value)]);
    await log(db, actor, 'set', key, String(value));
    return db.query('select key, value, note from settings order by key');
  },

  async log(db, args, f) {
    const actor = actorOf(f);
    need(f, 'note');
    const ref = String(args[0] ?? '').trim();
    if (!ref) throw Error('Name the site, cleaner, visit or complaint the note is about');
    await log(db, actor, 'note', ref, String(f.note));
    return { ref, note: f.note };
  },
};

// ------------------------------------------------------------------ drafts (written to drafts/, never sent)

const drafts = {
  async 'draft-client-report'(db, args, f) {
    const s = await site(db, args[0]);
    const to = f.to ? date(f.to, 'to') : today();
    const from = f.from ? date(f.from, 'from') : addDays(to, -29);
    const [hrs] = await db.query(`select count(*) filter (where status = 'done')::int as visits, coalesce(sum(worked_hours), 0)::numeric(8,1) as hours,
        count(*) filter (where status = 'missed')::int as missed from v_visits where site_id = $1 and starts_at::date between $2 and $3`, [s.id, from, to]);
    const insp = await db.query(`select ref, inspected_on, score_pct, faults, open_faults from v_inspections where site_id = $1 and inspected_on between $2 and $3 order by inspected_on`, [s.id, from, to]);
    const per = await db.query(`select t.area, t.task, p.done_on from periodic_done p join scope_tasks t on t.id = p.task_id where t.site_id = $1 and p.done_on between $2 and $3 order by p.done_on`, [s.id, from, to]);
    const due = await db.query(`select area, task, due_on, days_late from v_periodicals where site_id = $1 and due_on <= $2::date + 30 order by due_on`, [s.id, to]);
    const comp = await db.query(`select ref, to_char(received_at, 'DD Mon') as received, category, summary, standing, outcome from v_complaints where site_id = $1 and received_at::date between $2 and $3 order by received_at`, [s.id, from, to]);
    const lines = [`# Cleaning report: ${s.name}`, '', `For ${s.client}. Period ${from} to ${to}. Prepared [DATE] by [YOUR NAME].`, '',
      '## Cleaning delivered', '', `- Visits completed: ${hrs.visits}, ${hrs.hours} hours on site.`, `- Visits missed: ${hrs.missed}.${hrs.missed ? ' [Say how each was made up.]' : ''}`, '',
      '## Quality inspections', '', insp.length ? '| Ref | Date | Score | Faults | Still open |\n|---|---|---|---|---|\n' + insp.map((i) => `| ${i.ref} | ${i.inspected_on} | ${i.score_pct}% | ${i.faults} | ${i.open_faults} |`).join('\n') : 'No inspection this period. [Book one.]', '',
      '## Periodical work done', '', per.length ? per.map((p) => `- ${p.area}: ${p.task} (${p.done_on})`).join('\n') : 'None this period.', '',
      '## Coming up', '', due.length ? due.map((p) => `- ${p.area}: ${p.task}, due ${p.due_on}${p.days_late > 0 ? ' [LATE: book it before this goes out]' : ''}`).join('\n') : 'Nothing due in the next 30 days.', '',
      '## Your requests', '', comp.length ? '| Ref | Received | Type | What | Where it stands |\n|---|---|---|---|---|\n' + comp.map((k) => `| ${k.ref} | ${k.received} | ${k.category} | ${k.summary} | ${k.outcome || k.standing} |`).join('\n') : 'No requests or complaints this period.', '',
      '## Next month', '', '[What changes on site, what we recommend.]', ''];
    const file = draftFile(`client-report-${s.code}-${to}.md`, lines.join('\n'));
    return { draft: file, site: s.code, from, to, inspections: insp.length, complaints: comp.length, note: 'Draft only. Check every line before it goes to the client.' };
  },

  async 'draft-complaint-reply'(db, args) {
    const k = await complaint(db, args[0]);
    const [s] = await db.query('select s.name, c.contact_name, c.contact_email from sites s join clients c on c.id = s.client_id where s.id = $1', [k.site_id]);
    const [x] = await db.query(`select v.ref, v.cleaner, to_char(v.starts_at, 'Dy DD Mon') as day from complaints k join v_visits v on v.id = k.visit_id where k.id = $1`, [k.id]);
    const lines = [`To: ${k.from_name || s.contact_name || '[NAME]'} <${s.contact_email || '[EMAIL]'}>`, `Subject: ${s.name}: ${k.summary.slice(0, 60)}`, '',
      `Hi ${(k.from_name || s.contact_name || '[NAME]').split(' ')[0]},`, '', `Thank you for letting us know. ${x ? `The clean on ${x.day} did not happen as rostered. ` : ''}[What we have done about it, with the time it was done.]`, '',
      '[What changes so it does not happen again.]', '', '[YOUR NAME]', ''];
    const file = draftFile(`complaint-${k.ref}.md`, lines.join('\n'));
    return { draft: file, complaint: k.ref, note: `Draft only. Nothing is sent from here. When it has gone: respond ${k.ref}` };
  },

  // The notice to each cleaner on a New Zealand site we are losing: their right to elect to transfer (ERA 2000 s 69G, s 69I).
  async 'draft-transfer-notice'(db, args) {
    const s = await site(db, args[0]);
    if (s.region !== 'NZ') throw Error(`${s.code} is in ${s.region}: the right to transfer in Part 6A of the Employment Relations Act is New Zealand law`);
    const [k] = await db.query(`select * from v_contract_changes where site_id = $1 and direction = 'losing' and days_left >= 0 order by takes_effect_on limit 1`, [s.id]);
    if (!k) throw Error(`No contract change on ${s.code} that we are losing (contract-change ${s.code} --direction=losing ...)`);
    const team = await db.query(`select distinct c.code, c.name, c.email from visits v join cleaners c on c.id = v.cleaner_id
      where v.site_id = $1 and v.status in ('done', 'planned', 'on-site') and v.starts_at > current_date - 28 and c.status = 'active' order by c.code`, [s.id]);
    const files = [];
    for (const c of team) {
      const lines = [`To: ${c.name} <${c.email || '[EMAIL]'}>`, `Subject: ${s.name}: your right to transfer`, '', `Kia ora ${c.name.split(' ')[0]},`, '',
        `From ${k.takes_effect_on}, ${k.other_contractor} takes over the cleaning at ${s.name}. Our contract there ends the day before.`, '',
        `Because you clean this site, you have the right to choose to transfer to ${k.other_contractor} on the same terms and conditions you have with us now (Employment Relations Act 2000, Part 6A, s 69I).`, '',
        `If you want to transfer, tell us in writing by [ELECTION DATE: at least 10 working days from today, s 69G]. If you do not, we will talk with you about your work at our other sites.`, '',
        '[What happens to your other hours with us, your leave balance, and who to call with questions.]', '', '[YOUR NAME]', ''];
      files.push(draftFile(`transfer-notice-${s.code}-${c.code}.md`, lines.join('\n')));
    }
    return { site: s.code, takes_effect_on: k.takes_effect_on, tell_by: k.tell_by, cleaners: team.length, drafts: files.join(', '),
      note: `Draft only. Have someone who knows employment law check it. When it has gone: told-cleaners ${s.code}` };
  },

  // A quote for a site from its scope of works, at the target margin.
  async 'draft-quote'(db, args) {
    const p = await reads.price(db, args);
    const s = await site(db, args[0]);
    const [c] = await db.query('select name, contact_name from clients where id = $1', [s.client_id]);
    const byFreq = FREQUENCIES.map((fq) => ({ fq, rows: p.tasks.filter((t) => t.frequency === fq) })).filter((g) => g.rows.length);
    const lines = [`# Cleaning proposal: ${s.name}`, '', `For ${c.contact_name || '[NAME]'}, ${c.name}. Prepared [DATE] by [YOUR NAME].`, '',
      '## The scope of works', '', ...byFreq.flatMap((g) => [`### ${g.fq[0].toUpperCase()}${g.fq.slice(1)}`, '', ...g.rows.map((t) => `- ${t.area}: ${t.task}`), '']),
      '## The price', '', `${p.monthly_fee} a month plus GST, for about ${p.hours_a_week} cleaning hours a week across ${s.days_a_week} days.`, '',
      '[Start date, term, notice period, what is not included, consumables.]', ''];
    const file = draftFile(`quote-${s.code}.md`, lines.join('\n'));
    return { draft: file, site: s.code, monthly_fee: p.monthly_fee, hours_a_week: p.hours_a_week, note: 'Draft only. Check the scope and the price before it goes anywhere.' };
  },

  async 'weekly-review'(db) {
    const att = await reads.attention(db);
    const comp = await reads.compliance(db, [], {});
    const open = await reads['open-visits'](db, [], { days: '7' });
    const hrs = await reads.hours(db);
    const mar = await reads.margins(db);
    const count = (item) => att.filter((r) => r.item === item).length;
    const lines = [`# Monday review, ${today()}`, '',
      `- The law and the award: ${comp.filter((r) => r.kind === 'law' || r.kind === 'award').map((r) => `${r.problem} (${r.count})`).join('; ') || 'nothing broken'}.`,
      `- Open visits in the next 7 days: ${open.length}${open.length ? ` (${open.map((o) => `${o.ref} ${o.site} ${o.starts}`).join(', ')})` : ''}.`,
      `- Clients: ${count('complaint with no reply')} complaints with no reply, ${count('complaint not resolved')} not resolved, ${count('inspection under the pass mark')} sites under the pass mark, ${count('fault past its fix-by date')} faults past their fix-by date.`,
      `- Contract changes: ${att.filter((r) => r.item.startsWith('cleaners not told') || r.item === 'contract change').map((r) => `${r.ref} ${r.detail}`).join('; ') || 'none'}.`,
      `- Periodicals overdue: ${count('periodical overdue')}. Inspections due: ${count('inspection due')}.`,
      `- Hours against price this week: ${hrs.filter((h) => Number(h.rostered_minus_priced) !== 0).map((h) => `${h.site} ${Number(h.rostered_minus_priced) > 0 ? '+' : ''}${h.rostered_minus_priced}h`).join(', ') || 'every site on its priced hours'}.`,
      `- Thinnest margins, last 28 days: ${mar.slice(0, 3).map((m) => `${m.site} ${m.margin_pct}%`).join(', ')}.`,
      `- Money: ${count('invoice overdue')} invoices overdue, ${count('month not invoiced')} site months not invoiced, ${count('extra done, not invoiced')} extras not invoiced.`, '',
      '## Everything on the attention list', '', '| Item | Ref | Detail |', '|---|---|---|', ...att.map((r) => `| ${r.item} | ${r.ref} | ${r.detail} |`), ''];
    const file = draftFile(`weekly-review-${today()}.md`, lines.join('\n'));
    return { draft: file, attention_items: att.length, open_visits: open.length };
  },
};

// ------------------------------------------------------------------ import and export

// Column names a Swept export may use, with plain alternatives. --map=<file.json> overrides any of them.
const MAPS = {
  locations: { code: ['Location ID', 'Location Code', 'Site Code', 'Code', 'ID'], name: ['Location Name', 'Location', 'Name', 'Site'], client: ['Client', 'Client Name', 'Customer'],
    address: ['Address', 'Location Address', 'Street Address'], region: ['Region', 'State', 'Province', 'State/Province'], fee: ['Monthly Fee', 'Contract Value', 'Monthly Price', 'Fee'],
    hours: ['Budget Hours', 'Weekly Hours', 'Budgeted Hours'] },
  employees: { code: ['Employee ID', 'Employee Number', 'Payroll ID', 'Code', 'ID'], name: ['Employee Name', 'Name', 'Full Name'], first: ['First Name'], last: ['Last Name'],
    phone: ['Phone', 'Mobile', 'Phone Number'], email: ['Email', 'Email Address'], pay: ['Pay Rate', 'Hourly Rate', 'Wage'] },
  timesheets: { employee: ['Employee ID', 'Employee', 'Employee Name', 'Name'], location: ['Location ID', 'Location', 'Location Name', 'Site'],
    in: ['Clock In', 'Clock-in', 'Start', 'Start Time', 'Time In'], out: ['Clock Out', 'Clock-out', 'End', 'End Time', 'Time Out'] },
};

function mapper(kind, mapFile) {
  const base = MAPS[kind];
  if (!base) throw Error(`--kind must be one of: ${Object.keys(MAPS).join(', ')}`);
  const extra = mapFile ? JSON.parse(readFileSync(path.resolve(mapFile), 'utf8')) : {};
  return (row, field) => pick(row, ...(extra[field] ? [extra[field]] : []), ...(base[field] || []));
}
// "2026-10-21 18:00", "2026-10-21T18:00", "21/10/2026 18:00", "21/10/2026 6:00 PM" -> wall-clock stamp.
function looseStamp(v, label) {
  const s = String(v || '').trim();
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T,]+(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?/);
  if (dmy) {
    let h = Number(dmy[4]);
    if (dmy[6]) h = (h % 12) + (/p/i.test(dmy[6]) ? 12 : 0);
    return stamp(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')} ${h}:${dmy[5]}`, label);
  }
  return stamp(s.slice(0, 16), label);
}
const codeOf = (v, n) => String(v).toUpperCase().replace(/[^A-Z0-9-]/g, '-').replace(/-+/g, '-').slice(0, n);

async function importSwept(db, args, f) {
  const actor = actorOf(f);
  const [source, file] = args;
  if (source !== 'swept') throw Error('Usage: import swept <file.csv> --kind=locations|employees|timesheets');
  if (!file || !existsSync(file)) throw Error(`File not found: ${file}`);
  need(f, 'kind');
  const kind = String(f.kind);
  const get = mapper(kind, f.map);
  const rows = parseCsv(readFileSync(file, 'utf8'));
  const counts = { rows: rows.length, added: 0, skipped: 0 };
  await db.exec('begin');
  try {
    for (const [n, r] of rows.entries()) {
      const at = `row ${n + 2}`;
      try {
        if (kind === 'locations') {
          const key = get(r, 'code') || get(r, 'name');
          if (!key) throw Error('no location ID or name');
          const ext = `swept:${key}`;
          if ((await db.query('select 1 from sites where external_id = $1', [ext])).length) { counts.skipped++; continue; }
          const c = await client(db, f.client || get(r, 'client'));
          const region = oneOf(String(get(r, 'region') || f.region || '').toUpperCase(), REGIONS, `region (${at}; or pass --region)`);
          if ((c.country === 'NZ') !== (region === 'NZ')) throw Error(`${c.code} is an ${c.country} client and this site is in ${region}`);
          const fee = get(r, 'fee') || f.fee;
          if (!fee) throw Error('no monthly fee (Swept does not hold one: add a Monthly Fee column or pass --fee and correct each site after)');
          await db.query(`insert into sites (code, client_id, name, address, region, monthly_fee_cents, budget_hours_week, external_id) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [codeOf(get(r, 'code') || get(r, 'name'), 16), c.id, get(r, 'name') || key, get(r, 'address') || null, region, cents(fee, `fee (${at})`),
              get(r, 'hours') ? num(get(r, 'hours'), 'hours') : 0, ext]);
        } else if (kind === 'employees') {
          const name = get(r, 'name') || `${get(r, 'first') || ''} ${get(r, 'last') || ''}`.trim();
          if (!name) throw Error('no employee name');
          const ext = `swept:${get(r, 'code') || name}`;
          if ((await db.query('select 1 from cleaners where external_id = $1', [ext])).length) { counts.skipped++; continue; }
          const code = get(r, 'code') ? codeOf(get(r, 'code'), 12) : `C-${codeOf(name.split(/\s+/).map((w) => w.slice(0, 3)).join(''), 9)}`;
          await db.query(`insert into cleaners (code, name, phone, email, employment, pay_rate_cents, external_id) values ($1,$2,$3,$4,$5,$6,$7)`,
            [code, name, get(r, 'phone') || null, get(r, 'email') || null, oneOf(f.employment || 'part-time', EMPLOYMENT, 'employment'), get(r, 'pay') ? cents(get(r, 'pay'), `pay (${at})`) : 0, ext]);
        } else if (kind === 'timesheets') {
          const who = get(r, 'employee');
          const where = get(r, 'location');
          const inAt = looseStamp(get(r, 'in'), `clock in (${at})`);
          const outAt = looseStamp(get(r, 'out'), `clock out (${at})`);
          if (ms(outAt) <= ms(inAt)) throw Error('clock out is not after clock in');
          const ext = `swept:${who}:${where}:${inAt}`;
          if ((await db.query('select 1 from visits where external_id = $1', [ext])).length) { counts.skipped++; continue; }
          const sRow = await db.query('select id from sites where external_id = $1 or code = upper($2) or lower(name) = lower($2)', [`swept:${where}`, where]);
          if (sRow.length !== 1) throw Error(`location "${where}" not found (import locations first)`);
          const cRow = await db.query('select id from cleaners where external_id = $1 or code = upper($2) or lower(name) = lower($2)', [`swept:${who}`, who]);
          if (cRow.length !== 1) throw Error(`employee "${who}" not found (import employees first)`);
          await db.query(`insert into visits (site_id, cleaner_id, starts_at, ends_at, status, clock_in_at, clock_out_at, external_id) values ($1,$2,$3,$4,'done',$3,$4,$5)`,
            [sRow[0].id, cRow[0].id, inAt, outAt, ext]);
        } else throw Error(`--kind must be one of: ${Object.keys(MAPS).join(', ')}`);
        counts.added++;
      } catch (e) {
        throw Error(`${at}: ${e.message}. Nothing was imported.`);
      }
    }
    if (f['dry-run']) { await db.exec('rollback'); return { ...counts, dry_run: true, next: 'Run again without --dry-run to keep it' }; }
    await log(db, actor, 'import', `swept-${kind}`, `${path.basename(file)}: ${counts.added} added, ${counts.skipped} already here`);
    await db.exec('commit');
    return counts;
  } catch (e) {
    await db.exec('rollback');
    throw e;
  }
}

async function exportAll(db, args, f) {
  const tables = ['settings', 'clients', 'sites', 'cleaners', 'inductions', 'scope_tasks', 'periodic_done', 'visits', 'inspections', 'faults', 'complaints',
    'incidents', 'keys', 'contract_changes', 'extras', 'supplies', 'invoices', 'invoice_lines', 'activity'];
  const out = { exported_at: new Date().toISOString(), tables: {} };
  for (const t of tables) out.tables[t] = await db.query(`select * from ${t}`);
  const file = path.resolve(f.out || path.join(process.env.OUTPUT_DIR || REPO_ROOT, 'exports', `cleaning-${today()}.json`));
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(out, null, 2), { mode: 0o600 });
  return { file, rows: Object.fromEntries(tables.map((t) => [t, out.tables[t].length])) };
}

const all = { ...reads, ...writes, ...drafts, import: importSwept, export: exportAll };
export const commands = Object.keys(all).sort();

export async function run(db, command, args = [], flags = {}) {
  const fn = all[command];
  if (!fn) throw Error(`Unknown command "${command}". Commands: ${commands.join(', ')}`);
  return fn(db, args, flags);
}
