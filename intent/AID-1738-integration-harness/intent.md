# Intent: harness de integração first-class (§5.2)

Author: Paperclip AID-1738 (assigned to Engine Systems Engineer) ·
Change-id: AID-1738-integration-harness ·
Status: accepted (ORDEM carrier AID-1714/r3-B; countersign CEO e0e08f4b citado na AID-1738)

> One source of truth: o corpo da issue AID-1738. Trecho decisivo: "Harness de
> integração first-class: extrair os passos cross-engine ad-hoc do job
> `codexdojo-os` para harness nomeado/reusável (`scripts/integration/` ou make
> target) com contrato documentado + execução local de primeira classe — PR
> próprio."

## Problem

O job `codexdojo-os (TS)` é o único lugar onde os engines TS são exercitados
juntos (onboarding ESE AID-1716 §2): instala os 5 workspaces irmãos + substrato
Python, contratos do gate via glob (AID-1601), prova de Blobs (AID-947),
schema-drift (AID-473 F2), build com URLs same-origin, smokes Playwright
(AID-571) e readiness-report. "Integração" era efeito colateral de 1 job de CI:
sem nome, sem dono, sem execução local de primeira classe.

## Outcome

- `scripts/integration/cross-engine.sh`: harness nomeado com fases
  (`deps contracts blobs-proof schema-drift build smoke report`), fail-closed,
  knobs documentadas (`INTEGRATION_PLAYWRIGHT_RETRIES`,
  `INTEGRATION_SKIP_BROWSER_INSTALL`).
- `scripts/integration/README.md`: contrato documentado (o que cada fase prova,
  argv canônico, política de extensão, não-metas).
- `ci.yml`: o job `codexdojo-os` apenas orquestra o harness — **id e nome
  inalterados** (required check `codexdojo-os (TS)` preservado), argv
  idênticos (extração organizacional, não funcional).

## Constraints

- Zero enfraquecimento de checks: mesmos comandos, mesma ordem semântica,
  `--retries=1` fixado pelo CI (política AID-571/AID-1658; local default 0).
- Sem make target na raiz (AGENTS.md: raiz `make` é só das suítes Python
  compartilhadas) — por isso `scripts/integration/`.
- Execução local de primeira classe provada primeiro (ver plan.md/receipt).
