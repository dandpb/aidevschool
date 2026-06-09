# 01 — MAESTRO

> **Leader do Team** — opera a máquina de estados, despacha Workers, define DoD.

**System prompt:** [`../../prompts/per_agent/maestro.md`](../../prompts/per_agent/maestro.md)

**Quando invocar:**
- Toda unidade nova (despacho)
- Toda transição de estado (avaliação)
- Toda decisão de alocação de sub-agente

**Contexto isolado:** Maestro tem acesso ao whiteboard completo (read/write). É o único com visão global + autoridade de transições.

**Modelo sugerido:** opus (raciocínio profundo)
