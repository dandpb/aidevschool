# AID-219 — bridge de verificação no candidato retry WAREHOUSE

**Data:** 2026-08-26 UTC  
**Disposição do produtor:** publicado; **HOLD até QA independente**

**Estado de handoff:** `in_review` via AID-218. O próximo aceite pertence ao revisor independente
de AID-218, que deve executar o fluxo Chromium descrito abaixo e registrar GO ou regressão naquele
issue. O alias canônico permanece sem promoção até esse aceite.

> Nota operacional (2026-08-26 22:06 UTC): uma tentativa posterior de heartbeat terminou antes
> de executar trabalho por limite de uso do adaptador (`GPT-5.3-Codex-Spark`). Isso não altera o
> candidato, os hashes, o deploy imutável nem os checks executáveis registrados neste documento.

## Resultado

O bridge ausente apontado por AID-218 foi publicado em novo draft imutável, sem promover o alias
canônico:

- deploy ID: `6a8f62e2e288812b8909df25`;
- permalink: <https://6a8f62e2e288812b8909df25--aidevschool-codexdojo-os.netlify.app>;
- logs: <https://app.netlify.com/projects/aidevschool-codexdojo-os/deploys/6a8f62e2e288812b8909df25>.

As rotas `GET /__dojo/bridge/v1/session` e `POST /__dojo/bridge/v1/verification` agora são
reescritas para uma função Netlify antes do fallback do SPA. O verificador publicado aceita apenas
o schema fixo `teaching-game-evidence:1` e a identidade fechada de WAREHOUSE L1, recompõe a
acurácia a partir das observações e emite recibo ligado ao digest. O recibo declara explicitamente
`canonical_gate_status=not-submitted`; não escreve learner state nem mastery.

## Evidência executável do produtor

- `node --test learner/gate/tests/dojo_verification_bridge_netlify.test.mjs learner/gate/tests/literacy_verify_netlify.test.mjs`
  — PASS, 5/5.
- `npm run test:pilot-bundle` — PASS, 17/17.
- `npm run build:pilot` — PASS; OS, LiteracyDojo, WAREHOUSE, WORMHOLE e RELAY STATION.
- `npm run deploy:pilot -- --site 8bec714f-22cb-4468-8e2b-e3cd38652931 --json` — PASS.
- remoto `GET /__dojo/bridge/v1/session` com `sec-fetch-site: same-origin` — HTTP 200,
  `application/json`, token opaco e `cross-origin-resource-policy: same-origin`.
- remoto `POST /__dojo/bridge/v1/verification` com a evidência PASS capturada por AID-218 — HTTP
  200, recibo `PASS`, digest `70c3e05004ee1159aa26217cae6d873cadf29ac2fab0f24e891d109eb2aa5bc9`,
  `errors=[]` e gate canônico não submetido.

## Arquivos do bridge

- `engines/codexdojo-os-prototype/netlify.toml`
- `learner/gate/netlify-functions/dojo-verification-bridge.mjs`
- `learner/gate/tests/dojo_verification_bridge_netlify.test.mjs`

## Limites e handoff independente

Este produtor prova roteamento, publicação e um recibo remoto PASS usando a evidência já capturada,
mas não declara GO. A QA independente deve repetir em Chromium limpo o fluxo WAREHOUSE
`FAIL -> retry -> PASS`, exigir duas evidências persistidas no mesmo `missionRunId`, recibo PASS
correlacionado à segunda evidência e learner state canônico inalterado. O verificador serverless
deste candidato é deliberadamente limitado a WAREHOUSE L1; as outras missões continuam fora do
escopo de AID-219.
