# Runbook de Promoção v2 — piloto codexdojo-os (vigente a partir de AID-285, 2026-08-28)

Substitui o roteiro informal de AID-253/254 como referência de promoção. Origem: incidente
D1 (AID-278 NO-GO → AID-282) — o pre-check antigo não cobria handshake de missão literacy,
e deploys da mesma revisão `b9f360e` divergiram no pin do motor (permalink/draft com pin
externo stale `6a8ddc9a` × alias same-origin). Objetivo: nenhum deploy promovido sem que a
jornada **IA Prática** e a jornada **Dev** carreguem de ponta a ponta contra o artefato remoto.

## Regra de pin (obrigatória)

- `VITE_LITERACYDOJO_URL` (e demais apps embutidos: warehouse, wormhole, relay-station) **devem
  apontar same-origin** para o caminho embutido no bundle (`/apps/<app>/`), como `npm run build:pilot`.
- Contrato do tooling (commit `61b85535`, `scripts/pilot-bundle-lib.test.mjs`) **falha o build** se o
  pin apontar para host externo literacydojo. Nunca contornar esse teste.
- Nunca buildar com edit não commitado: a revisão do manifesto (`sourceRevision`) só é honesta se o
  build partir de um commit existente (causa raiz da divergência b9f360e: edit local não commitado
  embutido em build rotulado b9f360e).

## Passos (produtor; QA permanece verificadora independente)

1. **Preparar revisão** — branch dedicada a partir da revisão aprovada (append-only; sem merge em
   branch protegida), commit(s) com a mudança, push da branch + ref pinada `release/<sha>`.
2. **Build determinístico** — `COMMIT_REF=<sha> npm run build:pilot` (em `engines/codexdojo-os-prototype`);
   registrar sha256 de `dist/pilot-bundle-manifest.json` e conferir `sourceRevision = <sha>`.
3. **Testes de tooling** — `node scripts/pilot-bundle-lib.test.mjs` verde (inclui contrato same-origin).
4. **Deploy draft** — `node scripts/deploy-pilot-bundle.mjs --site 8bec714f-22cb-4468-8e2b-e3cd38652931 --json`
   → anotar `draftId`.
5. **Pre-check remoto no draft (NOVO, obrigatório)** — as DUAS jornadas contra o deploy remoto:
   ```bash
   QA_BASE_URL=https://<draftId>--aidevschool-codexdojo-os.netlify.app npm run test:smoke:remote
   ```
   - Disponível no branch `aid-279/release-smoke-refresh` (PR #178, commit `06081f3`); após merge, em main.
   - Interim (até o merge): `_work-products/AID-282/precheck-draft.mjs` com `QA_BASE_URL=<draft>`
     (17 checagens: identidade, pin same-origin, contentVersion do motor, MOTOR l01/l02, warehouse).
   - Critério: 100% verde — em especial iframe literacy same-origin + missão IA Prática renderizada.
   - Um deploy que falha aqui **não é promovido** — deploys Netlify são imutáveis; corrija em novo
     commit/branch e gere novo draft (deploys falhos ficam como evidência, nunca como alvo).
6. **Promover (sem rebuild)** — `node scripts/deploy-pilot-bundle.mjs --site … --prod --json` → anotar
   `deployId` de produção. Conferir que alias serve manifesto com mesmo sha256 do draft verificado.
7. **Pre-check remoto no alias E no permalink de produção (NOVO)** — repetir o passo 5 contra
   `https://aidevschool-codexdojo-os.netlify.app` e contra o permalink `<deployId>--…netlify.app`.
   Divergência permalink × alias = bloqueio de promoção (foi exatamente o achado AID-285/AID-279).
8. **Registrar proveniência** — RELEASE.md em `_work-products/<issue>/`: revisão, tree, refs pinadas,
   draftId, deployId, sha256 do manifesto, rollback (apenas deploys previamente verificados verdes —
   nunca um deploy com defeito conhecido).
9. **Verificação independente (QA)** — padrão AID-254: identidade, supply chain, smoke remoto das duas
   jornadas (permalink + alias × desktop/tablet/mobile), superfícies de escopo, integridade de
   `learner/learning_state.yaml`. GO/NO-GO pertence à QA; alegações cross-engine ficam retidas até o GO.

## Estado de deploys superseded (não usar)

| Deploy | srcRev | Estado |
| --- | --- | --- |
| `6a9203065c482aab8281f2e2` (permalink, ex-produção AID-273) | b9f360e | **superseded** — pin externo stale, IA Prática 0/12 |
| `6a9201e0b662aac59ee32539` (draft) | b9f360e | **superseded** — idem |
| `6a920711`, `6a920755` (drafts órfãos do heartbeat interrompido) | b9f360e | ignorar |
| `6a920835f71f4fe46c7d5954` (draft do fix) | 61b85535 | verificado 17/17 pelo produtor |
| `6a92098c07e78c7edb3b806e` (produção vigente) | 61b85535 | autoridade atual, pendente re-QA AID-284 |
| `6a9141bc5ac75e6a300cc00e` (rollback, ec265fa) | ec265fa | único rollback elegível (verde histórico) |
