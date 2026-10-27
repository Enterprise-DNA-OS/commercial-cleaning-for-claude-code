---
description: "Record that the client has been told about an incident."
---

# notify-client

Record that the client has been told about an incident.

Run `node scripts/cleaning.mjs notify-client <INC-ref> [--at="YYYY-MM-DD HH:MM"] [--note="..."] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
