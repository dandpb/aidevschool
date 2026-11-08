<!-- issue: AID-670 | key: janela-21d | doc_id: d217244c-9e7a-410a-8646-c4904868d6a3 | updated: 2026-09-09 17:18:51.38+00 -->

# janela-21d

(AID-670)

# Razão da janela 21d O3-C1

Fonte de verdade operacional da janela (spec AID-644 rev 2 §6; abertura d+0 no comentário `d2f931ec`; watchdog `255989ed`). Atualizado a cada checkpoint.

## Âncoras

| Item | Valor |
|---|---|
| d+0 (deploy promoção) | **2026-09-02T17:16:03Z** |
| Pin de produção | main `4c2aeb7` (deploy `6a9859d1`) |
| Landing | PR #248 merged (merge_commit `4c2aeb7`, CI 36/36) |
| Registro | PR #249 (merge CEO) — não bloqueante |
| d+21 (saída) | **2026-09-23T17:16Z** |

## Cronograma (marcadores anti-duplicação)

| Checkpoint | Due (UTC) | Marcador no comentário |
|---|---|---|
| d+1 | 2026-09-03T17:16Z | `CHECKPOINT d+1` |
| d+7 | 2026-09-09T17:16Z | `CHECKPOINT d+7` |
| d+21 | 2026-09-23T17:16Z | `SAÍDA d+21` |

## Baseline A1–A8 (d+0)

- A1–A6, A8: pinados por testes no PR #248 (merged; CI verde no pin). A7 = E3 documentado e aceito. Janela monitora **comportamento real**, não re-verifica testes.
- Defeitos P1/P2 nas C1 (l01–l07): **zero abertos** em d+0.

## Método por checkpoint

1. Scan P1/P2 abertos nas C1 (board completo).
2. CI no pin `4c2aeb7`.
3. Cadeia pós-promoção: AID-657/AID-667 (re-grant + a11y + grep RD4) e PR #249.
4. Métricas (só superfícies existentes): tentativas/pass das 13 atividades novas; conclusão de revisões (card "Revisão pendente"); abandono E1 — **N/A enquanto não houver canal agregado** (literacy-evidence v1 é local do learner). Funil OP-B (AID-675–677) direcional quando promovido. Hipóteses, nunca claim de eficácia.

## Regras de saída

- A1–A8 verdes + zero P1/P2 em d+21 → veredito ao board (O3-C2 **NÃO liberado** até C1 sustentar + evidência OP-B, spec §8.7) → `done`.
- Senão → follow-up com dono nomeado → `blocked` (unblock owner = dono).
- P1/P2 durante a janela → follow-up imediato de defeito (dono FPE `fa8130d5-e24e-4f98-8470-ccfeef17c6d5`), sem esperar d+21.

## Registro de checkpoints

| Checkpoint | Data executada | P1/P2 C1 | CI pin | Cadeia pós-promo | Métricas agregadas | Nota |
|---|---|---|---|---|---|---|
| d+1 | **2026-09-03 ~18:15Z** (manual, ORDEM AID-739/B → AID-741, receipt `742a8051`; comentário `89197c37`) | **zero** | **verde 36/36** | fechada (AID-657/AID-667, PR #249) | N/A — sem canal agregado (método §4) | watchdog `255989ed` não disparou (defeito AID-727, fechado `done` 2026-09-03T20:08Z) |
| d+7 | **2026-09-09 ~17:18Z** (carrier AID-852, comentário `59dc3ba8`) | **zero** | **verde 36/36** | fechada, sem regressão | N/A — sem canal (nenhum canal com dado em ambos os extremos; telemetria LIVE `65d64bca` aguarda verificação AID-936 09-10 → baseline nova só no d+21) | watchdog `255989ed` NÃO disparou e degradou a `null` na âncora; chain fechado (AID-810/802/782 `done`, AID-780 `done` resume); token d+21 ARMADO via carrier novo (monitor 09-23T17:20Z) |
| d+21 | — pendente (due 2026-09-23 17:16Z) | — | — | — | — | — |

## Estado entre checkpoints — 2026-09-04T01:14Z (liveness)

- Repositório de descanso da janela: `in_progress` (relay CEO AID-758/A → AID-759, Ação 2 — supera regra 2 do protocolo AID-684).
- Delta P1/P2 vs. varredura d+1: **zero** (board não-done = 5, nenhum defeito C1).
- CI no pin `4c2aeb7` reverificado ao vivo: **verde** (36 check-runs = 35 success + 1 skipped).
- Watchdog `255989ed`: `active`, triggerCount 3, `lastTriggeredAt` 2026-09-02T18:12Z — sem disparo pós-fix AID-727.
- **Gatilho d+7:** sem rodada de watchdog até **d+6 (2026-09-08T17:16Z)** → checkpoint manual via ORDEM (precedente AID-739/B → AID-741). ACK do relay em comentário `59483378`.


## Estado entre checkpoints — 2026-09-08T17:1xZ (sweep d+6 / FASE 1)

- **Gatilho:** monitor one-shot da AID-840 disparou 17:16:09.795Z (gate d+6). Idempotência: primeiro executor (nenhum marcador pós-gate antes).
- **Runbook d+7 check:** doc `checkpoint-d7-runbook` (AID-780) íntegro (§0–§5).
- **Scan P1/P2 C1 (l01–l07):** board completo (500) → **zero defeitos P1/P2** (open high/critical = orquestração/plataforma apenas: AID-814/AID-823, carriers, ORDEMs, G&R/UX).
- **Decisão d+7:** checkpoint **manual confirmado** — carrier AID-852, monitor `2026-09-09T17:20:00Z`, executa runbook completo + FASE 2 (fechar AID-782/AID-802, AID-780 `done` resume:true).
- **Estado da âncora:** `blocked` atrás de AID-852 (descanso entre checkpoints — emenda §Estado). AID-840/AID-865/AID-815 fechadas `done` (cobertas).
- **CI pin `4c2aeb7`:** verificação completa agendada para o d+7 (runbook §1.2); sem indicação de mudança (pin não muda).

## Estado entre checkpoints — 2026-09-09T17:2xZ (CHECKPOINT d+7 executado)

- **Executor:** carrier AID-852 (CEO, monitor one-shot `2026-09-09T17:20:00Z`); acordado 17:16:25Z via rotina AID-1119; primeiro executor pós-gate (idempotência OK).
- **Watchdog `255989ed`:** NÃO disparou no d+7 — campo `watchdog` da âncora agora `null`, `monitorAttemptCount` 0, `lastTriggeredAt` None (first-hand; era `active`/triggerCount 3 no sweep d+6). Família de defeitos AID-823/814. Carrier é o caminho canônico daqui ao d+21.
- **Scan P1/P2 C1 (l01–l07):** board completo via queries por status (19 não-done) → **zero defeitos C1** (abertos = governança/plataforma/G&R/UX/serving apenas).
- **CI pin `4c2aeb7`:** verde — 36 check-runs = 35 success + 1 skipped, 0 failures/pending.
- **Cadeia pós-promoção:** AID-657/AID-667 `done`; PR #249 merged 09-02T19:05:24Z.
- **Métricas:** N/A — sem canal em toda métrica (regra §2 runbook: dado real em AMBOS os extremos). Telemetria LIVE `65d64bca` (PR #277) aguarda verificação AID-936 (due 09-10T12:00Z) — se confirmada, canal agregado novo com baseline no d+21 (não retroativo). OP-B N/A até ativação (ADR-0010 §4). UX AID-641 parked `todo`.
- **Veredito tendência d+1→d+7: N/A — sem canal.** O3-C2 NÃO liberado (spec §8.7); confirmations `02abea83`/`38359991` (AID-838) e ask `36cf8ba8` (AID-849) `pending` — acatadas.
- **FASE 2:** AID-810 → AID-802 → AID-782 `done` (condição temporal satisfeita); AID-780 `done` com `resume: true` + receipt.
- **Token d+21 ARMADO:** carrier backstop novo (padrão AID-852/AID-832 §5), monitor `2026-09-23T17:20:00Z`, wake_owner CEO. Próxima ação devedora: **CHECKPOINT d+21 = 2026-09-23T17:16Z** (saída §6).
