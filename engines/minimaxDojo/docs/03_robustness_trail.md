# 🗺️ Trilha de Robustez (Cartógrafo)

> Trilha **intermediária** (não fundação). Cada unidade só desbloqueia a próxima por **pré-requisito comprovado por evidência executável** (mutation score, cobertura, code review OK).

---

## 1. Visão Geral

```
ENTRY POINT INTERMEDIÁRIO
        │
        ▼
 ┌──────────────────────────────────────────────────┐
 │  1. Testes automatizados / TDD                   │
 │      ↓ (pré-req: suíte verde + mutation ≥ 0.65)  │
 │  2. Mutation testing                             │
 │      ↓ (pré-req: analisar mutantes sobreviventes)│
 │  3. Code smells & refactoring                    │
 │      ↓ (pré-req: CC < 10, dup < 7%)             │
 │  4. SOLID & design patterns                      │
 │      ↓ (pré-req: ADR + comparação c/ alternativa)│
 │  5. Erros, validação, idempotência               │
 │      ↓ (pré-req: suíte de falhas + tipos)        │
 │  6. Logging / observabilidade                    │
 │      ↓ (pré-req: structured log + correlação)    │
 │  7. Code review (ler → escrever)                 │
 │      ↓ (pré-req: review com PORQUÊ ≥ 80%)        │
 │  8. Design para robustez (falhas, retries)       │
 │      ↓ (pré-req: testes de caos + contrato)      │
 │  9. Introdução a arquitetura/escala               │
 │         (monolito modular → bounded contexts)    │
 └──────────────────────────────────────────────────┘
```

---

## 2. Catálogo de Unidades (template por unidade)

### 2.1 U-001 — TDD em código existente (baby steps)

| Campo | Valor |
|-------|-------|
| Pré-req | Sonda concluída |
| Objetivo | adicionar 3 funções novas a um módulo **existente** estritamente em TDD (test → fail → code → pass → refactor) |
| DoD | 3 funções, ≥ 5 testes cada, 1 property-based, mutation ≥ 0.65 |
| Anti-padrão | teste escrito **depois** do código (verificável por git log) |
| Socrático | "antes de escrever o teste, qual o menor comportamento verificável?" |
| Tempo | 30 min |

### 2.2 U-002 — Mutation testing e mutantes sobreviventes

| Campo | Valor |
|-------|-------|
| Pré-req | U-001 dominada |
| Objetivo | rodar mutation runner; analisar 100% dos mutantes sobreviventes; matar 70% ou justificar equivalente |
| DoD | mutation ≥ 0.65, 0 mutante sobrevivente sem justificativa |
| Anti-padrão | "aumentar pra passar" (engordar assertion sem motivo) |
| Socrático | "esse mutante sobreviveu: o teste testa o comportamento certo?" |
| Tempo | 30 min |

### 2.3 U-003 — Code smells & refactoring (Fowler)

| Campo | Valor |
|-------|-------|
| Pré-req | U-002 dominada |
| Objetivo | identificar 3 smells no código, refatorar **sem quebrar testes** |
| DoD | CC mediana < 10, dup < 7%, suíte 100% verde após |
| Anti-padrão | rename cosmético sem mudança estrutural |
| Socrático | "esse nome descreve o que faz ou o que é?" |
| Tempo | 30 min |

### 2.4 U-004 — SOLID aplicado (com ADR)

| Campo | Valor |
|-------|-------|
| Pré-req | U-003 dominada |
| Objetivo | refatorar violação real de SOLID, justificar com ADR (MADR) |
| DoD | ADR com 1 alternativa rejeitada, 5 princípios checados |
| Anti-padrão | pattern pelo pattern (sem problema real) |
| Socrático | "qual problema concreto esse padrão resolve aqui?" |
| Tempo | 40 min |

### 2.5 U-005 — Erros, validação, idempotência

| Campo | Valor |
|-------|-------|
| Pré-req | U-004 dominada |
| Objetivo | tipar erros, validar boundary, garantir idempotência em operação mutante |
| DoD | erros tipados 100%, validação 100%, ≥ 5 testes de falha injetada |
| Anti-padrão | `raise Exception("...")`, swallow de erro |
| Socrático | "como diferencio input inválido de falha de IO no log?" |
| Tempo | 40 min |

### 2.6 U-006 — Logging estruturado + correlação

| Campo | Valor |
|-------|-------|
| Pré-req | U-005 dominada |
| Objetivo | substituir `print` por logger estruturado, adicionar request-id, expor métricas |
| DoD | 0 `print`, JSON log, correlação 100%, ≥ 3 métricas |
| Anti-padrão | string formatada em vez de campos estruturados |
| Socrático | "esse log me deixa grep'ar por usuário específico?" |
| Tempo | 30 min |

### 2.7 U-007 — Code review (ler → escrever)

| Campo | Valor |
|-------|-------|
| Pré-req | U-006 dominada |
| Objetivo | revisar código de par com PORQUÊ em 100% dos achados |
| DoD | 5 revisões, 0 "está errado", ≥ 3 achados com citação de princípio |
| Anti-padrão | "rename X" sem explicar por quê |
| Socrático | "qual princípio está em jogo?" |
| Tempo | 40 min |

### 2.8 U-008 — Design para robustez (falhas, retries, contratos)

| Campo | Valor |
|-------|-------|
| Pré-req | U-007 dominada |
| Objetivo | definir contrato, implementar retry+backoff+jitter, circuit breaker, testes de caos |
| DoD | contrato documentado, retry com jitter, CB testado, ≥ 3 cenários de caos |
| Anti-padrão | retry sem jitter (thundering herd) |
| Socrático | "se o downstream ficar lento, o que acontece com a fila?" |
| Tempo | 50 min |

### 2.9 U-009 — Introdução a arquitetura/escala

| Campo | Valor |
|-------|-------|
| Pré-req | U-008 dominada |
| Objetivo | identificar bounded contexts, esboçar monolito modular, ADRs arquiteturais |
| DoD | ≥ 2 ADRs (MADR), fitness function do atributo principal, alerta "monolito distribuído" = 0 |
| Anti-padrão | "vamos microservices" sem justificativa |
| Socrático | "qual atributo de qualidade você está otimizando e a que custo?" |
| Tempo | 50 min |

---

## 3. Pré-requisitos Globais (entre fases)

| Para desbloquear | Comprovar |
|------------------|-----------|
| U-002 (mutation) | U-001 verde + mutation baseline ≥ 0.40 |
| U-003 (smells) | U-002 verde + 100% mutantes analisados |
| U-004 (SOLID) | U-003 verde + CC < 12 |
| U-005 (erros) | U-004 verde + ADR existe |
| U-006 (logging) | U-005 verde + erros tipados |
| U-007 (review) | U-006 verde + correlação OK |
| U-008 (design robusto) | U-007 verde + ≥ 5 revisões PORQUÊ |
| U-009 (arquitetura) | U-008 verde + testes de caos passando |

---

## 4. Decisões de Design (não memorização)

Em cada unidade, o aluno **escolhe** pelo menos 1 item entre opções equivalentes, justificando com ADR:

| Unidade | Decisão |
|---------|---------|
| U-001 | test framework, assertion style (assert vs expect) |
| U-002 | mutation runner (mutmut vs cosmic-ray) |
| U-003 | estratégia de refactor (parallel change vs expand-contract) |
| U-004 | pattern a aplicar (vs alternativas rejeitadas) |
| U-005 | exception tipada vs Result/Either |
| U-006 | formato de log (JSON vs logfmt), biblioteca |
| U-007 | rubrica pessoal de review |
| U-008 | retry lib, circuit breaker lib, política de timeout |
| U-009 | monolito modular vs modular monolith com plugins |

---

## 5. Catálogo de Pegadinhas (curado, vai para Mneme)

| Pegadinha | Onde aparece | Como evitar |
|-----------|--------------|-------------|
| Mock que sempre retorna o valor esperado | U-001 | mockar interface, não implementação |
| `try/except: pass` | U-005 | categorizar e re-raise ou converter |
| Retry sem jitter | U-008 | sempre `expo + random(0, 1s)` |
| "Refactor" só cosmético | U-003 | exigir mudança estrutural ou rejeitar |
| ADR com 1 alternativa | U-004 | exigir ≥ 2 alternativas rejeitadas |
| Cobertura 100% com teste inútil | U-001 | exigir assertion real sobre comportamento |
| `print` em produção | U-006 | grep de print em CI |
| Review sem PORQUÊ | U-007 | reescrever finding em "porque viola X" |
| Microservices sem justificativa | U-009 | default = monolito modular |

---

*Ver [04_empirical_gates.md](04_empirical_gates.md) para o DoD completo de cada unidade.*
