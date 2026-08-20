---
description: Cria uma feature guiada por spec — PRD → testes → implementação → verificação
---
Você vai implementar uma feature seguindo o loop spec-first deste projeto.

Feature pedida: $ARGUMENTS

1. **Spec** — escreva `docs/specs/<slug>.md` com requisitos numerados (REQ-1..n),
   critério de aceite verificável para cada um (entrada → saída esperada) e seção
   "Fora de escopo". Pare e mostre a spec para aprovação antes de continuar.
2. **Vermelho** — escreva os testes em `test/` cobrindo cada REQ (1 teste por REQ,
   nomeado com o ID). Rode `npm test` e confirme que TODOS falham.
3. **Verde** — implemente o mínimo em `src/` até `npm test` passar. Não enfraqueça
   nenhum teste para fazê-lo passar.
4. **Verificação** — delegue ao subagente `verificador` a checagem spec × testes ×
   implementação. Não se autoaprove.
5. **Commit** — mensagem em inglês referenciando a spec.
