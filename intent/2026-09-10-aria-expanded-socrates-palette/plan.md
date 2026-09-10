# Plan (fast-path): aria-expanded no toggle Socrates — PR #335

> **FAST-PATH RECORD pré-merge** (AID-1331 ask `2aebe4d8` → founder-merge).
> Plano mínimo documentado antes do merge, citando o diff real do PR.

## Diff do PR (head `c3723e7f`, +7/−1 em 2 arquivos)

- `engines/dojoToday/src/main.ts` (+4/−1): `aria-expanded`/`aria-controls`
  no botão de configuração do Socrates; estado sincronizado com
  abrir/fechar (toggle, salvar, nudge fallback).
- `.jules/palette.md` (+3): nota de tarefa do bot (padrão já rastreado).

## Verificação

- 35/36 checks verdes no head `c3723e7f` (incl. `SDLC guardrails (diff)` e
  `dojoToday (TS + substrate)`) — sem edição de testes existentes, sem paths
  derivados, sem credenciais.
- **1 falha no head: `product readiness (claims)`** — DRIFT em
  `dojotoday-daily-guidance` (fingerprint stale ao tocar
  `engines/dojoToday/src/main.ts`; cf. avaliação AID-1308 r1). Sem edição de
  testes: o diff não toca specs/claims; a falha é a deriva de grant conhecida.
- dojoToday é superfície read-only ("lesson for today"); sem risco de
  escrita em learner state.

## Elegibilidade / ordem de merge (correção AID-1333)

1. **PR #335 NÃO elegível agora** — política: PR vermelho não entra, sem
   exceção (vale para founder merge).
2. Unblock: FPE executa re-ancoragem/re-grant readiness dojoToday no main
   (padrão AID-1295/PR #332) → branch do #335 atualizado contra o main novo
   → CI reavalia → verde.
3. Só então: founder merge no GitHub (aceitação registrada, opção (b) do ask
   `2aebe4d8`).
4. PR #334 (Bolt) não depende desta cadeia — elegível separadamente.

## Follow-ups

- A11y contínua destas superfícies segue na onda W0–W3 (precedentes
  #297/#298/#303/#304) se o CEO despachar nova onda.
- Regressão de anúncio SR pós-merge re-entra como novo `intent.md`.
