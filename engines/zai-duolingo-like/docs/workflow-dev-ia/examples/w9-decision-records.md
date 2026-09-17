# W9 — Decision records (.agents/notes)

**Quando usar:** depois de qualquer mudança estrutural ou decisão não óbvia.
Código diz O QUÊ; a nota diz POR QUÊ — e evita re-litigar decisões meses
depois.

## Fluxo

1. Leia `.agents/notes/README.md` (layout e regras do repo).
2. Escolha lifecycle (`proposed` → depois vira `implemented` ou `rejected`) e
   classe (`simplification` | `architecture` | `process`).
3. Escreva: status, parágrafo de "shipped" com a evidência de teste, ## Problem
   (com evidência do consumidor), ## Consequences.
4. Nome: `yyyy-mm-dd-topic.md` no diretório do lifecycle.

## Execução real (2026-08-19)

Duas notas criadas pelas mudanças do dia, no formato exato das notas de
2026-08-18 já existentes:

- `implemented/architecture/2026-08-19-lesson-attempt-clock-consistency.md`
  — por que o pipeline só pode escrever timestamps do clock injetado (W1),
  com o teste que provou o bug e a suíte 123/123 como evidência.
- `implemented/simplification/2026-08-19-single-lesson-unlock-source.md`
  — por que as regras de unlock agora têm fonte única (W2) e o que muda para
  futuros consumidores.

## Valor

Daqui a 6 meses, `grep` em `.agents/notes/` responde "por que isso é assim?"
sem arqueologia de git blame — e notas `rejected` impedem que alguém proponha
de novo o que já foi decidido contra.
