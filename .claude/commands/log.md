---
description: "Add a note to the activity log against a site, cleaner, visit or complaint."
---

# log

Add a note to the activity log against a site, cleaner, visit or complaint.

Run `node scripts/cleaning.mjs log <ref> --note="..." --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
