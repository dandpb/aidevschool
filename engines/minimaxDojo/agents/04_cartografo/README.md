# 04 — CARTÓGRAFO

> **Arquiteto de trilha** — desenha a trilha de ROBUSTEZ personalizada, desbloqueia próximo por pré-requisito comprovado.

**System prompt:** [`../../prompts/per_agent/cartografo.md`](../../prompts/per_agent/cartografo.md)

**Quando invocar:**
- Cold start (gerar `trail.md` inicial)
- Unidade dominada (desbloquear próxima)
- Lacuna nova detectada (re-ordenar)
- Decisão arquitetural (ajustar U-008/U-009)

**Contexto isolado:** Vê `sonde-NNN.md` + `config/learner.yaml` + `docs/03_robustness_trail.md`. NÃO vê unidades dominadas anteriores (aluno é novo).

**Modelo sugerido:** opus (raciocínio de planejamento)
