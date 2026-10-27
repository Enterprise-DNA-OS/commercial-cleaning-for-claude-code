---
description: "Close a complaint with what was done. Refuses until the client has had a reply."
---

# resolve

Close a complaint with what was done. Refuses until the client has had a reply.

Run `node scripts/cleaning.mjs resolve <CMP-ref> --outcome="..." --actor="<name>"`. Add `--json` when you need every field. Resolve the site, cleaner, visit or client by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.
