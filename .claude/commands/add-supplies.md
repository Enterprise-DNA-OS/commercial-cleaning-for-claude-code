---
description: "Record consumables delivered to a site, recharged to the client unless --recharge=no."
---

# add-supplies

Record consumables delivered to a site, recharged to the client unless --recharge=no.

Run `node scripts/cleaning.mjs add-supplies <site> --item="..." --qty=<n> --unit=<price each> [--recharge=no] [--date=YYYY-MM-DD] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
