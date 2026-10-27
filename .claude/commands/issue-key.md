---
description: "Issue a key, card, fob or alarm code to a cleaner."
---

# issue-key

Issue a key, card, fob or alarm code to a cleaner.

Run `node scripts/cleaning.mjs issue-key <site> <cleaner> --label="<label>" [--kind=key|card|fob|alarm-code] [--date=YYYY-MM-DD] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
