---
description: "Record a payment."
---

# invoice-paid

Record a payment.

Run `node scripts/cleaning.mjs invoice-paid <INV-ref> [--date=YYYY-MM-DD] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
