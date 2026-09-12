# AID-412 — QA pós-promoção 72130c6d: verificação independente do catálogo 21 missões + re-grant de tier de readiness

**Verificador:** QA Lead (ca6a3f95), independente do produtor (FPE fa8130d5)
**Data (UTC):** 2026-08-30 · **Veredicto: GO nos dois bindings** (alias + permalink) · 102/102 checks remotos
**Re-grant:** v14 executado e proposto em **PR #193** (merge board-only pendente)

## Alvo verificado (produção vigente)

| Item | Declarado | Verificado |
| --- | --- | --- |
| Pin | `72130c6d7002fc03d2fccb6a1131d05f7bbab467` | ✅ manifest.sourceRevision == pin (alias E permalink) |
| Manifesto sha256 | `f81bfd07…8d04` | ✅ idêntico nos 2 bindings (fetch próprio) |
| Deploy | `6a946c865e010af1557561de` | ✅ permalink servindo o mesmo artefato do alias |
| Superfícies | 6 (incl. `/apps/pipeline-plant/`) | ✅ entry sha256 confere por superfície; 30/30 arquivos do inventário 200 |
| Ponte staged | `ce72a04f…` == canônica | ✅ comportamento == contrato canônico do pin (abaixo) |

## 1. Matriz de regressão remota (padrão AID-278/284) — 51/51 POR BINDING

Script próprio `qa-remote-matrix.mjs` (arquivado), executado 2× (alias, permalink), Chromium via Playwright.
Resultados brutos: `results-alias.json` / `results-permalink.json`; capturas: `map-21.png`, `l15-running.png`,
`map-locked-tiles.png`, `map-after-l15.png`, `l16-unlocked.png`, `game-06-running.png`, `game-06-verdict.png`,
`game-06-dom-fallback.png`.

- **Identidade**: A1–A13 PASS ×2 (manifesto, sourceRevision, 6 entry-sha, 3 requiredFiles literacy,
  30/30 inventário, pins same-origin embutidos, sem pin externo obsoleto, pixelDojo imutável,
  **21 `chapterOrder`**, l15/l16/l17/game-06 no catálogo publicado, literacy `2026-08-21.1`).
- **Ponte**: B1–B5 PASS ×2 — sessão 200 (token 43ch same-origin), 403 `origin-forbidden`, 401 sem token,
  contrato WAREHOUSE L1 fechado → **veredito PASS**; registro PIPELINE → veredito capturado (ver F1).
- **Jornadas ao vivo**: C1–C8 PASS ×2 — mapa **"21 missões, uma sequência"**; MOTOR running com iframe
  same-origin em l01, l14 (controles), **l15 (nova)**, **game-06 (nova)**, warehouse (controle);
  **cadeia de prereqs canônica ao vivo**: l16 bloqueada por l15 e l17 por l16 e game-06 por game-05
  (tiles "Bloqueada por pré-requisito"); observador completou **l15 pela UI hospedada** → dev:l15
  `completed` (indexedDB), **l16 destravou** ("Disponível"), l17 segue bloqueada; game-06 completada pela
  API pública do jogo (L1 determinística) → `completed` local; fallback DOM íntegro com motor bloqueado.

## 2. Verificador canônico `pipeline_evaluator.py` via ponte (escopo do issue)

- **Ponte canônica (Python, `learner/gate/teaching_game_bridge.py`) no pin**: 16/16 payloads do produtor
  PASS — KV WAREHOUSE, WORMHOLE, RELAY STATION e **PIPELINE PLANT L1–L4** (`pipeline_evaluator.py`
  registrado em `GAME_SPECS`).
- **Ponte staged de produção (Netlify)**: WAREHOUSE PASS; PIPELINE/WORMHOLE/RELAY → FAIL
  (`evidence identity is not the fixed WAREHOUSE L1 verifier contract`) — **F1** (abaixo).

## 3. Re-grant de tier de readiness (matriz canônica) — v14

Worktree QA próprio no pin (`/paperclip/tmp/aid412-qa/wt`, detached 72130c6d; `learner.substrate --check`
in sync):

- Cenários executáveis re-executados pela QA: `npm run test:readiness` — pilot **4/4** (incl. mount de
  PIPELINE PLANT) + chapter-continuity/renderer-fallback/readiness-recovery **5/5** (2ª execução; ver F2).
- Observações independentes ao vivo (2 bindings) registradas em
  `docs/product-readiness/evidence/observations/2026-08-30-os-catalog-live/`.
- `cli.py aggregate → assess → check` in sync. **Assessment `2026-08-30-72130c6d-os-catalog-v14`**:
  - `os-returning-learner`: **pass** · `customer-ready`
  - `os-voxel-guided-missions`: **pass** · `customer-ready`
  - `os-literacy-guided-mission`: **conditional-follow-up** · `customer-ready` (gap F1 dispositioned)
- Landing: branch `aid-412/readiness-v14` → **PR #193** (merge board-only pelo FPE; child issue criada).

## 4. Integridade do learner canônico — PASS

Antes == depois da janela QA (workspace compartilhado intocado pela verificação):
`learner/learning_state.yaml` `c3cae54c…` · `.mavis/learning_state.yaml` `a900918a…`.
Nenhum `mastered` alterado; progressos de missão gerados apenas em perfis de navegador descartáveis da QA.

## 5. GO/NO-GO por binding

| Binding | Veredicto | Base |
| --- | --- | --- |
| alias `aidevschool-codexdojo-os.netlify.app` | **GO** | 51/51; identidade/supply-chain íntegros; jornadas novas e controles verdes |
| permalink `6a946c865e010af1557561de--…` | **GO** | 51/51; byte-idêntico ao alias (manifesto + hashes por superfície) |

Nenhum bloqueio Sev 1/2 introduzido por 72130c6d. F1/F2/F3 são pré-existentes ou flakes de teste,
registrados como child issues.

## Achados (triagem)

- **F1 (médio, pré-existente, NÃO-regressão)**: a ponte staged de produção implementa só o avaliador
  WAREHOUSE L1 (sha `ce72a04f…` inalterado desde o pin AID-343). Evidência pipeline/wormhole/relay
  hospedada é rejeitada em produção com relato honesto ("Evidência rejeitada"; sem falsa aprovação; gate
  canônico intacto — a ponte canônica aprova 16/16). Child issue aberta (producer).
- **F2 (médio-baixo, defeito de SUITE, não de produto)**: corrida em `completePipeline`
  (chapter-continuity): em modo hospedado o launch do host chama `game.start()` (fonte:
  `game-06-pipeline-plant/src/main.ts` launch), então a fase já é `predicting` quando o spec polling espera
  `briefing`. Falhou na 1ª execução local (log arquivado), passou na 2ª; CI do pin passou. Reproduzido
  também em produção pela QA (fase `predicting` pós-handshake). Child issue aberta.
- **F3 (baixo, informativo)**: deep-link em missão bloqueada (ex.: `/mission/dev/l16` antes de l15)
  inicia a missão (MissionShell não trava rota direta; trava existe no hub/mapa). Padrão pré-existente
  em toda missão com prereq; progresso é local e não-autoritativo. Sem child issue (nota de cobertura).

## Limitações

- Wormhole/relay-station não foram individualmente dirigidos ao vivo nesta rodada (montagem coberta por
  manifesto/hashes 200 + suíte verde do produtor no pin).
- E2E completo dos jogos (todos os níveis L1–L4 por UI) não executado; game-06 concluída pela API pública
  determinística do jogo (mesmo contrato do spec canônico).
- Re-grant cobre os 3 use cases do OS escopados ao catálogo; demais use cases seguem `stale`
  (pré-existentes a esta promoção — literacy-standalone, pixelquest, voxel-standalone, minitown,
  dojotoday) e permanecem com revalidação em suas superfícies.
- Navegador: Chromium only; sem teste offline/PWA.

## Artefatos (esta pasta)

`qa-remote-matrix.mjs` · `results-{alias,permalink}.json` · capturas PNG (10) ·
`readiness-run1-race.log` · `readiness-run2-green.log` · observações e assessment em PR #193.
