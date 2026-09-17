# 09 — Mini-service lifecycle

**Trigger:** adding, running, or debugging a service under `mini-services/` (today: `playground`, the AI chat backend).

Mini-services are standalone Bun processes discovered automatically by `.zscripts/dev.sh`: any subdirectory with a `package.json` containing a `dev` script gets `bun install` + `bun run dev` in the background, logging to `.zscripts/mini-service-<name>.log`.

## Steps

**Run an existing service standalone:**
```bash
cd mini-services/playground
bun install
bun run dev          # serves the playground LLM endpoint
```

**Add a new mini-service:**
1. `mkdir mini-services/<name>` with its own `package.json` (name, `private: true`, a `dev` script — that script is the discovery contract).
2. Keep its dependencies in its own manifest; add `/// <reference types="bun-types" />` for Bun APIs instead of new type deps.
3. Start it once standalone to verify, then let `.zscripts/dev.sh` own it in normal dev.
4. Wire the Next.js side through the existing proxy pattern (see how `src/app/api/playground/` talks to the playground service) and stub it in e2e with `page.route` — tests never hit the real LLM.

**Debug:**
- Read `.zscripts/mini-service-<name>.log` first; the dev script backgrounds the process, so crashes are silent in the main terminal.

## Verification

- The service answers health on `curl http://localhost:3001/health` (`{"ok":true,...}`) after `bun run dev` — the root path `/` is 404 by design; only `/health` (GET) and `/chat` (POST) exist.
- `npm run test:e2e` stays green with the LLM stubbed — proof the app tolerates the service boundary.

## Pitfalls

- Dependencies were deliberately pruned so the SDK (`z-ai-web-dev-sdk`) lives only in the mini-service manifest, not the root `package.json`. Do not hoist it.
- A missing `dev` script means the service is silently skipped by dev.sh — check the log line `No dev script found, skipping...` before assuming it started.
- Deploy packaging (`mini-services-*.sh`, `Caddyfile`) mirrors this layout; keep services self-contained so that harness keeps working.

## Sources

- [prune-unused-template-dependencies](../notes/implemented/simplification/2026-08-18-prune-unused-template-dependencies.md)
- [playwright-e2e-suite](../notes/implemented/process/2026-08-18-playwright-e2e-suite.md)
