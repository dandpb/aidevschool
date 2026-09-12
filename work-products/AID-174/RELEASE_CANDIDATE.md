# AID-174 — origem pública do LiteracyDojo corrigida

**Data:** 2026-08-25 UTC  
**Disposição final:** **SUPERADO** pelo candidato corrigido AID-177, com GO independente em AID-178

## Encerramento da cadeia

O deploy `6a8dcaf145449f40cdd93e55` abaixo permanece historicamente reprovado e não deve
ser usado: AID-176 encontrou ausência do verificador independente. A correção foi
publicada em novos candidatos imutáveis e aprovada independentemente:

- OS: `6a8ddcddb4a14cda431ff91e`
- LiteracyDojo + verificador: `6a8ddc9afe6838bdcf19a465`
- manifesto OS: `7ba0476cf17ebaf1636cf2eb1f32622a2677c16258de9001216cf4234eb999a2`
- `index.html` LiteracyDojo: `41c8c332eb8345bac6aec76b18c6245205de264242ef945247152b0a33a78887`

O registro normativo do sucessor está em
[`AID-177/RELEASE_CANDIDATE.md`](../AID-177/RELEASE_CANDIDATE.md), e o parecer
independente em [`AID-178/QA_REPORT.md`](../AID-178/QA_REPORT.md). Em
2026-08-25 UTC, os aliases públicos do OS e LiteracyDojo retornaram 200; seus
hashes de manifesto/index/termos/privacidade coincidiram com AID-177. Os
permalinks, e não os aliases mutáveis, continuam sendo a identidade de aceite.

AID-178 autoriza o CEO a remover o HOLD somente para esses permalinks e para a
missão `l02` v3. O produtor não remove convites nem amplia esse limite.

## Candidato imutável

- Site Netlify: `8bec714f-22cb-4468-8e2b-e3cd38652931` (`aidevschool-codexdojo-os`)
- Deploy: `6a8dcaf145449f40cdd93e55`
- Permalink: <https://6a8dcaf145449f40cdd93e55--aidevschool-codexdojo-os.netlify.app>
- Alias: <https://aidevschool-codexdojo-os.netlify.app>
- SHA Git (HEAD do workspace): `9d4b744526891335f0749f77db0f151b2c7ed8b7`
- Origem configurada do LiteracyDojo: <https://aidevschool-literacydojo.netlify.app/>
- Hash OS declarado no manifesto: `6cae1c6744a0e86a52ad7607c736b74ae331716432f9549da27a145697444eac`
- Hash `pilot-bundle-manifest.json`: `9a961cfc69250d6b6691a1039fc95bc113689198a80db8b29a10a54c5641c5a4`
- Hash `termos.html`: `385d87d6c123385137dee041abe6f9904b193ad19811cc71e45c7399a6763b12`
- Hash `privacidade.html`: `27fe5a37e1aff970029adcd348cb32c0597b1fb3bee5ba4c5eada235b42cd487`
- Revisão declarada no manifesto: `local-uncommitted`; a identidade normativa é deploy + manifesto.
- `local-uncommitted` no manifesto é esperado no bundle local; a identidade normativa usada para aceitação é `(deploy-id + hash do manifesto + hashes de conteúdo legal)`.

## Correção e proteção contra regressão

`scripts/build-pilot-bundle.mjs` injeta a origem HTTPS pública durante o build do
OS. O build não depende mais do fallback de desenvolvimento
`http://127.0.0.1:5178/`. `scripts/pilot-bundle-lib.test.mjs` exige essa
configuração e `scripts/public-literacy-origin-smoke.mjs` percorre o início da
jornada pública, verifica a origem efetiva do iframe e aguarda o primeiro CTA do
LiteracyDojo ficar visível.

## Evidência do produtor

- `npm run test:pilot-bundle`: PASS, 12/12.
- `npm run build:pilot`: PASS; manifesto e cinco superfícies completos, bundle refeito em `dist/` sem regressão local.
- `npm run deploy:pilot -- --prod --site …`: PASS; deploy acima ficou live (registro de deploy mantido em plataforma Netlify).
- GET no permalink: OS, manifesto, LiteracyDojo integrado e termos retornaram 200.
- `curl` no permalink e alias: hashes confirmados para manifesto e documentos legais sem drift:
  - `pilot-bundle-manifest.json`: `9a961cfc69250d6b6691a1039fc95bc113689198a80db8b29a10a54c5641c5a4`
  - `termos.html`: `385d87d6c123385137dee041abe6f9904b193ad19811cc71e45c7399a6763b12`
  - `privacidade.html`: `27fe5a37e1aff970029adcd348cb32c0597b1fb3bee5ba4c5eada235b42cd487`
- Smoke Chromium no permalink: PASS. `iframe.src` observado:
  `https://aidevschool-literacydojo.netlify.app/?hosted=1&hostOrigin=https%3A%2F%2F6a8dcaf145449f40cdd93e55--aidevschool-codexdojo-os.netlify.app`.

## Gate independente

O produtor não aprova seu próprio release. QA deve repetir o smoke no permalink,
concluir uma tentativa limpa, conferir termos e privacidade pela jornada, validar
o recibo independente e confirmar que não houve escrita canônica nem atribuição
de `mastered`. Até esse aceite, manter HOLD de novos convites.

## Rollback

- Deploy anterior conhecido: `6a8dbcd3260b4cc6a25a426a` (documentado em AID-171), no mesmo site Netlify.
- Em regressão, suspender novos convites e restaurar produção para o deploy anterior
  via console Netlify (site `8bec714f-22cb-4468-8e2b-e3cd38652931`), preservando logs
  de decisão com `deploy-id`, `hash do manifesto` e carimbo de horário.
