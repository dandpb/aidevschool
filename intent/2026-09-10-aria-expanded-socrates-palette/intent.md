# Intent: `aria-expanded`/`aria-controls` no toggle de config do Socrates (PR #335, origem Palette)

> **FAST-PATH RECORD pré-merge** — registrado em 2026-09-10 pelo SM
> (AID-1331, mandato rolling CEO) após triagem registrada: ask `2aebe4d8`
> (AID-1331) respondido pelo CEO às 20:58Z escolhendo o caminho de aceitação
> **(b) founder merge no GitHub**. A substância abaixo (o quê/por quê) são
> **afirmações do bot Palette no corpo do PR #335**, não verificadas
> independentemente para este registro — a aceitação planejada é o founder
> merge no próprio PR (política `docs/sdlc/README.md` §PRs automatizados,
> AID-1136 Registro #7).

Author: Palette (bot externo, conta `dandpb`, via `google-labs-jules[bot]`) ·
registro: SM (AID-1331 ask `2aebe4d8`) · Change-id:
`2026-09-10-aria-expanded-socrates-palette` · Status: registered-pre-merge,
**INELEGÍVEL para merge** — head vermelho em `product readiness (claims)`
(correção de evidência na auditoria AID-1333, 2026-09-10 ~21:4xZ; ver
"CI / elegibilidade" abaixo) — **superseded pela Emenda 2026-09-11: head
atual `d1f5b2a0` verde 36/36, substância já no main; ver emenda no rodapé**

## Problem (claim do produtor)

Usuários de screen reader não sabiam se o painel de configuração do Socrates
(dojoToday) estava expandido ou recolhido, nem qual região o botão controla.

## Fix pretendido (claim do produtor)

`aria-expanded` + `aria-controls` no botão de configuração; estado atualizado
dinamicamente ao abrir/fechar (toggle, botão salvar, fallback nudge).

## Trigger / origem

PR #335 aberto 2026-09-10T19:55:16Z (task Jules `14525935469184098205`).

## CI / elegibilidade (verificado first-hand, auditoria AID-1333 ~21:4xZ)

- Head `c3723e7f`: **35/36 checks verdes** (incl. `SDLC guardrails (diff)`,
  `dojoToday (TS + substrate)`), **1 falha**: `product readiness (claims)`
  (check-run `103038320110`, run `34526518352`, iniciado 20:32:55Z) —
  `DRIFT: docs/product-readiness/README.md` →
  `dojotoday-daily-guidance: blocked` (cenários
  `dojotoday-active-unit-guidance`/`dojotoday-returning-next-day` sem
  evidência independente; `dojotoday-read-only-boundary` sem promoted
  result). Mecânica de fingerprint stale ao tocar
  `engines/dojoToday/src/main.ts` — mesma classe diagnosticada na avaliação
  AID-1308 r1; precedente de correção: re-ancoragem docs(readiness)
  (AID-1295, PR #332).
- O registro inicial (PR #336, commit `7df83335`) dizia "CI verde no head"
  citando apenas `SDLC guardrails` — **incompleto**: o job de readiness já
  estava vermelho no mesmo head. Corrigido aqui; evidência acima é
  first-hand (GitHub API, check-runs + log do job).
- **Política (AID-1136 Registro #7): "PR vermelho não entra, sem exceção" —
  vale também para founder merge.** Unblock: re-ancoragem/re-grant
  readiness dojoToday no main (padrão AID-1295, owner FPE) → atualizar o
  branch do PR #335 → CI reavalia → só então founder merge.

## Aceitação (forma registrada)

Founder merge no GitHub (opção (b), CEO via ask `2aebe4d8`, 20:58Z). Sem
countersign QA — o dono humano assume a verificação no gate, na forma da
política; achados pós-merge re-entram como novo `intent.md` (Maintain).

## Emenda 2026-09-11 (staleness) — SM, auditoria AID-1363

O bloco "INELEGÍVEL para merge" acima está **stale**: referia-se ao head
`c3723e7f` e foi verificado first-hand novamente nesta data. Estado atual:

- **Head atual do PR #335: `d1f5b2a0`** — **36/36 checks verdes**
  (incl. `product readiness (claims)` e `SDLC guardrails (diff)`; GitHub
  API check-runs, verificado 2026-09-11T02:4xZ). O unblock descrito acima
  (re-ancoragem readiness) **aconteceu**: PR #337 (v44 re-anchor dojoToday
  @ `80c3105f`, AID-1334, QA GO AID-1339).
- **A substância já landed nativamente no main**: `aria-expanded` +
  `aria-controls` presentes em `engines/dojoToday/src/main.ts`
  (`main.ts:134,310,320,364`); `styles.css:640` documenta inclusive um
  ajuste além do PR original (estado do painel visível vs. colapsado).
- **Diff residual do PR vs main: apenas `.jules/palette.md`** (arquivo de
  trabalho do bot; sem substância de produto).

**Decisão pendente (dono: founder/CEO)** — merge do residual OU close com
comentário pré-close por obsolescência/duplicidade (§Recusa também é
registrada, `docs/sdlc/README.md`). A substância já entregue torna o close
o desfecho provável; qualquer das duas formas registra a cadeia. O head
verde mantém o PR elegível caso o founder prefira o merge.

Referência: decisão 3 da auditoria AID-1360 (01:35Z), que despachou esta
emenda ao SM; emenda executada na auditoria AID-1363.
