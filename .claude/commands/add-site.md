---
description: "Add a site, or a prospect to price (--prospect)."
---

# add-site

Add a site, or a prospect to price (--prospect).

Run `node scripts/cleaning.mjs add-site --code=<CODE> --name="<name>" --client=<client> --region=NZ|NSW|VIC|QLD|SA|WA|TAS|ACT|NT --fee=<monthly fee> [--hours=<priced hours a week>] [--sector=office|education|medical|retail|industrial|hospitality|residential] [--area=<m2>] [--days=5] [--start=YYYY-MM-DD] [--end=YYYY-MM-DD] [--vetting] [--induction=no] [--instructions="..."] [--prospect] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Record the floor area for an Australian site: it sets the award's minimum engagement.
