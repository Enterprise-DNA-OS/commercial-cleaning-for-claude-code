---
description: "Log a client complaint or request. Links it to a missed visit at the site in the last 48 hours, and says when the reply is due."
---

# log-complaint

Log a client complaint or request. Links it to a missed visit at the site in the last 48 hours, and says when the reply is due.

Run `node scripts/cleaning.mjs log-complaint --site=<site> --summary="..." [--from="<name>"] [--category=missed-clean|quality|supplies|damage|security|conduct|other] [--at="YYYY-MM-DD HH:MM"] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Then offer `/draft-complaint-reply`.
