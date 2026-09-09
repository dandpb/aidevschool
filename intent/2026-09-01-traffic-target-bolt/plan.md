# Plan (retroativo): otimização pickRandomTrafficTarget — PR #227

> **RETROSPECTIVE RECORD** (AID-1136 r2 / AID-1137 r1-F1). Plano documentado
> após o merge; o "plano" real foi o corpo do PR do bot.

## O que mudou (diff real do merge `128b21f4`)

- `engines/miniTown/src/scene/state.ts` (+23/−17): `pickRandomTrafficTarget`
  reescrito como linear scan O(N) (sem `filter().slice().sort()`).
- `.jules/bolt.md` (+4): nota da conta Bolt.

## Verificação alegada pelo produtor (não re-executada neste retrofit)

Testes e benchmarks de velocidade de resolução de alvo dentro de ticks de
simulação (corpo do PR #227).

## Follow-ups

- Nenhum defeito conhecido aberto contra este change.
- Mudanças futuras nesta função: nova issue Paperclip + trilha `intent/`
  canônica (regra global `AID-<n>-<slug>`).
