<!-- issue: AID-1412 | key: decisao | doc_id: bce78141-dc8b-4d5f-956d-a8541b18c8f3 | updated: 2026-09-11 17:06:16.53+00 -->

# Decisão CEO D-1412-1 — B5 assumption-first (deserializa BUILD do funil O1)

(AID-1412)

# Decisão CEO D-1412-1 — Deserialização de B5 (AID-1221) do funil O1: spec assumption-first

**Decisor:** CEO (product owner por delegação do founder, AID-1211; mandato AID-1412 "pense e tome as decisões seguindo o SDLC"). **Data:** 2026-09-11 ~17:1xZ.
**Supersedes (parcial):** AID-1216 item 3 "Design CONDICIONADO" e AID-1278 "PERMANECE bloqueado por design" — quanto à condição 2 de abertura de B5. Revogável pelo founder/board a qualquer momento.

## 1. Contexto verificado first-hand (17:0xZ)
- **Gate 1 (instrumentação F2) SATISFEITO**: AID-1218 `done` (spec+countersign, PR #324) e build FPE AID-1246 `done` (agregação v4 live). A metade do condicionamento original ("spec antes dos eventos de F2 seria chute") já não se aplica.
- **Gate 2 (sinal das 1ªs sessões O1) INALCANÇÁVEL no horizonte útil**: funil AID-909 em **0/0/0/0/0** desde 09-06, founder-gated (regra c2cd1381/q2 — founder é o único canal externo); 5 cards founder pendentes (`feb9d13c`, `12b3bdaa`, `3c76b523`, `9968700b`, `ff7d1547`) + card canônico `8e6df88f` (AID-1393). Track A tem kill gate 09-13T12:00Z (watchdog `6886eac8`). Janela realista de sinal: ~09-23.
- **Founder sinalizou duas vezes o sentido da decisão**: AID-909 15:31Z 09-10 ("resolva o ticket .. desbloqueio **ou descarte**") e a série de dispatches "Desbloqueio de próximas tarefas" (AID-1326→1346→1368→1393→1412) em vez de responder os cards.
- **Custo de espera**: lane BUILD ociosa >5d; AID-1221 na fila `blocked` desde 09-10; SLA de fila coberto por receipts, mas o throughput pedido pelo founder não acontece.

## 2. Decisão
**B5 (AID-1221) abre AGORA, em modo spec assumption-first.** O sinal O1 deixa de ser pré-requisito e passa a ser **stream de validação**:

1. **Spec F1 `2026-09-10-activation-first-activity`** (owner: System Designer bb7b8143, com Content Designer f2b1e95d): cada open question vira uma **premissa de trabalho explícita** (§Premissas), cada premissa com: fundamento no P1 existente (drop dominante pré-1ª-atividade; OS 4/6 starts; literacy 1/3; zero erros técnicos), sinal de refutação esperado do O1, e custo de reversão.
2. **Porta de revisão**: primeira revisão obrigatória da spec quando chegar (a) 1º sinal de sessões O1, (b) scorecards O1 (~09-23), ou (c) veredito do kill gate Track A (09-13T12:00Z) — o que vier primeiro. Se O1 morrer no kill gate, a spec segue com as premissas e a revisão vira gate de build (plan), não de retorno à fila.
3. **Rastreabilidade**: eventos F2 (live) ancoram as métricas da spec; nenhuma decisão de UX definitiva é "casada" antes do sinal — premissas marcadas como revogáveis.

## 3. O que NÃO muda
- **AID-1222 (B6/W2 l33–l35)**: permanece data-gated (§5-R4, scorecards ~09-23) — default registrado pelo CD (sem dados ⇒ candidato líder "contexto de projeto e trabalho contínuo") já cobre o caso O1-morto; revogável pelo SM/board.
- **AID-670** (janela 21d, gate d+21 09-23, backstop AID-1120 monitor ok) e **AID-871** (vendor #13155, tracker AID-1290 monitor 09-17): gates intencionais/temporais verificados hoje — sem mudança.
- **Funil O1 (AID-909/AID-641)**: continua como stream de validação; cards founder permanecem vivos; nada aqui responde nem cancela o card canônico `8e6df88f`.

## 4. Racional SDLC
Intent já aceita (AID-1216 item 3) → o gate de spec é onde premissas explícitas pertencem; spec com assumption log + revisão vinculada a dado é o padrão de menor risco quando o custo de lane ociosa supera o custo de revisão de spec. Modo de falha conhecido (spec-chute) mitigado por: premissas nomeadas, sinais de refutação, revisão obrigatória no primeiro dado.

## 5. Execução nesta run
- PATCH AID-1221: `blocked` → `todo`, `blockedBy: []`, assignee **System Designer** (bb7b8143), prioridade **high** (cabeça da lane BUILD), comentário-dispatch com runbook.
- Receipt em AID-1412 e cross-ref em AID-1393 (thread canônica do ask O1).
