# AID-191 — candidato imutável com correção do WAREHOUSE

**Data:** 2026-08-26 UTC  
**Disposição do produtor:** publicado; **HOLD até QA independente AID-190**

## Resultado

O bundle corrigido foi publicado como draft imutável, sem promover o alias:

- deploy ID: `6a8e4946e0a6aeca65a0ce65`;
- permalink: <https://6a8e4946e0a6aeca65a0ce65--aidevschool-codexdojo-os.netlify.app>;
- baseline Git do checkout compartilhado: `9d4b744526891335f0749f77db0f151b2c7ed8b7`;
- site Netlify: `8bec714f-22cb-4468-8e2b-e3cd38652931`.

O checkout contém mudanças compartilhadas não commitadas. Portanto, a identidade de aceite é o
deploy imutável mais os hashes abaixo; o SHA Git isolado não representa todo o artefato publicado.

## Evidência executável do produtor

- `npm run test:pilot-bundle` — PASS, 17/17.
- `npm run build:pilot` — PASS; OS, LiteracyDojo, WAREHOUSE, WORMHOLE e RELAY STATION.
- `npm run deploy:pilot -- --site 8bec714f-22cb-4468-8e2b-e3cd38652931 --json` — PASS.
- GET `/apps/warehouse/` — HTTP 200, `text/html`.
- O HTML servido referencia `/apps/warehouse/assets/index-mCE2AtpR.js`.
- GET desse asset — HTTP 200, `application/javascript; charset=UTF-8` (não o fallback HTML).
- CSP servida contém `frame-ancestors 'self'`.

Hashes SHA-256 local/remoto coincidentes:

| Artefato | SHA-256 |
| --- | --- |
| `pilot-bundle-manifest.json` | `3ac73a4dba8a7e5482ada5867894ceb553be0dc28b79a7539617b4e8c3c06066` |
| `apps/warehouse/index.html` | `3a7a5b09a803eda3a32078c731c1b34a9c8ca7cbc2c34d9d40d03337c56c3424` |
| `apps/warehouse/assets/index-mCE2AtpR.js` | `5863fac009cafb0bbfa0e5b331d4e162d287854e6debdb6b365832b0e6fbebbc` |

## Rollback e limites

Não houve promoção do alias nem convite de coorte. O rollback operacional é não distribuir este
permalink draft. O candidato anterior `6a8e2d5bb461eae9b9c38dff` reproduz o defeito e não deve ser
usado como mitigação. Qualquer alteração exige novo deploy imutável e novo gate independente.

Este registro prova publicação, integridade e correção do roteamento/MIME específico. Não prova a
jornada completa, aceitação de evidência ou mastery. O produtor não emite GO.

## Handoff independente

AID-190 deve repetir a QA no novo permalink, em Chromium limpo, incluindo carregamento do iframe,
shelf-0, tentativa antes da solução, retry, evidência bruta e decisão por verificador separado.
Alias e convites permanecem em HOLD até o GO independente.
