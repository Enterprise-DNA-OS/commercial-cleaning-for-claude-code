---
description: "Put a cleaner on a visit. The award and double bookings refuse outright; a contract term (police vetting) or house rule (induction, weekly hours) refuses unless --override names the reason, which is logged."
---

# fill

Put a cleaner on a visit. The award and double bookings refuse outright; a contract term (police vetting) or house rule (induction, weekly hours) refuses unless --override names the reason, which is logged.

Run `node scripts/cleaning.mjs fill <visit> <cleaner> [--override="<reason>"] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

If it refuses, run `/cover` and offer the best alternative.
