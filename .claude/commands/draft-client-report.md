---
description: "A site's monthly cleaning report for the client: visits and hours, inspections, periodicals done and coming up, their requests. Written to drafts/."
---

# draft-client-report

A site's monthly cleaning report for the client: visits and hours, inspections, periodicals done and coming up, their requests. Written to drafts/.

Run `node scripts/cleaning.mjs draft-client-report <site> [--from=YYYY-MM-DD] [--to=YYYY-MM-DD]`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Fill the bracketed lines from the records or ask. Never send it.
