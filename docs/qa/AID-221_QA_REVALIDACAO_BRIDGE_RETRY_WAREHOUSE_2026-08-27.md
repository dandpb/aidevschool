# AID-221 — revalidação independente do bridge e retry WAREHOUSE

## Disposição

**APROVADO no candidato imutável `6a8f7ece5ac75e84270cc00e`, limitado ao escopo abaixo.**

O bridge same-origin respondeu corretamente e a jornada pública WAREHOUSE
`FAIL -> retry -> PASS` voltou a passar em Chromium limpo. As duas tentativas têm
`attempt_id` e `evidenceId` distintos, compartilham o mesmo `missionRunId`, persistem
após reload e o host apresenta o PASS mais recente. Nenhum estado canônico do learner
foi alterado.

## Charters de risco

1. Confirmar disponibilidade e boundary HTTP do bridge same-origin.
2. Reproduzir a jornada crítica WAREHOUSE `FAIL -> retry -> PASS` no deploy remoto.
3. Verificar identidade por tentativa, correlação no mesmo run e persistência após reload.
4. Exercitar os contratos focados de intake, IndexedDB e dispatch ao verificador.
5. Comparar hashes do learner canônico e da projeção `.mavis` antes/depois.

## Ambiente e evidência reproduzível

- Data: 2026-08-27 UTC.
- Linux; Node.js `v24.18.0`; Playwright `1.62.1`; Chromium desktop 1280 x 800.
- Permalink: `https://6a8f7ece5ac75e84270cc00e--aidevschool-engine-lab-preview.netlify.app`.

Executado em `engines/codexdojo-os-prototype`:

```bash
sha256sum ../../learner/learning_state.yaml ../../.mavis/learning_state.yaml
npx playwright test --config ../../_work-products/AID-229/playwright.remote.config.ts
npm test -- --run src/verification/evidenceIntakeTeachingGame.test.ts \
  src/verification/indexedDbEvidenceRepositories.test.ts
npx vitest run --environment node bridge/routerVerificationDispatch.test.ts
sha256sum ../../learner/learning_state.yaml ../../.mavis/learning_state.yaml
```

Probe do bridge:

```bash
curl -H 'Sec-Fetch-Site: same-origin' -D - \
  https://6a8f7ece5ac75e84270cc00e--aidevschool-engine-lab-preview.netlify.app/__dojo/bridge/v1/session
```

Resultados:

- Jornada remota: PASS 1/1 em 5,389 ms.
- Intake/persistência: PASS 2 arquivos, 6/6 testes.
- Dispatch Node: PASS 1 arquivo, 5/5 testes.
- Bridge: HTTP 200, `application/json`, `cache-control: no-store`,
  `cross-origin-resource-policy: same-origin` e token não vazio de 43 caracteres.
- Hashes antes/depois invariantes:
  - `learner/learning_state.yaml`: `c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf`;
  - `.mavis/learning_state.yaml`: `a900918aeb4c29298d5a672bb6c2c9c66c7185f7b14be35c2db40a212c861bdc`.

## Triage e limitações

Nenhum defeito de produto ou falha de infraestrutura foi observado nesta execução.
O aceite cobre somente WAREHOUSE L1, bridge same-origin e Chromium desktop no permalink
imutável. Não cobre alias de produção, promoção de release, Firefox, WebKit, mobile,
outros viewports ou demais missões. Este parecer não declara mastery, paridade ou
robustez ampla.
