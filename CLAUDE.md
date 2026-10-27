# Commercial Cleaning for Claude Code: operating instructions

Claude Code reads this file at the start of every session. It says who this is for, the house rules, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR CLEANING BUSINESS]
- **Operator:** [YOUR NAME], [your role: owner, operations manager, area manager, rostering]
- **What matters most:** [for example: every visit covered tonight, no client waits more than four hours for a reply, every site makes money]

The work is a commercial cleaning contractor in New Zealand or Australia: clients and their sites, the scope of works for each, cleaners and their inductions, a visit roster checked before anyone goes on it, periodicals, quality inspections, complaints, keys, contract changes, extras, supplies and monthly invoices.

## Rules

- Read the CLI result before answering. Every answer about a site, cleaner, visit, inspection or complaint starts with data from `node scripts/cleaning.mjs`. Never answer from memory.
- Resolve names first. If the CLI says a name is ambiguous, list the candidates and ask; never pick the first.
- Times are the site's own clock. "05:00" at the Northbridge site is 5 am in Sydney. Write them as `--start="2026-10-21 05:00"`.
- Before anyone goes on a visit, run `cover` or `check`. If the award says no (an Australian part-time or casual visit under the minimum engagement for the site's floor area) or the cleaner is elsewhere, on leave or gone, say why and stop. Never look for a way around it.
- A contract term (police vetting) or house rule (induction, weekly hours) can be overridden only with a reason the operator gives. Never invent the reason.
- When a New Zealand site is changing hands, the cleaners' right to transfer has dates in law (Employment Relations Act 2000 s 69G, s 69I). Say the dates plainly and suggest the operator has the notice checked by someone who knows employment law.
- Every write names `--actor`. That is a label in the activity log, not a verified identity.
- Never invent a complaint, a fault, an incident detail, a regulator reference, a police vet date, a fee or an outcome. Copy them from the operator, the client's email or the inspection sheet.
- Never send, call, pay or delete. Replies, reports, notices and quotes are drafts in `drafts/`; invoices and reports are documents in `docs-out/`. Recording something as sent does not send it; a person does that.
- The rules in `docs/compliance.md` are records checks, not legal advice. If a rule looks out of date (award rates change every 1 July), say so and stop.
- Back up before a schema change. Use a new numbered migration (`/customise`), run `npm test`, and keep real data, exports and credentials out of Git.
- The database owner can bypass every application check. Protect that credential. Row security and revoked public privileges restrict unrelated database roles; a shared installation needs authenticated access.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| The activity log: who did what, newest first. | `/activity` |
| Add a cleaner. | `/add-cleaner` |
| Add a client. | `/add-client` |
| Quote one-off work outside the scope. | `/add-extra` |
| Add a site, or a prospect to price (--prospect). | `/add-site` |
| Record consumables delivered to a site, recharged to the client unless --recharge=no. | `/add-supplies` |
| Add or change a line in a site's scope of works. | `/add-task` |
| Add visits: one, or the same time on chosen days for a number of weeks. With a cleaner, every visit is checked first. | `/add-visit` |
| Record the client's yes to an extra. | `/approve-extra` |
| Show what needs a person today: open visits, visits rostered under the award, double bookings, contract terms and house rules broken, no clock-in, notifiable events not reported, complaints with no reply, contract changes and the cleaners' right to transfer, keys held by leavers, failed inspections, late faults, inspections and periodicals due, hours against the price, overdue invoices and unbilled work. | `/attention` |
| Cancel a visit. | `/cancel` |
| Sites changing hands: losing to another contractor or winning from one, the date, the New Zealand notice date for the cleaners' right to transfer, and where each stands. | `/changes` |
| Check one visit, or one visit with a different cleaner on it, against every rule. Changes nothing. | `/check` |
| A cleaner goes on leave, comes back, or leaves. Lists the visits that need someone else and the keys to collect. | `/cleaner-status` |
| One cleaner: details, keys held, and their visits for the last 14 days and next 7. | `/cleaner` |
| Every cleaner with employment type, award level, status, police vet date, the sites they are inducted at and keys held. | `/cleaners` |
| Clock a cleaner in. Refuses a cleaner who is on leave, has left or is elsewhere, and an unvetted cleaner on a vetting site unless the visit carries an override. Warns if the visit is under the award minimum. | `/clock-in` |
| Clock a cleaner out. | `/clock-out` |
| Close an incident. Refuses until the client is told and, for a notifiable event, the regulator. | `/close-incident` |
| Open complaints, newest first, with hours to reply and where each stands. --all adds the resolved ones. | `/complaints` |
|  | `/compliance` |
| A site changes hands: we are losing it to another contractor or winning it from one. For a New Zealand site we are losing, gives the date the cleaners must be told of their right to transfer. | `/contract-change` |
| Who can take a visit: every active cleaner in the same country checked against the award, double bookings, police vetting, site induction and weekly hours. Cleaners who know the site first, then fewest hours. Changes nothing. | `/cover` |
| Make this system yours in plain language. Add a field, rename stages, change a rule, add a column to a document. Writes the migration, applies it, updates the commands that touch it. | `/customise` |
| Render the paperwork in documents.json as branded HTML in docs-out/: tax invoices, inspection reports, scopes of works, incident reports and key registers. | `/documents` |
| A site's monthly cleaning report for the client: visits and hours, inspections, periodicals done and coming up, their requests. Written to drafts/. | `/draft-client-report` |
| A reply to a client complaint, written to drafts/. | `/draft-complaint-reply` |
| A cleaning proposal for a site from its scope of works and the priced fee. Written to drafts/. | `/draft-quote` |
| For a New Zealand site we are losing: a notice to each cleaner of their right to elect to transfer to the incoming contractor (ERA 2000 s 69G, s 69I). Written to drafts/. | `/draft-transfer-notice` |
| Everything in one JSON file. | `/export` |
| Mark an extra done. It goes on the next invoice. Refuses an extra the client has not approved. | `/extra-done` |
| One-off work outside the scope: quoted, approved, done, invoiced. | `/extras` |
| Put a cleaner on a visit. The award and double bookings refuse outright; a contract term (police vetting) or house rule (induction, weekly hours) refuses unless --override names the reason, which is logged. | `/fill` |
| Mark a fault fixed. | `/fix` |
| Each site this week: the hours the price was built on, rostered, open and worked so far. | `/hours` |
| Bring Swept data across from CSV: locations, then employees, then timesheets. Dry run first. | `/import` |
| Every incident, newest first, with where it stands: regulator not notified, client not told, open, closed. | `/incidents` |
| Record a site induction. | `/induct` |
| The ten questions in the README, answered from the records today. | `/insights` |
| Record a quality inspection: items checked and every fault ("Area: item; Area: item"). Scores it, sets a fix-by date for each fault. | `/inspect` |
| One inspection and every fault it found, with fix-by dates. | `/inspection` |
| Every inspection, newest first, with its score and faults. | `/inspections` |
| Record a payment. | `/invoice-paid` |
| Record that an invoice went out. | `/invoice-sent` |
| Raise a client's invoice: every site's monthly fee not yet billed up to the month, extras done and supplies to recharge, GST by country, never twice. | `/invoice` |
| Every invoice with where it stands: not sent, sent, overdue, paid. | `/invoices` |
| Issue a key, card, fob or alarm code to a cleaner. | `/issue-key` |
| The key and access register: every key, card, fob and alarm code, who holds it, and whether that person has left. | `/keys` |
| Log a client complaint or request. Links it to a missed visit at the site in the last 48 hours, and says when the reply is due. | `/log-complaint` |
| Log an incident. A notifiable event points straight at WorkSafe or the state regulator. | `/log-incident` |
| Add a note to the activity log against a site, cleaner, visit or complaint. | `/log` |
| Each site's margin over the last 28 days: the fee earned against the hours worked at each cleaner's rate plus on-costs. Thinnest first. | `/margins` |
| The cleaner did not turn up: mark the visit missed and open a cover visit for what is left. | `/missed` |
| Add a read-only HTML view (a dashboard page) from a plain-language description, rendered in the operator's brand by `npm run view`. | `/new-view` |
| Record that the client has been told about an incident. | `/notify-client` |
| Record the regulator notification and its reference. | `/notify-regulator` |
| Visits with nobody on them in the next 14 days (or --days). | `/open-visits` |
| Record a periodical as done; the next due date moves on. | `/periodic-done` |
| Monthly, quarterly, six-monthly and annual work: when each was last done, when it is due, how late it is. | `/periodicals` |
| Price a site from its scope of works: weekly hours, labour a month and the monthly fee at the target margin. Works on a prospect too. | `/price` |
| Every site's last inspection, score, 90-day average, open faults and complaints. | `/quality` |
| Close a complaint with what was done. Refuses until the client has had a reply. | `/resolve` |
| Record that the client has had a reply. | `/respond` |
| A key comes back to the office. | `/return-key` |
| The visits for the next 7 days (or --days), every visit with its cleaner and anything wrong with it. | `/roster` |
| Change a house rule or default (pass mark, fix-by days, reply hours, weekly hours, on-costs, quote margin, award rates). | `/set` |
| One site: the contract, this week's hours, quality, the scope of works, the team inducted there and its keys. | `/site` |
| Every site with its client, fee, priced hours, contract dates and whether it needs police vetting. | `/sites` |
| Record that the cleaners on a site we are losing were told of their right to transfer. Sets the election date 10 working days on (s 69G) unless --elect-by says otherwise. | `/told-cleaners` |
| Record the transfer information given to the incoming contractor, or received from the outgoing one. | `/transfer-info` |
| Take a cleaner off a visit and open it again. | `/unassign` |
| Everything earned and not on an invoice: monthly fees, extras done, supplies to recharge. | `/unbilled` |
| Record a police vet on file. | `/vet` |
| Render the read-only dashboards in views.json (this week, quality, margins) as branded HTML in views/. | `/view` |
| The Monday review, written to drafts/: the law and the award, open visits, clients, contract changes, hours against price, thinnest margins and money, then the whole attention list. | `/weekly-review` |

If an ask fits nothing here, run `node scripts/cleaning.mjs --help`, answer from the records, then propose a new command for it.

## Where things live

- `scripts/cleaning.mjs` is the one CLI. `scripts/lib/domain.mjs` holds its rules.
- `supabase/migrations/` is the schema in plain SQL. `v_visit_problems` is every rule a visit can break, in one place: the CLI, the views and the documents all read it. `npm run migrate` applies it. `DATABASE_URL` chooses Postgres; unset, it uses PGlite in `.data/`.
- `settings` holds the house rules, contract defaults and award rates (`set` changes them). Laws and their sources are in `docs/compliance.md`.
- `views.json` and `documents.json` define the dashboards and documents. `brand.json` is your name, colours and logo.
- `docs/replace-swept.md` is the switching guide.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=swept&utm_medium=readme
