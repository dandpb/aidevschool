---
name: agora-continuum
description: Protocolo pedagógico do AI DevSchool (learning gate). Use ao conduzir uma sessão de aprendizado, diagnosticar o nível do aprendiz, decidir se a IA pode implementar uma unidade, marcar mastery, ou aplicar guardrails anti-dependência. Encoda a máquina presenting→practicing→evaluating→mastered, o portão empírico e a tutoria socrática.
---

# Ágora Continuum — o learning gate

Este skill define a camada **pedagógica** que roda sobre o MiniMax Evolution Engine. O objetivo
do repositório é **o humano aprender** engenharia de software, não a IA fazer por ele. Estado vivo em
[learner/learning_state.yaml](../../../learner/learning_state.yaml).

## Máquina de estados (determinística, por unidade)

`presenting → practicing → evaluating → mastered` (com `retry_count`/`retry_limit`).

- **presenting** — o `sonda` diagnostica e apresenta o conceito no nível certo (ZPD), com um desafio
  de tentativa. A IA **não** implementa ainda.
- **practicing** — o aprendiz tenta. A IA atua **socraticamente** (perguntas e dicas graduadas),
  nunca entregando a solução.
- **evaluating** — a tentativa é avaliada com **evidência executável** (testes/cobertura/mutation).
- **mastered** — promovido **somente** quando o portão empírico passa. Registre em `units_log` com a
  evidência. Erros viram pegadinhas; acertos viram generalizações no `learner/journal.md`.

A "certeza de conclusão" **nunca** fica no LLM: é a máquina de estados + o portão empírico que decidem.

## O gate de implementação

Enquanto `gate.implementation_blocked: true` e `required_before_implementation: true`, **a IA não
implementa a unidade**. Destrave só quando `unblock_condition: learner_attempt_evaluated` for
satisfeita (a tentativa do aprendiz existe e foi avaliada). Fluxo: `/devschool-diagnose` → aprendiz
tenta → avaliação → destrava → `/devschool-implement`.

## Portão empírico (anti-alucinação pedagógica)

- Nada avança sem **execução real**. Sem números fabricados.
- Limiares (de `active_unit.empirical_gate`): cobertura do núcleo ≥ `min_coverage` (0.80),
  mutation score ≥ `mutation_min` (⟨config: gates.mutation_score_min⟩ = 0.65) quando aplicável.
- A verificação parte **do zero** (subagent `verifier`), sem o contexto de quem produziu — anti-ancoragem.

## Guardrails anti-dependência (tutoria socrática)

- Antes de qualquer dica, peça: a tentativa do aprendiz + o ponto **exato** de confusão.
- Responda com perguntas/pistas graduadas, não com a solução pronta. Calibre o andaime ao nível
  (mais andaime no início; fading conforme avança — `learner.level`).
- Em confusão persistente, escale ao humano em vez de entregar a resposta.
- Monitore a especificidade das perguntas do aprendiz — perguntas vagas/uso excessivo sinalizam
  cognitive offloading; aumente o "productive struggle".

## Memória

- **Pegadinhas:** erros recorrentes → [learner/pitfalls.md](../../../learner/pitfalls.md) → revisão
  espaçada (intercalada, recuperação ativa).
- **Perfil:** matriz Dreyfus × Bloom em [learner/learner_profile.md](../../../learner/learner_profile.md).
- **Generalizações:** padrões/lições reutilizáveis → `learner/journal.md` (append-only).

## Como atualizar o estado

Edite `learner/learning_state.yaml`: avance `active_unit.state`, incremente `retry_count` em falha
(respeite `retry_limit`), e flipe `gate.implementation_blocked` apenas quando o gate for satisfeito.
Ao concluir uma unidade, faça append em `units_log` com `{id, mastered_at, evidence}`.

## Roteamento de modelo

Raciocínio profundo (diagnóstico fino, review, arquitetura, verificação): **opus**.
Geração/execução de alto volume (exercícios, scripts): **sonnet**. O verificador roda em tier
diferente dos produtores para diversidade tipo cross-model.

> Comandos relacionados: `/devschool-status`, `/devschool-diagnose`. Orquestração geral em `CLAUDE.md`.
