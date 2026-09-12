# QA independente — AID-154

## Escopo validado
- Validar isolamento do Service Worker do OS e do LiteracyDojo no candidato de piloto.
- Confirmar rota `GET /sw.js` e `GET /apps/literacydojo/sw.js`.
- Correlacionar SHA/source revision, hash de artefatos e evidências de offline.
- Não alterar learner/mastery.

## Execução realizada
- `engines/codexdojo-os-prototype`: `npm run test:pilot-bundle`
- `engines/literacyDojo`: `npm run test pwaRoute.test.ts`
- `engines/literacyDojo`: `npm run test:e2e -- pwa.spec.ts`
- `engines/codexdojo-os-prototype`: `COMMIT_REF=<sha> npm run build:pilot`
- Validação HTTP em `engines/codexdojo-os-prototype/dist` com servidor `python3 -m http.server 4173`.

## Evidência coletada
1. `pilot-bundle-lib.test.mjs`: 11/11 testes aprovados.
2. `pwaRoute.test.ts`: 2/2 testes aprovados.
3. `pwa.spec.ts`: 1/1 teste aprovado (offline após visita inicial).
4. Manifesto do bundle:
   - `sourceRevision`: `9d4b744526891335f0749f77db0f151b2c7ed8b7`
   - `apps/literacydojo/sw.js` SHA-256: `520c1205d666a51b2120dc3f07ce3b774510242dd03e547122ed4313e1ec06e4`
   - `apps/literacydojo/index.html` SHA-256: `ccc53a8f9852079bd64c51cae20d6bf24d0e4561a8f2ccc0917b8414e785c185`
   - `pilot-bundle-manifest.json` SHA-256: `77bf8a7d2512be7e2353912a564439086a7058dd7db51e8294870dcff42de209`
5. Arquivo local para rota raiz inexistente:
   - `root sw.js absent` (em `dist`).
6. `GET /sw.js` no bundle local:
   - `HTTP/1.0 404 File not found`
   - Conteúdo não é o shell SPA (resposta HTML de erro genérica).
7. `GET /apps/literacydojo/sw.js` no bundle local:
   - `HTTP/1.0 200 OK`
   - `Content-Type: text/javascript`
   - Conteúdo inicia com comentário de SW e define `SCOPE` por `new URL("./", self.location.href).pathname`.
8. Serviço de PWA em build integrado:
   - Registro no código fonte com `serviceWorkerUrl(import.meta.env.BASE_URL)` e `BASE_URL=/apps/literacydojo/` no build do piloto.

## Limitações / bloqueios observados
- Não foi possível validar endpoint remoto/permalink de deploy da candidata por falta de autenticação de projeto/serviço:
  - `npx netlify status` sem pasta linkada ao projeto Netlify.
  - `paperclipai whoami` retorna `API error 401: Board authentication required`.
- Não há publicação de candidato comprovada nesta sessão.

## Decisão técnica
- GO técnico do recorte de SW (escope/rotas/offline).
- **Bloqueio operacional de encerramento**: publicar/autorizar candidato depende de autenticação do Board e de owner de release.
  - Owner de desbloqueio recomendado: CEO + Release Engineer para autorização e publicação do candidato validado.

## Reteste remoto após sinalização de desbloqueio — 2026-08-25 10:03 UTC

Destino: `https://aidevschool-codexdojo-os.netlify.app`.

- `GET /sw.js`: **HTTP 200**, `content-type: text/html; charset=UTF-8`, 608 bytes; corpo é o shell do OS.
- `GET /apps/literacydojo/sw.js`: HTTP 200, `content-type: application/javascript; charset=UTF-8`.
- SHA-256 do SW remoto: `114f6be8951f04554ffe5609fdb0900f89900cf77d866cc78052a1ca950dc807`.
- SHA-256 esperado do candidato local validado: `520c1205d666a51b2120dc3f07ce3b774510242dd03e547122ed4313e1ec06e4`.
- `GET /pilot-bundle-manifest.json`: HTTP 200 com o shell HTML, portanto não permite correlacionar `sourceRevision`/deploy.
- Nenhum permalink novo ou deploy ID do candidato foi encontrado nos artefatos de release disponíveis.

### Disposição final

**NO-GO / blocked (P1 de release).** O alias público não contém a correção validada e falha o
critério central de isolamento de `/sw.js`. Owner de desbloqueio: **CEO + Release Engineer**;
ação: autorizar/publicar exclusivamente o bundle candidato associado ao SHA
`9d4b744526891335f0749f77db0f151b2c7ed8b7`, fornecer deploy ID e permalink imutável e então
reativar a QA independente no alias e permalink. Release e convites permanecem não autorizados.
