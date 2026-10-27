---
description: "Clock a cleaner in. Refuses a cleaner who is on leave, has left or is elsewhere, and an unvetted cleaner on a vetting site unless the visit carries an override. Warns if the visit is under the award minimum."
---

# clock-in

Clock a cleaner in. Refuses a cleaner who is on leave, has left or is elsewhere, and an unvetted cleaner on a vetting site unless the visit carries an override. Warns if the visit is under the award minimum.

Run `node scripts/cleaning.mjs clock-in <visit> [--at="YYYY-MM-DD HH:MM"] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
