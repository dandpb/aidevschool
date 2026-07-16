---
description: Roda o loop completo de 5 fases (Curator→Devs→Reviewer→Benchmarker→Optimizer) para o projeto atual/indicado, com portão do verificador entre cada fase e respeitando o learning gate.
argument-hint: "[número do projeto opcional, ex. 01]"
---

Estado:
!`python3 -m engines.miniMaxEvolutionEngine.os_adapter 2>/dev/null || echo "(sem status YAML/Markdown)"`
!`cat learner/learning_state.yaml 2>/dev/null || echo "(sem learning_state)"`

Você é o **Orquestrador** (Maestro/Mavis). Rode o loop de 5 fases para o projeto `$ARGUMENTS`
(ou o `current_project` do status). Leia `CLAUDE.md` e `docs/PROMPTS/IDEIAS/codexDojo/04_bootstrap_prompts.md` para os contratos.

Regras inegociáveis:
1. **Learning gate primeiro.** Se `gate.implementation_blocked: true`, rode `/devschool-diagnose`
   e PARE até o aprendiz tentar + ser avaliado. Não implemente por ele.
2. **Portão do verificador entre fases.** Após cada produtor, dispare o subagent `verifier` na fase
   correspondente. Só avance a máquina YAML por `save_status` em **PASS**. Em **FAIL**, "acorde" o produtor com o
   feedback concreto (retry; respeite `retry_limit`).
3. **Devs em paralelo.** Na Fase 2, dispare `dev-go`, `dev-rust`, `dev-node` **na mesma mensagem**
   (3 chamadas Task), depois verifique cada um.

Sequência:
- Fase 1 → `curator` → `verifier(spec)` → status `spec-done`
- Fase 2 → `dev-go`+`dev-rust`+`dev-node` (paralelo) → `verifier(impl)` por linguagem → `impl-done`
- Fase 3 → `reviewer` → `verifier(review)` → `review-done`
- Fase 4 → `benchmarker` → `verifier(benchmark)` → `benchmark-done`
- Fase 5 → `optimizer` → `verifier(optimize)` → `cycle-complete`
- Ao fechar: acrescente um resumo ao `learner/journal.md` e sugira `/devschool-next`.

```yaml
phase: spec
producer: curator
verifier_phase: spec
next_status: spec-done
---
phase: impl
producer: [dev-go, dev-rust, dev-node]
verifier_phase: impl
next_status: impl-done
parallel: true
learning_gate_check: true
---
phase: review
producer: reviewer
verifier_phase: review
next_status: review-done
---
phase: benchmark
producer: benchmarker
verifier_phase: benchmark
next_status: benchmark-done
---
phase: optimize
producer: optimizer
verifier_phase: optimize
next_status: cycle-complete
```

Para cada declaração, invoque `run_phase(spec)`.

Pare entre fases se um quality gate falhar 2x seguidas (registre o bloqueio no YAML por `save_status`, preservando a narrativa Markdown).
Não rode benchmarks pesados sem confirmar ambiente isolado.
