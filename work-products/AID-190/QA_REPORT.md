# AID-190 — QA independente do candidato Dev corrigido AID-187

**Data:** 2026-08-26 UTC  
**Candidato imutável:** `6a8e2d5bb461eae9b9c38dff`  
**Disposição:** **NO-GO — blocker crítico de produto**

## Charters de risco

1. Confirmar que a CSP publicada permite somente framing same-origin.
2. Exercitar em Chromium limpo o caminho Dev → WAREHOUSE → tentativa incorreta → retry → tentativa correta → verificação/recibo.
3. Confirmar inventário do bundle e presença das páginas legais, sem promover alias nem alterar learner canônico.

## Ambiente

- Linux, UTC; Chromium headless fornecido por `@playwright/test`.
- Viewport do roteiro principal: 1280×720.
- Deploy Netlify imutável acima; sem uso de alias de produção.

## Evidência executada

### PASS — regressão de configuração

`cd engines/codexdojo-os-prototype && npm run test:pilot-bundle`

- 16/16 testes passaram.
- O teste novo confirma `frame-ancestors 'self'` e rejeita `'none'`.

### PASS — headers remotos e superfícies estáticas

`curl -sS -D - -o /dev/null <candidate>/`  
`curl -sS -D - -o /dev/null <candidate>/apps/warehouse/`

- Ambos retornaram HTTP 200.
- Ambos publicaram `Content-Security-Policy: ... frame-ancestors 'self'`.
- `pilot-bundle-manifest.json` retornou o inventário esperado.
- `apps/literacydojo/privacidade.html` e `apps/literacydojo/termos.html` retornaram HTTP 200 HTML.

### FAIL — jornada real no Chromium

Roteiro: abrir candidato → selecionar `Trilha técnica · Dev` → `Entrar na escola` → `Revisar agora` → aguardar `shelf-0` no iframe WAREHOUSE.

**Esperado:** HUD da WAREHOUSE carregado, permitindo tentativa, retry, evidência e verificação separada.  
**Atual:** o iframe navega para `<candidate>/apps/warehouse/?hosted=1&hostOrigin=...`, mas fica vazio e `shelf-0` expira após 30 s.

Console do Chromium:

```text
Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html".
```

Triagem reproduzível:

- `apps/warehouse/index.html` referencia `src="/assets/index-DmDLI-e5.js"` (caminho absoluto na raiz).
- `<candidate>/assets/index-DmDLI-e5.js` retorna HTTP 200 **text/html** via fallback do OS.
- O módulo real existe em `<candidate>/apps/warehouse/assets/index-DmDLI-e5.js` e retorna HTTP 200 `application/javascript`.
- Portanto, é defeito do bundle/produto, não falha de infraestrutura nem bloqueio CSP.

## Impacto e limitações

- Severidade crítica: bloqueia 100% da missão WAREHOUSE no candidato Dev.
- Tentativa, retry, evidência bruta, recibo/`attempt_id` e separação de estados não puderam ser validados porque dependem do módulo que não inicia.
- Nenhum comando de QA escreveu no learner canônico ou nas projeções; a árvore já estava suja antes da execução e foi preservada.
- Alias e convite de coorte permanecem em HOLD.

## Decisão

**NO-GO.** A correção CSP está presente e correta, mas não torna o candidato funcional. Engenharia deve reconstruir os jogos embarcados com base pública compatível com `/apps/<game>/` (ou reescrever referências no empacotamento), publicar novo candidato imutável e devolver para QA independente completa.

## Reavaliação após conclusão de AID-191/AID-207 — 2026-08-26 23:05 UTC

**Novo candidato:** `6a8f468d77062339d57476d5`  
**Disposição atualizada:** **NO-GO — blocker crítico de verificador público**

O defeito original de subpath/MIME foi corrigido. Em Chromium limpo, WAREHOUSE carregou no iframe
same-origin, inicializou WebGL e executou `FAIL → retry → PASS` sem erro de console. A correção de
persistência também foi comprovada: o IndexedDB contém as duas evidências do mesmo `missionRunId`,
com `evidenceId` distintos (`4e2b4edf-...` para FAIL e `7abdcbd0-...` para PASS), sem sobrescrita.

O gate completo ainda falha. Ambas as evidências terminam em `status: gateway-unavailable`; a UI
mostra `Verificador indisponível`, não exibe `Verificação independente aprovada` e não produz recibo
com `attempt_id`. O endpoint esperado pelo cliente (`/__dojo/bridge/v1/verification`, precedido pela
sessão do bridge) não está disponível no deploy estático. Uma sonda em
`/.netlify/functions/literacy-verify` também devolve o fallback HTML do OS, não uma função.

Integridade do candidato conferida independentemente:

- manifesto: `815d50bf200b58d91eb569779bca83a40f4e211790ff439953f80f379dee8468`;
- WAREHOUSE HTML: `3a7a5b09a803eda3a32078c731c1b34a9c8ca7cbc2c34d9d40d03337c56c3424`;
- WAREHOUSE JS: `5863fac009cafb0bbfa0e5b331d4e162d287854e6debdb6b365832b0e6fbebbc`;
- `learner/learning_state.yaml`: `c3cae54c...30bbf`, inalterado;
- `.mavis/learning_state.yaml`: `a900918a...1bdc`, inalterado.

Artefatos: `qa-result-6a8f468d.json` e `warehouse-pass-6a8f468d.png` neste diretório. O HOLD de
alias/coorte permanece até que um novo candidato imutável ofereça o verificador separado e receba
GO independente com correlação do retry PASS.

## Reavaliação após AID-224 — candidato `6a8f62e2e288812b8909df25`

**Disposição:** **NO-GO contratual; fluxo funcional aprovado**

O blocker de disponibilidade do verificador foi corrigido. A execução independente em Chromium
desktop limpo passou integralmente no roteiro automatizado:

- iframe same-origin e WebGL ativos, sem erros de console ou requests abortados;
- tentativa inicial FAIL, retry volta a `predicting`/índice 0 e tentativa seguinte PASS;
- duas evidências verificadas no mesmo `missionRunId`, com `evidenceId` distintos;
- dois recibos independentes, FAIL e PASS, ligados ao `storageId/evidenceId` e ao digest correto;
- UI final `Verificação independente aprovada`, sem `Evidência rejeitada`;
- ambos os recibos mantêm `producer_writes_mastered=false` e
  `canonical_gate_status=not-submitted`;
- manifesto e páginas legais retornam HTTP 200; 5/5 testes focados do bridge passam;
- hashes do learner e `.mavis` permanecem `c3cae54c...230bbf` e `a900918a...861bdc`.

O aceite explícito de AID-190 ainda exige um recibo com `attempt_id`. O contrato atual de
`TeachingGameVerificationReceipt` não define esse campo; somente o recibo Literacy o define. Os
dois recibos públicos WAREHOUSE confirmados não contêm `attempt_id`, embora a correlação por
`evidenceId/storageId + evidence_digest` seja íntegra. QA não presume equivalência para suprimir
um critério obrigatório. Artefatos finais: `final-6a8f62e2/qa-result.json` e
`final-6a8f62e2/final-state.png`.

## Disposição final — 2026-08-27

**GO independente para o candidato imutável `6a8f7ece5ac75e84270cc00e`, restrito à jornada
WAREHOUSE desktop Chromium.**

O último blocker foi corrigido e reproduzido diretamente por AID-190:

- Playwright remoto: 1/1 PASS para `FAIL → retry → PASS`, `attempt_id` e `evidenceId` distintos,
  mesmo `missionRunId`, persistência após reload e seleção do PASS mais recente;
- persistência/intake: 6/6 testes PASS;
- dispatch ao verificador separado: 5/5 testes PASS em ambiente Node;
- manifesto SHA-256 `f3e06e4d9f1dc7eed1b02f3a37817cde196e422267c2b980e2e68089ff0e7e3d`;
- WAREHOUSE index SHA-256 `43d9a8b56d17c447f0322c4a3f7431e40c2d0548d7cafd4af8f85f62db77b9a6`;
- termos e privacidade: HTTP 200 HTML;
- learner canônico e `.mavis` mantiveram os hashes `c3cae54c...230bbf` e
  `a900918a...861bdc`.

Assim, AID-186/AID-185 podem ser reconciliadas contra este deploy, e o CEO pode decidir a próxima
etapa de AID-180. Este GO não promove alias, não convida coorte, não declara mastery e não cobre
mobile/tablet, Firefox/WebKit, outras missões ou robustez ampla.
