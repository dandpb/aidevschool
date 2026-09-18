# Spec: CI by-name para engines sdlc-quest e zai-duolingo-like + gate .mjs no CI

Change-id: AID-2286-ci-byname-new-engines · From: intent/AID-2286-ci-byname-new-engines/intent.md · Status: accepted

## Requirements

1. **R1a — job `sdlc-quest`**: checkout + node 22 (`engines` do package.json
   exige `>=22`); sem install/cache (zero dependências declaradas); executa
   `node tools/test.cjs` a partir de `engines/sdlc-quest`.
2. **R1b — job `zai-duolingo-like`**: checkout + node 22 + cache npm sobre o
   lockfile; `npm ci` (exige lockfile em sync, AID-1670); `npx prisma generate`
   (tipos para tsc/build); `npm run verify` (vitest 125 testes + eslint +
   tsc --noEmit); `npm run build` com `DATABASE_URL` sqlite descartável (rotas
   DB são dinâmicas; env só protege contra init em build-time);
   `npx playwright install --with-deps chromium` + `npm run test:e2e`
   (webServer `next start` :3100 + e2e.db reset/seed no global-setup +
   /api/chat stubado por page.route).
3. **R4 — gate .mjs no CI**: job `learner` ganha `setup-node@v4` (22) e o passo
   `node --test learner/gate/tests/*.test.mjs` (glob shell; 18 arquivos).
4. **Lockfile**: resync de `engines/zai-duolingo-like/package-lock.json` para
   `npm ci` funcionar; diff limitado a resolução de transitivas faltantes e
   bumps dentro das faixas já declaradas no package.json.

## Design decisions

- Passo do gate .mjs vive no job `learner` (dono do diretório `learner/`),
  não num job apartado: mesmo runner já instalado, sinal de falha localizado.
- e2e incluído no job zai (mandato: "e2e se viável"): suíte é autocontida por
  construção; viabilidade local não pôde ser demonstrada por colisão de porta
  (E2E_PORT 3100 hardcoded + `reuseExistingServer: true`; neste ambiente a
  3100 é a API Paperclip) — a evidência do e2e é o próprio run do PR.
- Jobs são adicionais e independentes: nenhum `needs` novo; `product-readiness`
  e checks existentes não mudam de nome.

## Concerns flagged

- Resolução npm sobe prisma 6.11.1→6.19.3 (dentro de `^6.11.1`): verificado
  verde localmente (verify+build); CI instalará exatamente o lock commitado.
- `typescript.ignoreBuildErrors: true` no next.config faz o build não ser gate
  de tipos — por isso `verify` (tsc --noEmit) roda antes do build no job.
