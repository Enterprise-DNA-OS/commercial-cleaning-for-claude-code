---
description: "Record the transfer information given to the incoming contractor, or received from the outgoing one."
---

# transfer-info

Record the transfer information given to the incoming contractor, or received from the outgoing one.

Run `node scripts/cleaning.mjs transfer-info <site> [--date=YYYY-MM-DD] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
