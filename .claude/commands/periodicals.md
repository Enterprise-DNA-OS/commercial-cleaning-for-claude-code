---
description: "Monthly, quarterly, six-monthly and annual work: when each was last done, when it is due, how late it is."
---

# periodicals

Monthly, quarterly, six-monthly and annual work: when each was last done, when it is due, how late it is.

Run `node scripts/cleaning.mjs periodicals [--site=<site>]`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Overdue first. Offer to book each into the roster with `/add-visit`.
