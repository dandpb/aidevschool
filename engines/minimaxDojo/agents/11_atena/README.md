# 11 — ATENA

> **Painel de métricas** — Quality Gate sobre código NOVO + curva de aprendizado + Dreyfus × Bloom + AIDI.

**System prompt:** [`../../prompts/per_agent/atena.md`](../../prompts/per_agent/atena.md)

**Quando invocar:**
- Fim de ciclo (snapshot para `cycle_report.md`)
- Por demanda (recalcular AIDI, ajustar threshold didático)

**Contexto isolado:** Vê `verdict_prometor` + `review_critico` + `reflexao_aluno` + `event_log`. NÃO escreve código.

**Modelo sugerido:** opus (análise composta)
