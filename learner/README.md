# `learner/` — jornada do aprendiz (substrato COMPARTILHADO do ecossistema)

Estado **único** do aprendiz, compartilhado por **todos os motores** em `engines/*`.
Princípio: **1 aprendiz, 1 jornada** — o progresso não se fragmenta entre motores.

| Arquivo | Papel |
|---------|-------|
| `learning_state.yaml` | Learning gate: máquina `presenting→practicing→evaluating→mastered` + portão empírico + flag `implementation_blocked` |
| `learner_profile.md` | Matriz Dreyfus × Bloom, pré-requisitos comprovados, lacunas |
| `pitfalls.md` | Memória de pegadinhas (erros recorrentes → revisão espaçada) |
| `journal.md` | Base de conhecimento append-only (era `learning_journal.md`) |
| `pipeline_status.yaml` | Estado canônico e legível por máquina do pipeline de software atual |
| `pipeline_status.md` | Narrativa humana do ciclo; não é fonte nem fallback para máquinas |
| `verifier_receipts/` | Recibos JSON independentes, ligados à evidência do produtor por digest canônico |

O gate compartilhado vive em [`gate/`](gate/README.md). Um bloco `verifier`
embutido na evidência do produtor não autoriza `mastered`; o verificador escreve
um recibo separado em `verifier_receipts/`, e `learner.gate` confere o digest antes
de registrar qualquer resultado.

## Como os motores acessam
Cada motor tem um symlink interno para cá — ex.: `engines/miniMaxEvolutionEngine/learner → ../../learner`.
Assim as refs do motor (`learner/...`) resolvem para este diretório.

## Compatibilidade (legado)
A raiz do ecossistema mantém symlinks para ferramentas/plataformas antigas:
`.agora → learner` e `learning_journal.md → learner/journal.md`.

> O `.mavis/learning_state.yaml` é o espelho mantido pela plataforma Mavis. A intenção é **convergir**
> a fonte da verdade aqui (`learner/learning_state.yaml`) ao longo do tempo.
