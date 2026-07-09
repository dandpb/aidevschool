# 📑 minimaxDojo — Índice

> **Mapa completo de arquivos.** Para usar o dojo, comece pelo [`QUICK_START.md`](QUICK_START.md).

## 🚀 Por onde começar

| Se você quer... | Vá para... |
|------------------|------------|
| **Começar agora** | [`docs/QUICK_START.md`](docs/QUICK_START.md) |
| **Entender a missão** | [`README.md`](README.md) |
| **Configurar o learner** | [`config/learner.yaml`](config/learner.yaml) |
| **Carregar no MiniMax** | [`prompts/bootstrap/00_system.md`](prompts/bootstrap/00_system.md) + [`01_first_cycle.md`](prompts/bootstrap/01_first_cycle.md) |

## 🏛️ Arquitetura (docs/)

| Doc | Conteúdo |
|-----|----------|
| [00_architecture.md](docs/00_architecture.md) | Arquitetura completa, 5 camadas, fluxo de execução |
| [01_agent_roster.md](docs/01_agent_roster.md) | Catálogo detalhado dos 14 agentes (papel/inputs/outputs/ferramentas) |
| [02_state_machine.md](docs/02_state_machine.md) | Especificação formal da state machine (4 estados + sub-máquina) |
| [03_robustness_trail.md](docs/03_robustness_trail.md) | Trilha de 9 unidades (TDD→arquitetura) |
| [04_empirical_gates.md](docs/04_empirical_gates.md) | Portão empírico / DoD por unidade / anti-padrões |
| [05_memory_system.md](docs/05_memory_system.md) | 3 camadas de memória, whiteboard, Skills |
| [06_metrics_quality_gate.md](docs/06_metrics_quality_gate.md) | Quality Gate + AIDI + Dreyfus × Bloom |
| [07_governance_sla.md](docs/07_governance_sla.md) | Sêneca: auto-escala + SLA 24h |
| [QUICK_START.md](docs/QUICK_START.md) | 3 passos para começar |

## 🤖 Agentes (14)

Roster: [`agents/README.md`](agents/README.md). Prompts: [`prompts/per_agent/`](prompts/per_agent/). Details: [`docs/01_agent_roster.md`](docs/01_agent_roster.md).

## 🧠 Whiteboard (perfil vivo)

| Arquivo | Conteúdo |
|---------|----------|
| [learner_profile.md](whiteboard/learner_profile.md) | TaskState + Dreyfus × Bloom + pegadinhas + Skills |
| [trail.md](whiteboard/trail.md) | Trilha personalizada do aluno |
| [cron_registry.yaml](whiteboard/cron_registry.yaml) | Registro de tarefas recorrentes |
| `decisions/cycle-01-intake.md` | ADR inicial (foco TypeScript) |
| `event_log/events-2025-W00.ndjson` | Log de cold start |
| `diagnostics/sonde-000-template.md` | Template do primeiro SONDA |

## ⚙️ Infraestrutura (core/)

| Componente | Doc | Canônico |
|------------|-----|----------|
| State machine | [core/state_machine/](core/state_machine/) | [docs/02_state_machine.md](docs/02_state_machine.md) |
| Gates (portão) | [core/gates/](core/gates/) | [docs/04_empirical_gates.md](docs/04_empirical_gates.md) |
| Memory (whiteboard) | [core/memory/](core/memory/) | [docs/05_memory_system.md](docs/05_memory_system.md) |
| Scheduler (Cronos) | [prompts/per_agent/cronos.md](prompts/per_agent/cronos.md) + [whiteboard/cron_registry.yaml](whiteboard/cron_registry.yaml) | same |

## 📋 Templates de Saída (prompts/cycles/)

| Template | Quando |
|----------|--------|
| [cycle_report.md](prompts/cycles/cycle_report.md) | Toda notificação ao aluno (7 seções) |

## 🔧 Config

| Arquivo | Conteúdo |
|---------|----------|
| [config/learner.yaml](config/learner.yaml) | Perfil + thresholds + crons + modelos |

## 📂 Estrutura Final

```
minimaxDojo/
├── README.md                          # visão geral
├── INDEX.md                           # este arquivo
├── docs/                              # 8 documentos canônicos
├── prompts/
│   ├── bootstrap/                     # 00_system + 01_first_cycle
│   ├── per_agent/                     # 14 system prompts
│   └── cycles/                        # cycle_report template
├── agents/                            # roster only (prompts in prompts/per_agent/)
├── core/                              # state_machine, gates, memory, scheduler
├── config/learner.yaml                # perfil do aluno + thresholds
├── whiteboard/                        # perfil vivo + handoffs + skills + ADRs
├── exercises/                         # (reservado)
├── reports/                           # (reservado)
├── src/                               # (reservado)
└── tests/                             # (reservado)
```
