---
id: aluno-001
learner_id: daniel-barreto
created: 2026-06-03
updated: 2026-06-03
agente_owner: mnemosyne
---

# Perfil Vivo do Aluno

> **Atualizado por Mnemosyne após cada ciclo.** Estado completo. Sob demanda, Mnemosyne injeta apenas o **núcleo curado** no prompt.

## Estado Global

```yaml
linguagem_foco: TypeScript        # ativo
tempo_semanal: 5h
nivel_autodeclarado: intermediario
dreyfus_global: advanced_beginner   # será calibrado por SONDA
bloom_global: apply                  # será calibrado por SONDA
ai_dependency_index: 0.50           # default inicial
socrates_quota_today: 0 / 15
human_instructor: none
```

## Baseline (autodeclarado, a ser confirmado por SONDA)

- Confortável com: sintaxe TS, tipos, async/await
- Usa Vitest ou Jest em nível básico
- Lê código, mas **não internalizou** padrões de refactoring
- Fraco em: **testes adversariais, mutation testing, design patterns, design de contrato de erro**

## Unidades

| ID | Título | Estado | Dreyfus | Bloom | Mutation | Cobertura | Última | Próxima revisão |
|----|--------|--------|---------|-------|----------|-----------|--------|------------------|
| U-001 | TDD em código existente | APRESENTANDO | — | — | — | — | — | — |
| U-002 | Mutation testing | BLOQUEADA | — | — | — | — | — | — |
| U-003 | Code smells & refactoring | BLOQUEADA | — | — | — | — | — | — |
| U-004 | SOLID & design patterns | BLOQUEADA | — | — | — | — | — | — |
| U-005 | Erros, validação, idempotência | BLOQUEADA | — | — | — | — | — | — |
| U-006 | Logging estruturado | BLOQUEADA | — | — | — | — | — | — |
| U-007 | Code review (ler→escrever) | BLOQUEADA | — | — | — | — | — | — |
| U-008 | Design para robustez | BLOQUEADA | — | — | — | — | — | — |
| U-009 | Arquitetura / escala | BLOQUEADA | — | — | — | — | — | — |

## Lacunas Comprovadas (Sonda)

> Preenchido após primeiro SONDA. Inicialmente vazio.
>
> **Baseline já conhecido** (a confirmar):
> 1. Mutation testing — provavelmente fraco (autodeclarado)
> 2. Testes adversariais — fraco
> 3. Design patterns — fraco
> 4. Design de contrato de erro — fraco
> 5. Refactoring — fraco (autodeclarado)

## Pegadinhas Top (curado)

> 1. *(ainda sem dados)*

## Skills Ativas

- *(ainda sem skills)*

## Próxima Unidade

> **U-001** (TDD em código existente) — após SONDA confirmar lacunas, Cartógrafo pode re-ordenar.

## Histórico de Decisões (Sêneca)

- **2026-06-03T22:18 — focus narrowed to TypeScript** ([ADR](../../whiteboard/decisions/cycle-01-intake.md))
  - Maestro alterou `learning_state.yaml` para tornar TypeScript o foco ativo
  - Go e Rust mantidos como referência (Task 3 — code reading em 3 impls)
  - **Sem SLA aberto**

## ai_dependency_index — Histórico

| Ciclo | AIDI | Tendência |
|-------|------|-----------|
| 0 (cold) | 0.50 | — |

---

## Atualização

Após cada ciclo, Mnemosyne:
1. Atualiza tabela `Unidades` (estado + métricas)
2. Rotaciona `Pegadinhas Top` (manter 5 mais recorrentes)
3. Rotaciona `Skills Ativas` (manter 5 mais usadas)
4. Atualiza `ai_dependency_index`
5. Anexa linha em `Histórico de Decisões` (se Sêneca tomou)
6. **Compacta**: se > 30 dias, move seções antigas para `archive/learner_profile-<data>.md`

---

*Ver [`docs/05_memory_system.md`](../../docs/05_memory_system.md) § 2.1 para schema completo.*
