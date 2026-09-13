# Cross-engine integration harness (`scripts/integration/`)

**Change-id:** AID-1738-integration-harness (ORDEM AID-1714/r3-B, §5.2 do
onboarding ESE — AID-1716 recibo a4c30b89 §5)

## Por que este harness existe

O job de CI `codexdojo-os (TS)` era o **único lugar** onde os engines TS eram
exercitados juntos: ele instala todos os workspaces irmãos + o substrato Python
compartilhado, roda os contratos de `learner/gate` (glob), a prova end-to-end de
Blobs (AID-947), o monitor de schema-drift (AID-473 F2), o build com as URLs
same-origin dos pilots, os smokes Playwright (pilot + desktop) e o
readiness-report. "Integração" era um efeito colateral de 1 job de CI — sem
nome, sem dono, sem execução local de primeira classe.

Este diretório é a casa nomeada desse contrato. O job de CI **continua sendo o
mesmo required check** (`codexdojo-os (TS)` — id e nome inalterados), mas agora
só orquestra: os passos vivem em `cross-engine.sh` e rodam idênticos em CI e
localmente.

## Contrato

O harness prova, ponta a ponta, que o OS integrado funciona contra os engines
reais e o substrato compartilhado:

| Fase | O que prova | Fonte/commando canônico |
| --- | --- | --- |
| `deps` | todos os workspaces TS irmãos instalam de forma reprodutível (lockfiles congelados) + `pip install -e` da raiz (bridge despacha verificadores Python) | `npm ci`/`pnpm install --frozen-lockfile` |
| `contracts` | contratos do gate de ouro via **glob** — enumeração manual já orfanou 3 contratos (AID-1601 R1) | `node --test learner/gate/tests/*.test.mjs` |
| `blobs-proof` | export deduplicado contra um servidor real de Blobs (AID-947) | `verify_deployed_blobs.mjs` |
| `schema-drift` | monitor falha alto nos fixtures sintéticos (AID-473 F2) | `schema_drift_monitor.mjs` |
| `build` | dist com as URLs same-origin dos pilots (Vite lê `import.meta.env` em build time) | `npm run build` + `VITE_*` |
| `smoke` | pilot estático monta missões da própria origem + 3 smokes desktop | `bundle-missions.mjs` + Playwright |
| `report` | fatos de producer para o gate de claims (`product readiness (claims)` agrega; CI nunca concede tier) | `readiness-report.mjs` |

Invariante de behavior: os argv são os mesmos que o job executava inline até
`4bb7600` — a extração é organizacional (dono + reuso + local), não funcional.

## Uso

```bash
# local, primeira classe (a partir da raiz do repo):
bash scripts/integration/cross-engine.sh                     # todas as fases
bash scripts/integration/cross-engine.sh contracts schema-drift   # subconjunto
INTEGRATION_SKIP_BROWSER_INSTALL=1 bash scripts/integration/cross-engine.sh \
  smoke report                                               # browsers já instalados

# CI (job codexdojo-os): idêntico, com as knobs de política:
#   bash ../../scripts/integration/cross-engine.sh --skip-self-install
#   INTEGRATION_PLAYWRIGHT_RETRIES=1
```

Pré-requisitos locais: Node 20+, pnpm 9 no PATH, Python 3.12+, Chromium
Playwright (ou `INTEGRATION_SKIP_BROWSER_INSTALL=1` se já instalado).

### Knobs de ambiente

| Var | Default | Efeito |
| --- | --- | --- |
| `INTEGRATION_PLAYWRIGHT_RETRIES` | `0` | `--retries` do Playwright na fase `smoke`. CI fixa `1` (política determinística AID-571/AID-1658). **Nunca** suba retries para mascarar flake — recorrência no mesmo teste = quarentena + issue. |
| `INTEGRATION_SKIP_BROWSER_INSTALL` | unset | `=1` pula `npx playwright install --with-deps chromium` (máquinas com browsers instalados / sem sudo). |

## Política de extensão

Um passo novo é "de integração cross-engine" se ele precisa de **mais de um
workspace** (ou do substrato Python) para significar algo. Passos assim entram
aqui como fase nomeada + linha no contrato acima — não como `- run:` ad-hoc no
`ci.yml`. Passos unitários de um único engine ficam no próprio engine (ou no
job dele). O job `codexdojo-os` continua sendo o único required check desta
superfície; nenhuma fase nova pode enfraquecer as existentes (fail-closed).

## Não-metas

- Não é um build system do repo (raiz `make` continua só para as suítes Python
  compartilhadas — convenção do AGENTS.md; por isso harness em
  `scripts/integration/`, não make target).
- Não substitui os jobs por-engine (pixelDojo, voxelDojo, etc.): eles continuam
  donos das suas suítes e readiness artifacts.
- Não concede tier de readiness: `report` só produz fatos de producer
  (observação/concessão é do assessor independente).
