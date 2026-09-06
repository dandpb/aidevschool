# Intent — AID-961: export do coletor retorna 0 linhas nas 2 superfícies live

Paperclip issue: AID-961 (DEFECT, critical; revelado pelo redeploy AID-960 /
escopo AID-956 §3). Owner: Founding Product Engineer (fa8130d5).
**Pedido autoritativo:** a própria issue AID-961 (fix readRange+prune; CI
travando a semântica de PRODUÇÃO; gaps de deploy (a) npm ci no staging e
(b) declarações fora do dir deployável). Fluxo: FPE → PR → countersign QA →
merge single-writer CEO → redeploy AID-956-flow. Deadline: 1ª sessão O1
~09-23 (soft ~09-09).

## Problema (defect do pin c2937e55 / PR #280)

Ingestão funcionando e eventos persistindo no Blobs durável nas 2 superfícies,
mas o export GET devolvia 200 `application/x-ndjson` com 0 linhas — a aceitação
§3 da AID-956 falhava só no caminho de leitura. Causa-raiz (probes first-hand
nas 2 superfícies, drafts `6a9dbcbd…`/`6a9dbd4bd…`): o `readRange` do
`BlobsEventStore` passava `directories:true` acreditando que isso era recursão
(semântica do servidor local `@netlify/blobs/server`); no Blobs EDGE API de
produção a semântica é a INVERSA — `directories:true` é listing DELIMITADO
(um nível por chamada, 0 blobs aninhados).

## Descoberta adicional deste change (probe first-hand local)

O servidor local também devolve **vazio** para `list({prefix:"<dia>"})` FLAT
(probe executável: `list({prefix:'2026-09-06'})` → `blobs:[]`). Ou seja, as
duas implementações divergem em AMBAS as formas:

| forma de `list`                | servidor local (`@netlify/blobs/server`) | edge API (produção)     |
| ------------------------------ | ----------------------------------------- | ----------------------- |
| flat, sem prefixo              | todas as chaves (recursivo)               | todas as chaves         |
| flat, com prefixo do dia       | **vazio**                                 | recursivo               |
| `directories:true` + prefixo   | recursivo                                 | **delimitado, 0 blobs** |

A ÚNICA forma portável (recursiva e idêntica nas duas) é o **scan flat SEM
prefixo, paginado por cursor, com filtro de dia no cliente** — a estratégia
que o `prune` já usava. Este é o fix; a instrução literal da issue ("listar
flat pelo prefixo do dia") foi corrigida por evidência executável: prefix-flat
funcionaria no edge mas devolveria 0 linhas na prova de CI contra o servidor
real — recriando exatamente a armadilha do PR #280 (CI verde com semântica
que a produção não tem).

## Outcome

- Export live serve exatamente 1 linha por eventId nos intervalos de dia
  (mesmo código comprovado contra o servidor real local E a semântica edge).
- `readRange` e `prune` simétricos: scan flat sem prefixo + filtro/poda por
  dia no cliente. Trade-off aceito (volume pilot, retenção 90 dias): export
  varre o store em vez de endereçar o dia no servidor.
- CI trava a semântica de produção: probe com o edge EMULADO por cima do
  servidor real (`verify_deployed_blobs.mjs`) + fake edge-semântico no teste
  v2 + invariante estática no teste de empacotamento.
- Gaps de deploy da mesma onda: staging do OS instala as deps das funções
  (`npm ci` pinado pelo lockfile dentro de `netlify/functions` gitignored);
  `dojo-analytics-collector.d.mts` sai do diretório deployável (deploy CLI do
  literacy rejeitava TODO o dir com 422 "Incorrect function names") e passa a
  morar em `learner/gate/analytics/`.

## Não-objetos

- Sem rollback da escrita durável (decisão documentada na issue: risco #1 da
  AID-947 mitigado; rollback ressuscitaria a perda de dados pré/durante O1).
- Sem mudança no netlify.toml do literacy (`functions` canônico passa a ser
  deployável com a saída da declaração).
