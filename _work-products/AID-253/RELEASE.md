# AID-253 — revisão imutável e promoção do candidato AID-242

## Resultado

O bundle aprovado funcionalmente em AID-251 foi reconstruído com uma revisão Git imutável e
promovido ao alias canônico em 2026-08-28 UTC. Esta promoção não altera learner canônico e não
declara mastery.

## Identidade promovida

- Revisão Git imutável: `ec265fab13ac98700e9de58b5d719d55d979178d`
- Tree Git: `89a4cc24eb3812521236af26a6d4bd7ff0447f43`
- Draft pré-promoção: `6a9141725eedacfae9742619`
- Deploy de produção: `6a9141bc5ac75e6a300cc00e`
- Permalink de produção: <https://6a9141bc5ac75e6a300cc00e--aidevschool-codexdojo-os.netlify.app>
- Alias canônico: <https://aidevschool-codexdojo-os.netlify.app>
- SHA-256 de `pilot-bundle-manifest.json`: `ddf404d93468bcf0cea776b080990774cd2b68566aa163b60d2b5f682c7fc6b7`
- `sourceRevision` do manifesto: `ec265fab13ac98700e9de58b5d719d55d979178d`

O commit foi criado como objeto Git imutável a partir dos inputs delimitados do bundle, sem mover
ou fazer merge em branch protegida e sem absorver mudanças alheias do checkout compartilhado.

## Evidência executada

```text
COMMIT_REF=ec265fab13ac98700e9de58b5d719d55d979178d npm run build:pilot
PASS; OS + LiteracyDojo + WAREHOUSE + WORMHOLE + RELAY STATION.

npm run deploy:pilot -- --site 8bec714f-22cb-4468-8e2b-e3cd38652931 --json
PASS; draft 6a9141725eedacfae9742619.

QA_BASE_URL=https://6a9141725eedacfae9742619--aidevschool-codexdojo-os.netlify.app \
  npx playwright test tests/release-journeys.smoke.spec.ts
PASS; processo terminou com exit 0.

npm run deploy:pilot -- --site 8bec714f-22cb-4468-8e2b-e3cd38652931 --prod --json
PASS; deploy de produção 6a9141bc5ac75e6a300cc00e.

curl -fsSL https://aidevschool-codexdojo-os.netlify.app/pilot-bundle-manifest.json | sha256sum
ddf404d93468bcf0cea776b080990774cd2b68566aa163b60d2b5f682c7fc6b7  -
```

O hash do alias canônico é idêntico ao draft verificado antes da promoção. A revisão independente
de produto permanece registrada em `docs/qa/AID-251_QA_CANDIDATO_INTEGRADO_2026-08-28.md`.

## Rollback

No Netlify, republicar o deploy anterior do site `aidevschool-codexdojo-os` pelo histórico de
deploys. O permalink acima preserva o artefato promovido para auditoria mesmo após rollback.
