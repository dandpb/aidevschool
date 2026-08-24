# AID-121 — integração canônica e handoff do produtor

**Data UTC:** 2026-08-24  
**Candidato:** `3586cb587092abea2c4881b2f6a8b926e9487921` (`origin/main`)  
**Disposição do produtor:** pronto para QA independente; este documento não concede release nem mastery.

## Resultado

O host canônico já integra, no candidato acima, as jornadas exigidas por AID-121:

- LiteracyDojo hospedado para a trilha não técnica;
- primeiro capítulo developer hospedado, iniciado por WAREHOUSE;
- eventos de ativação, retomada, tentativa, retry e recuperação limitados a vocabulários comportamentais fechados;
- estados visíveis de falha, retry, verificação indisponível e retorno seguro;
- progresso local explicitamente separado de evidência, verificação e mastery canônico;
- build estático do piloto com runtimes empacotados e inventário de readiness com entrada, recuperação e próxima ação.

Arquivos de contrato e implementação relevantes:

- `engines/codexdojo-os-prototype/src/analytics/events.ts`
- `engines/codexdojo-os-prototype/src/journey/useJourneyController.ts`
- `engines/codexdojo-os-prototype/src/host/MissionShell.tsx`
- `engines/codexdojo-os-prototype/src/journey/ProgressScreen.tsx`
- `engines/codexdojo-os-prototype/scripts/bundle-missions.mjs`
- `engines/codexdojo-os-prototype/netlify.toml`
- `docs/product-readiness/inventory.yaml`

O allowlist de analytics rejeita chaves fora da política e não aceita resposta de lição nem texto livre. Nenhuma verificação executada escreveu em `learner/`.

## Evidência reproduzida em worktree limpo

Preparação:

```bash
git fetch origin main
git worktree add --detach /tmp/aid121.<id> origin/main
cd /tmp/aid121.<id>/engines/codexdojo-os-prototype
npm ci --include=dev
```

Testes focados e build:

```bash
NODE_ENV=test npm test -- --run \
  src/analytics src/journey src/progress src/host \
  src/app/routes.test.ts src/App.characterization.test.tsx
# 19 files passed; 121 tests passed

NODE_ENV=production npm run build
# PASS — TypeScript e Vite; dist gerado
```

Smoke do candidato estático, incluindo LiteracyDojo e primeiro capítulo developer:

```bash
cd ../voxelDojo
CI=true NODE_ENV=test pnpm install --frozen-lockfile --prod=false
cd ../codexdojo-os-prototype
CI=true NODE_ENV=test npm run test:smoke:pilot
# 4 runtimes empacotados; 3 testes Playwright passaram
```

O smoke valida rotas estáticas reais sob `/apps/literacydojo/` e `/apps/warehouse/`, incluindo tentativa incorreta, retry, retomada e separação entre conclusão local e verificação independente.

## Nota de setup

Uma tentativa inicial com `NODE_ENV=production` durante a instalação dos engines filhos omitiu dependências de desenvolvimento (`vite`/plugins) e falhou antes do smoke. Isso é uma condição de preparação do runner, não um resultado verde. A receita acima fixa o ambiente explicitamente e foi a execução aceita pelo produtor.

## Pedido ao QA independente

Reproduzir no mesmo SHA e verificar, sem confiar neste parecer:

1. ambas as rotas do piloto estático;
2. ausência de respostas/texto livre nos envelopes de analytics;
3. recuperação visível sem falso sucesso;
4. separação entre progresso local, evidência, verificação e mastery;
5. correlação do artefato publicado com SHA imutável e rollback para o deploy anterior.

Qualquer mudança de SHA exige nova correlação. O produtor não aprova a própria entrega.
