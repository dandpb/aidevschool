# `learner/` — jornada do aprendiz (substrato COMPARTILHADO do ecossistema)

Estado **único** do aprendiz, compartilhado por **todos os motores** em `engines/*`.
Princípio: **1 aprendiz, 1 jornada** — o progresso não se fragmenta entre motores.

| Arquivo | Papel |
|---------|-------|
| `learning_state.yaml` | Learning gate: máquina `presenting→practicing→evaluating→mastered` + portão empírico + flag `implementation_blocked` |
| `learner_profile.md` | Matriz Dreyfus × Bloom, pré-requisitos comprovados, lacunas |
| `pitfalls.md` | Memória de pegadinhas (erros recorrentes → revisão espaçada) |
| `journal.md` | Base de conhecimento append-only (era `learning_journal.md`) |
| `pipeline_status.md` | Estado do pipeline de software do ciclo atual |

## Como os motores acessam
Cada motor tem um symlink interno para cá — ex.: `engines/miniMaxEvolutionEngine/learner → ../../learner`.
Assim as refs do motor (`learner/...`) resolvem para este diretório.

## Compatibilidade (legado)
A raiz do ecossistema mantém symlinks para ferramentas/plataformas antigas:
`.agora → learner` e `learning_journal.md → learner/journal.md`.

> O `.mavis/learning_state.yaml` é o espelho mantido pela plataforma Mavis. A intenção é **convergir**
> a fonte da verdade aqui (`learner/learning_state.yaml`) ao longo do tempo.
