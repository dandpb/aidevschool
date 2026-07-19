---
description: Fase 2 — invoca dev-node (default). Polyglot (go+rust+node) só no pilot 01_rate_limiter ou com --polyglot.
argument-hint: "[projeto opcional] [--polyglot]"
---

Learning gate:
!`cat learner/learning_state.yaml 2>/dev/null || echo "(sem learning_state)"`

**Cheque o gate primeiro.** Se `gate.implementation_blocked: true`, PARE e rode `/devschool-diagnose`
— a implementação pela IA só é liberada quando o aprendiz tentar e for avaliado. Não fure o gate.

## Default: node-first

Se liberado, invoque **só** `dev-node` para o projeto `$ARGUMENTS` (ou `current_project`):

```yaml
phase: impl
producer:
  - dev-node
verifier_phase: impl
next_status: impl-done
pre_condition: spec-done
parallel: false
learning_gate_check: true
artefact: curriculum/{project}/node-impl/
```

- `dev-node` → `node-impl/`
- Lê `docs/spec.md`, cobre FRs, build+lint+test (≥80%).
- **Sem** Dockerfile salvo no pilot `01_rate_limiter` (lá Dockerfiles de referência existem).

Depois dispare **`verifier`** (fase `impl`) uma vez no `node-impl/`. Só atualize via `save_status`
→ `impl-done` com PASS.

## Polyglot (opt-in)

Use `--polyglot` **ou** projeto `01_rate_limiter` (pilot canônico) para despachar em paralelo:

```yaml
producer:
  - dev-go
  - dev-rust
  - dev-node
parallel: true
artefact: curriculum/{project}/{language}-impl/
```

Verifier uma vez **por linguagem**. `impl-done` só quando todas as linguagens pedidas derem PASS.

Não re-seed go/rust vazios em 02–18 sem pedido explícito de polyglot.
