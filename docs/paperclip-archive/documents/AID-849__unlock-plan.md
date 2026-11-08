<!-- issue: AID-849 | key: unlock-plan | doc_id: 06476a68-440a-4dcc-9e5d-92cdd6f13673 | updated: 2026-09-05 09:04:27.417+00 -->

# AID-849 — Plano de desbloqueio das próximas tarefas (CEO sweep 2026-09-05)

(AID-849)

# Plano de desbloqueio — AID-849 (CEO sweep, 2026-09-05 09:00Z)

## Objetivo da empresa (fonte: goal ativo `754b6643`)
Democratizar conhecimento e aplicação de IA por meio de lições curtas e práticas, com ritmo estilo Duolingo. Dois públicos: (a) pessoas que querem usar IA sem programar; (b) devs que querem construir software robusto com IA. Repo: https://github.com/dandpb/aidevschool

## Onde estamos (verificado first-hand nesta run)
- Conteúdo: 29 lições prontas no catálogo (20 ia_pratica + 9 dev); l27–l29 (trilha dev) publicadas; matriz de prontidão literacia+SO `customer-ready` (09-04).
- Teste moderado O1 (l27–l29): recrutamento aberto, funil 0/0/0/0 — intake do founder pendente há ~30h (`42e6116b`, AID-768).
- O3-C2 (retrofit de atividades l08–l13, 75→87): spec rev 2 entregue pelo System Designer (AID-838), confirmation `02abea83` pendente — protocolo: acatar pós-checkpoint d+7 (2026-09-09 17:16Z).
- Plataforma (Paperclip): 2 defeitos de watchdog/monitor contidos (AID-814/823); card founder `97f3b5d6` pendente para rotear relatório upstream.
- Janela O3-C1 21d: gate d+7 em 2026-09-08 17:16Z (AID-815, wake via rotina horária `c68a1d61` — viva; criou esta issue).

## Gargalos reais (todos os caminhos por tempo estão ARMADOS e verificados)
1. **Founder — intake O1** (AID-768 `42e6116b`): indicações de devs OU prorrogação de janela. Hoje 12:05Z o gate AID-832 executa protocolo AID-785 passo 2 (declaração de risco + card de janela estendida) se continuar 0/0/0/0.
2. **Founder — relay upstream** (AID-814 `97f3b5d6`): autorizar roteamento do relatório de defeitos aos mantenedores.
3. **Founder/CEO — spec O3-C2** (AID-838 `02abea83`): acatar agora (antecipado) ou manter pós-d+7 (protocolo). Antecipar libera dispatch do retrofit para o Content Designer imediatamente; o checkpoint d+7 continua governando O3-C1 de forma independente.

## Ações executadas neste sweep
- Auditoria first-hand das 6 issues abertas + 3 interações pendentes do founder (nenhuma outra pendência board-wide).
- Verificação do monitor primário AID-832 (`nextCheckAt 2026-09-05T12:05Z`, wake_owner) — íntegro.
- Consolidação das 3 decisões em UMA ask_user_questions nesta issue (wake_assignee).
- Comentário-receipt `a52a4921` com a matriz de estado.

## Dispatch pós-resposta do founder
| Resposta | Ação imediata | Owner |
|---|---|---|
| Q1: indicações ou prorrogação | UX retoma funil O1 na AID-768; gate 12:05Z faz supersede se respondido a tempo | UX Designer |
| Q2: aceitar relay | Manter pacote AID-814/823 em verificação §1.2 pós-resposta dos mantenedores | CEO |
| Q3: acatar antecipado | Aceitar `02abea83` + criar child de dispatch O3-C2 (retrofit l08–l13) | CEO → Content Designer |

## Delegação e contratação de agentes
- Nada delegável agora: próximas ações materiais são decisões do founder ou protocolos CEO já agendados (12:05Z hoje; sweep d+7 em 09-08).
- **Não criar novos agentes.** Bench atual (System Designer, Content Designer, UX Designer, QA Lead, SDLC Scrum Master, Founding Product Engineer, CEO) cobre todas as funções; gargalo é decisão/tempo, não capacidade. Gatilhos para reavaliar: funil O1 ativo (≥3 sessões agendadas → avaliar agente de moderação/support) ou dispatch O3-C2 em andamento (carga de conteúdo > 1 lane paralela).
