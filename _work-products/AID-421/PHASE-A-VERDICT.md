# AID-421 — Fase (a): GO/NO-GO pré-merge PR #195 (corrida de fase AID-416)

**Veredito: GO** (2026-08-30, QA Lead — verificação independente)

## Alvo
- PR #195 `aid-416/fix-pipeline-phase-race` → `main`, head `8d10161b013cdc09387695e246403feb0f14892a` (1 commit, 1 arquivo, +4/−3, só `tests/chapter-continuity.smoke.spec.ts`).
- Worktree QA isolada `/paperclip/tmp/aid412-qa/wt` (zero contato com o workspace canânico; HEAD = 8d10161b, árvore limpa; base 72130c6d é ancestral).

## Método e resultados

### 1. Reprodução pré-fix (conteúdo do spec @72130c6d, produto idêntico ao do PR)
`npx playwright test --project=desktop-1280 tests/chapter-continuity.smoke.spec.ts` ×6:
- **4/6 falhas**, todas `Expected: "briefing" / Received: "predicting"` (timeout 5000ms no predicate) — corrida confirmada de forma independente e MAIS severa que o 2/6 do produtor (AID-412).
- Logs: `prefix/run1..6.log` (runs 3–6 falham).

### 2. Critério de aceite no head do fix (8d10161b)
`npm run test:readiness` ×6: **6/6 rc=0** — cada run com `test:smoke:pilot` 4 passed + desktop-1280 5 passed (incl. `chapter-continuity … preserves completed first-release missions across switches and reloads`) + readiness-report OK.
- Logs: `postfix/run1..6.log`.

### 3. Sonda de instrumentação (prova de cobertura do ramo da corrida)
Cópia temporária do spec com log da fase no primeiro poll bem-sucedido (produto inalterado; arquivo removido após) ×6:
- `phase=briefing` 3/6; **`phase=predicting` 3/6 — todos 6/6 passed**.
- Ou seja: os runs em que o poll observou `predicting` (exatamente os que falhariam pré-fix) passam com o fix. Não é verde por sorte de timing.
- Logs: `probe/probe_run1..6.log`.

### 4. Inspeção do guard (tests/chapter-continuity.smoke.spec.ts @8d10161b)
- L116: poll retorna `phase === 'briefing' || phase === 'predicting'` → `.toBe(true)` — aceita as duas fases.
- L129: `if (hook.game.snapshot.phase === 'briefing') hook.game.start()` — `start()` só se ainda `briefing`, espelhando o guard do launch hospedado (`game-06-pipeline-plant/src/main.ts`).

### 5. CI do head 8d10161b
Check-runs: todos `success` (Python shared, curriculum Node/Rust, codexDojo TS, miniTown, minimaxDojo, openclaw, aiDevschoolMvp, supervisor) + 1 `skipped` legítimo (matriz pixelDojo games TS).

## Observação de infra (não é defeito do produto)
O `.npmrc` global do sandbox QA tem `omit=dev`; o `npm ci` interno de `scripts/bundle-missions.mjs` instalava só 5/257 pacotes em `engines/literacyDojo` e o `build:pilot` quebrava (`@vitejs/plugin-react` ausente). Contornado com `npm_config_include=dev` nos runs da QA. CI do repo não sofre disso (verde). Registrar para futuras worktrees QA.

## Scripts
`scripts/prefix-run6.sh`, `scripts/postfix-run6.sh` (reexecutáveis; exportam `PATH=/paperclip/tmp/bin` + `npm_config_include=dev`).
