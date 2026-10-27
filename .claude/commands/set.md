---
description: "Change a house rule or default (pass mark, fix-by days, reply hours, weekly hours, on-costs, quote margin, award rates)."
---

# set

Change a house rule or default (pass mark, fix-by days, reply hours, weekly hours, on-costs, quote margin, award rates).

Run `node scripts/cleaning.mjs set <key> <value> --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Run it with no valid key to list every setting.
