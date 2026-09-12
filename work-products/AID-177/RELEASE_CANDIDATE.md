# AID-177 — candidato com verificação independente configurada

**Data:** 2026-08-25 UTC  
**Disposição do produtor:** publicado; **HOLD até QA independente**

## Candidatos imutáveis

- Host OS: `6a8ddcddb4a14cda431ff91e`
- Permalink OS: <https://6a8ddcddb4a14cda431ff91e--aidevschool-codexdojo-os.netlify.app>
- LiteracyDojo + verificador: `6a8ddc9afe6838bdcf19a465`
- Permalink LiteracyDojo: <https://6a8ddc9afe6838bdcf19a465--aidevschool-literacydojo.netlify.app>
- Endpoint: `/.netlify/functions/literacy-verify` no permalink do LiteracyDojo
- SHA Git do workspace: `9d4b744526891335f0749f77db0f151b2c7ed8b7`
- Hash do manifesto OS: `7ba0476cf17ebaf1636cf2eb1f32622a2677c16258de9001216cf4234eb999a2`
- Hash do `index.html` imutável do LiteracyDojo: `41c8c332eb8345bac6aec76b18c6245205de264242ef945247152b0a33a78887`
- Hash `termos.html`: `385d87d6c123385137dee041abe6f9904b193ad19811cc71e45c7399a6763b12`
- Hash `privacidade.html`: `27fe5a37e1aff970029adcd348cb32c0597b1fb3bee5ba4c5eada235b42cd487`

O host está preso ao permalink imutável do LiteracyDojo, não ao alias mutável.
O manifesto registra `local-uncommitted`; por isso, a identidade de aceite é a
tupla deploys imutáveis + hashes acima, não uma alegação de release baseada no
SHA do checkout compartilhado.

## Mudança

- `engines/literacyDojo/netlify.toml` injeta
  `VITE_LITERACY_VERIFIER_URL=/.netlify/functions/literacy-verify` e empacota a
  função isolada.
- `learner/gate/netlify-functions/literacy-verify.mjs` reavalia de forma
  independente o contrato canônico estrito de `l02` v3; qualquer outra
  identidade ou divergência falha fechada.
- `engines/codexdojo-os-prototype/scripts/build-pilot-bundle.mjs` fixa a origem
  imutável do LiteracyDojo.
- Testes impedem remoção silenciosa do endpoint e cobrem PASS, drift e versão
  canônica não suportada.

O verificador produz recibo, mas não escreve estado canônico. O hash observado
de `learner/learning_state.yaml` permaneceu
`c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf`.

## Evidência do produtor

- Função isolada: 3/3 PASS.
- Contrato de recibo do cliente: 5/5 PASS.
- Proteções do bundle piloto: 13/13 PASS.
- Build LiteracyDojo: PASS.
- Build piloto completo: PASS.
- POST real no endpoint imutável: `PASS`, `context_isolated=true`,
  `attempt_id=att-check`, `producer_writes_mastered=false`.
- Bundle público contém literalmente `/.netlify/functions/literacy-verify`.
- Host público contém literalmente o permalink imutável do LiteracyDojo.

Essas são provas do produtor e não substituem a jornada independente em browser.

## Limite intencional

Este candidato habilita somente o gate fixo da missão piloto `l02` v3. Outras
lições falham fechadas. Ampliar a cobertura exige verificadores versionados e
revisão independente; não foi feito um verificador permissivo nem foi promovido
`mastered`.

## Rollback

- Host anterior: `6a8dcaf145449f40cdd93e55`.
- LiteracyDojo anterior: restaurar pelo histórico do site
  `ba44d0c6-6ebb-44a8-8c26-477d28611294`.
- Em regressão: manter HOLD, restaurar ambos os deploys no console Netlify e
  registrar deploy-id + hashes. Não alterar `learner/learning_state.yaml`.

## Gate independente

QA deve repetir o harness de AID-176 no permalink OS novo, confirmar que o
iframe resolve exatamente para o permalink LiteracyDojo acima, concluir a
tentativa limpa, observar recibo com o mesmo `attempt_id`, revalidar legais e
confirmar ausência de escrita canônica/`mastered`. O produtor não emite GO.
