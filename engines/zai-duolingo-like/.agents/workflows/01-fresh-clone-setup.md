# 01 — Fresh-clone setup

**Trigger:** first run on a new machine, a fresh clone, or a deleted/corrupt local database.

The SQLite dev database is never committed (`db/*.db` is gitignored; see [remove-template-leftovers](../notes/implemented/simplification/2026-08-18-remove-template-leftovers-and-dev-artifacts.md)). A fresh clone must recreate it from schema + seed.

## Steps

```bash
# 1. Install dependencies (bun is the package manager of record; bun.lock is tracked)
bun install

# 2. Point Prisma at the local dev database (no .env exists in the repo —
#    export it explicitly; relative file: URLs resolve against prisma/, so use an absolute path)
export DATABASE_URL="file:$(pwd)/db/custom.db"

# 3. Create the schema and load the curriculum
bun run db:push
bun prisma/seed.ts

# 4. Start the dev server (also auto-starts mini-services when using the script)
bun run dev            # Next.js on :3000
# or: ./.zscripts/dev.sh   # install + db:push + dev server + mini-services
```

## Verification

- `curl -fsS localhost:3000` returns the app shell.
- `curl -fsS localhost:3000/api/curriculum | head` returns modules with lessons.
- Seed output lists one `✓ Módulo:` line per module in `CURRICULUM` (9 modules / 26 lições today), plus the default learner and league rivals.

## Pitfalls

- `DATABASE_URL` must be absolute. Prisma resolves relative `file:` URLs against the schema directory, so `file:db/custom.db` silently creates `prisma/db/custom.db`.
- Do not commit the resulting `db/custom.db`. The `.gitignore` already excludes it — if git wants to track it, something regressed.
- Never edit `.zscripts/` or `Caddyfile` to work around local setup issues; they are the deploy harness.

## Sources

- [remove-template-leftovers-and-dev-artifacts](../notes/implemented/simplification/2026-08-18-remove-template-leftovers-and-dev-artifacts.md)
