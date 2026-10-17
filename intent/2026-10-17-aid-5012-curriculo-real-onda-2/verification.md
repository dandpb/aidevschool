# Verification — AID-5012 Onda 2 (recibo datado)

Executado em 2026-10-17 no checkout do plano AID-1521, Node v24.18.0,
npm 11.17.0. Verificador: `curriculum/_shared/verify_node_impl.sh` (novo).

## 06_file_upload_pipeline/node-impl

Comando completo (incluindo install):

```
bash curriculum/_shared/verify_node_impl.sh curriculum/07_rest_api_auth/node-impl --no-install
bash curriculum/_shared/verify_node_impl.sh curriculum/06_file_upload_pipeline/node-impl --no-install
```

Saída (06):

```
PASS install=skipped step=install
PASS step=lint
PASS step=build
PASS step=test
VERDICT PASS project=curriculum/06_file_upload_pipeline/node-impl steps=4/4 date=2026-10-17T18:19:09Z
```

- `npm ci --include=dev` executado manualmente antes (exit 0) — o passo
  install completo também foi validado no 07.
- Testes: **11/11** — `server.test.ts` (4, pré-existentes, não editados) +
  `edge.test.ts` (7, novos). `Test Files 2 passed (2)`.
- `lint` exit 0; `build` (tsc) exit 0.

## 07_rest_api_auth/node-impl

Comando com passo install completo:

```
bash curriculum/_shared/verify_node_impl.sh curriculum/07_rest_api_auth/node-impl
```

Saída:

```
PASS step=install
PASS step=lint
PASS step=build
PASS step=test
VERDICT PASS project=curriculum/07_rest_api_auth/node-impl steps=4/4 date=2026-10-17T18:20:42Z
```

- Testes: **17/17** — `app.test.ts` (6) + `jwt-secret.test.ts` (2)
  (pré-existentes, não editados) + `security.test.ts` (9, novos).
  `Test Files 3 passed (3)`.
- `lint` exit 0; `build` (tsc) exit 0.

## Regressões e correções durante a verificação

- `edge.test.ts`/`security.test.ts` primeira rodada: 2 falhas de dado de
  teste (senha de 12 chars válida usada como caso "curta"; claims JWT com
  `exp`/`aud` duplicados no `jwt.sign`). Corrigidas nos dados do teste; nenhuma
  mudança de comportamento de produção foi necessária além das três do spec
  (zero-byte, validação de paginação/filtro, pin de algoritmo).
- Lint exigiu remover assertions desnecessárias e acessos `any` — testes
  reescritos no padrão `bodyOf<T>` do `app.test.ts` existente.

## Projeções e suíte Python

- `python3 -m learner.substrate` exit 0 ("Generated projections
  regenerated: 31").
- `python3 -m pytest learner/substrate/tests -q`: 231 passed, 1 skipped após
  atualização do pin `scaffoldedCount` 14→12 (a falha anterior era o pin da
  Onda 1, atualizado no mesmo commit como em `90f89498`).
- `TestDashboardSnapshot`: 5 passed.

## Drift conhecido e deliberado

Este checkout compartilhado contém trabalho concorrente (AID-5006,
práticas pg-d02..04). Os arquivos `engines/codexDojo/src/data/learner.ts` e
`engines/codexdojo-os-prototype/src/data/learner.ts` ficaram com conteúdo
misto (AID-5006 + contagem 06/07). Neste PR, apenas o hunk
`scaffoldedCount` entra (via patch no index); o restante desses arquivos e
`docs/learner-downloads/catalogo-preview/*` permanecem para o dono do
AID-5006/regeneração seguinte. Nenhuma mudança de código desses arquivos é
reivindicada por este PR além do contador.
