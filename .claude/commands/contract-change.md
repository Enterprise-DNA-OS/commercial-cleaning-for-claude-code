---
description: "A site changes hands: we are losing it to another contractor or winning it from one. For a New Zealand site we are losing, gives the date the cleaners must be told of their right to transfer."
---

# contract-change

A site changes hands: we are losing it to another contractor or winning it from one. For a New Zealand site we are losing, gives the date the cleaners must be told of their right to transfer.

Run `node scripts/cleaning.mjs contract-change <site> --direction=losing|winning --other="<contractor>" --date=YYYY-MM-DD [--note="..."] --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
