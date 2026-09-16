# Observation scripts — claims re-grant v88 (AID-2199)

Método da observação independente (assessorContext `independent-readiness-review`,
observerContext `independent-readiness-observer`) para os 9 use cases re-ancorados
sobre a main `fb4dbc77` (RE-GRANT v88, delegado de AID-2192; padrão AID-2153/#455,
AID-2174/#457 e AID-1357 fábrica PR #461):

- `literacy-standalone-first-lesson` — `literacy-happy-path`, `literacy-retry`, `literacy-resume`
- `literacy-standalone-corridor-mod01-03` — `literacy-corridor-happy-path`, `literacy-corridor-gate-retry`, `literacy-corridor-review-window` (+ 2 cenários playwright-only cobertos pelo snapshot de producer)
- `os-literacy-guided-mission` / `os-returning-learner` / `os-voxel-guided-missions` — 9 cenários os-*
- `dojotoday-daily-guidance` — `dojotoday-active-unit-guidance`, `dojotoday-returning-next-day`, `dojotoday-read-only-boundary`
- `pixelquest-evidence-encounter` — `pixelquest-encounter-evidence`, `pixelquest-returning-evidence-handoff`, `pixelquest-evidence-recovery`
- `voxel-standalone-learning-loop` — `voxel-standalone-loop`, `voxel-standalone-return-reentry`, `voxel-accessible-renderer`
- `minitown-explore-only` — `minitown-explore-only`

## Causa do drift (recibo AID-2192; reprodução first-hand)

PR #446 (merge `cce67949`, trailer `SDLC-ALLOW-TEST-EDIT: AID-2121`) editou 5 specs
playwright `engines/pixelDojo/pixel-quest/playwright/*.spec.ts` → digests de claims
registrados ficaram stale no lane main. Rounds da fábrica AID-1357 (#458 `50d31811`,
#459 `fb4dbc77`, 24 snapshots +684/−0 cada) carregam o snapshot de producer mas não
completam o re-grant: falta observação independente (`regrant --propose` exit 3).
Repro first-hand na main `fb4dbc77`: `cli.py check --require-current` → rc=1,
STALE-WINDOW `pixelquest-evidence-encounter`; `product readiness (claims)` RED no
push-run 35145136858 (job 104960941856) com 9 use cases `blocked` por
`lacks independent evidence` / `missing promoted result`.

## Método da re-conferência (não é re-escrita de nota antiga)

1. Partida: bundles de observação mais recentes por cenário — v83 (`8eb0ada0`),
   v84 (`242dbb7c`), v82 (`ef414d4a`), v75 (`79d6a676`), v50 (`89040bec`) — cada
   nota re-conferida cita arquivo:linha.
2. Verificação mecânica first-hand na árvore `fb4dbc77`: para cada citação
   `arquivo:linha` das notas de partida, o conteúdo da linha no bundle original foi
   comparado com o conteúdo da mesma linha em `fb4dbc77` — 55/55 citações não-vazias
   idênticas na mesma linha (guias e fontes citadas não mudaram desde a árvore de
   cada observação; `student-guide.md`/`facilitator-guide.md` inalterados desde v83).
3. Walks-baseados: `engines/literacyDojo/src` e `curriculum/ai-literacy/modules/01*`
   têm git diff vazio desde a árvore do walk v50 (`89040bec`) — as strings observadas
   no UI ("MISSÃO CONCLUÍDA", "Tentar novamente", rodapé de dispositivo) foram
   re-localizadas na árvore atual (ResultScreen.tsx:77, LessonScreen.tsx:435,
   OnboardingScreen.tsx:189, App.tsx:378).
4. PixelQuest pós-#446 (acentuação do microcopy PT-BR): strings re-conferidas na
   árvore atual — Hud.ts:181 "Evidência PASS emitida. O verificador decide mastery.",
   Hud.ts:84; emitter.ts:1-30 (contrato dual-emit/append-only) inalterado.
5. Cada nota v88 carrega: framing v88 + citações re-conferidas + proveniência da
   observação original (bundle, árvore) para trilha de auditoria.

## Producer gates (fato de CI, não re-executados localmente)

O snapshot de producer deste re-grant vem dos artefatos do push-run da main
`fb4dbc77` (run 35145136858): todos os 38 jobs de engine verdes no SHA exato
(literacyDojo, codexdojo-os, dojoToday, miniTown, pixelDojo, voxelDojo games,
curriculum…) — único RED é o próprio `product readiness (claims` (job 104960941856),
que é o defeito que este re-grant cura. A fábrica AID-1357 baixou esses artefatos
(`*-readiness-fb4dbc77`) e os agregou em `evidence/producers/2026-09-16-fb4dbc77-auto-regrant/`
(24 reports `executor: automated`, gitSha `fb4dbc77`); esta fase QA re-agrega com
`--observations` e promove via `regrant --propose` (exit 0 = escrita do assessment).

## Comandos (fluxo REGRANT-RUNBOOK)

```bash
python3 docs/product-readiness/tools/cli.py aggregate \
  --reports docs/product-readiness/evidence/producers/2026-09-16-fb4dbc77-auto-regrant \
  --observations docs/product-readiness/evidence/observations/2026-09-16-fb4dbc77-claims-regrant-v88 \
  --output /tmp/candidate-v88.json \
  --assessment-id 2026-09-16-fb4dbc77-auto-regrant \
  --verified-at 2026-09-16T21:10:00Z --revalidate-by 2026-10-16
python3 docs/product-readiness/tools/cli.py regrant --propose --input /tmp/candidate-v88.json
python3 docs/product-readiness/tools/cli.py check
python3 docs/product-readiness/tools/cli.py check --require-current
python3 docs/product-readiness/tools/cli.py enforce --reports docs/product-readiness/evidence/producers/2026-09-16-fb4dbc77-auto-regrant
python3 -m pytest docs/product-readiness/tests -q
```
