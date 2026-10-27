---
description: "Show what needs a person today: open visits, visits rostered under the award, double bookings, contract terms and house rules broken, no clock-in, notifiable events not reported, complaints with no reply, contract changes and the cleaners' right to transfer, keys held by leavers, failed inspections, late faults, inspections and periodicals due, hours against the price, overdue invoices and unbilled work."
---

# attention

Show what needs a person today: open visits, visits rostered under the award, double bookings, contract terms and house rules broken, no clock-in, notifiable events not reported, complaints with no reply, contract changes and the cleaners' right to transfer, keys held by leavers, failed inspections, late faults, inspections and periodicals due, hours against the price, overdue invoices and unbilled work.

Run `node scripts/cleaning.mjs attention`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Lead with the law and the award, then anything happening in the next 12 hours, then clients, then money. Suggest the one next step for each line (usually `/cover`, `/notify-regulator`, `/draft-complaint-reply` or `/draft-transfer-notice`).
