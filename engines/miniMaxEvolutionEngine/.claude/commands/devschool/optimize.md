---
description: Fase 5 — invoca o subagent optimizer (gargalos → UMA otimização por linguagem → re-medição N≥3 no harness nativo → evolution_report.md), depois o verificador. Fecha o ciclo.
argument-hint: "[projeto opcional]"
---

Dispare o subagent **`optimizer`** (via Task) para a Fase 5 do projeto `$ARGUMENTS` (ou o
`current_project`). Pré-condição: `learner/pipeline_status.md` em `benchmark-done`.

```yaml
phase: optimize
producer: optimizer
verifier_phase: optimize
next_status: cycle-complete
pre_condition: benchmark-done
artefact: curriculum/{project}/docs/evolution_report.md
```

Invoque `run_phase(spec)` usando a declaração acima.

Instruções ao produtor (`optimizer`):

- Entradas: `docs/code_review.md` (verificado na Fase 3), `docs/benchmark_results.md` + JSONs brutos
  em `benchmarks/results/native/` (verificados na Fase 4) e `{go,rust,node}-impl/`. Se alguma
  entrada não existir ou não tiver passado pelo verificador, PARE e reporte o bloqueio — a Fase 5
  consome evidência, não a inventa.
- Identifique os **top 2–3 gargalos** citando os números da Fase 4 (hipótese explícita: "se X,
  então Y melhora porque Z").
- Aplique **UMA** otimização por linguagem (para isolar impacto). **Os testes devem continuar
  passando** após cada mudança (rode-os entre passos).
- Re-meça com o **mesmo harness nativo e mesmo workload** da Fase 4
  (`curriculum/_shared/benchmarks/native_runner.sh`), **N≥3 runs por linguagem**, salvando em
  `curriculum/{project}/benchmarks/results/native-after/{lang}/run-{i}.json`. Deltas =
  mediana(depois) vs mediana(antes); nenhum claim de melhoria dentro do ruído (CV).
- Documente ≥1 otimização **rejeitada** (com o porquê) — anti-conhecimento vale tanto quanto.
- Escreva `docs/evolution_report.md`: Contexto · Gargalos (com evidência) · Otimizações aplicadas
  por linguagem (padrão, risco, mitigação) · Tabela Antes/Depois (mediana±desvio, rastreável aos
  JSONs) · Otimizações rejeitadas · **≥3 insights cross-language ancorados em números** · Lições
  para o curator · Decisão: loop de novo OU projeto maduro.

Disciplina: meça antes e depois; sem otimização prematura; sem metric gaming (não troque p99 por
RPS); documente trade-offs.

Quando o `optimizer` terminar, dispare o subagent **`verifier`** (fase `optimize`) como Task novo,
sem contexto do produtor: os testes das 3 impls ainda passam (re-rodados do zero), 1 claim de
otimização re-verificado re-rodando 1 run (tolerância ±20%), Antes/Depois completo e rastreável aos
JSONs, e ≥1 rejeitada presente. Só em **PASS** atualize `learner/pipeline_status.md`:
`phase: cycle-complete`, `awaiting: next-curator`, `agents.optimizer: done`; acrescente
padrões/anti-padrões ao `learner/journal.md` e sugira `/devschool-next`. Em FAIL, devolva ao
`optimizer` (respeite `retry_limit`).
