---
description: "Record a quality inspection: items checked and every fault (\"Area: item; Area: item\"). Scores it, sets a fix-by date for each fault."
---

# inspect

Record a quality inspection: items checked and every fault ("Area: item; Area: item"). Scores it, sets a fix-by date for each fault.

Run `node scripts/cleaning.mjs inspect <site> --checked=<n> [--faults="Area: item; Area: item"] [--with-client] [--by="<inspector>"] [--date=YYYY-MM-DD] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Say pass or fail and who should fix each fault.
