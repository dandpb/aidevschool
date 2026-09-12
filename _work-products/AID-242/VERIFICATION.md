# AID-242 — integração das duas jornadas no host canônico

## Disposição do produtor

Implementação pronta para revisão independente. Este registro não declara release nem mastery.

## Candidato e rollback

- Candidate ID / deploy ID: `6a9043c45ac75e6bb50cc18b`
- Source baseline: `9d4b744526891335f0749f77db0f151b2c7ed8b7`
- URL imutável de QA: <https://6a9043c45ac75e6bb50cc18b--aidevschool-codexdojo-os.netlify.app>
- SHA-256 de `pilot-bundle-manifest.json`: `f3e06e4d9f1dc7eed1b02f3a37817cde196e422267c2b980e2e68089ff0e7e3d`
- Estado de release: draft imutável publicado sem `--prod`; o alias canônico não foi alterado.
- Rollback: não há estado de produção a reverter. Remover/ignorar o draft `6a9043c45ac75e6bb50cc18b` invalida o candidato sem tocar no deploy canônico.

O baseline Git identifica o ponto de partida; como o checkout compartilhado contém mudanças ainda não consolidadas, a identidade reproduzível para QA é o permalink mais o hash do manifesto. Este draft não deve ser promovido até as mudanças do produtor receberem revisão e uma revisão Git final.

## Limite entregue

- O entrypoint padrão de `codexdojo-os-prototype` monta a jornada canônica e mantém o desktop legado somente em `/desktop`.
- O onboarding oferece IA Prática e Trilha Dev no mesmo host.
- Hub, mapa e progresso compartilham o catálogo canônico de missões; a troca de trilha altera a recomendação ativa sem apagar o progresso da outra trilha.
- As missões preservam tentativa antes de feedback/evidência.
- A UI distingue conclusão local, evidência do produtor, verificação independente e estado canônico.
- Falhas de armazenamento, renderer e verificador aparecem como estados visíveis; quando a falha é recuperável, a UI oferece nova tentativa sem perder a evidência local.
- Analytics usa nomes e dimensões comportamentais com vocabulário fechado. O validador rejeita chaves não declaradas, respostas de lição, evidéncia, caminhos canônicos e texto livre.
- O teste do engine força `NODE_ENV=test`, impedindo que um ambiente externo `NODE_ENV=production` desative `React.act` e faça a suíte falhar antes das asserções.

## Evidência executável do produtor

Executado em 2026-08-27:

```text
cd engines/codexdojo-os-prototype
npm test -- --run src/App.characterization.test.tsx src/journey src/host src/progress

Test Files  13 passed (13)
Tests       35 passed (35)

npm run lint
Exit 0; 26 pre-existing CSS specificity/`!important` warnings, no errors or fixes applied.

npm run build
TypeScript and Vite production build completed successfully (1,864 modules transformed).

npm test -- --run src/analytics src/journey src/host src/progress
Test Files  15 passed (15)
Tests       48 passed (48)

npx playwright test tests/release-journeys.smoke.spec.ts
PASS (6) FAIL (0)

npm run test:pilot-bundle
Tests 17 passed (17)

npm run build:pilot
PASS; bundle atômico com OS, LiteracyDojo, WAREHOUSE, WORMHOLE e RELAY STATION.

npm run deploy:pilot -- --site 8bec714f-22cb-4468-8e2b-e3cd38652931 --json
PASS; draft `6a9043c45ac75e6bb50cc18b`, sem `--prod`.

curl -fsSL <permalink>/pilot-bundle-manifest.json | sha256sum
PASS; `f3e06e4d9f1dc7eed1b02f3a37817cde196e422267c2b980e2e68089ff0e7e3d`.

QA_BASE_URL=<permalink> npx playwright test tests/release-journeys.smoke.spec.ts
PASS (6) FAIL (0); executado contra o draft publicado.
```

O smoke de release cobre as duas jornadas no host, tentativa antes da solução, falha/recuperação, verificação independente, troca de trilha e preservação do estado canônico.

## Arquivos de contrato inspecionados

- `engines/codexdojo-os-prototype/src/App.tsx`
- `engines/codexdojo-os-prototype/src/journey/JourneyApp.tsx`
- `engines/codexdojo-os-prototype/src/journey/MapScreen.tsx`
- `engines/codexdojo-os-prototype/src/journey/TrackSwitcher.tsx`
- `engines/codexdojo-os-prototype/src/host/MissionShell.tsx`
- `engines/codexdojo-os-prototype/src/progress/domain.ts`
- `engines/codexdojo-os-prototype/src/data/missions.ts` (projeção gerada, apenas leitura)

## Revisão independente requerida

O QA independente deve iniciar pelo hash e URL imutável acima e executar, no mínimo:

```text
cd engines/codexdojo-os-prototype
npm test -- --run src/analytics src/journey src/host src/progress
QA_BASE_URL=https://6a9043c45ac75e6bb50cc18b--aidevschool-codexdojo-os.netlify.app \
  npx playwright test tests/release-journeys.smoke.spec.ts
curl -fsSL https://6a9043c45ac75e6bb50cc18b--aidevschool-codexdojo-os.netlify.app/pilot-bundle-manifest.json \
  | sha256sum
```

Confirmar especialmente:

1. as duas trilhas são acessíveis pelo mesmo host;
2. trocar de trilha não remove conclusões/evidências da outra;
3. nenhuma conclusão local é apresentada como verificação ou mastery;
4. o produtor não escolhe o verificador nem escreve no estado canônico.
5. a fila de analytics não contém resposta de atividade, evidência nem texto livre;
6. erros e a ação de recuperação ficam visíveis sem apagar o progresso.

## Estado do handoff no board

O candidato agora satisfaz o gate de identidade solicitado em AID-243: permalink
imutável, hash do manifesto, baseline, rollback e comandos mínimos. A disposição
correta do produtor é `in_review`, com AID-243 como caminho real de QA independente.
Não foi declarado release, GO ou mastery.
