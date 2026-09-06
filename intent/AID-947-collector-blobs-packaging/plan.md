# Plan — AID-947 (defeito do countersign AID-940; pedido na issue)

PR único, 4 passos. Aceitação do plano: o pedido explícito itens 1–4 da
issue AID-947 (countersign QA AID-940) + verificação independente pós-fix
da QA como gate de `done`.

1. **Diagnóstico executável** — repro local pré-fix:
   `import("@netlify/blobs")` → `ERR_MODULE_NOT_FOUND`; default export →
   NDJSON /tmp com duplicatas em re-POST idêntico (equivalente black-box do
   achado QA). Artefato: `evidence/repro-rootcause-output-prefix.txt`.
   Verificação: saída capturada (acima).
2. **Fix canônico** — `learner/gate/netlify-functions/`:
   - `package.json` + `package-lock.json` declarando `@netlify/blobs`
     pin exato `10.7.13` (engines node ^14.16||>=16 — compatível com as 2
     superfícies; v11 exige >=22.12 e a literacy não pin NODE_VERSION);
   - `netlify-blobs-runtime.mjs`: wrapper com import ESTÁTICO
     (`export { getStore } from "@netlify/blobs"`) — traçável pelo bundler
     esbuild das funções; o coletor carrega o wrapper dinamicamente
     (`@vite-ignore`), mantendo o fallback gracioso em vite/vitest;
   - `dojo-analytics-collector.mjs`: default export `deployedHandler`
     seleciona backing via `createAnalyticsBacking()` (lazy, sem TLA,
     retry de init no request seguinte); `readRange`/`prune` com
     `directories: true` + paginação `cursor`/`nextCursor`; `now`
     função-relógio (aceita Date fixo para testes);
   - `.d.mts` atualizado para a superfície real.
   Verificação: `verify_deployed_blobs.mjs` 6/6 PASS (server Blobs local
     real; 1 linha pós re-POST duplicado; controle sem contexto → NDJSON).
3. **Projeção OS + CI** — `build-pilot-bundle.mjs` stageia wrapper +
   `package.json` (a projeção `netlify/functions/` é artefato de build
   gitignored, regenerada pelo deploy OS; paridade canônico↔staged travada
   por teste onde a projeção exista); novo teste
   `dojo_analytics_collector_packaging.test.mjs` (8 invariantes: dep pin
   exata, wrapper único import estático, coletor sem bare specifier,
   default export com backing, paridade canônico↔staged, staging no
   script, tomls apontando os diretórios certos, repo root sem
   package.json); ci.yml (job codexdojo-os) ganha packaging + v2 +
   activation surfaces + `npm ci` funções + verify ponta-a-ponta.
   Verificação: `node --test` das suites gate 16+16+8 PASS; CI no PR.
4. **Review/entrega** — PR com disclosure; countersign independente QA;
   merge CEO; deploy (fluxo promotion vigente); QA re-verifica em
   produção (re-POST idêntico → 1 linha por eventId nas 2 superfícies);
   recibo na AID-947 com URLs/timestamps → `done`.

## Estado

- Passos 1–3: implementados (branch `aid947-collector-blobs-packaging`).
- Passo 4: PR aberto; aguardando CI + countersign QA + merge CEO + deploy +
  re-verificação QA em produção.
