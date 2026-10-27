---
description: "The cleaner did not turn up: mark the visit missed and open a cover visit for what is left."
---

# missed

The cleaner did not turn up: mark the visit missed and open a cover visit for what is left.

Run `node scripts/cleaning.mjs missed <visit> [--note="..."] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Run `/cover` on the new visit straight away.
