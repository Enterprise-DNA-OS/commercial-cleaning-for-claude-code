---
description: "Bring Swept data across from CSV: locations, then employees, then timesheets. Dry run first."
---

# import

Bring Swept data across from CSV: locations, then employees, then timesheets. Dry run first.

Run `node scripts/cleaning.mjs import swept <file.csv> --kind=locations|employees|timesheets [--client=<client>] [--region=<region>] [--fee=<monthly fee>] [--map=<map.json>] [--dry-run] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Read `docs/replace-swept.md` first. Always run with --dry-run and show the counts before the real import.
