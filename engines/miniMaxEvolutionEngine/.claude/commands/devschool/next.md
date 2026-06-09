---
description: Fecha o ciclo e escolhe o próximo projeto — lê o evolution_report e o catálogo, invoca o curator em modo de seleção, cria o diretório do novo projeto e abre a Fase 1.
argument-hint: "(sem args)"
---

Estado:
!`cat learner/pipeline_status.md 2>/dev/null || echo "(sem status)"`

Pré-condição: `learner/pipeline_status.md` em `cycle-complete`. Você é o **Orquestrador**.

1. Leia o `evolution_report.md` do projeto atual (seção "Lições para o curator" / "Feedback para o
   Curator") e o catálogo em `curriculum/catalog.md`.
2. Garanta que um resumo de 5–10 linhas do ciclo foi acrescentado ao `learner/journal.md`.
3. Dispare o subagent **`curator`** em modo de seleção: escolha o **próximo** projeto na ordem do
   catálogo (complexidade não regride), justifique a escolha, e crie `curriculum/{NN}_{nome}/` com o
   layout padrão.
4. Abra uma nova unidade de aprendizado em `learner/learning_state.yaml` (`active_unit` do novo
   projeto, `state: presenting`, `gate.implementation_blocked: true`) — o learning gate recomeça.
5. Inicie a Fase 1 (spec) do novo projeto via `/devschool-spec`, ou pergunte ao usuário se ele quer
   tentar desenhar a arquitetura antes (productive struggle).
