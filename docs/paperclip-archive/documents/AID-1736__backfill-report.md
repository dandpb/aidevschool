<!-- issue: AID-1736 | key: backfill-report | doc_id: 54309436-678a-449e-81c1-296f854ff128 | updated: 2026-09-13 14:20:22.746+00 -->

# Backfill de interações + baseline watchdog fila founder (2026-09-13)

(AID-1736)

# Backfill de interações — baseline 2026-09-13T14:30Z (AID-1736/F1)

**Método:** varredura de TODAS as 1300 issues da companhia (1228 done, 45 cancelled, 12 in_review, 10 in_progress, 3 todo, 1 blocked, 1 backlog) via `GET /api/issues/{id}/interactions`, incluindo issues em status terminal — exatamente o backlog invisível às varreduras normais de liveness. 226 cards de interação no total; **23 `pending`**.

## Sumário executivo

| Indicador | Valor | Limiar |
|---|---|---|
| Cards pending totais (fila founder) | **23** | aceite <10 |
| Órfãos em issues terminais | **14** | — |
| Órfãos >48h (warn) | **13** | aceite 0 |
| Órfãos >7d (escalate) | **10** | — |
| Gates vivos | **9** (todos <48h) | — |
| Time-to-gate founder: mais antigo vivo | **23.0h** (AID-1503) | warn >48h |
| Time-to-gate founder: média vivos | **13.3h** | — |

## 1. Órfãos/superseded — CANCELAR no board (14 cards, ação founder, board-only)

Cards `pending` em issues done/cancelled/todo. Não são resolúveis por agente (403, verificado AID-570) e enterram os gates vivos — mesma patologia do efeito AID-1624.

| # | Card (interaction id) | Issue | Status issue | Tipo | Idade | Título |
|---|---|---|---|---|---|---|
| 1 | `ace557f6` | AID-140 | cancelled | request_confirmation | 19.6d (471h) | Autorizar publicação de novo candidato do piloto |
| 2 | `1a56c80a` | AID-140 | cancelled | request_confirmation | 19.6d (471h) | Autorizar publicação de novo candidato do piloto |
| 3 | `5591d831` | AID-140 | cancelled | request_confirmation | 18.8d (452h) | Decidir retomada do piloto nos sucessores aprovados |
| 4 | `37f817e9` | AID-197 | cancelled | request_confirmation | 18.4d (442h) |  |
| 5 | `f174a0df` | AID-461 | cancelled | ask_user_questions | 13.3d (318h) | AID-461 probe2: qual é a verificação pretendida? |
| 6 | `cf8b749c` | AID-641 | todo | ask_user_questions | 10.9d (261h) | AID-641 — Recrutamento n=5–8 devs para o teste moderado O1 (QA GO publicado) |
| 7 | `9aa50a05` | AID-732 | cancelled | ask_user_questions | 10.1d (241h) | AID-732 · Desbloqueio: 3 decisões do founder (piloto P6 · I2 retorno · triage AI |
| 8 | `8419f040` | AID-737 | cancelled | ask_user_questions | 9.9d (238h) | AID-737 · Desbloqueio: pre-flight VERDE (veredito acima) — 3 decisões do founder |
| 9 | `a3d01a76` | AID-641 | todo | request_confirmation | 8.1d (194h) | O1 em risco: estender janela até ~09-23 (d+21 O3-C1) OU indicações agora |
| 10 | `776d12f7` | AID-920 | cancelled | ask_user_questions | 7.0d (168h) | Desbloqueio O1 — 2 ações que só você pode fazer (intros + ratificação G&R) |
| 11 | `be859c7f` | AID-929 | cancelled | ask_user_questions | 7.0d (167h) | Sweep AID-929 — corredor mergeado; 2 decisões só suas (consolidado dos cards AID |
| 12 | `2b11bda8` | AID-937 | cancelled | ask_user_questions | 6.9d (166h) |  |
| 13 | `a9fb9b1c` | AID-954 | cancelled | ask_user_questions | 6.9d (164h) | Desbloqueio AID-954 — 4 decisões que só você pode tomar (intros O1 = bloqueio #1 |
| 14 | `d0e5c6d1` | AID-1645 | cancelled | ask_user_questions | 8.4h | AID-1645 veio vazia — qual é a intenção? |

Notas: AID-140 tem 3 cards na mesma issue cancelada; AID-641 (todo) tem 2 cards de recrutamento O1 de 8–11d. 12 dos 14 já constavam no doc `cleanup-dispatch` (AID-1624); os demais são acréscimos pós-limpeza (ex.: AID-1645, 8h) — evidência de que o re-entulho recomeça sem backfill.

## 2. Gates vivos — MANTER (9 cards, todos <48h)

| # | Card (interaction id) | Issue | Status issue | Tipo | Idade | Título |
|---|---|---|---|---|---|---|
| 1 | `042e84fb` | AID-1503 | in_progress | ask_user_questions | 23.0h | Conta TabNews p/ Canal 2 (3 min): criar conta + entregar credencial em canal seg |
| 2 | `cd35f433` | AID-1526 | in_review | request_confirmation | 18.6h | Aprovação da política R1 de review/merge (DRAFT v0) — PR #351 |
| 3 | `b0164ecb` | AID-909 | in_progress | ask_user_questions | 15.3h | Canal 1 (re-ask): o pack de e-mail foi enviado? sim/nao |
| 4 | `69726372` | AID-1584 | in_review | request_confirmation | 12.3h | CEO: aprovar pipeline de quick wins O1 (doc web-audit §7) — QW1–QW3 code-side, Q |
| 5 | `a0a9a93a` | AID-1582 | in_review | request_confirmation | 12.2h | Aceite das 3 primeiras PRs (AID-1582 onboarding) |
| 6 | `d827e1ca` | AID-1589 | in_review | request_confirmation | 11.7h | RE-ASK (26,5h+): Aprovação founder — política R1 de review/merge (PR #351) |
| 7 | `fb3cd08b` | AID-1607 | in_review | request_confirmation | 10.7h | RATIFICAÇÃO founder — diretiva v3: auditorias SDLC por despacho (decisão AID-160 |
| 8 | `4199996a` | AID-1624 | in_review | request_confirmation | 9.7h | Fila founder: executar lote de limpeza — cancelar 12 cards superseded (doc clean |
| 9 | `6ac4e25a` | AID-1671 | in_review | request_confirmation | 6.1h | GO/NO-GO: review + merge do PR #380 (hardening-top10 R8, curriculum/15) |

Nota: o card do AID-1589 é RE-ASK do gate R1 já pendente em AID-1526 (política R1/PR #351) — duplicado consolidável; recomendo cancelar o RE-ASK e manter o original AID-1526 (decisão founder, board-only).

## 3. Dispositivo permanente (F2)

Rotina **`c74695f1` "Watchdog semanal — idade da fila founder (AID-1736)"** criada: trigger cron `0 12 * * 1` UTC (`9795ce1e`, próxima execução 2026-09-14T12:00Z), assignee CEO, parent = carrier AID-1714. Cada execução republica este report no carrier com as idades atualizadas.

**Aceite AID-1736:** <10 pending totais e 0 superseded >48h por 2 semanas consecutivas de watchdog (janela começa a contar quando o founder executar o cancelamento dos 14 órfãos acima).
