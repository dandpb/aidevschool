# 🏛️ Arquitetura — Ágora Continuum

> Documento de referência arquitetural do time de 14 sub-agentes sobre o MiniMax Agent Team (Team Engine / Mavis).

---

## 1. Camadas do Sistema

```
┌──────────────────────────────────────────────────────────────────────┐
│ CAMADA 5 — GOVERNANÇA (Sêneca)                                       │
│   Portão humano no loop, SLAs, auditoria de decisões                 │
├──────────────────────────────────────────────────────────────────────┤
│ CAMADA 4 — MEMÓRIA / EVOLUÇÃO (Mnemosyne + Ouroboros)                │
│   3 canais: intra-agente │ handoffs │ whiteboard persistente         │
├──────────────────────────────────────────────────────────────────────┤
│ CAMADA 3 — QUALIDADE & MÉTRICAS                                      │
│   Promętor (verify) │ Crítico (review) │ Galileu (lab+arch) │       │
│   Atena (painel)                                                       │
├──────────────────────────────────────────────────────────────────────┤
│ CAMADA 2 — PEDAGOGIA (Workers)                                       │
│   Sonda │ Cartógrafo │ Mestre-Conteúdo │ Sócrates │ Mneme            │
├──────────────────────────────────────────────────────────────────────┤
│ CAMADA 1 — LIDERANÇA (Leader)                                        │
│   Maestro (state machine + dispatch) │ Cronos (scheduler)           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Modelo de Execução

### 2.1 State Machine Determinística

Toda **unidade de aprendizagem** percorre:

```
APRESENTANDO → PRATICANDO → AVALIANDO → DOMINADO
                  ↑            │
                  └──── RETRY ←┘ (≤ 3)
                                ↓
                          SÊNECA (decisão
                          consequente)
```

Sub-máquina de AVALIANDO (portão empírico):

```
PRODUCING → VERIFYING → DONE
   ↑           │
   └───────────┘ (reprova → wake-up Mestre-Conteúdo)
```

**Invariantes:**
- Ninguém declara `DOMINADO` sem veredito positivo do **PROMĘTOR**.
- **PROMĘTOR** parte do zero, sem contexto do gerador (relação adversarial).
- `retry_limit = 3` por unidade; ao esgotar, **SÊNECA** decide (SLA 24h, conservador por default).

### 2.2 Isolamento de Contexto

| Camada | Tipo de Agente | Contexto | Tempo de Vida |
|--------|----------------|----------|---------------|
| Leader | persistente (Maestro) | visão global + whiteboard | longa duração |
| Workers pedagógicos | efêmero (Sonda, Sócrates, Mneme) | escopo da unidade | ciclo |
| Workers geradores | efêmero (Mestre-Conteúdo) | unit-spec + handoff do Maestro | 1 unidade |
| Verifiers | **efêmero (PROMĘTOR, Crítico)** | **zero contexto do gerador** | 1 unidade |
| Memory | persistente (Mnemosyne) | whiteboard + skills | longa duração |
| Governance | persistente (Sêneca) | log + SLAs | longa duração |

> **Regra de ouro:** Worker-gerador e Verifier **nunca** compartilham contexto. Adversarial.

### 2.3 Modos de Operação

| Modo | Uso | Plataforma |
|------|-----|------------|
| **Lightning** | chat interativo, Socrático, Maestro | MiniMax chat |
| **Pro** | back office (trilha, avaliação, benchmark, Mneme batch) | MiniMax background tasks, sessões frescas |
| **Cron** | revisões diárias, relatórios, auditoria | tarefas recorrentes isoladas (CRONOS) |

---

## 3. Protocolo de Hand-off

### 3.1 Tipos de Hand-off

| De → Para | Artefato | Conteúdo |
|-----------|----------|----------|
| Maestro → Mestre-Conteúdo | `unit_spec.md` | objetivo, DoD, restrições, language focus |
| Mestre-Conteúdo → PROMĘTOR | `submission.md` | código, suíte de testes, claim de cobertura |
| PROMĘTOR → Maestro | `verdict.md` | approve/reject, evidência, mutation score, gaps |
| Crítico → Maestro | `review.md` | findings + PORQUÊ + avaliação da revisão do aluno |
| Cartógrafo → Maestro | `trail.md` | unidades, pré-requisitos, próximos saltos |
| Atena → Maestro | `metrics_snapshot.md` | quality gate + curva aprendizado |
| Mnemosyne → qualquer | `learner_context.md` | perfil vivo (curado, sob demanda) |

### 3.2 Whiteboard (Notepad Compartilhado)

Persistente, recuperável, **atualizado apenas por Mnemosyne e Maestro**. Conteúdo:

- `learner_profile.md` — TaskState, Dreyfus × Bloom por conceito, pegadinhas
- `decisions/ADR-*.md` — decision records (MADR)
- `event_log/events.ndjson` — log auditável (1 linha por evento)
- `skills/SKILL-*.md` — Skills versionadas (PR → promoted)

### 3.3 Skills (Mnemosyne)

Skills são **PRs versionadas** dentro do whiteboard:

```
draft → review (Crítico/Atena) → versioned → promoted → active
```

Quando uma Skill vira `promoted`, vira entrada **estável** no system prompt do agente que a usa. Nunca despejar histórico bruto.

---

## 4. Fluxo de um Ciclo (template)

```
[FRONT OFFICE]
   Aluno: "começar ciclo"

[BACK OFFICE — Maestro]
   1. Lê whiteboard (perfil + estado)
   2. Seleciona próxima unidade (pré-requisito OK?)
   3. Cria unit_spec.md
   4. Despacha em paralelo (Pro, contexto isolado):
        - Mestre-Conteúdo (gera)
        - Sócrates (prepara andaime)
   5. Recebe submission.md do Mestre-Conteúdo
   6. Despacha PROMĘTOR (zero contexto do Mestre)
   7. Se reprova → wake-up Mestre-Conteúdo (variação)
   8. Se aprova → despacha Crítico + (se couber) Galileu
   9. Compila relatório de ciclo (template)
  10. Mnemosyne atualiza whiteboard
  11. Cronos agenda revisão espaçada (Mneme)

[FRONT OFFICE]
   Maestro: relatório de ciclo (7 seções) + pergunta de reflexão
```

---

## 5. Configuração e Parametrização

| Parâmetro | Default | Onde |
|-----------|---------|------|
| `LINGUAGEM_FOCO` | (vazio) | `config/learner.yaml` |
| `TEMPO_SEMANAL` | 5h | `config/learner.yaml` |
| `RETRIES.MAX_POR_UNIDADE` | 3 | `config/learner.yaml` |
| `MUTATION_SCORE_MIN` | 0.65 | `config/learner.yaml` |
| `COBERTURA_NUCLEO_MIN` | 0.80 | `config/learner.yaml` |
| `SOCRATES.QUOTA_DIA` | 15 | `config/learner.yaml` |
| `SENECA.SLA_HORAS` | 24 | `config/learner.yaml` |
| `GALILEU.SAMPLES_MIN` | 10 | `config/learner.yaml` |
| `GALILEU.WARMUP_MIN` | 500 | `config/learner.yaml` |
| `GALILEU.CV_MAX_PCT` | 20 | `config/learner.yaml` |
| `ATENA.CC_MEDIANA_MAX` | 10 | `config/learner.yaml` |
| `ATENA.DUPLICACAO_MAX_PCT` | 7 | `config/learner.yaml` |

---

## 6. Anti-padrões Vedados

- ❌ **Consenso = correção** (veto explícito)
- ❌ **"Provavelmente funciona"** (sem execução real, não avança)
- ❌ **Cobertura bruta como sucesso** (mutation score é mais informativo)
- ❌ **Self-approve** (Worker não verifica o próprio trabalho)
- ❌ **Verificador com contexto do gerador**
- ❌ **DORA/velocity como proxy de habilidade individual**
- ❌ **Distribuir o monolito prematuramente** (default = monolito modular)
- ❌ **Pular portão empírico**
- ❌ **Entregar solução pronta no Socrático** (anti-dependência)
- ❌ **Despejar memória bruta no contexto** (núcleo curado, histórico sob demanda)

---

## 7. Segurança e Sandboxing

- Toda geração/execução de código em **sandbox isolado** (containers/microVM).
- **Princípio de menor privilégio** em credenciais.
- **Sem persistência cross-tenant** no sandbox.
- **Logs auditáveis** de toda execução (Galileu, Promętor).
- **Rollback de Skill** se regressão detectada por Mnemosyne.

---

## 8. Stack Sugerida

| Componente | Opção |
|------------|-------|
| Plataforma de agentes | MiniMax Agent Team (Team Engine / Mavis) |
| Scheduler | Cronos (cron nativo ou fallback manual) |
| Whiteboard | arquivos `.md`/`.ndjson` versionados (git) |
| Linguagem foco | parametrizável (Python/Go/Rust/TypeScript) |
| Test runner | por linguagem: pytest, go test, cargo test, vitest |
| Mutation | mutmut, go-mutesting, cargo-mutants, stryker |
| Benchmark | pytest-benchmark, benchstat, criterion, vitest bench |
| Métricas estáticas | radon/lizard, gocyclo, clippy, eslint complexity |

---

*Ver [01_agent_roster.md](01_agent_roster.md) para o catálogo detalhado dos 14 agentes.*
