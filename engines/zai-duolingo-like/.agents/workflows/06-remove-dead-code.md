# 06 — Remove dead code safely

**Trigger:** deleting a route, response field, store field, dependency, component, or config file.

This repo's highest-yield maintenance habit: deletion backed by a zero-consumer grep, verified by the full bar, and recorded as a simplification note. It removed 3 unwired routes, 15+ dependencies, the whole shadcn catalog, and a store error channel without a single regression.

## Steps

1. **Prove zero consumers with grep** — and grep the *exact* symbol across the whole repo, not just obvious spots:
   ```bash
   grep -rn "<symbol-or-path>" src/ mini-services/ prisma/ e2e/ tests/
   ```
   The route audit once misjudged `leagueXp` as unread when it was consumed but untyped. When grep disagrees with your assumption, trust grep and re-check.
2. Delete in one pass (code + manifest entries + imports), not staged over days.
3. If removing dependencies, resync lockfiles in the same commit (`npm install` / `bun install` — `package-lock.json` and `bun.lock` are both tracked).
4. Verify: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, plus a manual smoke of the affected surface.
5. Write the simplification note ([workflow 10](10-write-agent-note.md)) stating what was given up and how zero-usage was proven.

## Verification

- Full bar green ([verify before done](02-verify-before-done.md)).
- The note records the grep evidence and any audit self-corrections (like `leagueXp`).

## Pitfalls

- Dead code that *claims a capability* (an error channel, "hidden" achievements) is worse than honest absence — readers hunt for the nonexistent consumer. Delete it first.
- UI optionality is recoverable on demand (`npx shadcn add dialog`); keeping an unused catalog costs two divergent styling systems.
- Unused deps invite future code to adopt ad-hoc libraries, creating two ways to do one thing. Removal must always trace back to the zero-importer grep.
- Never delete `worklog.md`, `.zscripts/`, or `Caddyfile` — institutional memory and deploy harness.

## Sources

- [remove-unwired-api-surface](../notes/implemented/simplification/2026-08-18-remove-unwired-api-surface.md)
- [remove-dead-client-fields-and-error-channel](../notes/implemented/simplification/2026-08-18-remove-dead-client-fields-and-error-channel.md)
- [prune-unused-template-dependencies](../notes/implemented/simplification/2026-08-18-prune-unused-template-dependencies.md)
- [drop-shadcn-ui-catalog](../notes/implemented/simplification/2026-08-18-drop-shadcn-ui-catalog.md)
