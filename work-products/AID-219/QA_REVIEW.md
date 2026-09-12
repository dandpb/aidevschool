# AID-219 — revisão independente do bridge WAREHOUSE

**Data:** 2026-08-26 UTC  
**Candidato:** `6a8f62e2e288812b8909df25`  
**Disposição:** **APROVADO para o escopo de AID-219**

## Resultado

O bloqueador crítico de AID-218 não se reproduz no novo draft imutável. Em Chromium limpo, a
jornada `FAIL -> retry -> PASS` produziu duas evidências verificadas no mesmo `missionRunId`, com
IDs distintos, e dois recibos. O recibo PASS referencia exatamente o digest e o `storageId` da
segunda tentativa. A UI mostrou “Verificação independente aprovada”. O estado canônico do learner
e sua projeção `.mavis` permaneceram inalterados.

## Charters de risco executados

1. Bridge remoto: exigir JSON com token em contexto same-origin e rejeição fora dessa origem.
2. Jornada crítica: executar WAREHOUSE `FAIL -> retry -> PASS` em Chromium limpo com WebGL.
3. Persistência e correlação: inspecionar IndexedDB e ligar o recibo PASS à segunda tentativa.
4. Boundary canônico: exigir `canonical_gate_status=not-submitted` e hashes do learner invariantes.
5. Contrato mínimo: executar os testes focados do bridge Netlify.

## Ambiente e comandos

- Linux; Node `v24.18.0`; Playwright Chromium headless; viewport 1280x800.
- Permalink: <https://6a8f62e2e288812b8909df25--aidevschool-codexdojo-os.netlify.app>

```bash
QA_BASE_URL=https://6a8f62e2e288812b8909df25--aidevschool-codexdojo-os.netlify.app \
QA_OUTPUT_DIR=work-products/AID-219 \
node work-products/AID-218/qa-warehouse-retry.mjs

curl -H 'Sec-Fetch-Site: same-origin' -D session-same-origin-headers.txt \
  -o session-same-origin-body.json \
  "$QA_BASE_URL/__dojo/bridge/v1/session"

node --test learner/gate/tests/dojo_verification_bridge_netlify.test.mjs \
  learner/gate/tests/literacy_verify_netlify.test.mjs

sha256sum learner/learning_state.yaml .mavis/learning_state.yaml
```

## Evidência observada

- Bridge same-origin: HTTP 200, `application/json`, token string de 43 caracteres e
  `cross-origin-resource-policy: same-origin`.
- Bridge sem contexto same-origin: HTTP 403, JSON `{"error":"origin-forbidden"}` — boundary
  esperado, não falha de infraestrutura.
- Chromium: WebGL ativo; HUD FAIL `Wave failed — evidence emitted. Retry?`; retry voltou a
  `phase=predicting`, `pendingIndex=0`; HUD PASS `Wave cleared — evidence emitted.`.
- `missionRunId` comum: `run-c459667a-0a63-4dce-bb6b-ff548367052a`.
- FAIL: `evidenceId=9b53ee72-b333-4332-b463-f5ca9767b597`, digest
  `bf3a8b1d72fc320c7578e3e28ac33216eda41edbba0ec5ffe7f74b3f3ee57ef2`, recibo FAIL.
- PASS/retry: `evidenceId=278d876c-6f72-4f22-9242-30f659f26687`, digest
  `70c3e05004ee1159aa26217cae6d873cadf29ac2fab0f24e891d109eb2aa5bc9`, recibo PASS correlacionado.
- Ambos os recibos: `canonical_gate_status=not-submitted`.
- Testes focados: PASS 5/5.
- Hashes antes/depois: learner `c3cae54c...230bbf`; `.mavis` `a900918a...861bdc`.
- Sem erros de console ou requests abortados.

Artefatos: `qa-result.json`, `final-state.png`, `session-headers.txt`, `session-body.json`,
`session-same-origin-headers.txt` e `session-same-origin-body.json` neste diretório.

## Limitações e release readiness

O aceite cobre somente o reparo do bridge e o fluxo desktop Chromium WAREHOUSE L1 do candidato
imutável. Não cobre outros navegadores, viewports ou missões; o próprio verificador está limitado a
WAREHOUSE L1. AID-219 pode ser aprovado. A promoção do alias continua sendo decisão separada de
release e este parecer não declara mastery, paridade ou robustez ampla.
