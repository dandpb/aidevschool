# Agent Note: Remove sandbox-template leftovers and committed dev artifacts

Status: implemented

> Shipped 2026-08-18. All listed paths deleted (`examples/`, `dev-shots/`, `workflows/`, `download/`, `REPORT-PTC.md`, `.zscripts/dev.pid`, `tailwind.config.ts`); `db/custom.db` untracked via `git rm --cached`; `.gitignore` gained `db/*.db`, `!db/.gitkeep`, `*.pid`; the `examples/**` ignore was removed from `eslint.config.mjs`. The `tests/` path was subsequently reused for the real vitest suite (see `tests/unit/`, `tests/api/`), replacing the deleted sandbox-pipeline scripts. `tailwindcss-animate` left with the deleted v3 config as part of the dependency prune.

## Problem

The repo was scaffolded from the z.ai web-dev sandbox template and still carries the template's support surface plus committed artifacts from the agent's own build sessions. None of it is imported by, served by, or referenced from the Next.js app (`src/`, `package.json`, `next.config.ts`). Consumer evidence per item:

| Item | Evidence | Disposition |
|---|---|---|
| `examples/websocket/` (socket.io chatroom demo, ports 3003) | Only repo reference is the `examples/**` entry in `eslint.config.mjs:47`; zero imports from `src/`; Caddyfile never references port 3003 | Delete both files; drop the eslint ignore entry |
| `tests/` (3 bash scripts) | They black-box test `.zscripts/database-runtime-build.sh` and `.zscripts/python-runtime-build.sh` — the sandbox's deploy pipeline. This app has zero Python sources and its dev DB is managed by `prisma db push`, so both the scripts and their tests exercise machinery this project never runs. No CI or package.json script invokes them | Delete all three |
| `download/README.md` | One-line placeholder ("Here are all the generated files."), directory otherwise empty; excluded from the deploy artifact by `.zscripts/python-runtime-build.sh` | Delete |
| `dev-shots/` (56 PNGs, ~22 MB) | Iteration screenshots (`qa4-home.png`, `home-improved.png`, …) from the build agent's visual QA loop. Tracked at HEAD; not under `public/` so never served; zero references | Delete the directory |
| `workflows/feature-loop/` | Untracked leftover of a DSH `workflow`-tool demo (`hearts.js` + tests + SPEC/PLAN). No repo reference to `workflows/` anywhere | Delete the directory |
| `REPORT-PTC.md` | Untracked one-off audit snapshot; already superseded by this note tree | Delete (or keep locally untracked — but don't commit it) |
| `.zscripts/dev.pid` | A tracked PID file containing `988` — a runtime artifact, stale the moment it was committed | Delete and add `*.pid` to `.gitignore` |
| `db/custom.db` (208 KB SQLite binary) | Tracked at HEAD and perpetually modified in the working tree; it is the live dev database (`.env:1` `DATABASE_URL=file:.../db/custom.db`) and is recreated from `prisma/schema.prisma` by `bun run db:push`. A committed binary database is guaranteed schema drift | `git rm --cached db/custom.db`; add `db/*.db` to `.gitignore` (keep `db/.gitkeep` so the path exists on fresh checkout) |
| `tailwind.config.ts` | Inert under Tailwind v4: `src/app/globals.css:1` uses `@import "tailwindcss"` with no `@config` directive, design tokens live in the CSS `@theme inline` block, and the file's `content` globs (`./pages/**`, `./components/**`, `./app/**`) don't even match this repo's `src/` layout. Its only live reference was the `tailwindcss-animate` plugin, superseded by `tw-animate-css` (`globals.css:2`) | Delete the file; the dependency removal is covered by [the dependency-prune note](2026-08-18-prune-unused-template-dependencies.md) |

Intentionally excluded:

- `worklog.md` (743 lines, tracked) — the build agent's session log and the only institutional memory of *why* decisions were made (bun instability, image-API rate limits, the Caddy gateway workaround). Keep until the project is declared done.
- `.zscripts/build.sh`, `dev.sh`, `start.sh`, `database-runtime-build.sh`, `python-runtime-build.sh`, the `mini-services-*.sh` trio, and `Caddyfile` — these are the sandbox's deploy/runtime harness, not app code. `start.sh` execs Caddy and the mini-services in production and `store.ts:461` depends on the Caddy `?XTransformPort=` gateway for the Playground. Deleting harness-owned scripts risks breaking the deployment for zero app-side gain.
- `start-services.sh` — the documented local dev entry (referenced 15× in `worklog.md`).

## Proposal

Delete the files listed above, `git rm --cached db/custom.db`, and update `.gitignore` with `db/*.db`, `!db/.gitkeep`, and `*.pid`. No source file changes are required beyond removing the `examples/**` ignore entry from `eslint.config.mjs`.

## Why not keep it?

Each item is either template boilerplate for machinery this app doesn't use (Python runtime, websocket demo), agent-session debris (screenshots, workflow demo, PID file), or a binary that fights version control (the SQLite DB). Together they account for ~22 MB of binary and a steady stream of working-tree noise (`git status` currently shows ~80 modified files, `db/custom.db` among them) that obscures real changes. The counterargument — "the sandbox might re-expose these" — is unpersuasive: the sandbox regenerates what it needs at deploy time, and `db:push` recreates the database from the schema.

## Acceptance criteria

- All listed paths are gone from the working tree and from `git ls-files`; `.gitignore` covers `db/*.db` and `*.pid`.
- `git status` no longer shows `db/custom.db` churn after a dev run.
- `npm run lint` passes (eslint ignore entry removed cleanly) and `next build` passes.
- Repo size on disk drops by ~22 MB.

## Risks

- **Fresh-checkout bootstrap**: with `db/custom.db` untracked, a fresh clone must run `bun run db:push` (and `prisma/seed.ts`) before the app has data. This is already the documented flow (`package.json` scripts) — add one line to the README/worklog if a fresh-clone path matters.
- **Losing the QA screenshots** deletes visual history; if that history matters, move 3-4 representative shots into `docs/` rather than keeping all 56.
