# AID-229 — QA independente WAREHOUSE no candidato 6a8f7ece

## Disposição

**GO para o candidato imutável `6a8f7ece5ac75e84270cc00e`, dentro do escopo testado.**

O fluxo público crítico `FAIL -> retry -> PASS` foi reproduzido em Chromium limpo no permalink
do draft. As duas evidências permaneceram no IndexedDB com `evidenceId` e `attempt_id` distintos,
correlacionadas ao mesmo `missionRunId`; após voltar ao hub e recarregar, a UI apresentou o
veredito PASS da tentativa mais recente. Não houve alteração do learner canônico nem de sua
projeção `.mavis`.

Nenhum defeito de produto release-blocker foi encontrado neste charter. Os dois primeiros ensaios
falharam por problemas do próprio teste de QA (ação antes de a lista de chaves estar materializada e
leitura do campo `attempt_id` no nível errado); foram corrigidos no artefato de teste e não são bugs
do candidato.

## Candidato e ambiente

- Data: 2026-08-27 UTC
- Permalink: `https://6a8f7ece5ac75e84270cc00e--aidevschool-engine-lab-preview.netlify.app`
- Deploy: `6a8f7ece5ac75e84270cc00e`
- Chromium via Playwright 1.62.1; viewport 1280 x 800
- Node.js: v24.18.0
- Manifest remoto SHA-256: `f3e06e4d9f1dc7eed1b02f3a37817cde196e422267c2b980e2e68089ff0e7e3d`
- WAREHOUSE index remoto SHA-256: `43d9a8b56d17c447f0322c4a3f7431e40c2d0548d7cafd4af8f85f62db77b9a6`

## Charter executado

1. Entrar pela Trilha Dev e abrir WAREHOUSE no draft imutável.
2. Produzir deliberadamente uma tentativa incorreta e exigir `Veredito independente: FAIL`.
3. Confirmar uma entrada persistida e verificada com `attempt_id=kv-warehouse-L1-attempt-1`.
4. Acionar retry no mesmo runtime, responder corretamente e exigir aprovação independente.
5. Confirmar duas entradas persistidas: attempts 1 e 2, dois `evidenceId`, um `missionRunId`.
6. Voltar ao hub, recarregar e exigir `Veredito PASS`; comparar novamente as duas entradas.
7. Comparar hashes do learner antes/depois.

## Evidência reproduzível

Executado a partir de `engines/codexdojo-os-prototype`:

```bash
npx playwright test --config ../../_work-products/AID-229/playwright.remote.config.ts
sha256sum ../../learner/learning_state.yaml ../../.mavis/learning_state.yaml
```

Resultado final:

```text
PASS (1) FAIL (0)
Time: 4308ms
c3cae54c452413b75b64f1e97ab6f34fe9d529a8be4b50fdccf861696d230bbf  learner/learning_state.yaml
a900918aeb4c29298d5a672bb6c2c9c66c7185f7b14be35c2db40a212c861bdc  .mavis/learning_state.yaml
```

Artefatos:

- `_work-products/AID-229/remote-warehouse-retry.spec.ts`
- `_work-products/AID-229/playwright.remote.config.ts`
- `engines/codexdojo-os-prototype/warehouse-retry-pass.png` (saída gerada; não é fonte)
- trace da última execução sob `_work-products/AID-229/test-results/` (saída gerada)

## Expected versus actual

| Risco | Esperado | Atual |
| --- | --- | --- |
| Primeira tentativa | FAIL independente persistido | PASS do charter |
| Retry | novo attempt/evidence no mesmo run | PASS do charter |
| Seleção mais recente | hub apresenta PASS | PASS após retorno + reload |
| Persistência | duas evidências coexistem | PASS, 2 registros |
| Learner | hashes inalterados | PASS |
| Identidade do draft | hashes iguais aos publicados | PASS |

## Limitações

- Cobertura de navegador limitada a Chromium desktop; tablet, mobile e outros browsers não foram
  executados neste issue.
- Não foi promovido nem testado o alias de produção; o GO vale apenas para o deploy imutável acima.
- A bateria focou a jornada WAREHOUSE e não reexecutou o catálogo voxelDojo completo.
- O `sourceRevision` do manifesto é `local-uncommitted`; por isso a identidade auditável permanece
  deploy + hashes, e não um commit Git.

## Decisão de release

O HOLD de QA específico de AID-212 pode ser removido para este candidato. Qualquer promoção do
alias continua sendo uma ação de Release/CEO fora do escopo desta QA.
