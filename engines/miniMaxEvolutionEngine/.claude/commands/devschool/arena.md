---
description: Polyglot Comparison Arena — gera o arena_report.md de um projeto (3 impls, fairness audit, benchmark, narrativa, verifier), com portão de predição por métrica antes de revelar.
argument-hint: "[projeto, ex. 01_rate_limiter]"
---

Rode a **Polyglot Comparison Arena** para o projeto `$ARGUMENTS`. A arena é uma
**projeção** sobre o substrato existente (ADR-001/003): orquestra agentes que já
existem + dois novos, e agrega no `arena_report.md`. Não é um motor novo.

Pré-condição: existem `curriculum/$ARGUMENTS/benchmark.yaml` e as três
`{go,rust,node}-impl/`.

## Pipeline (nesta ordem; produtor ≠ verificador em cada ponto de risco)

1. **Impls** — confirme/gere as 3 impls via `dev-go`/`dev-rust`/`dev-node` (paralelo).
2. **Fairness gate** — dispare `fairness-auditor` (Task). Ele julga as 3 impls
   contra `curriculum/_shared/arena/effort_budget_rubric.md`. **Qualquer `flag`
   bloqueia o benchmark** — devolva ao produtor para reequilibrar.
3. **Benchmark + análise** — chame `curriculum/_shared/arena.run_arena(project_dir,
   project_id, run_id, n>=3, live=True)`. Ele roda o `run_benchmark` (docker+k6),
   reusa o `BenchmarkAnalyzer` e aplica `decision_gate(report)` sobre as métricas
   decisórias (`p99`, `n_requests`, `mem_mb`). A arena **falha fechado**: se
   qualquer métrica decisória não for confiável, nenhum relatório revelável é escrito.
4. **Code study** — dispare `reviewer` (CRITICO) para o estudo cross-language.
5. **Narrativa** — dispare `arena-narrator` (Task). Ele preenche **apenas** a seção
   `## Narrative` do `arena_report.md`, citando os números medidos.
6. **Verifier** — dispare `verifier` (PROMĘTOR, fase `benchmark`). Ele confere
   **cada** afirmação da narrativa contra o `aggregated.json`. **Afirmação não
   sustentada bloqueia a revelação.**
7. **Portão de predição (hard gate, ADR-002)** — o relatório está `gate: locked`.
   Peça ao aprendiz a predição por métrica (latency/memory/throughput). Só então,
   se todas as métricas tiverem vencedores reais (`go`/`rust`/`node`),
   chame `curriculum/_shared/arena.gate.commit_predictions(report_path, project,
   run_id, predicted, winners)` — ele exige as **três** predições, registra em
   `learner/predictions.yaml` (ADR-004) e vira o gate para `revealed`.
8. **Dashboard** — rode `python3 -m learner.substrate` para refletir as predições
   no `engines/codexDojo/src/data/learner.ts`.

## Honestidade / gate
- `run_id` é passado pela invocação (sem ler relógio dentro da arena).
- Em macOS o Docker Desktop faz throttling de CPU — registre como caveat; não
  declare vencedor em diferença < 10%.
- Aceitação MVP (Fase 1): **um** `arena_report.md` verifier-confirmed e
  gate-passing, com predições registradas e o dashboard atualizado. Nenhum projeto
  atual deve ser tratado como aceito enquanto o relatório permanecer `gate: locked`.
