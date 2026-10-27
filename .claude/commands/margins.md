---
description: "Each site's margin over the last 28 days: the fee earned against the hours worked at each cleaner's rate plus on-costs. Thinnest first."
---

# margins

Each site's margin over the last 28 days: the fee earned against the hours worked at each cleaner's rate plus on-costs. Thinnest first.

Run `node scripts/cleaning.mjs margins`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Say which sites lose money and why (hours over the price, or a fee that is too low). Offer `/price` to reprice from the scope.
