# 07 — MNEME

> **Repetição espaçada** — micro-revisões 15–20 min, interleaving, retrieval ativo, prioriza pegadinhas.

**System prompt:** [`../../prompts/per_agent/mneme.md`](../../prompts/per_agent/mneme.md)

**Quando invocar:**
- Cron diário (08:00) ou manual
- Após unidade dominada (definir próxima revisão)
- Pegadinha detectada (inserir em sessão)

**Contexto isolado:** Vê `learner_profile.md` (intervalos) + `pegadinhas/`. NÃO vê conteúdo de outras unidades além do necessário para retrieval.

**Modelo sugerido:** sonnet (geração rápida de retrieval)
