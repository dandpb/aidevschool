# Intent — AID-947: backing durável do coletor live (defect do countersign AID-940)

Paperclip issue: AID-947 (DEFECT, priority high; countersign AID-940 veredito GO
com limitação nomeada). Owner: Founding Product Engineer (fa8130d5).
**Pedido autoritativo:** a própria issue AID-947 (itens 1–4: diagnóstico
definitivo, fix, verificação pós-fix, recibo; QA re-verifica de forma
independente). Deadline: 1ª sessão O1 ~09-23 (soft ~09-09).

## Dispatch (reentrada de monitoramento — WORKFLOW-PERMANENTE)

Achado do countersign final QA AID-940 (2026-09-06 ~16:30Z): re-POST
byte-idêntico do mesmo batch → 202 nas 2 vezes e o export live mostra 2
linhas por eventId nas 2 superfícies — impossível sob `BlobsEventStore`
(idempotente por chave). Logo o backing live é o `NdjsonFileSink` /tmp
efêmero. Reentra como defect (este change) e como issue AID-947.

## Problema (diagnóstico executável — evidence/repro-rootcause-output-prefix.txt)

Três defeitos encadeados, todos reproduzidos localmente contra a árvore
65d64bca:

1. **Empacotamento**: `@netlify/blobs` não é declarado em nenhum package.json
   do caminho de funções (repo root NÃO é projeto Node, por design); o
   `import("@netlify/blobs")` com specificador opaco não é traçável pelo
   bundler de funções → dependência nunca embarca → `ERR_MODULE_NOT_FOUND`
   em runtime → `BlobsEventStore.create()` retorna null.
2. **Wiring**: o default export deployado
   (`dojo-analytics-collector.mjs:521` pré-fix) construía o handler SEM
   backing — NDJSON /tmp incondicional mesmo com Blobs disponível.
3. **Latente (achado ao provar o fix)**: `readRange` listava com prefixo de
   dia + `/`; o protocolo Blobs é não-recursivo sem `directories: true` →
   export devolveria ZERO linhas mesmo com 1+2 consertados.

## Outcome

- Coletor deployado usa Blobs durável e idempotente (chave
  `<dia>/<source>/<eventId>`) quando o runtime Netlify o prove; NDJSON fica
  como fallback local/teste (comportamento inspecionável preservado).
- Export por dia continua exato: listagem recursiva + paginação por cursor.
- Invariantes executáveis novas em CI: empacotamento
  (`dojo_analytics_collector_packaging.test.mjs`) e prova ponta-a-ponta do
  backing durável contra servidor Blobs local real
  (`analytics/verify_deployed_blobs.mjs` + step de CI) — teria pegado os
  3 defeitos.
- Relógio por request (day bucket correto em instâncias de função de longa
  vida; `now` congelado era defeito adjacente no mesmo wiring).

## Verificação

- Local (executável, sem rede além de localhost): repro pré-fix + prova
  pós-fix com `@netlify/blobs/server` (contexto injetado como o runtime
  Netlify injeta: base64 em `globalThis.netlifyBlobsContext`).
- CI (job codexdojo-os): packaging invariante + `npm ci` do diretório de
  funções + verify ponta-a-ponta; suites v2/ativação (até então sem wiring
  de CI) agora também rodam.
- Produção (aceitação, dono QA com `ANALYTICS_EXPORT_TOKEN`): re-POST
  idêntico → export com 1 linha por eventId nas 2 superfícies (pedido 3 da
  issue). Este step requer deploy pós-merge (fluxo WAVE-PROMOTION, merge
  CEO), e é o gate de `done` da AID-947.

## Não-objetivos

- Sem mudança de envelopes/vocabulário (paridade TS segue canônica).
- Sem novo backend/segredo: `ANALYTICS_EXPORT_TOKEN` continua só no provedor.
- Sem promotion/deploy neste change (ordem explícita do CEO; precheck e
  promoção seguem o fluxo vigente AID-532/AID-462).
