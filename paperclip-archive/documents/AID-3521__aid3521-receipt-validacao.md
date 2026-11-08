<!-- issue: AID-3521 | key: aid3521-receipt-validacao | doc_id: 8b18a04e-22bc-4bd4-963e-e42fb598b251 | updated: 2026-09-30 21:04:39.82+00 -->

# AID-3521 — recibo de validação (amostra real a02b1833)

(AID-3521)

# Push-run receipt (por run/evento/PR/SHA) — VALIDAÇÃO Fase1 v2.1 (amostra real)

Merge commit: `a02b18334fda0336ceccfd4f9d2529fb3351752a` (M) · PR mergeado: `#604` · Receipt emitido em: `2026-09-30 21:1xZ` · Emissor: `platform & ci engineer / AID-3521 run 9cd19585`

> Amostra de validação do template `docs/sdlc/templates/push-run-receipt.md`
> (draft AID-3521 Fase1 v2.1 docs-only). Dados first-hand revalidados nesta
> sessão (2026-09-30) via GitHub API — endpoints citados por linha.

## Enumeração (passo 1)

`gh api repos/dandpb/aidevschool/commits/a02b18334fda0336ceccfd4f9d2529fb3351752a/check-runs --paginate`
→ **52 check-runs**, distribuídos em 9 runs de origem (todas resolvidas no passo 2 — nenhuma `unresolved`):

| run de origem | event (workflow) | escopo | linhas | não-verde |
| --- | --- | --- | --- | --- |
| 36491949848 | `push` (CI) — head_sha = M | `push @ M` | 44 | **`product readiness (claims)` FAILURE 22:26:53Z** (falha REAL de push) |
| 36492377134 | `issue_comment` (countersign-gate) | `cross-PR (PR 547 @ 30c4c3de→a02b1833 tier main)` | 1 | failure 22:26:19Z — FAIL §7 VOID/HELD pós-citação (log job 109163759513: `PR=547`, `##[error] … AID-2768 §7`) |
| 36492680464 | `issue_comment` (countersign-gate) | `cross-PR (PR 547)` | 1 | failure 22:29:56Z — FAIL §3 pin stale (head 547 movido p/ 30c4c3de) |
| 36493221306 | `issue_comment` (countersign-gate) | `cross-PR (PR 547)` | 1 | success 22:34:53Z — PASS |
| 36493452511 | `issue_comment` (countersign-gate) | `cross-PR (PR 605)` | 1 | failure 22:37:10Z — FAIL §1 sem citação |
| 36493588985 | `issue_comment` (countersign-gate) | `cross-PR (PR 547)` | 1 | success 22:38:33Z — PASS |
| 36492081074 | `workflow_run` (Readiness re-grant factory) | `derived @ M` | 1 | skipped 22:23:25Z |
| 36492479882 | `workflow_run` (Readiness re-grant factory) | `derived @ M` | 1 | success 22:27:22Z |
| 36493026632 | `workflow_run` (Readiness re-grant factory) | `derived @ M` | 1 | skipped 22:32:48Z |

Lookups do passo 2: `gh api repos/dandpb/aidevschool/actions/runs/<id>` para
cada uma das 9 runs (event/head_sha/conclusão confirmados nesta sessão —
JSONs arquivados em `aid3521-evidence/`); PR/motivo dos countersign-gate pelo
log do job (`.../actions/jobs/109163759513/logs` revalidado: `PR=547` + FAIL §7).

## Veredito do CI de M (só `push @ M` / `derived @ M`)

- Falha REAL de push (permanece visível, é a amostra positiva exigida):
  **`product readiness (claims)` — failure — run 36491949848 @ M** (falha
  pré-existente de claims, alheia ao gate; exatamente o caso que o revisor
  f0a85dba mandou não sumir).
- `derived @ M`: 1 success + 2 skipped (sem falha).
- Demais 42 linhas `push @ M`: success/skipped (matrizes voxelDojo/pixelDojo agrupadas por run; nenhuma outra falha).

## Critérios de validade (negativos) — verificados

- [x] Contagem bate: 44+5+3 = 52 = `total_count` da API. Um recibo que
      descartasse globalmente `countersign-gate` teria 47 linhas ≠ 52 →
      **inválido** (amostra negativa (a): descarte global detectável).
- [x] Nenhuma linha `push @ M` vermelha ausente: a única (product readiness)
      está nominada em destaque (amostra negativa (b): ocultar vermelho de
      push = recibo inválido).
- [x] Nenhuma linha cross-PR descartada: as 5 (incl. 3 vermelhas de PRs 547/605)
      estão presentes, rotuladas `cross-PR` com run/event/PR/SHA (amostra
      negativa (c): ruído rotulado, nunca removido).
- [x] Cada linha reproduzível: endpoints + run ids citados acima.

## Evidências arquivadas (primeira mão, esta sessão)

- `checkruns_a02b1833.json` — os 52 check-runs de M.
- `run_36491949848.json` (+ 8 demais `run_*.json`) — resolução event/head_sha.
- `joblog_109163759513.txt` — log do job countersign-gate (PR=547, FAIL §7).
