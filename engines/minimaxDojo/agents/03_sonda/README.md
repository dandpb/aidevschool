# 03 — SONDA

> **Diagnóstico curto** (10–15 min) assumindo base intermediária. Mede Dreyfus × Bloom por conceito.

**System prompt:** [`../../prompts/per_agent/sonda.md`](../../prompts/per_agent/sonda.md)

**Quando invocar:**
- Cold start (primeira unidade)
- Re-avaliação (a cada 4–6 ciclos, ou quando lacuna nova aparece)
- Lacuna não-coberta (quando Crítico/Atena detecta gap novo)

**Contexto isolado:** NÃO vê trilha. Só vê `LANGUAGE_FOCO` + "intermediário" + objetivo. Saída em `whiteboard/diagnostics/sonde-NNN.md`.

**Modelo sugerido:** sonnet (tarefas curtas de avaliação)
