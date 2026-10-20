# Spec: AID-3772 — retorno explícito takeaway→feedback no ciclo pg-c01 (fatia r5)

Author: FPE (fa8130d5) · Change-id: AID-3772-f1-takeaway-r5 · Status: draft (aguardando revisões)

## Comportamento exigido (contrato PO `eb44c0a6`, avaliado viável na triagem `f3b633d1`)

1. **Retorno explícito takeaway→feedback** preservando A/B/C, texto do takeaway, critérios e
   histórico — novo evento `revisao-pedida`, guard `phase === 'takeaway'`, transição apenas de
   `phase`; nenhum outro campo de estado muda.
2. **Navegação não consome tentativa** — `attempt` só incrementa em `retry-pedido` (cap=2
   inalterado); `revisao-pedida` não toca `attempt`, não cria XP, não concede tentativa extra.
   **Retry continua ação separada** sobre `openRetryTargets`, disparada da fase feedback como hoje.
3. **Entrada no takeaway permissiva; conclusão proibida com blockers** — comportamento vigente
   mantido sem mudança (`takeaway-registrado` sem gate de entrada; `pratica-concluida` exige
   `conclusionBlockers === []`). Não mascarar o defeito bloqueando a entrada.
4. **UI do takeaway com pendências** mostra: lista de pendências, ação "Revisar critérios —
   voltar ao feedback" (rótulo diário; "Revisar rúbrica…" na superfície pg-d01) e motivo de
   conclusão indisponível ("a conclusão fica indisponível até todas resolvidas; revisar não
   consome tentativa e preserva esta sessão"). No cap, o retorno continua disponível e o texto
   pré-existente do feedback ("o contrato cotidiano conclui a prática apenas com os N critérios
   suficientes na 1ª ou 2ª tentativa") permanece verdadeiro — nada promete conclusão.

## Invariáveis preservados (não-regressão)

- Ciclo canônico PD-04/PD-04b inalterado: exemplo→tentativa→feedback(+retry)→takeaway→recibo
  determinístico; recibo byte-idêntico para o mesmo estado (nenhum campo novo entra no recibo).
- Isolamento por `practiceId@contentVersion` e gate de troca com reinício confirmado (AID-3590)
  inalterados; foco em heading a cada transição de fase (AID-3564) vale para o retorno.
- `CYCLE_PHASE_ORDER` inalterado; `revisao-pedida` é no-op fora do takeaway.

## Evidência exigida

- Specs NOVAS (nenhum teste existente editado):
  `src/practice/guidedPracticeTakeawayReturn.test.ts` (reducer, 5 casos) e
  `src/practice/GuidedPracticeApp.takeawayReturn.test.tsx` (player, 2 casos), failing-test-first
  (vermelho comprovado no commit da fatia: 6/7 falhando antes do delta).
- Bateria do engine verde: `npm test` (72 arquivos/433 testes), `biome lint` nos 4 arquivos
  tocados, `tsc -b` limpos.
- Provas de browser PD-05 + PD-04b (catálogo `l03-scenario-catalog.md`): **não executadas nesta
  fase** — somente após manifest admitido e revisões do objeto exato; sem suíte repetida.

## Fora de escopo

Gate de blockers na entrada do takeaway; re-exibição da fase exemplo a partir do feedback;
mudanças em rúbrica/conteúdo ratificado; XP/missões; qualquer outro engine/substrato.
