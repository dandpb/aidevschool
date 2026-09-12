# AID-216 — candidato imutável da correção retry WAREHOUSE

**Data:** 2026-08-26 UTC  
**Disposição do produtor:** publicado; **HOLD até QA independente**

## Resultado

O bundle com a correção de persistência por tentativa foi publicado como draft imutável, sem
promover o alias canônico:

- deploy ID: `6a8f468d77062339d57476d5`;
- permalink: <https://6a8f468d77062339d57476d5--aidevschool-codexdojo-os.netlify.app>;
- baseline Git observado: `9d4b744526891335f0749f77db0f151b2c7ed8b7`;
- site Netlify: `8bec714f-22cb-4468-8e2b-e3cd38652931`.

O checkout compartilhado contém mudanças não commitadas. A identidade de aceite deste candidato é
o deploy imutável mais os hashes abaixo; o SHA Git isolado não representa todo o artefato.

## Evidência executável do produtor

- `npm test -- --run src/verification` — PASS, 5 arquivos e 29/29 testes.
- `npm run test:pilot-bundle` — PASS, 17/17 testes.
- `npm run build:pilot` — PASS; OS, LiteracyDojo, WAREHOUSE, WORMHOLE e RELAY STATION.
- `npm run deploy:pilot -- --site 8bec714f-22cb-4468-8e2b-e3cd38652931 --json` — PASS.
- GET `/apps/warehouse/` — HTTP 200, `text/html; charset=UTF-8`.
- CSP pública contém `frame-ancestors 'self'`.

Hashes SHA-256 locais/remotos coincidentes:

| Artefato | SHA-256 |
| --- | --- |
| `pilot-bundle-manifest.json` | `815d50bf200b58d91eb569779bca83a40f4e211790ff439953f80f379dee8468` |
| `apps/warehouse/index.html` | `3a7a5b09a803eda3a32078c731c1b34a9c8ca7cbc2c34d9d40d03337c56c3424` |
| `apps/warehouse/assets/index-mCE2AtpR.js` | `5863fac009cafb0bbfa0e5b331d4e162d287854e6debdb6b365832b0e6fbebbc` |

## Limites e handoff independente

Não houve promoção do alias nem convite de coorte. O produtor prova build, publicação e integridade,
mas não emite GO nem declara mastery. A QA independente deve abrir o permalink em Chromium limpo e
repetir WAREHOUSE `FAIL -> retry -> PASS`, confirmando que as duas evidências coexistem, que o recibo
PASS referencia o novo `evidenceId` e que nenhum learner state canônico é alterado. Qualquer mudança
no bundle exige novo deploy e novo gate.
