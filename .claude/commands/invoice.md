---
description: "Raise a client's invoice: every site's monthly fee not yet billed up to the month, extras done and supplies to recharge, GST by country, never twice."
---

# invoice

Raise a client's invoice: every site's monthly fee not yet billed up to the month, extras done and supplies to recharge, GST by country, never twice.

Run `node scripts/cleaning.mjs invoice <client> [--month=YYYY-MM] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Then `npm run docs -- invoice` to render it, the operator checks and sends it from their accounts system, then `/invoice-sent`.
