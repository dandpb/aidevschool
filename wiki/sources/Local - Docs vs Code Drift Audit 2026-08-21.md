---
type: source
title: "Auditoria interna: docs vs código real no aidevschool"
source_type: internal-audit
author: autoresearch agent (explore subagent)
date_published: 2026-08-21
url: n/a
confidence: high
key_claims:
  - "docs/VISION.md afirma que LiteracyDojo está 'resolvida para o player', mas a matriz product-readiness gerada mostra stale/sem tier"
  - "docs/ESTADO_REAL_2026-08-17.md cita .env.production que não existe"
  - "docs/CONSOLIDACAO_2026-08-17.md contradiz a si mesma sobre projetos implemented (2 vs 18)"
  - "engines/codexdojo-os-prototype/README.md promete 16 game packages mas o pilot build embute apenas 4"
  - "engines/pixelDojo/README.md diz que só o Game 01 existe, mas pixel-quest/README.md cobre 18 projetos"
---

# Auditoria interna: docs vs código real no aidevschool

Auditoria local do repositório `/Users/danielbarreto/Development/aidevschool`
realizada em 2026-08-21. Compara documentação (READMEs, VISION, handbook,
product-readiness, plans) contra código, config e evidências reais.

## Drift de alta severidade

- **docs/VISION.md:124-139**: "Release do LiteracyDojo (MVP IA na Prática)
  — resolvida para o player". A matriz gerada
  `docs/product-readiness/README.md:11` marca
  `literacy-standalone-first-lesson` como `stale` e sem tier. O assessment
  v4 concedeu `conditional-follow-up`/`customer-ready`, mas a matriz viva
  atual não repete isso.
- **docs/ESTADO_REAL_2026-08-17.md:217**: "Correção: `.env.production`
  aponta as 4 chaves para `/apps/<nome>/`". O arquivo
  `engines/codexdojo-os-prototype/.env.production` não existe; as URLs são
  injetadas pelo script `build:pilot` do `package.json` e por
  `scripts/bundle-missions.mjs`.
- **docs/CONSOLIDACAO_2026-08-17.md:31,158**: contradiz-se: linha 31 diz
  "2 de 18 implemented"; linha 158 diz "os 18 `node-impl/` contêm as
  implementações prontas". O catálogo mostra apenas 01 e 02 `implemented`,
  17 `scaffolded`.
- **engines/pixelDojo/README.md:54-57**: "Only Game 01 is specified in
  PLAN.md; only 01 exists on disk so far". O README de
  `engines/pixelDojo/pixel-quest/README.md` descreve um jogo mapeando os 18
  projetos, com 4 tipos de encontro implementados.
- **engines/codexdojo-os-prototype/README.md:49**: "Choose any of the 16 game
  packages". O pilot build embute apenas 4 missões
  (`literacydojo`, `warehouse`, `wormhole`, `relay-station`) conforme
  `scripts/bundle-missions.mjs:21-26`.

## Drift de média severidade

- **docs/VISION.md:53**: "capítulo inicial WAREHOUSE → WORMHOLE → RELAY
  STATION" — pula o projeto 04 (FACTORY FLOOR/task queue).
- **docs/VISION.md:111-113** e **README.md raiz**: AI Literacy é descrita
  como trilha separada fora do catálogo; ela é parte do catálogo
  compartilhado (Level 0/00) — ver ADR-0005.
- **engines/codexdojo-os-prototype/README.md:96**: "Catalog with 11 apps and
  explicit maturity states" — não há catálogo de 11 apps em `src/data/`.
- **engines/codexdojo-os-prototype/README.md:64**: portas 5175/5176/16
  catalog ports — os defaults atuais são 5178, 5202, 5203, 5205 para as 4
  missões pilot.
- **docs/handbook/02_onboarding.md:37**: "Python 3.10+"; repo exige
  `>=3.11` (`pyproject.toml`, `setup.sh`).
- **engines/miniTown/README.md:20-23**: cita 14 testes; package.json tem 26
  testes.
- **engines/voxelDojo/README.md:8**: "16 voxelDojo games implemented" — os
  projetos 01 e 04 não estão no voxelDojo (estão no pixel-quest); e os
  16 pacotes não são todos "implementados" no sentido pedagógico.

## Drift baixa / cosmético

- **docs/handbook/README.md:153**: data de revisão 2026-07-25; muito mudou
  desde então.
- **engines/voxelDojo/README.md:50**: "Only Game 10 is specified in PLAN.md
  so far; the rest are seeds" — hoje existem 16 pacotes.
- **engines/aiDevschoolMvp/**: falta `README.md`; a entrada canônica é
  `aidevschool/SKILL.md`.

## Método

Não foram executados builds/testes dos engines. Verificações: existência de
arquivos, `package.json`, `pyproject.toml`, CI, `curriculum/catalog.md`,
`docs/product-readiness/` tooling, `curl` na URL pública.

## Recomendação geral

Tratar `docs/ESTADO_REAL_2026-08-17.md` e `docs/CONSOLIDACAO_2026-08-17.md`
como snapshots datados (o que são) e não como estado atual. Mover ou marcar
claramente como archive se não forem mantidos. Para status vivo, preferir
`docs/product-readiness/` (gerado) e `curriculum/catalog.md`.
