# core/ — Infraestrutura Determinística

> Esta pasta guarda a especificação canônica (em markdown) dos **componentes determinísticos** que sustentam o Ágora Continuum. A implementação concreta roda sobre o MiniMax Agent Team (sessões, tasks em background, handoff files).

## Estrutura

```
core/
├── state_machine/   # Especificação da máquina de estados (determinística)
├── gates/           # Portão empírico (DoD + PROMĘTOR)
├── memory/          # Whiteboard + handoff + Skills (curadoria)
└── scheduler/       # Cronos (Pro vs Lightning)
```

> **Não há código executável** aqui — o Ágora Continuum opera **sobre arquivos markdown** + **sub-agentes efêmeros** com contexto isolado. O "runtime" é o MiniMax + a disciplina de state machine (definida em [`../docs/02_state_machine.md`](../docs/02_state_machine.md)).

## Princípio

> **A "certeza de conclusão" nunca fica no LLM.** Toda transição de estado é mediada por:
> 1. **Eventos explícitos** (ver `state_machine/`)
> 2. **Portões empíricos** (ver `gates/`)
> 3. **Curadoria de memória** (ver `memory/`)
> 4. **Scheduler auditável** (ver `scheduler/`)

## Documentos Canônicos

- [`../docs/02_state_machine.md`](../docs/02_state_machine.md) — máquina de estados
- [`../docs/04_empirical_gates.md`](../docs/04_empirical_gates.md) — portões
- [`../docs/05_memory_system.md`](../docs/05_memory_system.md) — memória
- [`../docs/00_architecture.md`](../docs/00_architecture.md) — arquitetura
