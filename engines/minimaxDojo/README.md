# 🥋 minimaxDojo — Ágora Continuum

> **Time de agentes-tutores de longa duração** rodando sobre o **MiniMax Agent Team** (Team Engine / arquitetura Mavis), treinado para levar um programador **intermediário** a escrever, revisar e verificar **código robusto e de qualidade profissional** com autonomia — sem criar dependência de IA.

```
┌──────────────────────────────────────────────────────────────────────┐
│  ÁGORA CONTINUUM — Time de 14 sub-agentes isolados por contexto     │
│  Leader + Workers + Verifiers + Critics + Memory + Governance         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Missão

Levar o aluno de
> "programo, mas meu código não é robusto"

até
> "escrevo, reviso e verifico código de qualidade profissional com autonomia",

através de uma **máquina de estados determinística** onde **a certeza de conclusão nunca fica no LLM** — apenas em **portões empíricos** (testes reais + mutation testing + benchmark estatístico) julgados por um **Verifier adversarial** que parte do zero.

---

## 👥 Os 14 Sub-Agentes

### 🏛️ [LEADER]
| # | Agente | Papel |
|---|--------|-------|
| 1 | **MAESTRO** | Decompõe objetivo → trilha → unidades; opera a state machine; desperta Workers em paralelo com contexto isolado; define DoD verificável; acorda o gerador quando o Verifier reprova. |
| 2 | **CRONOS** | Agendamento de longa duração: tarefas recorrentes em background (modo Pro) com sessões frescas; chat interativo em modo Lightning; propriedade única de cada cron. |

### 🎓 [PEDAGOGIA — WORKERS]
| # | Agente | Papel |
|---|--------|-------|
| 3 | **SONDA** | Diagnóstico curto (10–15 min) assumindo base intermediária. Mede velocidade+acurácia+autonomia. Classifica Dreyfus × Bloom. Aponta lacunas pontuais. |
| 4 | **CARTÓGRAFO** | Trilha de ROBUSTEZ: TDD → mutation → smells/refactoring → SOLID/patterns → erros/validação/idempotência → logging/observabilidade → code review → design para robustez → arquitetura/escala. Desbloqueia próximo nível só por pré-requisito comprovado. |
| 5 | **MESTRE-CONTEÚDO** | Gerador de exercícios: faded worked examples, Parsons Problems, projetos incrementais multi-arquivo. Define suite de testes/DoD junto ao Verifier. Promove padrões a Skills. |
| 6 | **SÓCRATES** | Tutor socrático (anti-dependência). Exige tentativa antes de qualquer dica. Pipeline STAP (Checking→Correcting→Complementing→Segmenting). 15 consultas/dia. Fading rápido. Nunca entrega solução pronta. |
| 7 | **MNEME** | Repetição espaçada. Micro-revisões 15–20 min na curva do esquecimento. Interleaving + retrieval ativo. Prioriza "memória de pegadinhas". |

### 🔍 [QUALIDADE & MÉTRICAS]
| # | Agente | Papel |
|---|--------|-------|
| 8 | **PROMĘTOR** | Verifier adversarial efêmero (Mavis). Mandato de refutação. Roda suites idiomáticas em sandbox isolado. Mutation score ≥60–70% + cobertura núcleo ≥80%. Cross-model em alegações consequentes. |
| 9 | **CRÍTICO** | Revisor pedagógico. Explica o PORQUÊ (idioms, SOLID, patterns, segurança, dívida). Treina o aluno a revisar código de pares. Conduz review em cadeia. |
| 10 | **GALILEU** | Laboratório + arquitetura. Benchmarks com rigor estatístico (≥10 amostras, warmup 500+, mediana+média+mínimo+CV%; bloqueia se CV%≥20%). ADRs em MADR. Fitness functions. Default = monolito modular. |
| 11 | **ATENA** | Painel de métricas. Quality Gate sobre código novo (CC mediana <10, mutation score, duplicação <5–10%, TD Ratio, reliability/security). Curva de aprendizado + Dreyfus × Bloom + ai_dependency_index. |

### 🧠 [MEMÓRIA / EVOLUÇÃO]
| # | Agente | Papel |
|---|--------|-------|
| 12 | **MNEMOSYNE** | Memória em 3 camadas: (a) intra-agente, (b) handoff files entre agentes, (c) whiteboard/notepad persistente (perfil vivo do aluno). Núcleo curado pequeno. Histórico pesquisável sob demanda. |
| 13 | **OUROBOROS** | Loop de auto-melhoria: plan→act→reflect→critique→revise. Tropeços viram pegadinhas; acertos viram Skills (PR → revisar → versionar → promover). Mede se a intervenção melhorou desempenho real. |

### ⚖️ [GOVERNANÇA]
| # | Agente | Papel |
|---|--------|-------|
| 14 | **SÊNECA** | Portão Humano no Loop em modo auto-escala. Autonomia plena em ações reversíveis/baixo risco. PAUSA-checkpoint-retomada com SLA 24h em decisões consequentes. Loga toda decisão para auditoria. |

---

## 🔁 A Máquina de Estados (anti "context anxiety")

```
                  ┌────────────────────────────────────┐
                  │                                    │
   APRESENTANDO ──▶  PRATICANDO  ──▶  AVALIANDO  ──▶  DOMINADO
        ▲                │                  │              │
        │                │   ┌──────────┐   │              │
        │                └──▶│RETRY (≤3)│◀──┘              │
        │                    └──────────┘                  │
        │                                                  │
        └─────────── re-apresentação se Mestre ◀───────────┘
                     gerar variação no Maestro
```

**Sub-máquina de AVALIANDO** (o portão empírico):

```
  PRODUCING  ──▶  VERIFYING  ──▶  DONE
       ▲              │
       │              │ reprova
       │              ▼
       └──── wake-up Worker (Mestre-Conteúdo)
              retry_limit = 3
              se esgotar → Sêneca (decisão consequente)
```

**Ninguém** declara "dominado" sem o PROMĘTOR aprovar, com evidência executável.

---

## 📂 Estrutura do Projeto

```
minimaxDojo/
├── README.md
├── docs/
│   ├── 00_architecture.md          # Arquitetura completa do Ágora Continuum
│   ├── 01_agent_roster.md          # Catálogo dos 14 agentes (papel/inputs/outputs/ferramentas)
│   ├── 02_state_machine.md         # Especificação formal da máquina de estados
│   ├── 03_robustness_trail.md      # Trilha de Cartógrafo (robustez → arquitetura)
│   ├── 04_empirical_gates.md       # Definition of Done por unidade
│   ├── 05_memory_system.md         # Whiteboard + handoffs + skills
│   ├── 06_metrics_quality_gate.md  # Painel da Atena
│   └── 07_governance_sla.md        # Regras do Sêneca
├── agents/
│   ├── 01_maestro/                 # bootstrap + ferramentas + contratos
│   ├── 02_cronos/
│   ├── 03_sonda/                   # diagnóstico curto
│   ├── 04_cartografo/              # trilha
│   ├── 05_mestre_conteudo/         # gerador
│   ├── 06_socrates/                # tutor socrático
│   ├── 07_mneme/                   # repetição espaçada
│   ├── 08_prometor/                # verifier adversarial
│   ├── 09_critico/                 # revisor pedagógico
│   ├── 10_galileu/                 # lab + arquitetura
│   ├── 11_atena/                   # painel de métricas
│   ├── 12_mnemosyne/               # memória 3-camadas
│   ├── 13_ouroboros/               # auto-melhoria
│   └── 14_seneca/                  # governança
├── core/
│   ├── state_machine/              # implementação determinística
│   ├── gates/                      # portão empírico
│   ├── memory/                     # whiteboard I/O
│   └── scheduler/                  # cron + modo Pro/Lightning
├── prompts/
│   ├── bootstrap/                  # prompts iniciais (system + first cycle)
│   ├── per_agent/                  # system prompts por agente
│   └── cycles/                     # templates de saída por ciclo
├── whiteboard/
│   ├── learner_profile.md          # perfil vivo (TaskState + Dreyfus × Bloom)
│   ├── decisions/                  # ADRs + decision records
│   ├── event_log/                  # log auditável
│   └── skills/                     # Skills versionadas (PR → promoted)
├── exercises/                      # exercícios gerados pelo Mestre-Conteúdo
├── reports/                        # relatórios de ciclo
├── config/                         # config do learner + plataforma
└── tests/                          # smoke tests da infra
```

---

## 🛡️ Princípios Operacionais

1. **Contexto isolado** — cada subtarefa = sub-agente efêmero com contexto/ferramentas mínimos. Worker e Verifier **nunca** compartilham contexto.
2. **Planejar × Executar × Verificar** — papéis e ferramentas distintos. Promętor não escreve código, só refuta.
3. **Front office (Lightning) responde já; back office (Pro) roda em background** — múltiplos tópicos em paralelo sem contaminação.
4. **Portão empírico > consenso** — `mutation score ≥ 60–70%` + `cobertura núcleo ≥ 80%` antes de "dominado".
5. **Anti-dependência** — Sócrates nunca entrega solução pronta; 15 consultas/dia; fading rápido.
6. **Evolução contínua** — fim de ciclo → tropeços viram pegadinhas; acertos viram Skills (PR-versionadas).
7. **Segurança** — código roda em sandbox isolado; escopo mínimo de credencial.

---

## 🚀 Como Iniciar

1. **Preencha o perfil** em [`config/learner.yaml`](config/learner.yaml): `LINGUAGEM_FOCO`, `TEMPO_SEMANAL`, etc.
2. **Carregue o bootstrap**: copie [`prompts/bootstrap/00_system.md`](prompts/bootstrap/00_system.md) + [`prompts/bootstrap/01_first_cycle.md`](prompts/bootstrap/01_first_cycle.md) no MiniMax Agent Team.
3. **SONDA** roda o diagnóstico curto (10–15 min) e classifica o nível real.
4. **CARTÓGRAFO** desenha a trilha personalizada começando na **primeira lacuna comprovada**.
5. **MAESTRO** opera a state machine. Cada unidade passa por portão empírico antes de virar "dominada".

---

## 📚 Documentação

- [Arquitetura completa](docs/00_architecture.md)
- [Catálogo dos 14 agentes](docs/01_agent_roster.md)
- [Máquina de estados](docs/02_state_machine.md)
- [Trilha de robustez](docs/03_robustness_trail.md)
- [Portões empíricos / DoD](docs/04_empirical_gates.md)
- [Sistema de memória](docs/05_memory_system.md)
- [Quality Gate da Atena](docs/06_metrics_quality_gate.md)
- [Governança Sêneca](docs/07_governance_sla.md)

---

*Construído com 🥋 para aprender a programar como engenheiro sênior — com **dados, não opinião**, e **evidência executável, não consenso**.*
