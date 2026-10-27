---
description: "Record a periodical as done; the next due date moves on."
---

# periodic-done

Record a periodical as done; the next due date moves on.

Run `node scripts/cleaning.mjs periodic-done <site> --task="<task>" [--date=YYYY-MM-DD] [--cleaner=<cleaner>] [--note="..."] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
