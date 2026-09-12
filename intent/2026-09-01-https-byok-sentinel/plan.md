# Plan (retroativo): fix HTTPS BYOK — PR #216

> **RETROSPECTIVE RECORD** (AID-1136 r2 / AID-1137 r1-F1). Plano documentado
> após o merge; o "plano" real foi o corpo do PR do bot.

## O que mudou (diff real do merge `5de4e147`)

- `engines/dojoToday/src/assistant.ts` (+15/−0): guarda de protocolo `https:`
  em `askSocrates` antes do `fetch`, com isenções `localhost`/`127.0.0.1`.
- `.jules/sentinel.md` (+5): nota da conta Sentinel.

## Verificação alegada pelo produtor (não re-executada neste retrofit)

`pnpm test` e `pnpm test:readiness` em `engines/dojoToday` (corpo do PR #216).

## Follow-ups

- Nenhum defeito conhecido aberto contra este change.
- Se surgir defeito: trilha canonical = nova issue Paperclip + intent/
  (regra global `AID-<n>-<slug>`), não edição silenciosa deste registro.
