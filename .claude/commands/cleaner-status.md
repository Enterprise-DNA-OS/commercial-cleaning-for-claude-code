---
description: "A cleaner goes on leave, comes back, or leaves. Lists the visits that need someone else and the keys to collect."
---

# cleaner-status

A cleaner goes on leave, comes back, or leaves. Lists the visits that need someone else and the keys to collect.

Run `node scripts/cleaning.mjs cleaner-status <cleaner> --status=active|on-leave|left [--date=YYYY-MM-DD] [--reason="..."] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Offer `/cover` for each visit and `/return-key` for each key.
