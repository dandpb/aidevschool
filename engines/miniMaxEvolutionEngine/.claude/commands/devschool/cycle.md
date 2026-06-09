---
description: Roda o loop completo de 5 fases (Curator→Devs→Reviewer→Benchmarker→Optimizer) para o projeto atual/indicado, com portão do verificador entre cada fase e respeitando o learning gate.
argument-hint: "[número do projeto opcional, ex. 01]"
---

Estado:
!`cat learner/pipeline_status.md 2>/dev/null || echo "(sem status)"`
!`cat learner/learning_state.yaml 2>/dev/null || echo "(sem learning_state)"`

Você é o **Orquestrador** (Maestro/Mavis). Rode o loop de 5 fases para o projeto `$ARGUMENTS`
(ou o `current_project` do status). Leia `CLAUDE.md` e `docs/PROMPTS/IDEIAS/codexDojo/04_bootstrap_prompts.md` para os contratos.

Regras inegociáveis:
1. **Learning gate primeiro.** Se `gate.implementation_blocked: true`, rode `/devschool-diagnose`
   e PARE até o aprendiz tentar + ser avaliado. Não implemente por ele.
2. **Portão do verificador entre fases.** Após cada produtor, dispare o subagent `verifier` na fase
   correspondente. Só avance o `learner/pipeline_status.md` em **PASS**. Em **FAIL**, "acorde" o produtor com o
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

Pare entre fases se um quality gate falhar 2x seguidas (registre o bloqueio em `learner/pipeline_status.md`).
Não rode benchmarks pesados sem confirmar ambiente isolado.
