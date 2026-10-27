# CLI reference

Every command is `node scripts/cleaning.mjs <command> ...`. Options use `--key=value`. Add `--json` to any command for machine output. Every write needs `--actor="<your name>"`. Times are the site's own clock, written `"YYYY-MM-DD HH:MM"`.

## activity

The activity log: who did what, newest first.

```
node scripts/cleaning.mjs activity [--days=7]
```

## add-cleaner

Add a cleaner.

```
node scripts/cleaning.mjs add-cleaner --code=<CODE> --name="<name>" [--employment=full-time|part-time|casual] [--level=1|2|3] [--pay=<hourly rate before loadings>] [--vetted=YYYY-MM-DD] [--phone=] [--email=] --actor="<name>"
```

## add-client

Add a client.

```
node scripts/cleaning.mjs add-client --code=<CODE> --name="<name>" --country=NZ|AU [--contact="<name>"] [--email=<email>] [--invoice-days=20] --actor="<name>"
```

## add-extra

Quote one-off work outside the scope.

```
node scripts/cleaning.mjs add-extra <site> --description="..." --price=<amount> --actor="<name>"
```

## add-site

Add a site, or a prospect to price (--prospect).

```
node scripts/cleaning.mjs add-site --code=<CODE> --name="<name>" --client=<client> --region=NZ|NSW|VIC|QLD|SA|WA|TAS|ACT|NT --fee=<monthly fee> [--hours=<priced hours a week>] [--sector=office|education|medical|retail|industrial|hospitality|residential] [--area=<m2>] [--days=5] [--start=YYYY-MM-DD] [--end=YYYY-MM-DD] [--vetting] [--induction=no] [--instructions="..."] [--prospect] --actor="<name>"
```

## add-supplies

Record consumables delivered to a site, recharged to the client unless --recharge=no.

```
node scripts/cleaning.mjs add-supplies <site> --item="..." --qty=<n> --unit=<price each> [--recharge=no] [--date=YYYY-MM-DD] --actor="<name>"
```

## add-task

Add or change a line in a site's scope of works.

```
node scripts/cleaning.mjs add-task <site> --area="<area>" --task="<task>" --every=daily|weekly|fortnightly|monthly|quarterly|six-monthly|annual [--minutes=<per clean>] [--last=YYYY-MM-DD] --actor="<name>"
```

## add-visit

Add visits: one, or the same time on chosen days for a number of weeks. With a cleaner, every visit is checked first.

```
node scripts/cleaning.mjs add-visit <site> --start="YYYY-MM-DD HH:MM" --hours=<n> [--cleaner=<cleaner>] [--repeat=<weeks> --days=1,2,3,4,5] [--override="<reason>"] [--note="..."] --actor="<name>"
```

## approve-extra

Record the client's yes to an extra.

```
node scripts/cleaning.mjs approve-extra <X-ref> --by="<who said yes>" [--date=YYYY-MM-DD] --actor="<name>"
```

## attention

Show what needs a person today: open visits, visits rostered under the award, double bookings, contract terms and house rules broken, no clock-in, notifiable events not reported, complaints with no reply, contract changes and the cleaners' right to transfer, keys held by leavers, failed inspections, late faults, inspections and periodicals due, hours against the price, overdue invoices and unbilled work.

```
node scripts/cleaning.mjs attention
```

## cancel

Cancel a visit.

```
node scripts/cleaning.mjs cancel <visit> --reason="..." --actor="<name>"
```

## changes

Sites changing hands: losing to another contractor or winning from one, the date, the New Zealand notice date for the cleaners' right to transfer, and where each stands.

```
node scripts/cleaning.mjs changes
```

## check

Check one visit, or one visit with a different cleaner on it, against every rule. Changes nothing.

```
node scripts/cleaning.mjs check <visit> [--cleaner=<cleaner>]
```

## cleaner-status

A cleaner goes on leave, comes back, or leaves. Lists the visits that need someone else and the keys to collect.

```
node scripts/cleaning.mjs cleaner-status <cleaner> --status=active|on-leave|left [--date=YYYY-MM-DD] [--reason="..."] --actor="<name>"
```

## cleaner

One cleaner: details, keys held, and their visits for the last 14 days and next 7.

```
node scripts/cleaning.mjs cleaner <cleaner>
```

## cleaners

Every cleaner with employment type, award level, status, police vet date, the sites they are inducted at and keys held.

```
node scripts/cleaning.mjs cleaners
```

## clock-in

Clock a cleaner in. Refuses a cleaner who is on leave, has left or is elsewhere, and an unvetted cleaner on a vetting site unless the visit carries an override. Warns if the visit is under the award minimum.

```
node scripts/cleaning.mjs clock-in <visit> [--at="YYYY-MM-DD HH:MM"] --actor="<name>"
```

## clock-out

Clock a cleaner out.

```
node scripts/cleaning.mjs clock-out <visit> [--at="YYYY-MM-DD HH:MM"] --actor="<name>"
```

## close-incident

Close an incident. Refuses until the client is told and, for a notifiable event, the regulator.

```
node scripts/cleaning.mjs close-incident <INC-ref> --outcome="..." --actor="<name>"
```

## complaints

Open complaints, newest first, with hours to reply and where each stands. --all adds the resolved ones.

```
node scripts/cleaning.mjs complaints [--all]
```

## contract-change

A site changes hands: we are losing it to another contractor or winning it from one. For a New Zealand site we are losing, gives the date the cleaners must be told of their right to transfer.

```
node scripts/cleaning.mjs contract-change <site> --direction=losing|winning --other="<contractor>" --date=YYYY-MM-DD [--note="..."] --actor="<name>"
```

## cover

Who can take a visit: every active cleaner in the same country checked against the award, double bookings, police vetting, site induction and weekly hours. Cleaners who know the site first, then fewest hours. Changes nothing.

```
node scripts/cleaning.mjs cover <visit>
```

## draft-client-report

A site's monthly cleaning report for the client: visits and hours, inspections, periodicals done and coming up, their requests. Written to drafts/.

```
node scripts/cleaning.mjs draft-client-report <site> [--from=YYYY-MM-DD] [--to=YYYY-MM-DD]
```

## draft-complaint-reply

A reply to a client complaint, written to drafts/.

```
node scripts/cleaning.mjs draft-complaint-reply <CMP-ref>
```

## draft-quote

A cleaning proposal for a site from its scope of works and the priced fee. Written to drafts/.

```
node scripts/cleaning.mjs draft-quote <site>
```

## draft-transfer-notice

For a New Zealand site we are losing: a notice to each cleaner of their right to elect to transfer to the incoming contractor (ERA 2000 s 69G, s 69I). Written to drafts/.

```
node scripts/cleaning.mjs draft-transfer-notice <site>
```

## export

Everything in one JSON file.

```
node scripts/cleaning.mjs export [--out=<file.json>]
```

## extra-done

Mark an extra done. It goes on the next invoice. Refuses an extra the client has not approved.

```
node scripts/cleaning.mjs extra-done <X-ref> [--date=YYYY-MM-DD] --actor="<name>"
```

## extras

One-off work outside the scope: quoted, approved, done, invoiced.

```
node scripts/cleaning.mjs extras
```

## fill

Put a cleaner on a visit. The award and double bookings refuse outright; a contract term (police vetting) or house rule (induction, weekly hours) refuses unless --override names the reason, which is logged.

```
node scripts/cleaning.mjs fill <visit> <cleaner> [--override="<reason>"] --actor="<name>"
```

## fix

Mark a fault fixed.

```
node scripts/cleaning.mjs fix <QA-ref> --item="<fault>" [--by="<name>"] [--date=YYYY-MM-DD] --actor="<name>"
```

## hours

Each site this week: the hours the price was built on, rostered, open and worked so far.

```
node scripts/cleaning.mjs hours
```

## import

Bring Swept data across from CSV: locations, then employees, then timesheets. Dry run first.

```
node scripts/cleaning.mjs import swept <file.csv> --kind=locations|employees|timesheets [--client=<client>] [--region=<region>] [--fee=<monthly fee>] [--map=<map.json>] [--dry-run] --actor="<name>"
```

## incidents

Every incident, newest first, with where it stands: regulator not notified, client not told, open, closed.

```
node scripts/cleaning.mjs incidents
```

## induct

Record a site induction.

```
node scripts/cleaning.mjs induct <cleaner> <site> [--date=YYYY-MM-DD] --actor="<name>"
```

## insights

The ten questions in the README, answered from the records today.

```
node scripts/cleaning.mjs insights
```

## inspect

Record a quality inspection: items checked and every fault ("Area: item; Area: item"). Scores it, sets a fix-by date for each fault.

```
node scripts/cleaning.mjs inspect <site> --checked=<n> [--faults="Area: item; Area: item"] [--with-client] [--by="<inspector>"] [--date=YYYY-MM-DD] --actor="<name>"
```

## inspection

One inspection and every fault it found, with fix-by dates.

```
node scripts/cleaning.mjs inspection <QA-ref>
```

## inspections

Every inspection, newest first, with its score and faults.

```
node scripts/cleaning.mjs inspections [--site=<site>]
```

## invoice-paid

Record a payment.

```
node scripts/cleaning.mjs invoice-paid <INV-ref> [--date=YYYY-MM-DD] --actor="<name>"
```

## invoice-sent

Record that an invoice went out.

```
node scripts/cleaning.mjs invoice-sent <INV-ref> [--date=YYYY-MM-DD] --actor="<name>"
```

## invoice

Raise a client's invoice: every site's monthly fee not yet billed up to the month, extras done and supplies to recharge, GST by country, never twice.

```
node scripts/cleaning.mjs invoice <client> [--month=YYYY-MM] --actor="<name>"
```

## invoices

Every invoice with where it stands: not sent, sent, overdue, paid.

```
node scripts/cleaning.mjs invoices
```

## issue-key

Issue a key, card, fob or alarm code to a cleaner.

```
node scripts/cleaning.mjs issue-key <site> <cleaner> --label="<label>" [--kind=key|card|fob|alarm-code] [--date=YYYY-MM-DD] --actor="<name>"
```

## keys

The key and access register: every key, card, fob and alarm code, who holds it, and whether that person has left.

```
node scripts/cleaning.mjs keys
```

## log-complaint

Log a client complaint or request. Links it to a missed visit at the site in the last 48 hours, and says when the reply is due.

```
node scripts/cleaning.mjs log-complaint --site=<site> --summary="..." [--from="<name>"] [--category=missed-clean|quality|supplies|damage|security|conduct|other] [--at="YYYY-MM-DD HH:MM"] --actor="<name>"
```

## log-incident

Log an incident. A notifiable event points straight at WorkSafe or the state regulator.

```
node scripts/cleaning.mjs log-incident --site=<site> --at="YYYY-MM-DD HH:MM" --kind=slip-trip-fall|chemical|sharps|manual-handling|property-damage|security|other --summary="..." [--cleaner=<cleaner>] [--injury] [--notifiable] --actor="<name>"
```

## log

Add a note to the activity log against a site, cleaner, visit or complaint.

```
node scripts/cleaning.mjs log <ref> --note="..." --actor="<name>"
```

## margins

Each site's margin over the last 28 days: the fee earned against the hours worked at each cleaner's rate plus on-costs. Thinnest first.

```
node scripts/cleaning.mjs margins
```

## missed

The cleaner did not turn up: mark the visit missed and open a cover visit for what is left.

```
node scripts/cleaning.mjs missed <visit> [--note="..."] --actor="<name>"
```

## notify-client

Record that the client has been told about an incident.

```
node scripts/cleaning.mjs notify-client <INC-ref> [--at="YYYY-MM-DD HH:MM"] [--note="..."] --actor="<name>"
```

## notify-regulator

Record the regulator notification and its reference.

```
node scripts/cleaning.mjs notify-regulator <INC-ref> --reference=<ref> [--at="YYYY-MM-DD HH:MM"] --actor="<name>"
```

## open-visits

Visits with nobody on them in the next 14 days (or --days).

```
node scripts/cleaning.mjs open-visits [--days=14]
```

## periodic-done

Record a periodical as done; the next due date moves on.

```
node scripts/cleaning.mjs periodic-done <site> --task="<task>" [--date=YYYY-MM-DD] [--cleaner=<cleaner>] [--note="..."] --actor="<name>"
```

## periodicals

Monthly, quarterly, six-monthly and annual work: when each was last done, when it is due, how late it is.

```
node scripts/cleaning.mjs periodicals [--site=<site>]
```

## price

Price a site from its scope of works: weekly hours, labour a month and the monthly fee at the target margin. Works on a prospect too.

```
node scripts/cleaning.mjs price <site>
```

## quality

Every site's last inspection, score, 90-day average, open faults and complaints.

```
node scripts/cleaning.mjs quality
```

## resolve

Close a complaint with what was done. Refuses until the client has had a reply.

```
node scripts/cleaning.mjs resolve <CMP-ref> --outcome="..." --actor="<name>"
```

## respond

Record that the client has had a reply.

```
node scripts/cleaning.mjs respond <CMP-ref> [--at="YYYY-MM-DD HH:MM"] [--note="..."] --actor="<name>"
```

## return-key

A key comes back to the office.

```
node scripts/cleaning.mjs return-key <site> --label="<label>" --actor="<name>"
```

## roster

The visits for the next 7 days (or --days), every visit with its cleaner and anything wrong with it.

```
node scripts/cleaning.mjs roster [--days=7] [--from=YYYY-MM-DD] [--site=<site>] [--cleaner=<cleaner>]
```

## set

Change a house rule or default (pass mark, fix-by days, reply hours, weekly hours, on-costs, quote margin, award rates).

```
node scripts/cleaning.mjs set <key> <value> --actor="<name>"
```

## site

One site: the contract, this week's hours, quality, the scope of works, the team inducted there and its keys.

```
node scripts/cleaning.mjs site <site>
```

## sites

Every site with its client, fee, priced hours, contract dates and whether it needs police vetting.

```
node scripts/cleaning.mjs sites
```

## told-cleaners

Record that the cleaners on a site we are losing were told of their right to transfer. Sets the election date 10 working days on (s 69G) unless --elect-by says otherwise.

```
node scripts/cleaning.mjs told-cleaners <site> [--date=YYYY-MM-DD] [--elect-by=YYYY-MM-DD] --actor="<name>"
```

## transfer-info

Record the transfer information given to the incoming contractor, or received from the outgoing one.

```
node scripts/cleaning.mjs transfer-info <site> [--date=YYYY-MM-DD] --actor="<name>"
```

## unassign

Take a cleaner off a visit and open it again.

```
node scripts/cleaning.mjs unassign <visit> --reason="..." --actor="<name>"
```

## unbilled

Everything earned and not on an invoice: monthly fees, extras done, supplies to recharge.

```
node scripts/cleaning.mjs unbilled [<client>]
```

## vet

Record a police vet on file.

```
node scripts/cleaning.mjs vet <cleaner> [--date=YYYY-MM-DD] [--reference=<ref>] --actor="<name>"
```

## weekly-review

The Monday review, written to drafts/: the law and the award, open visits, clients, contract changes, hours against price, thinnest margins and money, then the whole attention list.

```
node scripts/cleaning.mjs weekly-review
```
