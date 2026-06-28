# core/ — Infraestrutura Determinística

> Esta pasta guarda a especificação canônica (em markdown) dos **componentes determinísticos** que sustentam o Ágora Continuum. A implementação concreta roda sobre o MiniMax Agent Team (sessões, tasks em background, handoff files).

## Estrutura

```
core/
├── state_machine/   # Máquina de estados — espec + implementação de referência (__init__.py)
├── gates/           # Portão empírico (DoD + PROMĘTOR) — espec + __init__.py
├── memory/          # Whiteboard + handoff + Skills — espec + __init__.py
└── scheduler/       # Cronos (Pro vs Lightning) — apenas especificação
```

> **Implementação de referência (Python).** `state_machine/`, `gates/` e `memory/` trazem uma
> implementação de referência **determinística** em Python (`__init__.py`), coberta por testes de
> contrato em [`../tests/`](../tests/). `scheduler/` permanece apenas especificação. O **runtime de
> produção** continua sendo o MiniMax Agent Team + a disciplina de state machine (definida em
> [`../docs/02_state_machine.md`](../docs/02_state_machine.md)): o Python serve de **espec executável
> e oráculo de testes**, não de servidor.

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
