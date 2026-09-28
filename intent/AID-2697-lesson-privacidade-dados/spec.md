# Spec: lição privacidade-dados no módulo final do Vertical Protocol

Change-id: AID-2697-lesson-privacidade-dados · From: intent/AID-2697-lesson-privacidade-dados/intent.md · Status: accepted

## Requirements

1. A lição `privacidade-dados` ("Privacidade: o que você alimenta na máquina")
   existe como `order: 2` (3ª lição) do módulo `o-protocolo-final`, com
   `narrative`, `tip` e `xpReward: 20` no estilo do currículo existente.
2. A lição tem 5 exercícios com ids `m9l3e1..m9l3e5`, cobrindo os tipos
   `multiple-choice`, `order`, `true-false`, `fill-blank` e `swipe` (todos os
   tipos que o grader suporta exceto duplicatas).
3. Todo exercício é solucionável: `gradeExercise(ex, correctAnswers(...))`
   retorna `true` (reuso do helper de teste existente).
4. Nenhuma progressão existente é retravada: com TODAS as lições anteriores
   completas e a nova lição pendente, todos os módulos seguem desbloqueados
   (a lição nova está no último módulo — guarda de regressão explícita).
5. A lição flui pelo jogo sem código adicional: seed, unlock, daily-challenge
   e UI derivam de `CURRICULUM` (nada de regra nova fora de `curriculum-data.ts`).
6. Suíte existente permanece verde: 128 testes + novo arquivo de regressão.

## Design

- Append de um objeto literal em `CURRICULUM[o-protocolo-final].lessons`,
  mantendo o estilo de escrita (pt-BR, voz do Bip, cozy-cyberpunk) e os
  ids seguindo a convenção `m9l3eN` do módulo.
- Novo teste `tests/unit/curriculum-privacy-lesson.test.ts` (unitário, sem
  banco): presença/ordem, solvabilidade via grader, ids únicos e a guarda
  de não-relock (Requisito 4) usando `isModuleUnlocked`/`isLessonUnlocked`.
- Exercícios ensinam: dado sensível não vai em prompt; mascarar/remover;
  política de dados do provedor; saída revisada antes de compartilhar;
  classificação rápido/no-fim-do-prompt (swipe).

## Policy applied

- `engines/zai-duolingo-like/QWEN.md`: feature começa por spec; gates
  `npm test` + `npm run lint` + `npx tsc --noEmit`.
- `AGENTS.md` raiz: engines são autocontidas; nenhum dado de aprendiz sai
  do engine; "one learner, one curriculum, many engines" — o currículo do
  jogo é conteúdo do engine, não o substrato compartilhado.
- Fluxo fábrica (AID-2676): contrato congelado antes do build; verificador
  distinto roda os checks (P2/P3); gate fail-closed (P1–P5).
