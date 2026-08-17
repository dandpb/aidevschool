# PRD — Contrato mínimo de feedback/analytics (decisão pendente)

## Problema

O ADR `docs/design/adr/0009-product-analytics.md` define eventos de produto, mas o working tree
herdado de outra sessão contém a **remoção** de `src/domain/analytics.ts`,
`src/adapters/analyticsSinks.ts` e `tests/domain/analytics.test.ts` do LiteracyDojo — ou seja, o
contrato existe no papel e a implementação está em fluxo. Sem decisão, o repo fica no pior dos
dois mundos: nem feedback mínimo, nem contrato limpo.

## Opções

**A. Restaurar o mínimo (recomendada para o piloto).** Reintroduzir um sink local-first pequeno
(entry_viewed / route_chosen / lesson_completed) com teste, sem texto livre, sem rede.

**B. Arquivar o contrato.** Mover o ADR para `docs/design/adr/` com status "superseded/deferred"
e remover referências ativas, deixando explícito que o piloto roda sem analytics.

## Recomendação

Opção **B agora, A depois do piloto com alunos**: o P6 mostra que o próximo dado útil vem de
observação humana, não de eventos. Analytics sem consumidor é complexidade sem entrega — exatamente
o padrão que o usuário quer evitar.

## Decisão que só o dono pode tomar

Escolher A ou B. O working tree atual (deleção herdada de outra sessão) não foi revertido nem
confirmado por este caso.

## Status

**Aguardando decisão.** Nenhum código de analytics foi restaurado ou removido nesta rodada.
