---
description: "The visits for the next 7 days (or --days), every visit with its cleaner and anything wrong with it."
---

# roster

The visits for the next 7 days (or --days), every visit with its cleaner and anything wrong with it.

Run `node scripts/cleaning.mjs roster [--days=7] [--from=YYYY-MM-DD] [--site=<site>] [--cleaner=<cleaner>]`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Group by day. Put open visits and visits with problems first in each day.
