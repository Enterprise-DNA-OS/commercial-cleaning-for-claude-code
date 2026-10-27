---
description: "Record the regulator notification and its reference."
---

# notify-regulator

Record the regulator notification and its reference.

Run `node scripts/cleaning.mjs notify-regulator <INC-ref> --reference=<ref> [--at="YYYY-MM-DD HH:MM"] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Only after the operator has made the notification. Never invent a reference.
