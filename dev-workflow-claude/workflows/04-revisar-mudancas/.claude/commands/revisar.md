---
description: Code review multi-dimensão de um diff — corretude, simplicidade e cobertura de testes, com achados em arquivo:linha, prova executável para achados críticos e veredito final.
---

Revise a mudança proposta em 3 dimensões independentes. Escopo do diff: $ARGUMENTS
(se vazio, use o diff pendente contra o HEAD: `git diff HEAD`; aceita também um range como `main..feature` ou `HEAD~1`).

## Passos

1. **Delimitar o diff.** Rode `git diff <escopo>` (ou `git diff HEAD` sem argumentos) e liste os arquivos tocados. Tudo fora do diff está fora da revisão — não revise o repositório inteiro.

2. **Lente 1 — Corretude (casos de borda).** Para cada função nova/alterada, enumere as entradas-limite: vazio, zero, um elemento, negativo, não-inteiro, tipo errado, entrada máxima. Pergunte: "que input real quebra isso?" Anote cada quebra encontrada.

3. **Lente 2 — Simplicidade (o que deletar).** Procure no diff: abstrações com um único uso (registries, strategies, options com default único), parâmetros que nenhum chamador passa, caches que nunca acertam, indireção sem segundo caso concreto. Para cada item, diga o que deletar e como fica a versão reduzida.

4. **Lente 3 — Testes (o que falta cobrir).** Compare os testes adicionados no diff com os casos de borda da Lente 1. Liste os cenários sem cobertura, priorizando os que protegem contra regressão do comportamento novo.

5. **Tabela de achados.** Cada achado com: `arquivo:linha` | problema | correção sugerida | gravidade (CRÍTICO / MÉDIO / BAIXO). CRÍTICO = comportamento errado observável; MÉDIO = complexidade ou lacuna de teste; BAIXO = estilo.

6. **Prova executável dos críticos.** Achado CRÍTICO não é opinião: escreva um teste mínimo que falha na versão proposta (`node --test`, sem dependências), rode-o e cole a saída da falha. Se o teste passar, rebaixe ou descarte o achado.

7. **Veredito final.** `APROVAR` (nenhum CRÍTICO, MÉDIOs opcionais) ou `PEDIR MUDANÇAS` (qualquer CRÍTICO provado, ou MÉDIOs que o autor deve resolver antes do merge). Justifique em uma frase. Se pedir mudanças, o teste-prova fica no repositório como critério de aceite: a correção está pronta quando ele passar.
