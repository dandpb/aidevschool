# Verifier deep test — ae7918dd

**HEAD:** `ae7918dd5b644dd60f7a8049dbb7a6ac2253e7ec`  
**Date:** 2026-09-07T11:47Z (UTC)  
**Branch:** `cursor/verifier-deep-ae7918dd-c0b0`  
**Grant:** none (verifier-only run)

## Results

| Surface | Command | Result | Notes |
| --- | --- | --- | --- |
| LiteracyDojo | `npm ci && npx playwright install chromium && npm run test:e2e` | **PASS** | 15/15 Playwright tests; readiness artifacts reported |
| CodexDojo OS | `npm ci && npx playwright install chromium && npm run test:readiness` | **PASS** | pilot smoke 7/7 + readiness 5/5; bundled engine builds OK |
| PixelQuest (pixelDojo) | `pnpm install --frozen-lockfile && pnpm exec playwright install chromium && pnpm smoke` | **PASS** | 2/2 Playwright tests; readiness artifact reported |
| dojoToday | `npm ci && npm run selfcheck && npm test; npm run test:readiness` | **FAIL** | `selfcheck` aborts: `ModuleNotFoundError: No module named 'fsrs'` (repo-root Python dep; handbook expects `make install` / `pip install -e ".[dev]"`) |
| voxelDojo | `pnpm install --frozen-lockfile && pnpm exec playwright install chromium && pnpm smoke` | **PASS** | 16 game packages, all smoke suites green |
| miniTown (experimental) | `pnpm install --frozen-lockfile && pnpm exec playwright install chromium && pnpm smoke` | **PASS** | 1/1 Playwright test; readiness artifact reported |

## Summary

- **5 / 6 surfaces PASS**
- **1 / 6 surfaces FAIL** — dojoToday blocked before Playwright readiness by missing `fsrs` Python package at repo root

## Logs

- `literacyDojo.log`
- `codexdojo-os.log`
- `pixelDojo.log`
- `dojoToday.log`
- `voxelDojo.log`
- `miniTown.log`
