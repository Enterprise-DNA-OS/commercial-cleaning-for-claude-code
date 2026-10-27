---
description: "Add visits: one, or the same time on chosen days for a number of weeks. With a cleaner, every visit is checked first."
---

# add-visit

Add visits: one, or the same time on chosen days for a number of weeks. With a cleaner, every visit is checked first.

Run `node scripts/cleaning.mjs add-visit <site> --start="YYYY-MM-DD HH:MM" --hours=<n> [--cleaner=<cleaner>] [--repeat=<weeks> --days=1,2,3,4,5] [--override="<reason>"] [--note="..."] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

If it refuses, say why and run `/cover` for an alternative. Never invent an override reason.
