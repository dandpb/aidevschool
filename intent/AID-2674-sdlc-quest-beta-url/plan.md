# Plan — AID-2674 (bounded ops change: short plan block per docs/sdlc/README.md)

1. **Verificar pacote no main:** `node tools/check-package.cjs` + `node
   tools/test.cjs` no commit de origem; publicáveis = `index.html`,
   `sdlc-quest.html`, `src/*.{js,css}` — exatamente a superfície do
   `tools/serve.cjs`. Manifesto `SHA256SUMS.txt` não muda.
2. **Site free tier:** `aidevschool-sdlcquest` (Netlify, conta do founder já
   usada pelo pipeline; id registrado no runbook). Sem build: arquivos
   copiados verbatim; headers noindex/nosniff/no-referrer + CSP estrita em
   `/` e `/index.html` (scripts `'self'`; o single-file offline
   `sdlc-quest.html` é inline por design e leva só os headers baseline).
3. **Script versionado:** `scripts/deploy/sdlc-quest-beta/publish.sh` —
   aborta se algum arquivo divergir do `SHA256SUMS.txt` do commit de origem;
   monta o diretório de publicação com o `netlify.toml` versionado; deploy
   `--prod`. Segredo só via env `NETLIFY_AUTH_TOKEN` (nunca no repo).
4. **Smoke reutilizável:** `smoke/sdlc-quest-beta.spec.ts` (Playwright,
   respostas derivadas de `src/data.js` em runtime) — joga a campanha até o
   gate na URL pública e falha com qualquer erro de console.
5. **Runbook/registro:** `scripts/deploy/sdlc-quest-beta/README.md` com URL,
   site id, provenance do deploy, rollback (deploy id anterior) e regras de
   novas publicações (sempre a partir de main, manifesto coerente).
6. **Aceitação (issue):** (1) URL pública com fluxo até o gate ✔ (2)
   screenshots ✔ (3) CI do engine verde no PR ✔ (4) PR merged via SDLC
   (countersign QA + merge single-writer FPE citando o countersign).

## Verificação

- Local: manifesto 227 arquivos OK; engine tests 339 pass / 0 fail; smoke
  Playwright contra host estático local com headers de produção: passed.
- Live (pós-deploy): smoke Playwright contra
  https://aidevschool-sdlcquest.netlify.app — passed (15/18, 5/6 estações,
  1500 XP, gate autorizado, zero erros de console); screenshots
  `sdlc-01-home-public.png`, `sdlc-03-gate-authorized.png`,
  `sdlc-04-map-15of18.png` anexos em AID-2674.
- Deploy provenance: main `4461841f` (site deploy
  `6ab723bfcd6907b88fe9a6cb`).
