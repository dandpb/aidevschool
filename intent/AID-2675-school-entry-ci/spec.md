# Spec: CI by-name para school-entry

Change-id: AID-2675-school-entry-ci · From: intent/AID-2675-school-entry-ci/intent.md

## Contrato executado pelo job

| Comando (engine-local) | Suíte | Credencial externa | Evidência local (2026-09-26, Node v24.18.0) |
| --- | --- | --- | --- |
| `npm test` (`node --test tests/*.test.mjs`) | backend, concurrency, health, model, review-regressions — inclui checker Chromium real (C06) | não | 26 pass / 0 fail |
| `npm run test:browser` (`node --test tests/browser.spec.mjs`) | 7 specs contra o app real | não | 7 pass / 0 fail |
| `npm run check` (`node scripts/check.mjs`) | sintaxe de todos os módulos `server/ public/ scripts/ tests/` | não | 21 módulos OK |
| `npm run test:live` | 2 chamadas reais de inferência | **sim** (`TYPESAFE_API_KEY`) | fora do CI |

- Dependência única: `playwright@1.61.1` (lockfile commitado; `npm ci`).
- Chromium deve ser instalado **antes** de `npm test`: `health.test.mjs`
  casa o glob unitário e lança `chromium.launch()` (verificado first-hand:
  sem o browser certo, C06 falha com `false !== true`).
- Runtime: `node-version: 22` (setup-node resolve o último 22.x ≥ 22.13;
  Dockerfile da engine usa `node:22-bookworm-slim` — CI espelha a major de
  produção).

## Decisões

1. **Nome do contexto**: `school-entry (TS)` — segue o padrão dos jobs by-name
   de engine (`sdlc-quest (TS)`, `zai-duolingo-like (Next.js + Prisma)`).
2. **Sem artifact upload**: a engine não produz `test-results/` (node:test
   nativo, sem reporter de trace); nada para subir. Se futuramente adotar
   traces Playwright, o upload entra em PR próprio.
3. **Required check**: contexto entra na branch protection do `main` após o
   PR reportá-lo (senão PRs abertos ficariam pendentes num contexto que não
   existe). Ação de admin no GitHub, registrada no task record.
4. **test:live fora do CI**: custo por chamada + segredo no runner sem
   necessidade — a fronteira "sem credencial externa" dos demais testes é o
   que permite o job rodar em todo PR.

## Fora de escopo (issue AID-2675 continua aberta)

- Publicação/hospedagem da URL pública (decisão de hosting pendente de
  aceite do founder — proposta em separado no carrier).
- Painel do operador em produção, checagem Chromium da entrada liberada em
  produção, `ENGINE_TARGETS_FILE` real.
