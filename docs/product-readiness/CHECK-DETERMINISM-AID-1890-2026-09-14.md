# `product readiness (claims)` — flap de factory-staleness (AID-1890)

**Data:** 2026-09-14 · **Autor:** Platform & Release Engineer (AID-1890, achado A
de AID-1857) · **Tipo:** root-cause + correção (determinismo do check required)

## Sintoma (evidência first-hand)

O check **required** `product readiness (claims)` falhou no PR #418 @
`824dd465` (15:07Z) e na branch `21dde164` (14:26Z), enquanto PRs #417 (15:48Z)e #419 e as lanes `main` (09:29Z e 15:26Z) passaram na mesma janela. A
assinatura "lacks independent evidence" / "missing promoted result" impressa no
log é ruído informativo esperado (impresso também nas runs verdes); a linha que
realmente falhou foi **`DRIFT: docs/product-readiness/README.md`** no passo
`check`.

## Causa raiz

`render_matrix` avaliava cada use case com `current_decision(..., now=relógio,
repo=árvore de trabalho)`. O drift do `check` comparava o README rastreado
(snapshot do estado promovido em `main`) contra esse render **vivo**, que muda
com:

1. **qualquer diff sob os `sourcePaths` de um use case** (ex.:
   `engines/pixelDojo/pixel-quest/playwright/`, `engines/voxelDojo/`) — o
   fingerprint de fonte recalculado diverge do promovido → linha `stale` →
   DRIFT → vermelho. Reproduzido deterministicamente: base `00789fe6` + diff do
   PR #418 → DRIFT (1 linha: `pixelquest-evidence-encounter` pass→stale).
2. **o relógio de parede**: `now.date() > revalidateBy` vira a linha para
   `stale` à meia-noite UTC, independente de diff.

O sinal de staleness tem um único consumidor desenhado: a **fábrica de
re-grant**, que dispara sobre **run de CI vermelha em push na `main`**
(`readiness-regrant.yml`, `workflow_run`). Como required context, o mesmo
vermelho em PRs criava deadlock: PR que toca `sourcePaths` não mergeia → `main`
nunca vê a mudança → a fábrica nunca dispara → o PR nunca fica verde. PRs
irmãos que não tocam `sourcePaths` passavam — daí o padrão de "flap".

## Correção (gate preservado, sinal preservado)

- **`check` determinístico** (todas as lanes): o drift compara as views geradas
  contra as **decisões promovidas registradas** (`recorded_decision`) — função
  pura das fontes rastreadas, sem relógio e sem fingerprint da árvore. Desync de
  view (fonte canônica editada sem re-render) e candidato inválido continuam
  bloqueando em toda lane.
- **`check --require-current`** (novo): falha quando a re-avaliação viva diverge
  do registrado (`live_deviations`) — a janela stale, agora com mensagem
  nomeada por use case (`STALE-WINDOW: ...`). Na CI:
  - **push em `main`**: bloqueante — o gatilho da fábrica segue idêntico
    (run vermelha de push em main).
  - **lanes de PR**: `::warning` não-bloqueante (visibilidade de triagem).
- `enforce` inalterado (já ignorava janelas stale por design — ver teste
  AID-925 em `tests/test_cli.py`).

Sem mudança em branch protection, sem gate desabilitado, sem check enfraquecido:
defeitos reais (desync de view, candidato inválido, claims bloqueadas, artefato
com digest divergente) continuam vermelhos.

## Efeito colateral imediato esperado

`main` hoje carrega `minitown-explore-only` com fingerprint stale (a linha
"stale" estava congelada no README rastreado). No próximo push em `main` após
este PR, `--require-current` fica vermelho para minitown → a fábrica propõe o
re-grant → countersign → verde. É o ciclo desenhado operando de forma visível.

## Evidência

- Repro local determinístico (base `00789fe6` + diff PR #418): DRIFT antes da
  correção; `check` verde e `check --require-current` vermelho nomeando
  `pixelquest-evidence-encounter` + `minitown-explore-only` depois.
- Testes de regressão:
  `docs/product-readiness/tests/test_check_determinism.py` (3 casos: drift de
  fingerprint, fronteira de `revalidateBy`, desync de view ainda bloqueia).
- Job verde 2x no PR de correção (ver thread AID-1890).
