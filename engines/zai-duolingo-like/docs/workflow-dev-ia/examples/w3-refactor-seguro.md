# W3 — Refactor seguro: verde antes, verde depois

**Quando usar:** duplicação em código de teste/suporte, renames, extração de
helpers. A garantia é a suíte: nada de comportamento pode mudar.

## Fluxo

1. Rode a suíte completa ANTES e anote a contagem (baseline).
2. Faça a mudança mecânica (extrair/mover/renomear) — sem lógica nova.
3. Rode de novo: mesma contagem de testes passando (ou maior, se você adding
   testes; jamais menor).
4. Lint + typecheck para pegarem imports órfãos.

## Execução real (2026-08-19)

- **Alvo:** a query `db.learner.findFirstOrThrow({ where: { NOT: { id: { startsWith: "rival-" } } } })`
  aparecia como função local em 2 arquivos de teste e inline 3× em outro.
- **Mudança:** `currentLearner()` promovida a `tests/helpers.ts`; 3 arquivos
  atualizados (`game-state`, `achievement-award`, `streak-goal`,
  `streak-milestone` — este último trocou 3 queries inline).
- **Armadilha evitada:** importar helper sem usar vira erro de lint — um dos
  arquivos definia a função mas nunca a chamava; o import foi removido ali.
- **Verde depois:** suíte completa 123/123 (a mesma do baseline + features
  novas do dia), lint 0, tsc 0.

## Valor

Menos cópia, convenção explícita (o helper agora É o lugar), e a prova de que
refactor mecânico não toca comportamento: contagem de testes idêntica.
