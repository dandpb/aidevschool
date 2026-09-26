# Plan: lição privacidade-dados no módulo final do Vertical Protocol

Change-id: AID-2697-lesson-privacidade-dados · From: intent/AID-2697-lesson-privacidade-dados/spec.md · Status: approved

Aprovação: GO do programa FACTORY-STRESS onda 2 (AID-2736, flip da AID-2697
para execução + comentário de base 06:32Z) sobre a ordem do dono em AID-2676
("todos os agentes testam com POCs que estressam a solução"); escopo do item
user-facing decidido pelo Founding Product Engineer dentro desse mandato.

## Files that change

- `engines/zai-duolingo-like/src/lib/curriculum-data.ts` — append da lição
  `privacidade-dados` (order 2, 5 exercícios `m9l3e1..m9l3e5`) no módulo
  `o-protocolo-final`.
- `engines/zai-duolingo-like/tests/unit/curriculum-privacy-lesson.test.ts` (new)
  — regressão: presença/ordem/tipos, solvabilidade via grader, ids únicos,
  guarda de não-relock de progressão.
- `intent/AID-2697-lesson-privacidade-dados/{intent,spec,plan,checks}.md` (new)
  — este registro versionado (contrato da fábrica).

## Order of work

1. Registro versionado (este diretório) congelado pela fábrica no base SHA.
2. Autor (contexto `fpe-2697-author`) aplica a lição + teste e commita no
   worktree isolado da fábrica no base acordado.
3. Autor roda os gates do engine (`npm ci` + `npm test` + `tsc --noEmit` +
   `eslint`) antes de declarar pronto.
4. Verificador independente (contexto `fpe-2697-verifier`) reexecuta os
   checks do contrato; gate avalia P1–P5 e promove no mesmo SHA.
5. PR para `main` com head = SHA promovido; merge é decisão humana.

## Risks

- Risco maior: regressão de progressão (relock). Mitigado pela inserção no
  último módulo + teste de unlock (Requisito 4 da spec).
- Custo de verificação: `npm ci` fresco no worktree da fábrica (minutos);
  aceito no corte (perfil `standard` do check C2).
- Alternativas consideradas e NÃO escolhidas: lição no módulo `o-lado-negro`
  (tema melhor, mas retrava módulos seguintes); novo módulo inteiro (fora do
  corte desta issue); mudar regras de unlock para grandfathering (escopo de
  outra mudança).

## Proof

Checks C1–C4 em `checks.md`: C1 estrutural barato; C2 suíte completa +
instalação (standard); C3 typecheck; C4 lint. Gate P1–P5 no mesmo SHA;
ledger `--verify` revalida a cadeia; PR aponta para o head promovido.
