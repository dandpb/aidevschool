# pixelDojo — contexto de raiz (Claude Code)

8-bit arcade games que **ensinam os assuntos do `curriculum/`**. Cada jogo mapeia **um** conceito
para **uma** mecânica de arcade, e a jogada vira a **evidência executável** do learning gate.

> Playbook completo (canônico) em **[AGENTS.md](AGENTS.md)**. Este arquivo é só o ponteiro de raiz,
> seguindo o mesmo padrão do ecossistema (AGENTS.md é a fonte; CLAUDE.md aponta).

## Regras de ouro (herdadas do ecossistema)

1. **Learning gate:** o aprendiz tenta e é avaliado (evidência executável) **antes** de marcar
   `mastered`. O jogo é a superfície de tentativa, não o juiz.
2. **Produtor ≠ verificador.** O jogo emite evidência crua; um verificador separado decide mastery e
   faz o append em `../../learner/learning_state.yaml > units_log` (hoje `[]` — fechar 1 loop = MVP).
3. **Sem afirmações sem evidência** (ensina, diverte, paridade, robustez) — exige playthrough +
   screenshots/telemetria.
4. **Filesystem é a fonte da verdade.** `curriculum/` e `learner/` ficam só na raiz; leia
   root-relative (`../../...`), nunca duplique.
5. Antes de commit: rode `/simplify` no diff, aplique, **depois** commite.

## Onde começar

- Definir um jogo: **[PLAN.md](PLAN.md)** (template + exemplo Rate Limiter já preenchido).
- Mapa de adaptação Codex→Cowork e sementes de jogo para os 12 assuntos: **[README.md](README.md)**.
- Prompts de pixel-art reutilizáveis (MiniMax): **[.prompts/8bit-style.md](.prompts/8bit-style.md)**.
