# ADR-0002: OpenClaw is a tracer-bullet continuous runner, not the polyglot cycle owner

- **Status:** Accepted
- **Date:** 2026-07-08
- **Decisor:** architecture-deepening loop (scheduled fire)
- **Principles cited:** F1 (contrato antes de código), F3 (produtor ≠ verificador), F5 (fatia vertical antes de escala), F7 (falha visível)

## Contexto

Two modules encode the 5-phase polyglot project cycle (`spec → impl → review → benchmark → optimize`):

1. **miniMaxEvolutionEngine** — interactive Claude Code commands/subagents; phase advancement is
   prompt-led; `learner/pipeline_status.yaml` is the shared machine seam.
2. **openclaw** — file-based checklist scheduler with path and size checks plus a real phase graph
   in code.

Domain analysis already noted openclaw as an undocument dual implementation of the polyglot cycle. Maintaining both as equal “owners” causes silent drift (phase vocabulary, thresholds, status format).

## Opções

| Opção | Complexidade | Custo | Nota |
| --- | --- | --- | --- |
| A. Deepen openclaw into full empirical adapters | Alta | Semanas | Duplicates MME quality path |
| B. Demote openclaw to tracer / continuous runner | Baixa | Doc + seams | Keeps automate-able skeleton |
| C. Delete openclaw | Baixa | Perda do tracer | Throws away the working checklist skeleton |

## Decisão

**Opção B.** OpenClaw is the **tracer-bullet continuous runner**:

- Owns scheduler control flow and simulate-mode checklist orchestration. The unused Hermes runtime
  is removed; OpenClaw has no event-bus responsibility.
- Does **not** claim empirical mastery or replace MME/Prometor for learning-gate or code quality.
- `learner/pipeline_status.yaml` (structured twin of the Markdown narrative) is the machine seam for phase fields; Markdown keeps agent notes.
- miniMaxEvolutionEngine remains the **primary implementation** of the interactive polyglot cycle for real work.
- Byte-size checks in openclaw adapters stay simulate-grade stand-ins, not empirical gates.

## Consequências

**Fica mais fácil:** stop re-suggesting “merge openclaw and MME”; document ownership; invest substrate/verifier depth first.

**Fica mais difícil:** openclaw will not grow silent second-class empirical verification without a new ADR.

**Revisitar quando:** a real CI-driven polyglot runner needs executable test/coverage adapters — then deepen openclaw adapters under this ADR or supersede it.
