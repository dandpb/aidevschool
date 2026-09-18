# Observation scripts — claims re-grant v92 (AID-2339)

Método da observação independente (assessorContext `independent-readiness-review`,
observerContext `independent-readiness-observer`) para os 6 use cases re-ancorados
sobre a main `3aca4d5d` (RE-GRANT v92, AID-2339; padrão v88 AID-2199/#461,
v90 AID-2206 e AID-1357 fábrica PR #479):

- `literacy-standalone-first-lesson` — `literacy-happy-path`, `literacy-retry`, `literacy-resume`
- `literacy-standalone-corridor-mod01-03` — `literacy-corridor-happy-path`, `literacy-corridor-gate-retry`, `literacy-corridor-review-window` (+ 2 cenários playwright-only cobertos pelo snapshot de producer)
- `os-literacy-guided-mission` — `os-literacy-hosted-mission`, `os-verification-recovery`, `os-literacy-returning-device`
- `os-returning-learner` — `os-onboarding-track-choice`, `os-returning-recovery`, `os-returning-device`
- `os-voxel-guided-missions` — `os-voxel-hosted-missions`, `os-renderer-accessibility-recovery`, `os-voxel-returning-device`
- `dojotoday-daily-guidance` — `dojotoday-active-unit-guidance`, `dojotoday-returning-next-day`, `dojotoday-read-only-boundary` (cenário observation-only, sem report automatizado por design)

## Causa do drift (AID-2339; reprodução first-hand)

Fingerprints dos 6 grupos ficaram stale na main após os anchors v88 (`cabdc4a1`,
2026-09-16) e v90 (`15d69d50`, 2026-09-16):

- literacy/os-*: migração de vocabulário de analytics — `028382b4` (literacyDojo
  src/domain/analytics.ts + src/adapters/analyticsBatchSink.ts), `dcb08e72`
  (codexdojo-os-prototype src/analytics/events.ts), `a9403d38` (repair CI) —
  instrumentação; nenhum arquivo citado nas observações mudou.
- dojotoday: série de judgment no learner seam (`e17d98b6`, `52996b5b`, `11668331`,
  `1fef38ea`, `5e1aaa9c`, `2ed9746c`, `2096a0a7`, `44ab2b66`, `02e04320`,
  `076cebe4` em learner/substrate/*) + `55f6edb2` (PR #487, ARIA labels em
  engines/dojoToday/src/main.ts — diff label-only, citação main.ts:78-79 re-conferida).

A fábrica AID-1357 propôs o PR #479 (v91 @ `853c2943`, 14:51Z) mas a fase de
observação não foi concluída e a dedupe segurou os rounds seguintes (21:05/21:18Z);
além disso o anchor `853c2943` envelheceu para o grupo dojotoday (`55f6edb2` pós-anchor).
Este re-anchor corta da tip corrente (`3aca4d5d`) conforme REGRANT-RUNBOOK.md §Regra
de merge; o PR #479 é fechado com §recusa (anchor stale + superseded).

## Método da re-conferência (não é re-escrita de nota antiga)

1. Partida: bundles de observação mais recentes por cenário — v88 (`cabdc4a1`,
   literacy/os-*) e v90 (`15d69d50`, dojotoday) — com a proveniência original
   preservada em cada nota (v83/v84/v50/v75/v82 etc.).
2. Re-conferência first-hand na árvore `3aca4d5d` (2026-09-18):
   - guias citados inalterados desde os anchors (git log vazio para
     student-guide.md/facilitator-guide.md entre anchor e HEAD);
   - verificação mecânica arquivo:linha das citações (amostra 11/11 PASS —
     ver logs/first-hand-checks.log);
   - diff dos commits de drift lido first-hand (analytics = instrumentação;
     ARIA = labels; substrate = learner seam sem caminho de escrita no estado
     do aprendiz a partir do dojoToday);
   - executável nesta árvore: `python3 -m pytest learner/substrate/tests -q`
     → 214 passed/1 skipped; `python3 engines/dojoToday/tools/selfcheck.py` → OK.
3. Producer evidence @ `3aca4d5d`: artefatos do CI run 35275355476 (push main;
     apenas `product readiness (claims)` vermelho) — literacydojo-readiness /
     codexdojo-os-readiness / dojotoday-readiness (receipts em logs/);
     voxel-standalone-* EXCLUÍDOS do aggregate deste re-anchor (regra de
     filtragem do runbook: só os use cases re-ancorados).

## Comando de re-anchor (reproduzível)

```bash
git checkout -b docs/aid-2339-claims-regrant-v92 main   # tip corrente, nunca base antiga
# producer snapshot filtrado em evidence/producers/2026-09-18-3aca4d5d-claims-regrant-v92/
python3 docs/product-readiness/tools/cli.py aggregate \
  --reports docs/product-readiness/evidence/producers/2026-09-18-3aca4d5d-claims-regrant-v92 \
  --observations docs/product-readiness/evidence/observations/2026-09-18-3aca4d5d-claims-regrant-v92 \
  --output /tmp/product-readiness-report.json \
  --assessment-id 2026-09-18-3aca4d5d-claims-regrant-v92 \
  --verified-at 2026-09-18T02:35:00Z --revalidate-by 2026-10-18
python3 docs/product-readiness/tools/cli.py regrant --propose --input /tmp/product-readiness-report.json  # exit 0 = write
python3 docs/product-readiness/tools/cli.py check   # exit 0 obrigatório no HEAD
python3 -m pytest docs/product-readiness/tests -q
```
