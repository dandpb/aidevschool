# Intent — AID-1741 drill cleanup jobs receipt

- **Status:** accepted (CEO, ORDEM impl própria — issue delegada AID-1738 r3-B)
- **Paperclip:** AID-1741 (pai AID-1714); implementa a decisão C+E da
  triagem AID-1738 §5.1 (`REGRANT-FACTORY-NOISE-TRIAGE-2026-09-13.md` §4,
  PR #391).

## Problem

O cleanup de drill/proposta da fábrica de re-grant fecha o PR e apaga a
branch `regrant/auto-*` em segundos. Pós-delete, a API devolve `jobs: []` e
check-runs `total_count: 0` — o vermelho esperado da proposta vira
irreconstruível para qualquer auditoria post-hoc (reproduzido nas 3 runs de
drill de 2026-09-13).

## Outcome

- Protocolo de cleanup (lado Paperclip/agente, **não** workflow) passa a
  capturar `actions/runs/{id}/jobs` e comentar no PR nome+conclusão de cada
  job não-verde **antes** de fechar o PR e deletar a branch.
- Timeline ordenável no PR: comentário-jobs < `closed` < `head_ref_deleted`.
- Convenção de consumo (E) codificada no runbook: vermelho em
  `head_branch ~ ^regrant/auto-` = proposal-red, não regressão.

## Affected systems

- `docs/product-readiness/REGRANT-RUNBOOK.md` — nova seção de protocolo.
- `docs/product-readiness/tools/capture_drill_jobs.sh` — helper novo
  (gh api → comentário no PR; idempotente; registra B1a quando não há run).

## Constraints

- Zero mudança em `ci.yml` / `readiness-regrant.yml` / branch protection
  (boundary da decisão §5.1 e da ORDEM).
- Auto-delete permanece (C); nada de CI informativo na branch (D rejeitado
  na triagem).
- Aceite: próximo drill executado com o protocolo novo evidencia o
  comentário de jobs no PR antes do `head_ref_deleted`.

## Plan

1. Helper `capture_drill_jobs.sh <PR>` (resolver run do head → jobs →
   comentário com marcador idempotente).
2. Seção do protocolo no runbook com a ordem estrita capturar → fechar →
   deletar + convenção E.
3. Evidência: fixture drill AID-1669 executado com o protocolo novo;
   timeline do PR verificada via `issues/{n}/timeline`.
