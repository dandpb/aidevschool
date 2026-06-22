# F3 Manual QA Evidence

Verdict: APPROVE

## Environment

- App: codexDojo dashboard
- URL: http://127.0.0.1:5173/
- Command: `pnpm run dev` from `engines/codexDojo`
- Evidence time: 2026-06-18

## Screenshots

- Overview: `./f3-overview.png`
- Agents: `./f3-agents.png`
- Project: `./f3-project.png`

## Overview page

Status: PASS

- Page loaded successfully.
- Metric strip shows 10 metric titles:
  - TEMPO DE EXECUÇÃO
  - COBERTURA DO NÚCLEO
  - MUTATION SCORE
  - COMPLEXIDADE CICLOMÁTICA
  - DEPENDÊNCIA DE IA
  - CORRETUDE
  - SEGURANÇA DE TIPOS E API
  - SEGURANÇA
  - OPERABILIDADE E OBSERVABILIDADE
  - VARIÂNCIA DO BENCHMARK (CV%)
- `não medido ainda` appears 10 times in the metric strip.
- No metric card showed a fake numeric measurement.
- `Meta:` appears 10 times, once per metric card.
- Ecosystem status cards are visible: LEARNING GATE, MEMORY, LEGACY/REFACTOR, POLYGLOT COMPARISON.
- Console errors: 0.

## Agents page

Status: PASS

- Page shows product/user-facing agent summary as `10 agentes user-facing`.
- 10 user-facing agents are visible: Mentor, Curriculo, Arquiteto, Implementador, Revisor de Codigo, Testes, Metricas, DevOps, Pesquisador, Memoria.
- The page also shows the tutor-core expansion as 14 operational roles, clearly labelled separately as `TUTOR CORE` / `14 papéis operacionais`.
- Clicking an agent role updates the detail panel; clicked `CRONOS` and detail panel changed from `MAESTRO` to `CRONOS`.
- Console errors: 0.

## Project page

Status: PASS

- Project information is visible.
- Shows `P01`, `Rate Limiter (Token Bucket)`, `Objetivo de aprendizado`, and `Definition of Done`.
- Console errors: 0.

## Notes

- Dev server was stopped after QA.
