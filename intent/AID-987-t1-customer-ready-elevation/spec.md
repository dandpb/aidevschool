# Spec — AID-987/T1 (derivação executável da spec aceita AID-981 §2/§9-T1)

Status: **approved** (fonte: proposal AID-981 rev `2d4e447d`, aceita pelo CEO
no dictame AID-986; este arquivo deriva o COMO executável sem alterar o QUÊ).

## 1. Cenários continuity (critério `customer-ready`, policy v1)

| Cenário | Use case | startState | steps | assertions (playwright/observation) |
| --- | --- | --- | --- | --- |
| `dojotoday-returning-next-day` | dojotoday-daily-guidance | returning-device-next-day (projeção gerada dia N+1) | reopen-daily-view, verify-updated-due-review-queue, verify-streak-reconciled, verify-active-unit-consistent, follow-next-action | `schedule-updates-across-days` (playwright, high) · `learner-understands-no-eval-carryover` (observation, high) |
| `voxel-standalone-return-reentry` | voxel-standalone-learning-loop | completed-loop-then-closed-game | reopen-declared-game, verify-deterministic-restart, locate-or-reexport-evidence-handoff, continue-next-declared-game, identify-verifier-handoff | `reentry-is-deterministic-and-uncorrupted` (playwright, high) · `no-false-mastery-on-return` (observation, high) |
| `pixelquest-returning-evidence-handoff` | pixelquest-evidence-encounter | saved-evidence-artifact-then-closed-app | reopen-pixelquest, replay-encounter, verify-reemitted-evidence-matches-saved-artifact-core, verify-saved-artifact-remains-valid, identify-verifier-handoff | `return-replay-is-deterministic-and-artifact-uncorrupted` (playwright, high) · `no-false-mastery-on-return` (observation, high) |

Honestidade contratada (spec §2.2 nota): evidência voxel/pixelquest é
session-bound (janela + console); a continuidade É a reentrada determinística
+ integridade do artifact salvo pelo learner. Nenhuma persistência inventada.

## 2. Automação

- **dojoToday**: harness 2-builds via seam de teste mínima — fixtures
  `playwright/fixtures/today.day-n.ts` / `today.day-n-plus-1.ts` (tipados
  `TodaySnapshot`), alias de build controlado por env
  `DOJOTODAY_TODAY_MODULE` no `vite.config.ts` (default: sem alias →
  comportamento inalterado), 2 webServers extra (5181/5182) no
  `playwright.config.ts`, spec `playwright/continuity.spec.ts` que abre o
  dia N, reabre o dia N+1 no MESMO contexto e verifica fila FSRS/streak/
  unidade ativa atualizadas sem estado falso. `src/data/today.ts` (gerado)
  não é tocado.
- **voxel**: extensão de `game-02-warehouse/playwright/warehouse.spec.ts`
  (pacote de referência): completar L1 → reload → reinício determinístico
  (briefing L1, fila de evidência zerada = sem estado corrompido/ressuscitado)
  → replay L1 → novo registro com núcleo determinístico idêntico e attemptId
  novo. Catalog-wide permanece no smoke happy-path (R3 da spec).
- **pixelquest**: spec nova `playwright/returning.spec.ts` no pixel-quest:
  encontro rate-limiter → artifact salvo (canal .logs/evidence.ndjson +
  janela) → reload → replay → núcleo determinístico idêntico + artifact salvo
  permanece válido/identificável; sem false mastery (copy do HUD).

## 3. T1b telemetria anônima (D3 = ligar)

Envelope **v3** no coletor AID-913 (mesmo endpoint
`/__dojo/bridge/v1/analytics`, mesmo guard same-origin, mesma retenção/
export/prune; batch ≤100 eventos, ≤64KiB):

- `{schemaVersion: 3, source: "dojotoday"|"voxeldojo"|"pixelquest", events:[…]}`
- evento flat `{schemaVersion: 3, source, event, eventId (uuid), sessionId
  (uuid por page-load, só memória), occurredAt, props}` — zero PII, zero
  identificação de aprendiz, zero persistência de identidade.
- Vocabulário FECHADO por evento:
  - `daily-view-open` props `{}`
  - `voxel-loop-complete` props `{unitId, result: completed|failed}`
  - `pixelquest-encounter-complete` props `{unitId, result: completed|failed}`
  - `evidence-handoff` props `{unitId}` — dispara SOMENTE no handoff real
    (registro encaminhado ao host_OS), não na mera emissão local.
- Emissão: módulo compartilhado `engines/shared/teaching-evidence/
  funnelTelemetry.ts` (micro-batcher best-effort, fetch keepalive +
  sendBeacon no page-hide; falha de rede é silenciosa por design).
  - dojoToday: `daily-view-open` no boot standalone (modo `?host=os` fica
    fora para não duplo-contar com o funil do OS).
  - voxel (todos os jogos, via `dualEmit` channel `voxeldojo`) e pixelquest
    (channel `pixelquest`): `*-complete` na emissão de evidência;
    `evidence-handoff` no encaminhamento ao host.
- Coletor: validação v3 fail-closed + derivação de source no Blobs
  (`<source>/<day>/<eventId>`); testes node:test novos
  (`dojo_analytics_collector_v3.test.mjs`) + extensão do teste de
  superfícies autorizadas (2 netlify.toml novos).

## 4. D2-A rotas estáticas mínimas

- `engines/dojoToday/netlify.toml`: + `functions` (canônico
  `learner/gate/netlify-functions`, precedente literacyDojo), redirect do
  coletor ANTES do fallback, `VITE_ANALYTICS_ENDPOINT` same-origin, e
  `VITE_DOJOTODAY_DEMO_NOTICE` → banner honesto de projeção de demonstração
  (mitigação R2 da spec; só no build deployado, default local inalterado).
- `engines/voxelDojo/game-02-warehouse/netlify.toml` (NOVO): build estático
  do jogo de referência + functions do coletor + redirect (roteável a partir
  da rota declarada no inventário).
- Rotas declaradas no `inventory.yaml` (entry invalidante → regrant v34 no
  mesmo pacote, propriedade do countersign QA AID-988):
  - dojotoday: `https://aidevschool-dojotoday.netlify.app/`
  - voxel (referência): `https://aidevschool-voxel-warehouse.netlify.app/`
  - pixelquest: permanece app local (fora do D2-A desta onda).
- O deploy live (criar site/`netlify deploy --prod`) é founder/CEO —
  single-writer, janela entre sessões O1; este PR entrega tudo deploy-ready.

## 5. Inventário

- `intendedTier: customer-ready` nos 3 use cases + `scenarioIds` += cenário
  continuity + `sourcePaths` += arquivos novos; `cli.py render` regenera a
  matriz (coluna Intended muda; Granted segue v33 até o regrant v34 do QA —
  estado intermediário honesto, tolerado pelo `enforce` com candidate report).
- Scripts `readiness-report.mjs` dos 3 engines listam os cenários novos
  (fatos de produtor no aggregate do CI).

## 6. Verificação (desta sessão)

1. `node --test` coletor v3 + v2 + activation surfaces + packaging (regressão).
2. Testes do módulo compartilhado (node:test via runner do pacote host onde
   aplicável + suítes vitest dos engines).
3. `npm run lint` + `npm run test:readiness` (dojoToday, agora com a spec
   continuity nos 2 servers de fixture).
4. `pnpm run smoke` no game-02-warehouse (spec re-entry) e no pixel-quest
   (spec retorno).
5. `python3 docs/product-readiness/tools/cli.py check` (sem DRIFT) +
   `python3 -m pytest docs/product-readiness/tests -q`.

## 7. Riscos

- **R-seam**: o alias de teste no vite.config é env-gated (default off) —
  builds normais não mudam; selfcheck do substrato continua lendo o
  `today.ts` canônico.
- **R-duplo-funil**: eventos v3 do jogo hospedado no OS coexistem com os
  eventos v1 do OS (funis distintos: engine × host) — sem identificação
  cruzada (sessionIds independentes).
- **R-CI**: novo cenário sem resultado promovido deixa a decisão publicada
  BLOCKADA por razão producer-only — tolerada pelo `enforce` (upstream do
  countersign T2), fecha no regrant v34.
