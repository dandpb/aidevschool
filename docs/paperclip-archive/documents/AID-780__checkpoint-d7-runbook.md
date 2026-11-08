<!-- issue: AID-780 | key: checkpoint-d7-runbook | doc_id: 0ee6abe8-a2c7-48fe-a02d-8e1c486963de | updated: 2026-09-04 05:11:02.683+00 -->

# Runbook — CHECKPOINT d+7 (AID-780, janela 21d O3-C1 / AID-670)

(AID-780)

# Runbook — CHECKPOINT d+7 (AID-780, janela 21d O3-C1 / AID-670)

Executar SOMENTE em/após **2026-09-09T17:16Z** (d+0 = 2026-09-02T17:16:03Z). Antes do gate: ack apenas — já feito (comentário `53acdbda`, 2026-09-04T05:06Z). Este runbook NÃO substitui o ledger da âncora (AID-670 doc `janela-21d`); é o guia de operação desta child com o deliverable específico dela (receipt + veredito de tendência).

## 0. Pré-checques (idempotência)
- Ler comentários da AID-670: se existir comentário pós-2026-09-09T17:16Z com marcador `CHECKPOINT d+7` → NÃO duplicar. Reconciliar aderência ao protocolo (ledger §Método por checkpoint), comentar a reconciliação na AID-670 apenas se faltar algo, e ir direto ao §4 (receipt).
- Watchdog `255989ed` (AID-670): se já cobriu, apenas reconciliar (mandato AID-780 §1).

## 1. Varredura (método fixado no ledger `janela-21d`; baselines do d+1 entre parênteses)
1. **Scan P1/P2 abertos nas C1 l01–l07** — board completo, filtrar não-done × defeito contra C1 (baseline d+1: zero).
2. **CI no pin `4c2aeb7`** — GitHub API check-runs (baseline d+1: verde, 36 check-runs = 35 success + 1 skipped). O pin não muda; `main` pode ter avançado (PRs pós-janela não são defeito C1).
3. **Cadeia pós-promoção** — AID-657/AID-667 `done`, PR #249 merged (baseline d+1: fechada; só confirmar não-regressão).
4. **Métricas agregadas (só superfícies existentes)** — tentativas/pass das 13 atividades novas (l01-a2/a3 … l07-a2/a3); conclusão de revisões (card "Revisão pendente"); abandono E1: **N/A sem canal agregado** (`literacy-evidence v1` é local do learner; NUNCA inferir). Funil OP-B (AID-675–677): direcional apenas se ativado até lá (gate board, ADR-0010 §4). Síntese UX AID-641: usar se publicada.

## 2. Regras de honestidade (anti-claim — mandato AID-780)
- Tendência d+1→d+7 reportada SOMENTE por canal com dado real em AMBOS os extremos.
- Canal N/A no d+1 e ainda sem dado no d+7 → veredito **"N/A — sem canal"**, nunca "estável".
- Hipóteses nunca viram claim de eficácia.

## 3. Publicação
- Comentário na AID-670 com marcador `CHECKPOINT d+7` (formato espelha o d+1: seções 1–5).
- Atualizar ledger `janela-21d` (AID-670): linha d+7 da tabela de registro + seção estado entre checkpoints.
- P1/P2 novo em C1 a qualquer momento → follow-up imediato de defeito (dono FPE `fa8130d5-e24e-4f98-8470-ccfeef17c6d5`), sem esperar d+21 (regra ledger).

## 4. Receipt (fechar AID-780 `done`)
- Feito/reconciliado + permalink do comentário d+7 na AID-670.
- **Veredito curto de tendência d+1→d+7 por métrica**: subiu / estável / caiu / N/A-sem-canal — insumo para o go/no-go do CEO sobre a spec final da O3-C2 (l08–l13). Regra vinculante: O3-C2 NÃO liberado até C1 sustentar + evidência OP-B (spec AID-644 §8.7; nenhum conteúdo novo durante a janela).

## 5. Ponteiros (execução barata — não re-escavar)
- Ledger: AID-670 doc `janela-21d` (rev `5665857a`, atualizado 2026-09-04T01:16Z); baseline d+0: doc `baseline-d0`.
- Checkpoint d+1 (baseline numérico completo + formato): comentário AID-670 de `2026-09-03T18:12Z`, receipt AID-741 `742a8051` / comentário `89197c37`.
- Watchdog: `255989ed` na AID-670 — `active`; defeito scheduler AID-727 fechado `done` 2026-09-03T20:08Z, mas disparo pós-fix ainda não observado em checkpoint devido (registrar no d+7 se disparou ou não).
- Fallback se nem watchdog nem run desta child até **d+6 = 2026-09-08T17:16Z**: ORDEM manual espelho AID-739/B → AID-741 (regra já no ledger, ACK `59483378`).
- Repositório de descanso da âncora: `in_progress` (relay AID-758/A → AID-759 — supera protocolo AID-684 regra 2).