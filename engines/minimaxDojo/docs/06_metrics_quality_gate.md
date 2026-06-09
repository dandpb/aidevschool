# 📊 Painel de Métricas (Atena) + Quality Gate

> A Atena compõe **Quality Gate sobre código novo** + **curva de aprendizado individual** + **Dreyfus × Bloom** + **qualidade da reflexão** + **`ai_dependency_index`**. **Proibido** usar DORA/velocity como proxy de habilidade individual.

---

## 1. Dois Eixos de Métrica

```
┌─────────────────────────────────────────────────────────────┐
│ EIXO A — QUALIDADE DE CÓDIGO (gate objetivo)                │
│   CC, mutation, cobertura, duplicação, TD ratio,            │
│   reliability, security                                     │
├─────────────────────────────────────────────────────────────┤
│ EIXO B — APRENDIZADO DO ALUNO (curva + classificação)       │
│   velocidade, acurácia, autonomia, Dreyfus × Bloom,         │
│   qualidade da reflexão, ai_dependency_index                │
└─────────────────────────────────────────────────────────────┘
```

**Regra de ouro:** Métricas de **código** (eixo A) validam a unidade atual. Métricas de **aprendizado** (eixo B) ajustam a trilha e o andaime.

---

## 2. Eixo A — Quality Gate (sobre CÓDIGO NOVO da unidade)

### 2.1 Tabela de Critérios

| Critério | Default (limite saudável) | Limite de alerta | Verificado por |
|----------|---------------------------|------------------|----------------|
| CC mediana | < 10 | > 15 | CRÍTICO |
| CC máx | ≤ 15 | > 20 | CRÍTICO |
| Mutation score | ≥ 0.65 | < 0.50 | PROMĘTOR |
| Cobertura núcleo | ≥ 0.80 | < 0.70 | PROMĘTOR |
| Duplicação | < 7% | > 10% | CRÍTICO |
| Technical Debt Ratio | < 5% | > 10% | CRÍTICO |
| Reliability (SonarQube) | A | B ou pior | PROMĘTOR |
| Security (SonarQube) | A | B ou pior | CRÍTICO |
| Lint | 0 erros | warnings ≥ 10 | PROMĘTOR |
| Dependências vulneráveis | 0 high/critical | ≥ 1 high | CRÍTICO |
| Tamanho PR (LoC) | < 300 | > 500 | MAESTRO |

### 2.2 Veredito Composto

```
SE (mutation_score >= 0.65)
 E (cobertura_nucleo >= 0.80)
 E (CC_mediana < 10)
 E (duplicacao < 7%)
 E (TDR < 5%)
 E (security = A)
ENTÃO
  gate = PASS
SENÃO
  gate = FAIL   # com lista explícita de métricas abaixo do limite
```

**Atena reporta, Maestro decide.** Se Atena=PASS mas Crítico/PROMĘTOR reprovam por algo não-mensurável (legibilidade, idiom), o Maestro pondera.

### 2.3 Exceções Didáticas

Em unidades **didáticas**, o Mestre-Conteúdo pode propor **1 violação consciente** (ex.: "este exercício, aceitamos CC=12 para mostrar o smell antes de refatorar"). Isso:
- precisa estar marcado em `DoD.md` com `didactic_violation: true`
- precisa de ADR explicando
- conta como **não-bloqueante** no gate

---

## 3. Eixo B — Curva de Aprendizado (sobre o ALUNO)

### 3.1 Métricas por Unidade

| Métrica | Como medir | Default saudável |
|---------|------------|------------------|
| **velocidade** | tempo até `DOMINADO` (min) | dentro de 1.5× do esperado |
| **acurácia** | % de submissões aceitas no 1º try | ≥ 60% em U-001, sobe para ≥ 80% em U-005+ |
| **autonomia** | % de unidades completadas sem consulta ao Sócrates | ≥ 70% |
| **retries** | nº de retries até `DOMINADO` | ≤ 2 (3 é alerta) |
| **reflexão** | qualidade da resposta à pergunta de reflexão (0–5) | ≥ 3 |

### 3.2 Dreyfus × Bloom (por conceito)

| Dreyfus | Bloom correspondente | Comportamento esperado |
|---------|----------------------|------------------------|
| Novice | Remember | reproduz |
| Advanced Beginner | Understand | reconhece |
| Competent | Apply | usa em situação nova |
| Proficient | Analyze | detecta padrão |
| Expert | Evaluate/Create | generaliza, ensina |

**Onde o aluno está** é atualizado pela **Sonda** (inicial) e **Atena** (contínuo). Exemplo:

```yaml
conceitos:
  tdd:                { dreyfus: competent,      bloom: apply }
  mutation_testing:   { dreyfus: advanced_beginner, bloom: analyze }
  refactoring:        { dreyfus: novice,          bloom: understand }
```

### 3.3 ai_dependency_index (AIDI)

Índice **[0, 1]** de dependência de IA. Atualizado por **Ouroboros** no fim do ciclo.

| Componente | Peso | Como medir |
|------------|------|------------|
| Submissões aceitas no 1º try | 0.20 | ↑ quando cai |
| Consultas ao Sócrates por unidade | 0.15 | ↑ quando cresce |
| Solução completamente gerada por IA | 0.25 | ↑ quando detectado |
| Review de par **sem** achados reais | 0.15 | ↑ quando aluno não detecta nada sozinho |
| Reflexão "vazia" (memorizada) | 0.10 | ↑ quando reflexões viram template |
| Tempo de escrita sem consulta | 0.15 | ↑ quando aluno espera IA |

```
AIDI > 0.60  → alerta amarelo (Socrático reforça fading)
AIDI > 0.75  → alerta vermelho (Sêneca escalado, suspender modo rápido)
AIDI < 0.30  → saudável (aluno no caminho)
```

### 3.4 Qualidade da Reflexão (0–5)

| Score | Característica |
|-------|----------------|
| 0 | vazia / "ok" |
| 1 | repete o enunciado |
| 2 | repete a solução |
| 3 | conecta solução a um conceito da trilha |
| 4 | conecta + identifica pegadinha pessoal |
| 5 | generaliza (transfere para outro domínio) |

---

## 4. Saída da Atena — `metrics_snapshot.md`

```yaml
---
unit: U-002
timestamp: 2025-XX-XX
---

# Métricas — U-002

## Eixo A — Quality Gate
- mutation_score: 0.71 ✅
- cobertura_nucleo: 0.86 ✅
- CC_mediana: 6.5 ✅
- CC_max: 12 ✅
- duplicacao: 4.2% ✅
- TDR: 3.1% ✅
- security: A ✅
- lints: 0 errors / 2 warnings (deprecations)
- **gate: PASS**

## Eixo B — Aprendizado
- velocidade: 28 min (esperado 30) ✅
- acuracia: 1ª tentativa: 67% (3/5) ✅
- autonomia: 80% (1 consulta Socrático) ✅
- retries: 1
- reflexão_score: 3 (conecta com TDD)

## Dreyfus × Bloom (atualização)
| Conceito | Dreyfus | Bloom |
|----------|---------|-------|
| tdd | competent | apply |
| mutation_testing | advanced_beginner | analyze |
| refactoring | novice | understand |

## AIDI
- atual: 0.38 (saudável)

## Recomendações para o Maestro
- Aluno está pronto para U-003
- Sugerir revisão espaçada de property-based em 5 dias
- Considerar exercício-extra de SOLID (lacuna detectada na reflexão)
```

---

## 5. O que a Atena **NÃO** Faz (anti-padrões)

- ❌ Não mede **lines of code** como qualidade
- ❌ Não usa **DORA** (deployment frequency, lead time, MTTR, change failure rate) como proxy de habilidade individual
- ❌ Não usa **velocity** (story points) como métrica de aprendizado
- ❌ Não confunde **falar sobre** um conceito com **aplicar** (Bloom)
- ❌ Não infla qualidade por cobertura bruta (preferir mutation)
- ❌ Não usa **AIDI < 0.10** como meta (paranoico: aluno tem que estar aprendendo, não rejeitando IA)

---

*Ver [02_state_machine.md](02_state_machine.md) para como o snapshot alimenta a state machine.*
