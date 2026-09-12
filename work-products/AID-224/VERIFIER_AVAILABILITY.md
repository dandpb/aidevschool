# AID-224 — verificador separado no candidato Dev imutável

**Data:** 2026-08-26 UTC  
**Disposição:** disponível e revalidado; aceite independente herdado de AID-219

## Resultado

O candidato Dev imutável `6a8f62e2e288812b8909df25` disponibiliza o verificador separado do
produtor na função serverless `dojo-verification-bridge`. O host entrega apenas a evidência bruta;
o verificador recompõe o resultado a partir das observações fechadas de WAREHOUSE L1 e emite um
recibo ligado ao digest. Ele não escreve `learner/`, `.mavis/` ou `mastered`.

- Permalink imutável:
  <https://6a8f62e2e288812b8909df25--aidevschool-codexdojo-os.netlify.app>
- Sessão: `GET /__dojo/bridge/v1/session`
- Verificação: `POST /__dojo/bridge/v1/verification`
- Implementação: `learner/gate/netlify-functions/dojo-verification-bridge.mjs`
- Roteamento anterior ao fallback SPA: `engines/codexdojo-os-prototype/netlify.toml`

## Revalidação desta execução

```text
GET session com Sec-Fetch-Site: same-origin
=> HTTP 200, application/json, token opaco com 43 caracteres,
   cross-origin-resource-policy: same-origin

GET session sem contexto same-origin
=> HTTP 403

node --test learner/gate/tests/dojo_verification_bridge_netlify.test.mjs
=> PASS, 2/2

sha256sum learner/learning_state.yaml .mavis/learning_state.yaml
=> c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf
   a900918aeb4c29298d5a672bb6c2c9c66c7185f7b14be35c2db40a212c861bdc
```

O teste focado prova que uma tentativa WAREHOUSE incorreta gera `FAIL`, o retry correto gera
`PASS`, os digests diferem e o recibo mantém `canonical_gate_status=not-submitted`.

## Aceite independente e limites

O produtor não autoaprova este gate. A revisão independente já foi executada em AID-219 e está
registrada em `work-products/AID-219/QA_REVIEW.md`: Chromium limpo percorreu
`FAIL -> retry -> PASS`, encontrou duas evidências e dois recibos correlacionados e confirmou os
mesmos hashes invariantes do learner.

O aceite cobre somente Chromium desktop e WAREHOUSE L1 nesse permalink. Não promove alias, não
autoriza coorte, não cobre outras missões/browser/viewports e não declara mastery. A identidade do
candidato permanece o deploy imutável acima; os NO-GOs de candidatos anteriores continuam apenas
como histórico.
