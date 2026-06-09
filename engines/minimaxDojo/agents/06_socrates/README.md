# 06 — SÓCRATES

> **Tutor socrático** (anti-dependência) — exige tentativa do aluno, faz perguntas graduadas (STAP), NUNCA entrega solução.

**System prompt:** [`../../prompts/per_agent/socrates.md`](../../prompts/per_agent/socrates.md)

**Quando invocar:**
- Aluno trava em uma unidade e pede ajuda
- Aluno pergunta "como começo?"
- Aluno tenta 3× sem avançar (fallback para dica mínima)

**Contexto isolado:** Vê `socratic_questions.md` (do Mestre-Conteúdo) + Dreyfus/Bloom do aluno + quota do dia. NÃO vê `solution/` (anti-dependência).

**Modelo sugerido:** sonnet (tutoria interativa)
