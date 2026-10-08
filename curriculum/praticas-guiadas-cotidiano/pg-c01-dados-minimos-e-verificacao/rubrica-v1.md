# RÚBRICA v1 (6 critérios separáveis)

> **versão: v1** · avaliador: revisor humano (QA/corretor treinado). Veredito por critério:
> `suficiente` / `insuficiente` — sempre com a evidência citada (peça do aprendiz + linha).
> Sem nota agregada: a prática fica **concluída com os 6 critérios suficientes**, na 1ª ou na
> 2ª tentativa (critérios antes insuficientes recuperados + afirmação nova tratada).
> Critérios são separáveis: acerto em um **nunca** compensa erro em outro.
> Mudança de critério/peso/âncora gera v2 com changelog; errata tipográfica não versiona.

| # | Critério | Suficiente quando… | perCheck (pergunta de verificação) |
|---|---|---|---|
| c1-mínimos | O pedido à IA contém só o necessário, sem expor ninguém | O pedido mantém datas, valores em discussão, tarefas e o formato do aviso; e **tira ou troca por rótulo neutro** todos os itens que expõem pessoas: CPF (G6), saúde (G7), endereço+código do portão (G8), telefone (G8) | O pedido final cita "dia 12/19" e "R$ 35/45" como dúvidas a resolver e **não contém** CPF, insulina/tio Léo, Rua das Acácias/código, 5555-1234? |
| c2-vereditos | Vereditos corretos por afirmação | ≥ **4 das 5** afirmações com o veredito correto (ver gabarito 5.2 em `guia-de-correcao/solucao.md`); a afirmação 5 conta como `contrariada (privacidade)` | A tabela tem 5 vereditos e segue o gabarito em ≥4 linhas? |
| c3-citações | Citação verificável por veredito | Todo veredito `apoiada`/`contrariada` cita **fonte e linha** (ex.: `fonte-1 L1`), e a linha citada **existe e diz** o que a tabela alega | Sorteie 2 vereditos: as citações batem com o texto da linha nas fontes da pasta `insumos/`? |
| c4-incerteza | Incerteza tratada como incerteza | A afirmação 4 fica `fontes não dizem` (não vira "pode" nem "não pode"), com **o que falta saber + a quem perguntar + a pergunta** | A linha da afirmação 4 nomeia a tia Regina e uma pergunta sobre horário de decoração, sem decidir o horário? |
| c5-privacidade | Recusa e classificação do dado sensível | O pedido de CPF (afirmação 5) é **recusado**; o CPF é classificado como sensível; a saída nomeada usa o canal certo: o contrato é com a tia Regina no **privado** (fonte-1 L5), fora da IA | A entrega diz "não colar" **e** para onde ir (Regina, privado/contrato no nome dela), sem "mandar no privado da IA"? |
| c6-resposta | Aviso final útil e só com fonte | O aviso afirma somente data, valor e prazo **com citação** (19; R$ 45; confirmar até 14; bebida/sobremesa), **não repete** 12 nem 35, declara a incerteza (horário de decoração) e não expõe dado de pessoa nenhuma | O aviso contém "dia 19", "R$ 45", "até dia 14" e uma frase de "estou confirmando…" — e nenhum CPF/telefone/endereço? |

## Erros plausíveis (o que o corretor deve esperar — não exaustivo)

- Colar o print inteiro no pedido "para a IA não perder contexto" (esquece a Etapa A).
- Marcar a afirmação 1 como `apoiada` porque "o Beto mesmo falou dia 12" (a fonte que
  decide é o recado fixado da anfitriã, não a proposta anterior).
- Marcar a afirmação 2 como `fontes não dizem` porque "existem os dois valores" (a Fonte 1
  **decide** o valor atual; o 35 é histórico da conversa).
- Confiar na afirmação 4 porque "parece razoável" (razoável não é linha de fonte).
- Recusar o CPF mas "mandar no privado da IA" (troca de canal inválida — a IA não é canal).
- Corrigir tudo na tabela e ainda escrever "dia 12" no aviso final (verificar ≠ aplicar).

## Feedback explicativo por critério (modelo para a 2ª tentativa)

- **c1:** "Risque do seu pedido tudo que a IA não usa para escrever o aviso: se a frase
  não muda o texto do aviso, ela sai. CPF, saúde, endereço e telefone não mudam o aviso —
  e expõem pessoas."
- **c2:** "Reabra as duas fontes, lado a lado com a resposta da IA. Onde uma linha decide,
  o veredito é `apoiada`/`contrariada`; onde nenhuma linha toca o assunto, é `fontes não dizem`."
- **c3:** "Sem `fonte+linha`, um terceiro não consegue conferir o seu trabalho — é isso que
  separa verificação de opinião."
- **c4:** "A dúvida já vale: escreva o que falta, quem sabe e a pergunta exata. Não decida
  por eliminação nem por 'parece de bom senso'."
- **c5:** "Classifique antes: CPF é dado sensível; ferramenta de IA não é canal para ele.
  O contrato já tem dono: a tia Regina, no nome dela (fonte-1 L5)."
- **c6:** "Risque do seu aviso tudo que você não citou na tabela. Se o número não tem
  citação, ele não entra — ou entra como 'estou confirmando'."

## Controles negativos (autocheque do corretor)

1. Pedido à IA com o print inteiro colado (CPF incluso) "para não perder contexto"
   → **c1 insuficiente**, mesmo com os 5 vereditos certos.
2. Tabela com 5 vereditos `apoiada` sem nenhuma citação → **c2 e c3 insuficientes**.
3. Afirmação 1 marcada `apoiada` "pelo tom confiante da IA" → **c2 insuficiente**.
4. Vereditos corretos, mas aviso final repete "dia 12" e "R$ 35" → **c6 insuficiente**
   (acerto em c2 não compensa; critérios são separáveis).
5. Afirmação 4 convertida em "não pode decorar" (silêncio como proibição) → **c4 insuficiente**.
6. CPF recusado, mas com sugestão de "colar só no privado da IA" → **c5 insuficiente**.
