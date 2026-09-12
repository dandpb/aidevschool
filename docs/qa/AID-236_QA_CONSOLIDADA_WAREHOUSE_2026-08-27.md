# AID-236 — QA consolidada AID-231 / WAREHOUSE

## Disposição

**GO para AID-225 e AID-227 no candidato imutável
`6a8f7ece5ac75e84270cc00e`, limitado ao escopo abaixo.**

O fluxo público WAREHOUSE `FAIL -> retry -> PASS` foi reproduzido novamente em Chromium limpo.
As tentativas 1 e 2 possuem `attempt_id` e `evidenceId` distintos, permanecem correlacionadas ao
mesmo `missionRunId`, sobrevivem ao reload e o host seleciona o PASS mais recente. Os contratos
focados de persistência e dispatch também passam. Não houve alteração do learner canônico nem da
projeção `.mavis`.

Com isso, AID-190 e AID-204 podem ser retomadas/reconciliadas contra este candidato. O HOLD de
promoção de alias e convite de coorte permanece, pois essas ações não fazem parte desta QA.

## Ambiente e charter

- 2026-08-27 UTC; Node.js v24.18.0; Playwright 1.62.1; Chromium desktop 1280 x 800.
- Permalink: `https://6a8f7ece5ac75e84270cc00e--aidevschool-engine-lab-preview.netlify.app`.
- Identidade previamente conferida: manifest SHA-256
  `f3e06e4d9f1dc7eed1b02f3a37817cde196e422267c2b980e2e68089ff0e7e3d`; WAREHOUSE index
  SHA-256 `43d9a8b56d17c447f0322c4a3f7431e40c2d0548d7cafd4af8f85f62db77b9a6`.
- Riscos: identidade por tentativa, correlação do retry, persistência após reload, seleção do
  resultado mais recente, dispatch ao verificador separado e integridade do learner.

## Evidência reproduzível

Em `engines/codexdojo-os-prototype`:

```bash
npx playwright test --config ../../_work-products/AID-229/playwright.remote.config.ts
npm test -- --run src/verification/evidenceIntakeTeachingGame.test.ts \
  src/verification/indexedDbEvidenceRepositories.test.ts
npx vitest run --environment node bridge/routerVerificationDispatch.test.ts
sha256sum ../../learner/learning_state.yaml ../../.mavis/learning_state.yaml
```

Resultados:

```text
Remote Chromium: PASS (1) FAIL (0), 8568 ms
Persistência/intake: 2 arquivos PASS, 6/6 testes
Dispatch Node: 1 arquivo PASS, 5/5 testes
c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf  learner/learning_state.yaml
a900918aeb4c29298d5a672bb6c2c9c66c7185f7b14be35c2db40a212c861bdc  .mavis/learning_state.yaml
```

Uma invocação inicial incluiu o teste Node do bridge no ambiente browser padrão do Vitest e
falhou antes da coleta (`node:child_process` externalizado). A execução com `--environment node`
passou 5/5; portanto, o evento foi triado como erro de comando/configuração da QA, não defeito do
produto.

## Limitações

- Apenas Chromium desktop; sem mobile, tablet, Firefox ou WebKit.
- Apenas o permalink imutável; o alias de produção não foi promovido nem testado.
- Escopo restrito à jornada WAREHOUSE e contratos relacionados; catálogo voxelDojo completo não
  foi reexecutado.
- O manifesto declara `sourceRevision=local-uncommitted`; a identidade auditável continua sendo o
  deploy e os hashes do artefato, não um commit Git.

