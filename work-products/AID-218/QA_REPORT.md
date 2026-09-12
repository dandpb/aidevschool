# AID-218 — QA independente do candidato retry WAREHOUSE `6a8f468d`

**Data:** 2026-08-26 UTC  
**Disposição:** **NO-GO — bloqueador crítico reproduzido**

## Resultado

O artefato publicado é íntegro em relação aos hashes declarados e a correção de persistência por
tentativa funciona no browser: `FAIL` e `PASS` coexistem no mesmo `missionRunId`, com
`evidenceId`/`storageId` distintos. Porém, o candidato não publica o bridge de verificação.
`GET /__dojo/bridge/v1/session` devolve o `index.html` do SPA (`200 text/html`) em vez de JSON com
token. Assim, ambas as tentativas terminam `gateway-unavailable`, não existe recibo PASS e a UI não
mostra aprovação independente.

Esse comportamento bloqueia o critério explícito de AID-216 e a jornada crítica do piloto. Não
promover o alias nem convidar coorte.

## Charters de risco executados

1. **Identidade do candidato:** comparar os hashes remotos do manifesto e WAREHOUSE com AID-216.
2. **Retry no browser:** em Chromium limpo executar WAREHOUSE `FAIL -> retry -> PASS`.
3. **Persistência/correlação:** inspecionar as duas object stores do IndexedDB e exigir duas
   evidências distintas no mesmo run, mais recibo PASS ligado ao digest da segunda tentativa.
4. **Boundary do verificador:** distinguir falha do jogo/host de indisponibilidade do bridge.
5. **Integridade do learner:** comparar hashes canônico e `.mavis` antes/depois.

## Ambiente e comandos reproduzíveis

- Linux, Chromium Playwright headless, viewport 1280x800
- Node `v24.18.0`; npm `11.17.0`
- permalink: `https://6a8f468d77062339d57476d5--aidevschool-codexdojo-os.netlify.app`

```bash
curl -fsSL "$URL/pilot-bundle-manifest.json" -o /tmp/aid218-manifest.json
curl -fsSL "$URL/apps/warehouse/index.html" -o /tmp/aid218-warehouse.html
sha256sum /tmp/aid218-manifest.json /tmp/aid218-warehouse.html
node work-products/AID-218/qa-warehouse-retry.mjs
curl -i "$URL/__dojo/bridge/v1/session"
sha256sum learner/learning_state.yaml .mavis/learning_state.yaml
```

## Evidência

- `pilot-bundle-manifest.json`: `815d50bf200b58d91eb569779bca83a40f4e211790ff439953f80f379dee8468`
- `apps/warehouse/index.html`: `3a7a5b09a803eda3a32078c731c1b34a9c8ca7cbc2c34d9d40d03337c56c3424`
- WAREHOUSE montou em WebGL; HUD observado:
  - FAIL: `Wave failed — evidence emitted. Retry?`
  - após retry: `phase=predicting`, `pendingIndex=0`
  - PASS: `Wave cleared — evidence emitted.`
- IndexedDB final: duas evidências no mesmo `missionRunId`, IDs distintos e payloads `pass=false`
  e `pass=true`; ambas com `status=gateway-unavailable`; zero recibos.
- Bridge session: HTTP 200, `content-type: text/html; charset=UTF-8`, body iniciando com o HTML do
  `codexDojo OS`; o contrato exige JSON `{ token: <string> }`.
- Nenhum erro de console ou request abortado: o erro decorre da resposta de rota inválida, não de
  WebGL, CSP, rede do runner ou lógica da simulação.
- learner inalterado:
  - `learner/learning_state.yaml`: `c3cae54c...230bbf`
  - `.mavis/learning_state.yaml`: `a900918a...861bdc`

Artefatos: `qa-result.json`, `qa-warehouse-retry.mjs` e `final-state.png` nesta pasta.

## Esperado versus atual

| Verificação | Esperado | Atual |
| --- | --- | --- |
| Retry | FAIL e PASS persistidos com IDs distintos | PASS |
| Correlação | recibo PASS referencia o digest/ID do retry | FAIL — nenhum recibo |
| Bridge session | JSON com token de sessão | FAIL — fallback HTML do SPA |
| UI | “Verificação independente aprovada” | FAIL — indisponível |
| Estado canônico | sem escrita em mastery | PASS — hashes inalterados |

## Triagem e owner de desbloqueio

**Produto/release, severidade crítica.** O bundle estático publicado não inclui/roteia o bridge
`/__dojo/bridge/v1/*` necessário ao contrato do host. Responsável: Engenharia/Release. Ação:
publicar novo draft imutável com session e verification routes funcionais, registrar URL/hashes e
reenviar para QA independente. Um retorno HTTP 200 sozinho não basta: session deve entregar JSON e
o playthrough deve produzir recibo PASS correlacionado.

## Limitações

Escopo restrito ao candidato AID-216 e à jornada Dev/WAREHOUSE em Chromium desktop. Outras missões,
viewports e navegadores não foram explorados porque o blocker crítico já impede o gate. Não houve
alteração de produto nem de learner state.
