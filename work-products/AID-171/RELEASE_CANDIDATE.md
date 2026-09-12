# AID-171 — candidato legal corrigido

**Publicado em:** 2026-08-25 UTC  
**Disposição final:** candidato publicado, QA independente concluída com **NO-GO definitivo**

## Identidade imutável

- Site Netlify: `8bec714f-22cb-4468-8e2b-e3cd38652931` (`aidevschool-codexdojo-os`)
- Deploy: `6a8dbcd3260b4cc6a25a426a`
- URL imutável: <https://6a8dbcd3260b4cc6a25a426a--aidevschool-codexdojo-os.netlify.app>
- URL canônica: <https://aidevschool-codexdojo-os.netlify.app>
- SHA-256 de `pilot-bundle-manifest.json`: `77bf8a7d2512be7e2353912a564439086a7058dd7db51e8294870dcff42de209`
- Revisão declarada no manifesto: `local-uncommitted`

O checkout compartilhado continha mudanças concorrentes e não possui um commit que
represente sozinho o artefato. Por isso, a identidade normativa deste candidato é o
par deploy imutável + hash do manifesto, não o HEAD Git.

## Verificações do produtor

- `npm run test:pilot-bundle`: PASS, 11/11.
- `npm run build:pilot`: PASS; OS, LiteracyDojo, WAREHOUSE, WORMHOLE e RELAY STATION.
- Alias e permalink retornaram HTTP 200 para as cinco entradas, os dois documentos
  legais e o manifesto.
- Os hashes servidos pelo alias e permalink coincidiram entre si e com o manifesto.
- `termos.html`: `385d87d6c123385137dee041abe6f9904b193ad19811cc71e45c7399a6763b12` (1773 bytes).
- `privacidade.html`: `27fe5a37e1aff970029adcd348cb32c0597b1fb3bee5ba4c5eada235b42cd487` (1940 bytes).

Esses checks comprovam publicação e correlação pelo produtor; não constituem aceite
independente, autorização de convites, parecer jurídico ou evidência de mastery.

## Rota de QA independente

O revisor deve testar o permalink acima e o alias canônico, registrar os hashes do
manifesto e das entradas, abrir os documentos legais pela jornada real do
LiteracyDojo, executar a jornada crítica em browser limpo e confirmar ausência de
falso mastery e de escrita no learner canônico. Qualquer mudança de deploy ou hash
invalida o aceite.

## Resultado da QA independente

AID-172 reproduziu em Chromium limpo um bloqueador Sev 1: ao iniciar a missão IA
Prática, este deploy aponta o iframe do LiteracyDojo para
`http://127.0.0.1:5178/`, tornando a jornada pública indisponível. Os hashes e os
documentos legais diretos passaram, mas isso não compensa a falha da jornada real.

O deploy `6a8dbcd3260b4cc6a25a426a` recebeu **NO-GO definitivo** e não pode ser
aprovado retroativamente. O relatório normativo é
[`../AID-172/QA_REPORT.md`](../AID-172/QA_REPORT.md).

Os sucessores OS `6a8ddcddb4a14cda431ff91e` e LiteracyDojo
`6a8ddc9afe6838bdcf19a465` receberam QA independente em AID-178. Esse aceite é
restrito aos sucessores e não altera o resultado histórico deste candidato.

## Rollback

Os deploys anteriores conhecidos reproduzem o defeito legal e não são rollback
seguro para este incidente. Em regressão Sev 1/2, suspender novos convites e restaurar
este deploy imutável somente se ele já tiver recebido aceite independente; caso
contrário, manter o HOLD e produzir outro candidato corrigido.
