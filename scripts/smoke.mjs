#!/usr/bin/env node
// npm test: a temporary database, the demo contractor, every command exercised, then cleaned up.
// Set TEST_DATABASE_URL to run the same checks against an empty Postgres database instead of PGlite.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { run, reads, commands, QUESTIONS, cents, stamp, date } from './lib/domain.mjs';

const root = mkdtempSync(path.join(os.tmpdir(), 'cleaning-test-'));
process.env.DATA_DIR = path.join(root, 'db');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.OUTPUT_DIR = path.join(root, 'out');

let db;
let checks = 0;
const ok = (v, msg) => { assert.ok(v, msg); checks++; };
const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; };
const fails = async (fn, re, msg) => { await assert.rejects(fn, re, msg); checks++; };
const call = (cmd, args = [], f = {}) => run(db, cmd, args, f);
const A = { actor: 'Test' };
const one = async (sql, p = []) => (await db.query(sql, p))[0];
// A wall-clock time at a site, n days from the site's today, at hh:mm.
const at = async (region, days, hhmm) => (await one(`select (region_now($1)::date + $2::int)::text as d`, [region, days])).d + ' ' + hhmm;
const ref = async (sql, p = []) => (await one(sql, p)).ref;

try {
  db = await getDb();
  await migrate(db);
  eq((await migrate(db)).ran.length, 0, 'migrate twice is a no-op');
  await seed(db);
  const visitsOnce = (await one('select count(*)::int as n from visits')).n;
  await seed(db);
  eq((await one('select count(*)::int as n from visits')).n, visitsOnce, 'seed is idempotent (visits)');
  eq((await one('select count(*)::int as n from cleaners')).n, 12, 'seed is idempotent (cleaners)');
  eq((await one('select count(*)::int as n from faults')).n, 13, 'seed is idempotent (faults)');
  eq((await one('select count(*)::int as n from activity')).n, 3, 'seed activity written once');
  ok(visitsOnce > 250, 'five weeks of visits');

  // Every read runs.
  const openKmc = await ref(`select ref from v_visits where status = 'open' and site = 'KMC-ALB'`);
  const openNrc = await ref(`select ref from v_visits where status = 'open' and site = 'NRC-MALL'`);
  for (const cmd of Object.keys(reads)) {
    const a = { cover: [openNrc], check: [openKmc], cleaner: ['Mele'], site: ['NRC-MALL'], inspection: ['QA-301'], price: ['TPG-QUAY'] }[cmd] || [];
    ok(await call(cmd, a, {}), `read ${cmd}`);
  }
  eq(QUESTIONS.length, 10, 'ten questions');
  const ins = await call('insights');
  eq(ins.length, 10);
  ok(ins.every((q) => Array.isArray(q.rows)), 'every question returns rows');
  ok(ins.filter((q) => q.rows.length).length >= 9, 'the demo answers at least nine of the ten');

  // Parsing is strict.
  eq(cents('46.50', 'x'), 4650);
  eq(cents('$1,200', 'x'), 120000);
  assert.throws(() => cents('12.345', 'x'), /amount/); checks++;
  assert.throws(() => cents('0', 'x'), /more than zero/); checks++;
  eq(cents('0', 'x', { zero: true }), 0);
  eq(stamp('2026-10-21 6:05', 'x'), '2026-10-21 06:05:00');
  eq(stamp('2026-10-21T18:00', 'x'), '2026-10-21 18:00:00');
  assert.throws(() => stamp('2026-10-21 25:00', 'x'), /impossible/); checks++;
  assert.throws(() => stamp('21/10/2026', 'x'), /date and time/); checks++;
  assert.throws(() => date('2026-02-30', 'x'), /date/); checks++;

  // Time zones and working days.
  const z = await one(`select region_zone('NZ') as nz, region_zone('NSW') as nsw, region_zone('XX') as bad,
    extract(epoch from (region_now('NZ') - region_now('WA'))) / 3600 as nz_ahead_of_wa,
    working_days_before('2026-11-16', 20)::text as wd, working_days_before('2026-11-02', 1)::text as fri`);
  eq(z.nz, 'Pacific/Auckland'); eq(z.nsw, 'Australia/Sydney'); eq(z.bad, null);
  ok([4, 5].includes(Math.round(Number(z.nz_ahead_of_wa))), 'Auckland is 4 or 5 hours ahead of Perth');
  eq(z.wd, '2026-10-19', '20 working days before Monday 16 November 2026');
  eq(z.fri, '2026-10-30', 'the working day before a Monday is the Friday');

  // The award's minimum engagement follows the floor area (cl 13.5(c)).
  const mins = await one(`select award_min_hours(250) as a, award_min_hours(1200) as b, award_min_hours(3000) as c, award_min_hours(9000) as d, award_min_hours(null) as e`);
  eq([mins.a, mins.b, mins.c, mins.d, mins.e].map(Number).join(','), '1,2,3,4,2', 'minimum engagement by floor area');

  // The demo contractor says what it should.
  const attention = await call('attention');
  const has = (item, r) => attention.some((x) => x.item === item && (!r || x.ref === r));
  ok(has('cleaners not told of their right to transfer', 'HPS-SCH'), 'school contract ending, cleaners not told');
  ok(has('contract change', 'KMC-TAK'), 'new site with no transfer information');
  ok(has('rostered under the award'), 'casual visit under the minimum engagement');
  ok(has('contract term broken'), 'unvetted cleaner at the school');
  ok(has('house rule broken'), 'cleaner not inducted at the mall');
  ok(has('regulator not notified'), 'chemical exposure not notified');
  ok(has('client not told of incident'), 'cracked glass not reported to the client');
  ok(has('complaint with no reply'), 'food court complaint with no reply');
  ok(has('complaint not resolved'), 'soap complaint not resolved');
  ok(has('key held by someone who has left', 'TPG-QUAY'), 'loading dock key with a leaver');
  ok(has('inspection under the pass mark'), 'mall under the pass mark');
  ok(has('fault past its fix-by date'), 'faults past fix-by');
  ok(has('inspection due', 'WDC-DERR'), 'never inspected');
  ok(has('periodical overdue', 'TPG-QUAY'), 'carpet extraction overdue');
  ok(has('over budget hours this week', 'WDC-DERR'), 'over priced hours');
  ok(has('invoice overdue', 'INV-1998'), 'overdue invoice');
  ok(has('month not invoiced', 'WDC'), 'last month not invoiced');
  ok(has('extra done, not invoiced', 'TPG'), 'extra not invoiced');
  ok(has('open visit'), 'open visits');
  ok(!attention.some((x) => x.ref === 'KMC-TAK' && x.item.startsWith('inspection')), 'a site not started yet is not due an inspection');
  ok(attention.every((r) => r.item && r.detail), 'every attention row says what and why');

  const comp = await call('compliance');
  ok(comp.some((r) => r.problem === 'paid under the level 1 minimum rate' && r.first === 'C-205'), 'pay under the award rate');
  ok(comp.some((r) => /69G/.test(r.rule)), 'Part 6A notice rule cites s 69G');
  ok(comp.every((r) => r.rule), 'every compliance row cites its rule');
  ok(comp.findIndex((r) => r.kind === 'house') > comp.findIndex((r) => r.kind === 'award'), 'law and award first');

  const margins = await call('margins');
  eq(margins[0].site, 'WDC-DERR', 'thinnest margin first');
  ok(Number(margins[0].margin_pct) < 0, 'Westgate loses money');

  // Cover: ranks without changing anything, only same-country cleaners.
  const before = (await one('select count(*)::int as n from activity')).n;
  const cover = await call('cover', [openNrc]);
  eq(cover[0].verdict, 'can do it');
  ok(cover.every((c) => /^C-2/.test(c.code)), 'Sydney cover offers Australian cleaners only');
  eq((await one(`select status from visits where ref = $1`, [openNrc])).status, 'open', 'cover changes nothing');
  eq((await one('select count(*)::int as n from activity')).n, before, 'cover logs nothing');

  // The gate: award and clash refuse; contract and house need a logged reason.
  await fails(() => call('fill', [openNrc, 'C-205'], A), /house rule.*not inducted/, 'house rule refuses without a reason');
  const filled = await call('fill', [openNrc, 'C-205'], { ...A, override: 'Grace walks him through on arrival' });
  ok(/not inducted/.test(filled.overridden), 'override recorded');
  ok((await one(`select detail from activity where action = 'fill' order by at desc limit 1`)).detail.includes('Grace walks him through'), 'override logged');
  const wdcStart = await at('VIC', 9, '07:00');
  await fails(() => call('add-visit', ['WDC-DERR'], { ...A, start: wdcStart, hours: '1.5', cleaner: 'Ahmed' }), /minimum engagement.*13\.5\(c\)/, 'award refuses outright');
  eq((await one(`select count(*)::int as n from visits where starts_at = $1`, [wdcStart])).n, 0, 'a refused visit leaves nothing behind');
  const two = await call('add-visit', ['WDC-DERR'], { ...A, start: wdcStart, hours: '2', cleaner: 'Ahmed' });
  eq(two[0].status, 'planned', 'two hours at 1,200 m2 is lawful');
  const nzStart = await at('NZ', 9, '07:00');
  const nzShort = await call('add-visit', ['KMC-ALB'], { ...A, start: nzStart, hours: '1', cleaner: 'Hana' });
  eq(nzShort[0].status, 'planned', 'the Australian award does not apply in New Zealand');
  const clash = await ref(`select ref from v_visits where cleaner_code = 'C-101' and status = 'planned' order by starts_at limit 1`);
  const clashAt = (await one(`select starts_at::text as s from visits where ref = $1`, [clash])).s.slice(0, 16);
  await fails(() => call('add-visit', ['TPG-NEWM'], { ...A, start: clashAt, hours: '2', cleaner: 'Arjun', override: 'try' }), /already at TPG-QUAY/, 'double booking refuses even with a reason');
  await fails(() => call('fill', [openKmc, 'Tomasi'], A), /contract.*police vet/, 'vetting refuses without a reason');
  await call('vet', ['Tomasi'], { ...A, reference: 'NZP-123' });
  ok(!(await call('check', [openKmc], { cleaner: 'Tomasi' })).some((p) => p.kind === 'contract'), 'vet on file clears the contract term');
  const repeat = await call('add-visit', ['TPG-NEWM'], { ...A, start: await at('NZ', 14, '06:00'), hours: '2', repeat: '2', days: '1,3,5' });
  eq(repeat.length, 6, 'two weeks of Monday, Wednesday, Friday');
  ok(repeat.every((r) => r.cleaner === '(open)'), 'repeat without a cleaner leaves them open');

  // Clock in and out, missed visits.
  const planned = await one(`select ref, starts_at::text as s, region from v_visits where cleaner_code = 'C-104' and site = 'TPG-NEWM' and status = 'planned' order by starts_at limit 1`);
  await fails(() => call('clock-in', [planned.ref], { ...A, at: planned.s.slice(0, 11) + '06:00' }), /two hours before/, 'clock-in too early refused');
  const inAt = planned.s.slice(0, 11) + '17:41';
  const cin = await call('clock-in', [planned.ref], { ...A, at: inAt });
  eq(cin.late_minutes, 11);
  await fails(() => call('clock-out', [planned.ref], { ...A, at: planned.s.slice(0, 11) + '17:00' }), /after the clock-in/);
  const cout = await call('clock-out', [planned.ref], { ...A, at: planned.s.slice(0, 11) + '22:41' });
  eq(Number(cout.worked_hours), 5);
  const tomasi = await ref(`select ref from v_visits where cleaner_code = 'C-107' and status = 'planned' order by starts_at limit 1`);
  await call('cleaner-status', ['Tomasi'], { ...A, status: 'on-leave', reason: 'family' });
  const tomasiAt = (await one('select starts_at::text as s from visits where ref = $1', [tomasi])).s.slice(0, 16);
  await fails(() => call('clock-in', [tomasi], { ...A, at: tomasiAt }), /cleaner is on-leave/, 'on-leave cleaner cannot clock in');
  await call('cleaner-status', ['Tomasi'], { ...A, status: 'active' });
  const miss = await call('missed', [tomasi], { ...A, note: 'phone off' });
  ok(/^V-/.test(miss.cover_visit), 'missed visit opens a cover visit');
  eq((await one(`select status from visits where ref = $1`, [miss.cover_visit])).status, 'open');

  // A leaver: the visits to cover and the keys to collect.
  const left = await call('cleaner-status', ['Losa'], { ...A, status: 'left', reason: 'moved to Hamilton' });
  ok(left.visits_to_cover.length > 0, 'leaver lists visits to cover');
  eq(left.keys_to_collect.length, 1, 'leaver lists keys to collect');
  await call('return-key', ['TPG-QUAY'], { ...A, label: 'swipe card' });
  eq((await one(`select count(*)::int as n from keys where cleaner_id is not null and label like 'Level 1%'`)).n, 0, 'key back in the office');
  await fails(() => call('issue-key', ['TPG-QUAY', 'Losa'], { ...A, label: 'Spare' }), /has left/);

  // Periodicals.
  const pd = await call('periodic-done', ['TPG-QUAY'], { ...A, task: 'extraction', cleaner: 'Arjun' });
  ok(pd.next_due > today(), 'next due moves forward');
  await fails(() => call('periodic-done', ['TPG-QUAY'], { ...A, task: 'Vacuum all carpet' }), /not found/, 'daily tasks are not periodicals');

  // Inspections and faults.
  const insp = await call('inspect', ['WDC-DERR'], { ...A, checked: '20', faults: 'Lunchroom: microwave not wiped; Amenities: bins full; Offices: dust on sills; Glass: smears; Amenities: no soap' });
  eq(insp.score_pct, 75); ok(/fail/.test(insp.result));
  await fails(() => call('inspect', ['WDC-DERR'], { ...A, checked: '1', faults: 'a; b' }), /only 1 items/);
  const fx = await call('fix', [insp.inspection], { ...A, item: 'microwave' });
  eq(fx.on_time, true);
  eq((await call('inspection', [insp.inspection])).faults.filter((f) => f.standing === 'fixed').length, 1);

  // Complaints.
  const k = await call('log-complaint', [], { ...A, site: 'TPG-QUAY', from: 'Rachel Moana', category: 'quality', summary: 'Level 4 kitchen sink not cleaned' });
  ok(/^CMP-/.test(k.ref));
  await fails(() => call('resolve', [k.ref], { ...A, outcome: 'done' }), /reply to the client first/);
  await call('respond', [k.ref], A);
  await call('resolve', [k.ref], { ...A, outcome: 'Sink cleaned, added to the level 4 checklist' });
  eq((await call('complaints', [], {})).some((r) => r.ref === k.ref), false, 'resolved complaints drop off the open list');
  eq((await call('complaints', [], { all: true })).some((r) => r.ref === k.ref), true, '--all shows them');

  // Incidents: notification order.
  const inc = await call('log-incident', [], { ...A, site: 'NRC-MALL', at: await at('NSW', 0, '05:30'), kind: 'sharps', summary: 'Needle found in amenities bin', cleaner: 'Thanh', injury: 'no' });
  ok(/^INC-/.test(inc.ref));
  await fails(() => call('close-incident', [inc.ref], { ...A, outcome: 'x' }), /tell the client first/);
  await call('notify-client', [inc.ref], A);
  await call('close-incident', [inc.ref], { ...A, outcome: 'Sharps procedure followed' });
  const chem = await ref(`select ref from incidents where kind = 'chemical'`);
  await fails(() => call('close-incident', [chem], { ...A, outcome: 'x' }), /regulator has not been notified/);
  await fails(() => call('notify-regulator', [inc.ref], { ...A, reference: 'x' }), /not marked notifiable/);
  await call('notify-regulator', [chem], { ...A, reference: 'WS-2026-55102' });
  await call('close-incident', [chem], { ...A, outcome: 'Products separated, training on mixing' });
  const future = await at('NSW', 2, '05:30');
  await fails(() => call('log-incident', [], { ...A, site: 'NRC-MALL', at: future, kind: 'other', summary: 'x' }), /future/);

  // Contract changes: the s 69G date, then told and transfer information.
  const cc = await call('contract-change', ['TPG-NEWM'], { ...A, direction: 'losing', other: 'Spotless Rival Ltd', date: '2027-03-01' });
  eq(cc.tell_by, '2027-02-01', '20 working days before Monday 1 March 2027');
  eq((await one(`select contract_end::text as d from sites where code = 'TPG-NEWM'`)).d, '2027-03-01');
  const told = await call('told-cleaners', ['TPG-NEWM'], { ...A, date: '2027-01-25' });
  eq(told.elect_by, '2027-02-08', 'election 10 working days after the notice');
  eq(told.in_time, true);
  await call('transfer-info', ['TPG-NEWM'], A);
  await fails(() => call('draft-transfer-notice', ['NRC-MALL']), /New Zealand law/, 'Part 6A notice is NZ only');

  // Extras, supplies and invoices: everything billed once, GST by country.
  const x = await call('add-extra', ['NRC-MALL'], { ...A, description: 'Graffiti removal, car park level 2', price: '480' });
  await fails(() => call('extra-done', [x.ref], A), /not been approved/);
  await call('approve-extra', [x.ref], { ...A, by: 'Nadia Haddad' });
  await call('extra-done', [x.ref], A);
  await call('add-supplies', ['NRC-MALL'], { ...A, item: 'Hand soap 5 L', qty: '4', unit: '38.50' });
  const unbilled = await call('unbilled', ['NRC']);
  ok(unbilled.some((u) => u.kind === 'extra') && unbilled.some((u) => u.kind === 'supplies'), 'extras and supplies wait for the invoice');
  const inv = await call('invoice', ['NRC'], A);
  const expected = 1850000 + 48000 + 15400;
  eq(inv.subtotal_cents, expected, 'month fee + extra + supplies');
  eq(inv.gst_cents, Math.round(expected * 0.1), 'GST at 10% in Australia');
  await fails(() => call('invoice', ['NRC'], A), /Nothing to invoice/, 'never twice');
  const nz = await call('invoice', ['TPG'], A);
  eq(nz.gst_cents, Math.round(nz.subtotal_cents * 0.15), 'GST at 15% in New Zealand');
  await fails(() => call('invoice-paid', [inv.ref], A), /not been sent/);
  await call('invoice-sent', [inv.ref], A);
  await call('invoice-paid', [inv.ref], A);

  // Sites, scope and pricing.
  await call('add-client', [], { ...A, code: 'BCH', name: 'Bayside Childcare Ltd', country: 'AU', contact: 'Lee Wong' });
  await fails(() => call('add-site', [], { ...A, code: 'BCH-1', name: 'x', client: 'BCH', region: 'NZ', fee: '100' }), /AU client/);
  const pros = await call('add-site', [], { ...A, code: 'BCH-MAN', name: 'Bayside Childcare Manly', client: 'BCH', region: 'NSW', sector: 'education', fee: '1', days: '5', area: '400', prospect: true });
  eq(pros.active, false, 'a prospect is not an active site');
  await call('add-task', ['BCH-MAN'], { ...A, area: 'Rooms', task: 'Mop floors, wipe tables and toys', every: 'daily', minutes: '90' });
  await call('add-task', ['BCH-MAN'], { ...A, area: 'Bathrooms', task: 'Clean and sanitise', every: 'daily', minutes: '30' });
  await call('add-task', ['BCH-MAN'], { ...A, area: 'Windows', task: 'Inside glass', every: 'monthly', minutes: '120' });
  const p = await call('price', ['BCH-MAN']);
  eq(p.hours_a_week, '10.5', '10 hours daily plus monthly windows');
  ok(/^\$[\d,]+\.00$/.test(p.monthly_fee), 'a monthly fee');
  ok(!(await call('attention')).some((r) => r.ref === 'BCH-MAN'), 'a prospect raises nothing');

  // Drafts are written, never sent.
  const d1 = await call('weekly-review');
  const d2 = await call('draft-client-report', ['NRC-MALL']);
  const d3 = await call('draft-complaint-reply', [await ref(`select ref from v_complaints where site = 'NRC-MALL' and standing <> 'resolved'`)]);
  const d4 = await call('draft-transfer-notice', ['HPS-SCH']);
  const d5 = await call('draft-quote', ['BCH-MAN']);
  for (const d of [d1, d2, d3, d5]) ok(existsSync(path.join(process.env.OUTPUT_DIR, d.draft)), `draft ${d.draft}`);
  eq(d4.cleaners, 2, 'a transfer notice for each cleaner on the school');
  ok(readFileSync(path.join(process.env.OUTPUT_DIR, d3.draft), 'utf8').includes('Nadia'), 'complaint reply addressed');
  ok(/69I/.test(readFileSync(path.join(process.env.OUTPUT_DIR, 'drafts', readdirSync(path.join(process.env.OUTPUT_DIR, 'drafts')).find((f) => f.startsWith('transfer-notice'))), 'utf8')), 'transfer notice cites s 69I');
  ok(!readdirSync(path.join(process.env.OUTPUT_DIR, 'drafts')).some((f) => /\u2014/.test(readFileSync(path.join(process.env.OUTPUT_DIR, 'drafts', f), 'utf8'))), 'no em dashes in drafts');

  // Settings and notes.
  await fails(() => call('set', ['nope', '1'], A), /Unknown setting/);
  ok((await call('set', ['pass_score_pct', '80'], A)).some((r) => r.key === 'pass_score_pct' && r.value === '80'));
  ok(!(await call('attention')).some((r) => r.item === 'inspection under the pass mark' && /NRC-MALL/.test(r.detail)), 'pass mark is a setting');
  await call('log', ['NRC-MALL'], { ...A, note: 'Centre manager happy after the walk' });
  await fails(() => call('log', ['NRC-MALL'], { note: 'x' }), /--actor is required/, 'every write names an actor');

  // Swept import: dry run, repeat rows skipped, a bad row rolls back the file.
  const ex = path.join(REPO_ROOT, 'examples', 'swept');
  const dry = await call('import', ['swept', path.join(ex, 'locations.csv')], { ...A, kind: 'locations', 'dry-run': true });
  eq(dry.added, 2); eq((await one(`select count(*)::int as n from sites where external_id like 'swept:%'`)).n, 0, 'dry run keeps nothing');
  eq((await call('import', ['swept', path.join(ex, 'locations.csv')], { ...A, kind: 'locations' })).added, 2);
  eq((await call('import', ['swept', path.join(ex, 'locations.csv')], { ...A, kind: 'locations' })).skipped, 2, 'repeat rows skipped');
  eq((await call('import', ['swept', path.join(ex, 'employees.csv')], { ...A, kind: 'employees' })).added, 2);
  eq((await call('import', ['swept', path.join(ex, 'timesheets.csv')], { ...A, kind: 'timesheets' })).added, 3);
  const ts = await one(`select v.worked_hours from v_visits v join visits x on x.id = v.id where x.external_id like 'swept:E-311:1042:2026-10-03%'`);
  eq(Number(ts.worked_hours), 4.08, '6:00 PM to 10:05 PM');
  const bad = path.join(root, 'bad.csv');
  (await import('node:fs')).writeFileSync(bad, 'Employee,Location,Clock In,Clock Out\nE-312,1043,05/10/2026 19:00,05/10/2026 21:00\nE-312,9999,05/10/2026 19:00,05/10/2026 21:00\n');
  await fails(() => call('import', ['swept', bad], { ...A, kind: 'timesheets' }), /row 3.*not found.*Nothing was imported/);
  eq((await one(`select count(*)::int as n from visits where external_id like 'swept:E-312:1043:2026-10-05%'`)).n, 0, 'a bad row rolls back the file');

  // Export, activity, database checks.
  const exp = await call('export', [], { out: path.join(root, 'export.json') });
  ok(exp.rows.visits > 250 && existsSync(exp.file));
  await fails(() => db.query(`update activity set detail = 'x'`), /append-only/);
  await fails(() => db.query(`insert into keys (site_id, label, cleaner_id, issued_on) select id, 'k2', null, current_date from sites limit 1`), /check/, 'a key in the office has no issue date');
  await fails(() => db.query(`insert into invoice_lines (invoice_id, site_id, kind, month, description, amount_cents) select l.invoice_id, l.site_id, 'fee', l.month, 'again', 1 from invoice_lines l where l.kind = 'fee' limit 1`), /invoice_lines_fee_once|duplicate/, 'a month fee is billed once');
  ok(commands.length >= 60, `${commands.length} commands`);

  // Views and documents render, escaped.
  await db.query(`update clients set name = '<b>Tasman</b> & Co' where code = 'TPG'`);
  await db.close(); db = null;
  for (const [script, args] of [['view.mjs', []], ['docs.mjs', []]]) {
    const r = spawnSync(process.execPath, [path.join('scripts', script), ...args], { cwd: REPO_ROOT, env: process.env, encoding: 'utf8' });
    eq(r.status, 0, `${script}: ${r.stderr}`);
  }
  const viewsDir = path.join(process.env.OUTPUT_DIR, 'views');
  ok(readdirSync(viewsDir).some((f) => f.endsWith('.html')), 'views rendered');
  const docDir = path.join(process.env.OUTPUT_DIR, 'docs-out');
  const allDocs = readdirSync(docDir, { recursive: true }).filter((f) => String(f).endsWith('.html'));
  ok(allDocs.length >= 5, 'documents rendered');
  const html = allDocs.map((f) => readFileSync(path.join(docDir, String(f)), 'utf8')).join('');
  ok(html.includes('&lt;b&gt;Tasman&lt;/b&gt; &amp; Co') && !html.includes('<b>Tasman</b>'), 'HTML is escaped');


  // The CLI shell.
  const cli = spawnSync(process.execPath, ['scripts/cleaning.mjs', 'attention', '--json'], { cwd: REPO_ROOT, env: process.env, encoding: 'utf8' });
  eq(cli.status, 0, cli.stderr);
  ok(Array.isArray(JSON.parse(cli.stdout)));
  const badFlag = spawnSync(process.execPath, ['scripts/cleaning.mjs', 'attention', '--nope'], { cwd: REPO_ROOT, env: process.env, encoding: 'utf8' });
  eq(badFlag.status, 1); ok(/Unknown option --nope/.test(badFlag.stderr));
  const amb = spawnSync(process.execPath, ['scripts/cleaning.mjs', 'site', 'TPG'], { cwd: REPO_ROOT, env: process.env, encoding: 'utf8' });
  eq(amb.status, 1); ok(/ambiguous/.test(amb.stderr), 'ambiguous names list and stop');

  console.log(`PASS: ${checks} checks, ${commands.length} commands`);
} finally {
  await db?.close();
  rmSync(root, { recursive: true, force: true });
}

function today() { return new Date().toISOString().slice(0, 10); }
