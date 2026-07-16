---
description: Fase 4 — invoca o subagent benchmarker (harness nativo sem Docker, N≥3 runs × 3 impls, mediana+desvio), depois o verificador.
argument-hint: "[projeto opcional]"
---

Dispare o subagent **`benchmarker`** (via Task) para a Fase 4 do projeto `$ARGUMENTS` (ou o
`current_project`). Pré-condição: estado YAML-first em `review-done`.

```yaml
phase: benchmark
producer: benchmarker
verifier_phase: benchmark
next_status: benchmark-done
pre_condition: review-done
artefact: curriculum/{project}/docs/benchmark_results.md
```

Invoque `run_phase(spec)` usando a declaração acima.

Harness **nativo, sem Docker** (vive no substrato compartilhado):

- `curriculum/_shared/benchmarks/native_runner.sh <project_dir> <lang> <port> <k6_script>` —
  builda + testa + sobe UMA implementação, roda k6, captura peak RSS e emite **1 JSON no stdout**
  (1 run por invocação; o chamador agrega).
- Workload: use o específico do projeto se existir (`curriculum/{project}/benchmarks/*.js`), senão
  `curriculum/_shared/benchmarks/generic_http_workload.js`.
- `curriculum/_shared/benchmarks/bench_orchestrator.py <project_dir>` — smoke N=1 das 3 impls
  (útil para descobrir a porta real quando a impl ignora `PORT`); **não satisfaz o gate N≥3**.

Instruções ao produtor (`benchmarker`):

- Pré-checagem: `go`, `cargo`, `node` e `k6` no PATH. Se faltar algo, PARE e registre o bloqueio em
  o YAML por `save_status` (`blockers`) — falha nunca é silenciada; não sobrescreva Markdown.
- Rode **N≥3 runs por linguagem** (ports: go=28080, node=28081, rust=28082), salvando cada JSON
  bruto em `curriculum/{project}/benchmarks/results/native/{lang}/run-{i}.json`. Exemplo de 1 run:
  `bash curriculum/_shared/benchmarks/native_runner.sh curriculum/{project} go 28080 curriculum/_shared/benchmarks/generic_http_workload.js > curriculum/{project}/benchmarks/results/native/go/run-1.json`
- Agregue por linguagem: **mediana + desvio-padrão + CV** de RPS, p50/p95/p99, fail rate e peak RSS.
  Se CV > 15% numa métrica-chave, rode runs adicionais ou declare a métrica inconclusiva.
- Escreva `docs/benchmark_results.md`: (1) Ambiente & Metodologia (hardware, versões das toolchains,
  N, workload, caveat: **nativo em macOS, máquina compartilhada — ordering relativo vale, números
  absolutos não**) (2) Tabela-resumo (mediana±desvio × 3 langs) (3) Análise por linguagem
  (4) Gargalos por implementação (input crítico do optimizer) (5) Recomendações (6) Limitações.
  Todo número da tabela deve ser rastreável a um JSON bruto em `benchmarks/results/native/`.

Regras de honestidade: só mediana+desvio de N≥3; nada de vencedor em diferença < 10% ou dentro do
ruído (CV); sem dado, sem claim.

Quando o `benchmarker` terminar, dispare o subagent **`verifier`** (fase `benchmark`) como Task novo,
sem contexto do produtor: ele confere N≥3 JSONs por linguagem em `benchmarks/results/native/`,
re-roda 1 run e compara com a mediana reportada (tolerância ±20%), tabela completa (sem TBD) e a
seção de limitações. Só em **PASS** atualize o YAML por `save_status`: `phase: benchmark-done`,
`awaiting: optimizer`, `agents.benchmarker: done`. Em FAIL, devolva ao `benchmarker` (respeite
`retry_limit`). Próximo comando: `/devschool-optimize`.
