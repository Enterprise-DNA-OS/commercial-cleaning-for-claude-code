---
description: "Check one visit, or one visit with a different cleaner on it, against every rule. Changes nothing."
---

# check

Check one visit, or one visit with a different cleaner on it, against every rule. Changes nothing.

Run `node scripts/cleaning.mjs check <visit> [--cleaner=<cleaner>]`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Say whether the problem refuses outright (award, clash) or needs a reason (contract, house).
