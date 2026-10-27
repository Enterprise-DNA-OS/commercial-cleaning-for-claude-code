---
description: "Add or change a line in a site's scope of works."
---

# add-task

Add or change a line in a site's scope of works.

Run `node scripts/cleaning.mjs add-task <site> --area="<area>" --task="<task>" --every=daily|weekly|fortnightly|monthly|quarterly|six-monthly|annual [--minutes=<per clean>] [--last=YYYY-MM-DD] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
