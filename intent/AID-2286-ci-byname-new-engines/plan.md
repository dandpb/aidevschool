# Plan: CI by-name para engines sdlc-quest e zai-duolingo-like + gate .mjs no CI

Change-id: AID-2286-ci-byname-new-engines · From: intent/AID-2286-ci-byname-new-engines/spec.md · Status: approved

## Files that change

- `.github/workflows/ci.yml` — job `sdlc-quest` (novo), job
  `zai-duolingo-like` (novo), passo `node --test` + `setup-node` no job
  `learner`.
- `engines/zai-duolingo-like/package-lock.json` — resync (transitivas
  faltantes; `npm ci` volta a funcionar).
- `intent/AID-2286-ci-byname-new-engines/{intent,spec,plan}.md` (novos).

## Order of work

1. Verificação local pré-edit: gate .mjs (119 pass/0 fail/1 skip), sdlc-quest
   (`node tools/test.cjs` 323 pass), zai (`npm ci` → achado EUSAGE → resync
   lock → `prisma generate` → `verify` 125 pass → `build` standalone OK;
   e2e local bloqueado por colisão de porta 3100 — ver spec).
2. Editar `ci.yml` (jobs + passo), validar YAML.
3. `scripts/sdlc_guard_check.sh --base origin/main` (nenhum teste editado;
   guard deve passar limpo).
4. Commit → branch `aid-2286/ci-byname-sdlcquest-zai-gatemjs` → PR.
5. CI do PR é a prova de ponta a ponta (inclusive e2e zai, primeira execução
   dessas suítes em CI).
6. Countersign QA pré-merge (disciplina AID-2219 p/ PR de bot), depois merge.

## Risks

- e2e zai vermelho no CI por causa ambiente (primeira execução ever):fallback
  é diagnosticar no run; se for flake de infra, ajustar job; se for defeito
  real da engine, registrar e escalar (não enfraquecer o job).
- Bumps do resync do lockfile: mitigados pela verificação local completa
  contra o mesmo lock.
- Runner minutes: zai e2e adiciona ~5-8 min por PR — mesma ordem dos engines
  Playwright existentes.

## Proof

- `node --test learner/gate/tests/*.test.mjs` → 119 pass, 0 fail, 1 skipped
  (local, node 24; CI usa node 22 — mesmas APIs node:test).
- `cd engines/sdlc-quest && node tools/test.cjs` → 323 pass, 0 fail.
- `cd engines/zai-duolingo-like && npm ci && npx prisma generate && npm run
  verify` → vitest 125 pass + eslint clean + tsc clean;
  `DATABASE_URL=file:…/db/ci-build.db npm run build` → rc=0, standalone OK.
- PR CI: jobs `sdlc-quest (TS)`, `zai-duolingo-like (Next.js + Prisma)` e
  `Python (learner + curriculum shared)` verdes no head do PR.
