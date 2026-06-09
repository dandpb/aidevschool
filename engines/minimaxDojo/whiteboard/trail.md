---
aluno_id: aluno-001
criado: 2025-XX-XX
atualizado: 2025-XX-XX
agente_owner: cartografo
---

# Trilha Personalizada — Ágora Continuum

> **Versão cold-start.** O Cartógrafo **atualiza** após SONDAR e a cada ciclo (unidade dominada, lacuna detectada, decisão arquitetural).

## Perfil Resumido (placeholder até SONDA)

- Dreyfus global: advanced_beginner
- Bloom global: apply
- Lacunas comprovadas: *(preencher após SONDA)*
- Skills ativas: *(nenhuma ainda)*

---

## Trilha de Robustez — 9 unidades (TEMPLATE)

> Trilha canônica em [`docs/03_robustness_trail.md`](../../docs/03_robustness_trail.md). Personalizar após SONDA.

### U-001 — TDD em código existente
- **Estado:** APRESENTANDO (cold start)
- **Pré-req:** SONDA concluída ✅
- **Objetivo:** adicionar 3 funções novas a um módulo existente estritamente em TDD
- **DoD:** 3 funções, ≥ 5 testes cada, 1 property-based, mutation ≥ 0.65
- **Anti-padrão:** teste escrito depois do código (verificável por git log)
- **Estilo:** kata pequeno
- **Tempo:** 30 min
- **Decisão de design:** test framework (pytest vs unittest vs outros)

### U-002 — Mutation testing e mutantes sobreviventes
- **Estado:** BLOQUEADA
- **Pré-req:** U-001 dominada + baseline mutation ≥ 0.40
- **Objetivo:** rodar mutation runner; analisar 100% dos sobreviventes; matar 70%+
- **DoD:** mutation ≥ 0.65, 0 mutante sobrevivente sem justificativa
- **Decisão de design:** mutation runner (mutmut vs cosmic-ray vs go-mutesting vs cargo-mutants vs stryker)
- **Tempo:** 30 min

### U-003 — Code smells & refactoring (Fowler)
- **Estado:** BLOQUEADA
- **Pré-req:** U-002 dominada
- **DoD:** CC mediana < 10, duplicação < 7%, suíte 100% verde
- **Decisão de design:** estratégia de refactor (parallel change vs expand-contract)
- **Tempo:** 30 min

### U-004 — SOLID aplicado (com ADR)
- **Estado:** BLOQUEADA
- **Pré-req:** U-003 dominada (CC < 12)
- **DoD:** ADR MADR, 5 princípios checados
- **Decisão de design:** pattern a aplicar (com ≥ 1 alternativa rejeitada)
- **Tempo:** 40 min

### U-005 — Erros, validação, idempotência
- **Estado:** BLOQUEADA
- **Pré-req:** U-004 dominada (ADR existe)
- **DoD:** erros tipados 100%, validação 100%, ≥ 5 testes de falha injetada
- **Decisão de design:** exception tipada vs Result/Either
- **Tempo:** 40 min

### U-006 — Logging estruturado + correlação
- **Estado:** BLOQUEADA
- **Pré-req:** U-005 dominada
- **DoD:** 0 print, JSON log, correlação 100%, ≥ 3 métricas
- **Decisão de design:** formato de log (JSON vs logfmt), biblioteca
- **Tempo:** 30 min

### U-007 — Code review (ler → escrever)
- **Estado:** BLOQUEADA
- **Pré-req:** U-006 dominada
- **DoD:** 5 revisões, 0 "está errado", ≥ 3 achados com citação de princípio
- **Decisão de design:** rubrica pessoal de review
- **Tempo:** 40 min

### U-008 — Design para robustez (falhas, retries, contratos)
- **Estado:** BLOQUEADA
- **Pré-req:** U-007 dominada
- **DoD:** contrato documentado, retry com jitter, CB testado, ≥ 3 cenários de caos
- **Decisão de design:** retry lib, CB lib, política de timeout
- **Tempo:** 50 min

### U-009 — Introdução a arquitetura/escala
- **Estado:** BLOQUEADA
- **Pré-req:** U-008 dominada
- **DoD:** ≥ 2 ADRs (MADR), fitness function executável, alerta "monolito distribuído" = 0
- **Decisão de design:** monolito modular vs modular monolith com plugins
- **Tempo:** 50 min

---

## Próxima Unidade (cold start)

> **U-001** (entrada intermediária — após SONDA apontar primeira lacuna comprovada, Cartógrafo pode re-ordenar)

## Decisões de Design Abertas (não pré-definidas)

- U-001: test framework
- U-002: mutation runner
- U-003: estratégia de refactor
- U-004: pattern (com ≥ 1 alternativa)
- U-005: exception vs Result
- U-006: formato de log + lib
- U-007: rubrica de review
- U-008: retry lib + CB lib + timeout policy
- U-009: monolito modular vs plugins

## Pegadinhas Prioritárias (vão para Mneme)

> Preencher após primeiro PROMĘTOR + Crítico.

---

*Ver [`docs/03_robustness_trail.md`](../../docs/03_robustness_trail.md) para o template canônico.*
