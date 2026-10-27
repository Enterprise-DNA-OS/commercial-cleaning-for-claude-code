---
description: "Record that the cleaners on a site we are losing were told of their right to transfer. Sets the election date 10 working days on (s 69G) unless --elect-by says otherwise."
---

# told-cleaners

Record that the cleaners on a site we are losing were told of their right to transfer. Sets the election date 10 working days on (s 69G) unless --elect-by says otherwise.

Run `node scripts/cleaning.mjs told-cleaners <site> [--date=YYYY-MM-DD] [--elect-by=YYYY-MM-DD] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
