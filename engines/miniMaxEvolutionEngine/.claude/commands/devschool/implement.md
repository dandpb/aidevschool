---
description: Fase 2 — invoca dev-go/dev-rust/dev-node em PARALELO (só se o learning gate permitir), depois roda o verificador em cada implementação.
argument-hint: "[projeto opcional]"
---

Learning gate:
!`cat learner/learning_state.yaml 2>/dev/null || echo "(sem learning_state)"`

**Cheque o gate primeiro.** Se `gate.implementation_blocked: true`, PARE e rode `/devschool-diagnose`
— a implementação pela IA só é liberada quando o aprendiz tentar e for avaliado. Não fure o gate.

Se liberado: dispare os 3 subagents **na mesma mensagem** (3 chamadas Task em paralelo) para o
projeto `$ARGUMENTS` (ou o `current_project`):
- `dev-go` → `go-impl/`
- `dev-rust` → `rust-impl/`
- `dev-node` → `node-impl/`

Cada um deve ler o `spec.md` inteiro, cobrir todos os FRs, passar build+lint+test (≥80%) e Dockerfile.

Quando os 3 terminarem, dispare o subagent **`verifier`** (fase `impl`) **uma vez por linguagem** —
ele re-roda build/test do zero e tenta quebrar com burst de concorrência. Só atualize `learner/pipeline_status.md`
→ `impl-done` quando as 3 derem **PASS**. Em FAIL, "acorde" o dev daquela linguagem com o feedback
concreto (respeite `retry_limit`).
