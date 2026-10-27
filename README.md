<h1 align="center">Commercial Cleaning for Claude Code</h1>

<p align="center">
  <strong>The open-source cleaning contract system that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your Swept data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=swept">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/swept?utm_source=github&utm_medium=readme&utm_campaign=swept">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#bring-your-swept-data">Instead of Swept</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Commercial Cleaning for Claude Code does the job you pay Swept for, as a Postgres database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and it can answer questions the Swept dashboard cannot.

Swept prices by location, in bands: its Scale plan starts at $225 a month for up to 15 locations, and above 50 locations it is a custom quote ([sweptworks.com/plan-pricing](https://sweptworks.com/plan-pricing), checked 27 October 2026). Every site you win moves you up a band. Here the database is yours, and a new site costs nothing.

Want the same thing with a phone app for your cleaners, or built on a different stack? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=swept).

It covers a commercial cleaning contractor in New Zealand or Australia, from 10 cleaners to a few hundred: clients and sites, each site's scope of works and the hours its price was built on, cleaners and their inductions and police vets, the visit roster, periodicals, quality inspections and the faults they find, complaints, keys and access cards, contract changes, extras, supplies and monthly invoices. Every visit is checked before anyone goes on it: in Australia, the Cleaning Services Award 2020 minimum engagement for the site's floor area (cl 13.5(c)); everywhere, double bookings, police vetting where the client requires it, site induction and weekly hours. When a New Zealand site changes hands, it tracks the cleaners' right to transfer and the 20-working-day notice date (Employment Relations Act 2000 s 69G, s 69I).

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No location bands, no seats, no add-ons. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/commercial-cleaning-for-claude-code.git
cd commercial-cleaning-for-claude-code
npm install
npm run demo
```

Then open the folder in Claude Code and type `/attention`. Try `/margins`, `/changes` and `/insights` next.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-location fee.

## The commands

| Command | What it does |
|---|---|
| `/attention` | Open visits, visits under the award, double bookings, contract terms and house rules broken, no clock-in, notifiable events not reported, complaints with no reply, contract changes, keys held by leavers, failed inspections, late faults, periodicals and inspections due, hours against the price, overdue and unbilled money |
| `/cover` | Who can take a visit: every cleaner in the same country checked against the award, double bookings, vetting, induction and weekly hours, people who know the site first. Changes nothing |
| `/fill` | Put a cleaner on a visit. The award refuses outright; a contract term or house rule needs a reason, which is logged |
| `/roster` | The next 7 days, every visit with its cleaner and anything wrong with it |
| `/compliance` | The roster, pay rates, incidents, complaints, keys and contract changes checked against the rules in [docs/compliance.md](docs/compliance.md), law and award first, with sources |
| `/margins` | Each site's margin over 28 days: the fee against hours worked at each cleaner's rate plus on-costs |
| `/hours` | Each site this week: priced, rostered, open and worked hours |
| `/periodicals` | Carpet extraction, strip and seal, high dusting and the rest: last done, due, how late |
| `/inspect` | Record a quality inspection; it scores it and gives every fault a fix-by date |
| `/log-complaint` | Log a client complaint, linked to a missed visit if there was one, with the reply due time |
| `/changes` | Sites changing hands and where each stands on the New Zealand right to transfer |
| `/price` | Price a site from its scope of works at your target margin, prospects included |
| `/invoice` | A client's monthly invoice: every site's fee, extras done and supplies to recharge, GST by country, never twice |
| `/weekly-review` | The Monday review, written to `drafts/` |
| `/draft-client-report` | A site's monthly cleaning report for the client |
| `/draft-transfer-notice` | The notice to each cleaner of their right to transfer (New Zealand) |
| `/draft-complaint-reply` | A reply to a complaint, from what the records say was done |
| `/draft-quote` | A cleaning proposal from the scope and the priced fee |
| `/insights` | The ten questions below |

The working commands: `/add-visit`, `/unassign`, `/cancel`, `/clock-in`, `/clock-out`, `/missed`, `/periodic-done`, `/fix`, `/respond`, `/resolve`, `/log-incident`, `/notify-client`, `/notify-regulator`, `/close-incident`, `/issue-key`, `/return-key`, `/contract-change`, `/told-cleaners`, `/transfer-info`, `/add-extra`, `/approve-extra`, `/extra-done`, `/add-supplies`, `/invoice-sent`, `/invoice-paid`, `/add-client`, `/add-site`, `/add-task`, `/add-cleaner`, `/cleaner-status`, `/induct`, `/vet`, `/set`, `/log`. The reads: `/open-visits`, `/check`, `/quality`, `/inspections`, `/inspection`, `/complaints`, `/incidents`, `/sites`, `/site`, `/cleaners`, `/cleaner`, `/keys`, `/unbilled`, `/invoices`, `/extras`, `/activity`. Plus `/import`, `/export`, `/view`, `/documents`, `/new-view` and `/customise`. 75 commands in all; [docs/cli.md](docs/cli.md) lists every option.

Names match case-insensitively. A partial name or code works when it is unique; when it is not, the command lists the candidates and stops.

## The gates

- `/fill` and `/add-visit` with a cleaner refuse a part-time or casual visit at an Australian site shorter than the award's minimum engagement for its floor area: 1 hour for a sole cleaner at 300 m2 or less, then 2, 3 or 4 hours (Cleaning Services Award 2020 cl 13.5(c)). They refuse a cleaner who is already somewhere else, on leave or gone.
- Police vetting (a contract term set per site), site induction and the weekly hours limit refuse unless `--override` gives a reason. The reason goes in the activity log. `/clock-in` refuses an unvetted cleaner on a vetting site unless the visit carries one.
- `/compliance` checks every Australian cleaner's base rate against the award rate for their level (cl 15.1, from 1 July 2026).
- `/contract-change` on a New Zealand site you are losing gives the date the cleaners must be told of their right to transfer: 20 working days before (ERA 2000 s 69G). `/told-cleaners` sets the election date 10 working days on.
- `/close-incident` refuses until the client has been told, and for a notifiable event, until the regulator has been notified (HSWA 2015 s 56, WHS Act 2011 s 38).
- `/resolve` refuses a complaint the client has had no reply to. `/extra-done` refuses work the client has not approved.
- `/invoice` bills each site's monthly fee once, every extra once and every recharge once, with 15% GST in New Zealand and 10% in Australia.
- `/missed` opens a cover visit for the time left. `/cleaner-status` lists the visits that need someone else and the keys to collect.

The software records and checks; the operator decides. It is not legal advice, and it sends nothing.

## Bring your Swept data

Swept exports approved timesheets to CSV. Copy your locations and employees into CSV too, add your clients, then import in this order, dry run first:

```bash
node scripts/cleaning.mjs import swept locations.csv --kind=locations --client=TPG --region=NZ --actor="Your name" --dry-run
node scripts/cleaning.mjs import swept employees.csv --kind=employees --actor="Your name" --dry-run
node scripts/cleaning.mjs import swept timesheets.csv --kind=timesheets --actor="Your name" --dry-run
```

The [switching guide](docs/replace-swept.md) covers the headings it reads, `--map` for files with other headings, what comes across and what does not. Imports are atomic: repeat rows are skipped and one bad row stops the whole file.

## Ten questions answered from your records

`/insights` runs all ten today.

1. Which sites earn the least after labour, over the last 28 days?
2. Which sites ran over the hours their price was built on, over the last 4 weeks?
3. Who clocks in late, and by how many minutes on average?
4. Which sites draw the most complaints per 100 hours worked?
5. Which sites are under the pass mark, or have not been inspected in time?
6. How much is earned and not on an invoice yet, by client?
7. Which periodicals are late, and how many cleaning hours do they owe?
8. Who holds keys or cards, to how many sites, and does anyone who has left still have one?
9. How many different cleaners worked each site over the last 28 days?
10. Which visits were missed, and did a complaint follow?

## Your first hour: ten things to ask for

1. What needs my attention today?
2. Hana is sick tomorrow morning. Who can cover Albany?
3. Is anyone rostered under the award minimum this fortnight?
4. Which sites lost money last month, and why?
5. Put Arjun on Newmarket every weeknight from 17:30 for the next four weeks.
6. The centre manager says the food court tables are sticky again. Log it and draft a reply.
7. We have lost the school contract from the start of next term. What do we owe the cleaners, and by when?
8. Price the Manly childcare centre from this scope at a 25% margin.
9. Invoice Northbridge for this month, with the graffiti removal.
10. Add a field for the client's purchase order number on every site through `/customise`.

## Verification

`npm test` runs every command on a temporary database with the demo contractor: migrations, repeatable seed data, each site's own time zone, working days, the award's minimum engagement by floor area, award rates, double bookings, vetting and induction overrides logged, refused visits leaving nothing behind, cover that changes nothing and stays in one country, clock-in and clock-out, missed visits opening cover, a leaver's visits and keys, periodicals, inspections and faults, the complaint and incident order, the Part 6A notice and election dates, extras, supplies and invoices to the cent with GST by country and never twice, Swept imports with dry run, repeats and rollback, drafts, export, the append-only activity log, database checks, views, documents and escaped HTML. Set `TEST_DATABASE_URL` to run the same checks on an empty Postgres database.

Read the [operating rules](CLAUDE.md), the [rules and sources](docs/compliance.md), the [selection evidence](docs/research.md) and [why there is no front end](docs/why-no-front-end.md).

## Architecture

```
commercial-cleaning-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/                  the CLI the commands drive
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      plain SQL schema
  supabase/seed.sql         demo data
  docs/                     the rules, the thesis and the switching guide
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Commercial Cleaning for Claude Code for your business, migrates your Swept data, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=swept)
- Read more: [enterprisedna.co/omni/instead-of/swept](https://enterprisedna.co/omni/instead-of/swept?utm_source=github&utm_medium=readme&utm_campaign=swept)

## License

MIT. Copyright (c) 2026 Enterprise DNA.
