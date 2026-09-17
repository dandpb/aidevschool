# W2 — TDD: extrair regra duplicada test-first

**Quando usar:** quando uma regra de negócio vive em 2+ lugares (ou vai viver)
e precisa de uma única fonte testada.

## Fluxo

1. Escreva os testes da regra contra um módulo que ainda não existe (red).
2. Implemente o mínimo para verde.
3. Substitua os consumidores pela nova função — as suítes existentes deles
   funcionam como testes de caracterização (o comportamento não pode mudar).
4. Gates completos.

## Execução real (2026-08-19)

- **Alvo:** as regras de unlock de lição ("módulo 0 sempre aberto; módulo i
  precisa de TODAS as lições do módulo i-1; lição j precisa da j-1") existiam
  em duas cópias: `src/app/api/curriculum/route.ts` e `src/lib/daily-challenge.ts`
  (a segunda com comentário _"replicate unlock logic"_ — o drift anunciado).
- **Red:** `tests/unit/lesson-unlock.test.ts` (11 testes) escrito contra o
  módulo inexistente → falha de import.
- **Green:** `src/lib/lesson-unlock.ts` (~37 linhas, funções puras com typing
  estrutural — aceita rows do Prisma sem adapter).
- **Integração:** os dois consumidores migrados; suítes de curriculum e
  daily-challenge passaram sem alteração (caracterização).
- **Gates:** 123/123, lint 0, tsc 0. Nota:
  `.agents/notes/implemented/simplification/2026-08-19-single-lesson-unlock-source.md`.

## Valor

Uma fonte testada para a regra; ~10 linhas de branching duplicado removidas;
mudança futura na regra = 1 edição + testes que já definem a semântica.
