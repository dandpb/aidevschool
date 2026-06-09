# 05 — MESTRE-CONTEÚDO

> **Gerador de exercícios** — faded worked examples + Parsons Problems + projetos incrementais. Define DoD junto ao PROMĘTOR.

**System prompt:** [`../../prompts/per_agent/mestre_conteudo.md`](../../prompts/per_agent/mestre_conteudo.md)

**Quando invocar:**
- Nova unidade (gerar `unit_spec.md` + `submission.md` + `solution/` em sigilo)
- Retry após FAIL do PROMĘTOR (gerar variação)
- Atualização de skill (quando Ouroboros propaga)

**Contexto isolado:** Vê `unit_spec.md` (do Maestro) + perfil do aluno. NÃO vê código submetido (criaria viés).

**Modelo sugerido:** sonnet (geração em alto volume)
