---
description: "Render the paperwork in documents.json as branded HTML in docs-out/: tax invoices, inspection reports, scopes of works, incident reports and key registers."
---

# documents

Run `npm run docs` for every document, `npm run docs -- <name>` for one type (invoice, inspection-report, scope-of-works, incident-report, key-register), or `npm run docs -- <name> <id-prefix>` for one record. The business name, logo and colours come from `brand.json`. Print to PDF from the browser. Nothing is sent from here.
