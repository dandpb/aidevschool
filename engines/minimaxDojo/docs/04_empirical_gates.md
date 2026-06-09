# 🚪 Portões Empíricos — Definition of Done

> O PROMĘTOR **nunca** aceita "deve estar funcionando". O portão é **execução real + métricas verificáveis**. Sem exceção.

---

## 1. Princípio

> **Consenso não é correção.** O Worker diz "funciona". O Verifier **roda o código** e diz "passa, com mutation score 0.71, cobertura 0.83, sem warnings". Só então vira `DOMINADO`.

---

## 2. Portão Universal (vale para toda unidade)

| Critério | Threshold | Verificado por |
|----------|-----------|----------------|
| Execução real | testes rodam em sandbox isolado, exit 0 | PROMĘTOR |
| Suíte verde | 100% dos testes passam (happy + bordas + adversarial) | PROMĘTOR |
| **Mutation score** | **≥ 0.65** (preferível a cobertura bruta) | PROMĘTOR |
| Cobertura do núcleo | ≥ 0.80 (linhas de execução do objetivo da unidade) | PROMĘTOR |
| Linter limpo | 0 erros, 0 warnings no escopo da unidade | PROMĘTOR |
| Código idiomático | revisa PORQUÊ (idiom, SOLID, padrão) | CRÍTICO |
| Sem anti-padrões críticos | lista negra da trilha (ver §3) | CRÍTICO |
| Reflexão do aluno | responde a pergunta de reflexão do ciclo | MAESTRO |

---

## 3. Anti-padrões Vedados (negam "DOMINADO" mesmo com testes verdes)

### 3.1 Testes
- ❌ `assert True` / teste vazio
- ❌ Mock que sempre retorna o valor de saída esperado
- ❌ Teste do próprio mock (não exercita código)
- ❌ `try/except: pass` mascarando falhas
- ❌ `sleep` ao invés de sincronização real
- ❌ Cobertura por `pass` ou comentários

### 3.2 Código
- ❌ `any`/`unknown` (TS) ou `interface{}`/`any` (Go) sem justificativa
- ❌ Mutate input em vez de retornar novo
- ❌ Resource leak (arquivo, conexão, lock)
- ❌ Swallow de exceção sem log
- ❌ `null` retornado como "valor normal"
- ❌ `TODO` / `FIXME` no escopo da unidade

### 3.3 Robustez (unidades da trilha de robustez)
- ❌ Validação ausente em boundary externo
- ❌ Operação não-idempotente sem justificativa
- ❌ `print` em vez de logger estruturado
- ❌ Magic numbers sem constante nomeada

---

## 4. DoD por Tipo de Unidade

### 4.1 TDD (Testes primeiro)
| Critério | Threshold |
|----------|-----------|
| Testes escritos **antes** do código (verificável por git log) | 100% |
| Suíte: happy + 3 bordas + 2 adversariais | ≥ 5 testes |
| Mutation score | ≥ 0.65 |
| Cobertura | ≥ 0.80 |
| Refactor posterior sem quebrar testes | ✅ |

### 4.2 Mutation Testing
| Critério | Threshold |
|----------|-----------|
| Mutation score | ≥ 0.65 |
| Mutantes sobreviventes analisados | 100% (com justificativa ou fix) |
| Mutantes equivalentes marcados | explicitamente |

### 4.3 Code Smells & Refactoring
| Critério | Threshold |
|----------|-----------|
| CC mediana | < 10 (funções > 15 → flag) |
| Duplicação | < 7% |
| Funções > 50 linhas | 0 |
| Parâmetros > 5 | 0 (introduzir objeto) |
| Comentários "what" (vs "why") | reduzidos |
| PR de refactor passa suíte completa | ✅ |

### 4.4 SOLID & Design Patterns
| Critério | Threshold |
|----------|-----------|
| 1 padrão mal-aplicado | aceito (didático) |
| 5 princípios SOLID violados | 0 (revisar) |
| ADR do padrão escolhido | obrigatório |
| Comparação com ≥ 1 alternativa rejeitada | no ADR |

### 4.5 Erros / Validação / Idempotência
| Critério | Threshold |
|----------|-----------|
| Erros tipados / categorizados | 100% |
| Validação de boundary | 100% |
| Operações mutantes idempotentes | 100% (ou ADR) |
| Suíte de falhas injetadas | ≥ 5 cenários |
| Logs estruturados em erros | 100% |

### 4.6 Logging / Observabilidade
| Critério | Threshold |
|----------|-----------|
| Logger estruturado (JSON ou similar) | 100% |
| Sem `print`/`console.log` em produção | 0 |
| Correlação (request-id) em todas as linhas | 100% |
| Métricas expostas (counters/histograms) | ≥ 3 relevantes |
| PII/segredo em log | 0 (grep confirma) |

### 4.7 Code Review
| Critério | Threshold |
|----------|-----------|
| Revisão do aluno tem PORQUÊ | 100% dos findings |
| Falso-positivo do aluno | < 20% |
| Achados reais do aluno (não óbvios) | ≥ 3 por sessão |
| Saberia explicar pro par | sim (verificado por Socrático) |

### 4.8 Design para Robustez (falhas, retries, contratos)
| Critério | Threshold |
|----------|-----------|
| Contrato (entrada/saída) documentado | 100% |
| Retry com backoff exponencial + jitter | sim (se aplicável) |
| Circuit breaker quando chama externos | sim (se aplicável) |
| Testes de caos (latência, falha, partição) | ≥ 3 cenários |
| Property-based test em parsers/validadores | ≥ 1 |

### 4.9 Arquitetura / Escala
| Critério | Threshold |
|----------|-----------|
| ADR em MADR | obrigatório |
| Fitness function do atributo de qualidade | ≥ 1 implementada |
| Bounded contexts identificados | explícito |
| Default = monolito modular respeitado | ✅ (ou justificativa forte) |
| Alerta "Monolito Distribuído" | 0 (ou resolvido) |

---

## 5. Como o PROMĘTOR Reporta (template)

```markdown
# Verdict — <unit_id>

## Status
**PASS** | FAIL

## Evidência
- Comando: `pytest -q --cov=... --cov-fail-under=80`
- Saída: ...
- Mutation runner: `mutmut run --help` (ou equivalente)
- Mutation score: 0.71 (threshold 0.65) ✅
- Cobertura núcleo: 0.86 (threshold 0.80) ✅

## Suíte rodada (aluno + adversariais)
- happy_path: ✅
- borda_1 (input vazio): ✅
- borda_2 (input máximo): ✅
- borda_3 (input malformado): ✅
- adversarial_1 (overflow): ✅
- adversarial_2 (concorrência): ❌ → GAP

## Gaps (bloqueantes)
1. **GAP-01** — `concurrency_test` falhou: race em `cache.py:42`
   - reprodução: ...
   - mutante sobrevivente: `cache.get(key)` → `cache.get(None)`

## Recomendação
- reprovado; Mestre-Conteúdo gere variação com foco em race condition
```

---

## 6. Como o CRÍTICO Reporta (template)

```markdown
# Review — <unit_id>

## Findings (com PORQUÊ)

### F-01 [severity: major] — `parser.py:12` (complexidade ciclomática = 14)
- **O quê:** função `parse()` com 4 responsabilidades.
- **Por quê:** viola SRP e dificulta testabilidade — o aluno não consegue isolar a falha do parser de URL da do parser de query string.
- **Como revisar (não corrigir):** "qual a menor mudança que extrai 1 responsabilidade mantendo comportamento e cobertura?"

### F-02 [severity: minor] — `errors.py:5` (Exception genérica)
- **O quê:** `raise Exception("...")`
- **Por quê:** perdemos categorização; o handler não consegue diferenciar input inválido de falha de IO.
- **Como revisar:** "que tipo de erro o chamador precisa diferenciar?"

## Avaliação da Revisão do Aluno
- Achados reais: 3 / 5 (1 falso-positivo, 1 redundante)
- PORQUÊ presente em: 4 / 5
- Próximo exercício: detectar SOLID violado sem dica.

## ADR Pedido
- ADR-0010: escolher entre exception tipada ou Result type para erros de boundary.
```

---

## 7. Catálogo de Ferramentas por Linguagem (defaults)

| Linguagem | Test runner | Mutation | Coverage | Linter | Bench |
|-----------|-------------|----------|----------|--------|-------|
| **Python** | pytest | mutmut (ou cosmic-ray) | coverage.py | ruff + mypy | pytest-benchmark |
| **Go** | go test + testify | go-mutesting | go test -cover | golangci-lint | go test -bench + benchstat |
| **Rust** | cargo test | cargo-mutants | cargo tarpaulin | clippy | criterion |
| **TypeScript** | vitest | stryker | c8/v8 | eslint + tsc | vitest bench |

---

*Ver [02_state_machine.md](02_state_machine.md) para como o portão se integra à state machine.*
