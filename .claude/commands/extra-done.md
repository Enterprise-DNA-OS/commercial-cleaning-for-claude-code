---
description: "Mark an extra done. It goes on the next invoice. Refuses an extra the client has not approved."
---

# extra-done

Mark an extra done. It goes on the next invoice. Refuses an extra the client has not approved.

Run `node scripts/cleaning.mjs extra-done <X-ref> [--date=YYYY-MM-DD] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
