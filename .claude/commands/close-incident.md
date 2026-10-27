---
description: "Close an incident. Refuses until the client is told and, for a notifiable event, the regulator."
---

# close-incident

Close an incident. Refuses until the client is told and, for a notifiable event, the regulator.

Run `node scripts/cleaning.mjs close-incident <INC-ref> --outcome="..." --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
