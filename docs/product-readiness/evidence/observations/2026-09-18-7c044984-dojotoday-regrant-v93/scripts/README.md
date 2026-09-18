# Observation scripts — dojotoday re-grant v93 (AID-2396 / ordem QA AID-2393)

Re-anchor incremental do grupo `dojotoday-daily-guidance` na branch do PR #489,
na tip corrente (REGRANT-RUNBOOK.md §Regra de merge itens 2–3: a main andou em
path coberto entre o anchor v92 e o countersign → regenerar o re-anchor).

- Tree auditada: merge `7c044984` = branch `docs/aid-2339-claims-regrant-v92`
  (`6ce16467`) + main `60ae2179` (PR #494: `learner/substrate/judgments.py`
  +25/-18 — refactor `_ask`→`ask_and_record`, seam público p/
  `learner/gate/metric_lint`; sem novo caminho de escrita de estado do aprendiz).
- Veredito QA AID-2393 `db5a93ce` (NO-GO 04:48:57Z): merge sim
  `60ae2179`+`6ce16467` → `check --require-current` rc=1 com exatamente
  `STALE-WINDOW: dojotoday-daily-guidance` (3 cenários stale) — reproduzido
  first-hand nesta árvore antes do re-anchor (logs/first-hand-checks.txt).
  Demais 5 grupos do v92 seguem current nesta árvore (única linha STALE-WINDOW).

## Escopo (apenas o grupo re-ancorado — regra de filtragem do runbook)

- `dojotoday-daily-guidance` — `dojotoday-active-unit-guidance`,
  `dojotoday-returning-next-day` (producer reports playwright @ `7c044984`) +
  `dojotoday-read-only-boundary` (cenário observation-only, sem report
  automatizado por design).

Os outros 5 use cases do v92 NÃO entram neste bundle nem no aggregate (reports
de outros use cases sem observação viram decisões `blocked` e derrubam claims
publicados — REGRANT-RUNBOOK.md §Fluxo local).

## Método (re-conferência, não re-escrita; cadeia v90→v92→v93)

1. Partida: bundle v92 `2026-09-18-3aca4d5d-claims-regrant-v92` (proveniência
   original preservada em cada nota; bracket `[Re-anchor v92 ...]` mantido).
2. Re-conferência first-hand na árvore `7c044984` (2026-09-18):
   - guias citados inalterados desde v92 (git log `3aca4d5d..7c044984` vazio
     para student-guide.md/facilitator-guide.md; manualFingerprint idêntico);
   - verificação mecânica arquivo:linha das citações (13/13 PASS —
     logs/first-hand-checks.txt);
   - diff do drift lido first-hand (judgments.py: refactor de seam, receipts
     seguem audit em `learner/judgment_receipts/`, nenhum caminho de escrita de
     estado do aprendiz a partir do dojoToday);
   - executável nesta árvore: `python3 -m pytest learner/substrate/tests -q` →
     214 passed/1 skipped; `npm run selfcheck` → OK; `npm run test:readiness` →
     playwright 25 passed + 2 producer reports @ `7c044984`
     (sourceFingerprint `fe30fdb9...` novo, manual `029ce8f5...` inalterado).
3. Producer evidence desta árvore: reports first-hand locais
   (logs/dojotoday-test-readiness.txt) — o CI da branch re-executa os mesmos
   argv no push (jobs dojoToday + claims); o push-run da main pós-merge é o
   verificador final fail-closed.

## Comando de re-anchor (reproduzível)

```bash
git merge origin/main   # 7c044984 = 6ce16467 + 60ae2179
python3 -m pytest learner/substrate/tests -q          # 214 passed/1 skipped
cd engines/dojoToday && npm ci --include=dev && npx playwright install chromium \
  && npm run test:readiness                           # selfcheck OK + 25 passed + reports
python3 docs/product-readiness/tools/cli.py aggregate \
  --reports engines/dojoToday/test-results/readiness \
  --observations docs/product-readiness/evidence/observations/2026-09-18-7c044984-dojotoday-regrant-v93 \
  --output /tmp/product-readiness-report.json \
  --assessment-id 2026-09-18-7c044984-dojotoday-regrant-v93 \
  --verified-at 2026-09-18T04:57:00Z --revalidate-by 2026-10-18
python3 docs/product-readiness/tools/cli.py regrant --propose --input /tmp/product-readiness-report.json  # exit 0 = write
python3 docs/product-readiness/tools/cli.py check                # exit 0
python3 docs/product-readiness/tools/cli.py check --require-current  # exit 0
python3 -m pytest docs/product-readiness/tests -q
```
