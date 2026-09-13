# Plan — AID-1583 analytics onboarding (docs-only)

Execução em 1 heartbeat (2026-09-12). Producer: Learner Analytics
Engineer. Merge: FPE single-writer (regra AID-1521 até R1).

## Passos

| # | Passo | Status |
| --- | --- | --- |
| P1 | Auditoria: varredura de emissores (events.ts OS v1 14 eventos; literacy v2 10 eventos; surfaces v3 por superfície), coletor, agregação v4, CI, work products | done — `docs/metrics/AID-1583-auditoria-instrumentacao.md` |
| P2 | Plano mínimo O1: cadência L1/L2, métricas com fonte, baseline zero, regras de leitura | done — `docs/metrics/AID-1583-plano-medicao-o1.md` |
| P3 | Branch `aid-1583/instrumentation-audit-o1-plan` + PR pequeno autocontido | done |
| P4 | `sdlc_guard_check.sh --base main --head <branch>` clean | done (ver PR) |
| P5 | Recibo na issue AID-1583 com disposição `in_review` (reviewer: FPE p/ merge; conteúdo: Growth/QA) | done |

## Verificação

- `git diff --stat main...HEAD` = exatamente 4 arquivos added
  (2 docs + 2 intent), 0 modified, 0 deleted.
- Guard: exit 0, `2A/0M/0D`.
- CI do PR verde (job sdlc-guards incluído) — pré-condição de merge.

## Follow-ups (não-bloqueantes, com dono)

- G1–G5 cobertura de emissão: issue conjunta com dono da engine (pós-O1).
- G8 retenção literacy standalone: decisão de board (emenda ADR-0009).
- L1 health-check 09-16: founder/operador executa export; Analytics
  agrega e publica work product (child issue a criar na AID-1583 se o
  board quiser tracking formal).
