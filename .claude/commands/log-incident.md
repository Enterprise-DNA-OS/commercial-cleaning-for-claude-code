---
description: "Log an incident. A notifiable event points straight at WorkSafe or the state regulator."
---

# log-incident

Log an incident. A notifiable event points straight at WorkSafe or the state regulator.

Run `node scripts/cleaning.mjs log-incident --site=<site> --at="YYYY-MM-DD HH:MM" --kind=slip-trip-fall|chemical|sharps|manual-handling|property-damage|security|other --summary="..." [--cleaner=<cleaner>] [--injury] [--notifiable] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

If it may be notifiable (death, a notifiable injury or illness, a dangerous incident), say so plainly and that the site must be left as it is. The operator decides and makes the notification.
