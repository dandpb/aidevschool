# Plan (fast-path): aria-expanded no toggle Socrates — PR #335

> **FAST-PATH RECORD pré-merge** (AID-1331 ask `2aebe4d8` → founder-merge).
> Plano mínimo documentado antes do merge, citando o diff real do PR.

## Diff do PR (head `c3723e7f`, +7/−1 em 2 arquivos)

- `engines/dojoToday/src/main.ts` (+4/−1): `aria-expanded`/`aria-controls`
  no botão de configuração do Socrates; estado sincronizado com
  abrir/fechar (toggle, salvar, nudge fallback).
- `.jules/palette.md` (+3): nota de tarefa do bot (padrão já rastreado).

## Verificação

- CI verde no head, incluindo `SDLC guardrails (diff)` e os suites
  dojoToday (TS + substrate) — sem edição de testes existentes, sem paths
  derivados, sem credenciais.
- dojoToday é superfície read-only ("lesson for today"); sem risco de
  escrita em learner state.

## Follow-ups

- A11y contínua destas superfícies segue na onda W0–W3 (precedentes
  #297/#298/#303/#304) se o CEO despachar nova onda.
- Regressão de anúncio SR pós-merge re-entra como novo `intent.md`.
