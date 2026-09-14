# Flaky ledger — check-runs do CI (AID-1857/t2)

Ledger append-only e machine-readable das entradas "flaky" da política de
retry determinístico AID-1658 (`--retries=1 --trace on-first-retry` nas
superfícies Playwright do workflow CI). Fonte: GitHub Actions jobs/check-runs
API — a mesma usada no mapa de harness do onboarding AID-1722.

## Como rodar

```bash
node scripts/flaky-ledger/flaky-ledger.mjs --self-test          # parser offline
GITHUB_TOKEN=… node scripts/flaky-ledger/flaky-ledger.mjs --runs 60
```

- `flaky-ledger.ndjson`: uma linha por ocorrência flaky (chave de dedupe
  `run_id#attempt#job#test_id` — re-escanear uma janela nunca duplica).
- Gatilho de quarentena AID-1658: recorrência no mesmo teste → quarentena +
  issue (nunca subir retries). Este ledger é o agregado consultável desse
  gatilho.

## Estado atual (regenerado na última varredura)

- Última varredura: 60 run(s) do workflow CI (59 com jobs Playwright examinados).
- Entradas novas na última varredura: 0; total acumulado no ledger: 0.

| Superfície | Teste | Ocorrências | Última |
| --- | --- | --- | --- |
| — | — | 0 | — |

(Zero linhas = zero entradas flaky registradas nas varreduras — estado
legítimo, não falha da ferramenta.)
