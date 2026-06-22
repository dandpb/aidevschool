---
description: Micro-sessão de repetição espaçada (15-20 min) — dispara o subagent mneme para gerar uma sessão de revisão baseada em learner_profile.md + pitfalls.md. Retrieval ativo, interleaving ≥30%, prioriza pegadinhas. Cron diário 08:00 por padrão.
argument-hint: "[unit_id opcional — força revisão de uma unidade específica]"
---

Estado do aprendiz (última revisão de cada unidade):
!`cat learner/learner_profile.md 2>/dev/null | head -50 || echo "(sem learner_profile)"`

Dispare o subagent **`mneme`** (via Task) com o input canônico:
- `aluno_id` de `learner/learning_state.yaml`
- `unidades_dominadas` e `pegadinhas_top` de `learner/learner_profile.md`
- `unidades_em_agendamento` calculadas (1d → 3d → 7d → 14d → 30d)
- `tempo_max: 20` (min)
- Se $ARGUMENTS foi passado, force a unidade para a sessão

Re-leia `engines/minimaxDojo/prompts/per_agent/mneme.md` para as regras de seleção (1-2 da
unidade mais atrasada, 1 de interleaving, 1 de pegadinha, 0-1 desafiadora), formato da
`mneme_session.md`, e ajuste de intervalo por acerto.

Quando o `mneme` retornar:
- Salve a sessão em `whiteboard/mneme_session.md` (sobrescreve a anterior).
- Apresente ao aprendiz um resumo: 3-5 exercícios, duração estimada, unidades tocadas.
- Não espere resposta imediata — o aprendiz faz offline, traz o resultado no próximo ciclo.

Log do evento: `{"ev":"mneme.sessao","unidades":[...],"pegadinhas":[...]}` (vai para
`event_log/`; mnemosyne compacta semanalmente).

Sem cron nativo? Adicione entrada em `whiteboard/cron_fallback.md` (instrua o aprendiz a pedir
"revisão do dia" toda manhã 8h).
