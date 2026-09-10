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
"CI / elegibilidade" abaixo)

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
