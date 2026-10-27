# Rules and sources

The rules this system checks, where each comes from, what a breach looks like in the records, and which command finds it. `/compliance` runs them all. Rules were checked against the legislation and the award on 27 October 2026. Laws and award rates change: check the source before you rely on a rule, and update this file and the check together.

This is not legal advice. The software records and checks; the operator decides.

## Australia: Cleaning Services Award 2020 (MA000022)

Source: [awards.fairwork.gov.au/MA000022.html](https://awards.fairwork.gov.au/MA000022.html), rates from 1 July 2026.

| Rule | What a breach looks like | Where it is checked |
|---|---|---|
| **Minimum engagement, cl 13.5(c).** A part-time or casual cleaner is engaged for at least 1 hour (a sole cleaner at a stand-alone site of 300 m2 or less), 2 consecutive hours (up to 2,000 m2), 3 hours (2,000 to 5,000 m2) or 4 hours (5,000 m2 or more). | A part-time or casual visit at an Australian site shorter than the minimum for its floor area. A site with no floor area uses the `au_min_engagement_hours` setting (2). | `v_visit_problems` kind `award`. `/fill`, `/add-visit` refuse it; `/clock-in` warns. |
| **Minimum rates, cl 15.1 Table 2.** Level 1 $27.08, level 2 $27.97, level 3 $29.45 an hour (full-time adult, before the 15% part-time allowance in cl 10.2 and the 25% casual loading in cl 11.2). | An active cleaner working Australian sites whose base hourly rate is under the rate for their level. | `/compliance`. Rates are the `award_l1_cents` to `award_l3_cents` settings: update them each 1 July. |
| **Classification, Schedule A.** Every employee is classified at a level. | An active cleaner on Australian sites with no award level. | `/compliance`. |
| **Penalty rates, cl 20 Table 7.** Weekday shifts starting before 6.00 am or finishing after 6.00 pm, Saturdays, Sundays and public holidays attract penalty rates by employment type. | Not checked here: penalties are paid by your payroll. `/margins` costs labour at the base rate plus `on_cost_pct`, so set that to include your penalty mix. | Payroll. |

## New Zealand: Employment Relations Act 2000, Part 6A

Source: [legislation.govt.nz/act/public/2000/24](https://www.legislation.govt.nz/act/public/2000/24/en/latest/). Cleaning services are covered by Schedule 1A.

| Rule | What a breach looks like | Where it is checked |
|---|---|---|
| **Right to elect to transfer, s 69I.** When a cleaning contract changes hands, each cleaner on the work may elect to transfer to the incoming contractor on the same terms and conditions. | A losing contract change on a New Zealand site. | `/changes`, `/draft-transfer-notice`. |
| **Notice of the right, s 69G.** No later than 20 working days before the change, the employer gives each affected cleaner information about the right, enough to decide, and an election date. The default election date is 10 working days after the information is given. | `cleaners_told_on` empty after `tell_by` (20 working days before the change; public holidays are not taken out, so count them yourself). | `/attention`, `/compliance`. `/told-cleaners` sets the election date. |
| **Individualised transfer information, s 69OEA.** The outgoing employer gives the incoming one information about each transferring employee by the date the change takes effect. | `transfer_info_on` empty within 7 days of the change. | `/compliance`. Winning sites show it as information still to receive. |
| **Transfer costs information, ss 69OC to 69OE.** Disclosure to a prospective contractor or tenderer, aggregated and kept current. | Not tracked as a field: record it with `/log <site>`. | Activity log. |

## Health and safety, both countries

| Rule | Source | Where it is checked |
|---|---|---|
| **Notify a notifiable event as soon as possible**, by the fastest means. | [HSWA 2015](https://www.legislation.govt.nz/act/public/2015/70/en/latest/) s 56 (NZ, WorkSafe). [WHS Act 2011](https://www.legislation.gov.au/C2011A00137/latest/text) s 38 (AU, the state regulator). | `/attention`, `/compliance`. `/close-incident` refuses until it is recorded. |
| **Preserve the site** until an inspector says otherwise. | HSWA 2015 s 55 (NZ). WHS Act 2011 s 39 (AU). | `/log-incident` says so when an event is notifiable. |
| **Site induction before the first visit.** A house rule that carries out the duty of care. | HSWA 2015 s 36 (NZ). WHS Act 2011 s 19 (AU). | `v_visit_problems` kind `house`; needs an override reason. |

## Contract terms and house rules

These are your rules, not the law. Change them with `/set`.

| Setting | Default | What it checks |
|---|---|---|
| Site `vetting_required` | per site | Every cleaner on the site has a police vet on file no older than `vet_valid_years` (3). Refuses unless an override reason is logged. |
| `complaint_response_hours` | 4 | Hours to reply to a client complaint. |
| `inspect_every_days` | 30 | Days between quality inspections at an active site. |
| `pass_score_pct` | 85 | An inspection under this score is a fail. |
| `fix_within_days` | 2 | Days to fix a fault found at inspection. |
| `max_week_hours` | 50 | Most hours one cleaner works in a week. |
| Keys | | Every key, card and code back on a cleaner's last day. |
