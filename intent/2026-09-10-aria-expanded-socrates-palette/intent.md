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
`2026-09-10-aria-expanded-socrates-palette` · Status: registered-pre-merge
(aguardando founder merge GitHub)

## Problem (claim do produtor)

Usuários de screen reader não sabiam se o painel de configuração do Socrates
(dojoToday) estava expandido ou recolhido, nem qual região o botão controla.

## Fix pretendido (claim do produtor)

`aria-expanded` + `aria-controls` no botão de configuração; estado atualizado
dinamicamente ao abrir/fechar (toggle, botão salvar, fallback nudge).

## Trigger / origem

PR #335 aberto 2026-09-10T19:55:16Z (task Jules `14525935469184098205`). CI
no head `c3723e7f` verde, incluindo o job `SDLC guardrails (diff)`
(check-runs verificados às ~20:3xZ pelo SM).

## Aceitação (forma registrada)

Founder merge no GitHub (opção (b), CEO via ask `2aebe4d8`, 20:58Z). Sem
countersign QA — o dono humano assume a verificação no gate, na forma da
política; achados pós-merge re-entram como novo `intent.md` (Maintain).
