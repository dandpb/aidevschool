# AID-186 — QA independente do candidato Dev AID-185

**Data:** 2026-08-25 UTC  
**Aplicação:** `engines/codexdojo-os-prototype`  
**Candidato:** `https://6a8e1fd068712e4edf67d617--aidevschool-codexdojo-os.netlify.app`  
**Disposição:** **NO-GO / BLOCKED**

## Resultado executivo

Defeito crítico reproduzido no artefato imutável: a primeira missão da Trilha
Dev não carrega dentro do OS. O navegador bloqueia `/apps/warehouse/` porque a
resposta enviada pelo próprio deploy declara CSP `frame-ancestors 'none'`.
Assim, tentativa, feedback, retry, evidência e verificação independente ficam
inalcançáveis. O candidato não está pronto para convite.

## Charter de risco e evidência

1. **Identidade e confinamento do runtime — FAIL.**
   - Chromium limpo, viewport padrão, sem storage prévio.
   - Fluxo: selecionar `Trilha técnica · Dev` → `Entrar na escola` → primeira
     missão.
   - Host permaneceu no permalink e navegou para
     `/mission/dev/game-02-warehouse`.
   - O iframe foi corretamente configurado para a mesma origem em
     `/apps/warehouse/?hosted=1&hostOrigin=<permalink>`.
   - Resultado real: frame `chrome-error://chromewebdata/`, request
     `net::ERR_BLOCKED_BY_RESPONSE` e console:
     `Framing ... violates ... "frame-ancestors 'none'"`.
   - Captura: [remote-dev-load-failure.png](./remote-dev-load-failure.png).

2. **Tentativa antes da solução, feedback e retry — BLOCKED pelo defeito acima.**
   - Esperado: controles `shelf-*`, uma tentativa FAIL, feedback e `retry`.
   - Real: nenhum controle `shelf-0` ficou visível em 30 s.

3. **Evidência e verificador independente — BLOCKED pelo defeito acima.**
   - Nenhuma evidência bruta pôde ser produzida; portanto nenhum recibo
     independente pode ser aceito ou rejeitado pela UI.

4. **Separação entre conclusão, verificação e mastery — parcial.**
   - O host exibe `Estado canônico` separadamente, mas o fluxo não alcança
     conclusão/verificação.
   - Não há evidência executável suficiente para aprovar este contrato no
     candidato remoto.

5. **Imutabilidade do learner — PASS para esta execução.**
   - Antes e depois: `learner/learning_state.yaml` =
     `c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf`.
   - A projeção `.mavis/learning_state.yaml` também permaneceu em
     `a900918aeb4c29298d5a672bb6c2c9c66c7185f7b14be35c2db40a212c861bdc`.

## Gates locais executados

- `npm run lint` — PASS com 26 warnings preexistentes (sem erro).
- `NODE_ENV=test npm run test -- --run src/engines/EngineHubApp.test.tsx src/engines/registry.test.ts`
  — PASS, 31/31.
- `NODE_ENV=test npm run test:pilot-bundle` — PASS, 15/15.
- `NODE_ENV=test npm run build` — PASS; warning de chunk > 500 kB.
- `npm run test ...` sem `NODE_ENV=test` — FAIL, 14/14 em
  `EngineHubApp.test.tsx`, com `React.act is not a function`. Classificação:
  falha ambiental/configuração do runner (o mesmo conjunto passa quando o
  ambiente de teste é declarado), não evidência do defeito remoto.

## Defeito crítico

**Severidade:** crítica / release blocker  
**Esperado:** o iframe same-origin `/apps/warehouse/` carrega e permite iniciar
a tentativa.  
**Atual:** CSP `frame-ancestors 'none'` bloqueia o próprio iframe; o protocolo
host/runtime entra em warnings repetidos de `postMessage` para origem `null`.

## Limitações

- WORMHOLE e RELAY STATION não foram exploradas após o blocker da missão de
  entrada; elas não reduzem o impacto sobre a ativação.
- Nenhum claim de robustez, readiness ou mastery é emitido.
- QA não alterou produto nem estado canônico.

## Critério de desbloqueio

O produtor de AID-185 deve publicar um **novo candidato imutável** cuja política
de frame permita os runtimes empacotados na origem do OS. O novo deploy/hash
exige rerun independente completo de tentativa FAIL → feedback → retry → PASS →
recibo separado, mais rejeição de recibo ausente/incompatível.

## Reconciliação posterior — 2026-08-26

- AID-187 foi encerrada após evidência independente de que o bloqueio CSP foi
  removido em candidato posterior. Isso não altera o NO-GO deste relatório para
  o deploy `6a8e1fd068712e4edf67d617`.
- AID-200 encontrou um segundo blocker no candidato `6a8e4946…`: o retry PASS
  não substituía/correlacionava corretamente a primeira evidência FAIL.
- AID-207 implementou correlação por `evidenceId`; AID-216 publicou o novo
  candidato imutável `6a8f468d77062339d57476d5` sem promover alias.
- A validação independente desse novo artefato está delegada à AID-212. Somente
  essa issue pode emitir GO para `6a8f468d…`; AID-186 encerra definitivamente
  como QA concluída com NO-GO para o candidato original.
