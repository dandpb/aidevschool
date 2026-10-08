# Corrija a rotina sem começar do zero — versão em texto puro

> Equivalente em texto simples do `worksheet-visual.html` (mesmo exercício, mesma numeração de campos).
> Para leitores de tela, baixa largura de banda, impressão preto-e-branco ou quem prefere texto seco.
> **Material de exercício** (~20 min, depois da lição “Quando a automação erra”). Papel ou digital.
> Dados inventados, só para treinar: nada é salvo, enviado ou automatizado.

Folha de exercício AiDevSchool. Notas técnicas para docentes: ver `README.md` (acompanha esta folha).

---

## Roteiro

1. Exemplo resolvido (Mariana) — caso completo, cenário diferente do seu.
2. Seu caso (rotina de pedidos de uma loja) — você confere na fonte e escreve o reparo.
3. Teste com a semana 2 (números novos).
4. Autochecagem com nova tentativa + negativos concretos.

---

## Regra de ouro: conferir na fonte, por categoria

Cada pedido/ticket tem UM único status (categorias que não se sobrepõem — nada é contado duas
vezes). Por isso dá para conferir qualquer resumo assim:

    fonte → soma por categoria → total

(a soma das categorias tem que fechar o total da fonte)

Cuidado: o total fechar SOZINHO não garante nada — o erro escondido pode estar em ONDE cada item
caiu. Confira categoria por categoria na fonte.

---

## 1. Exemplo resolvido — a rotina da Mariana

### Antes (rotina degradada)

Pedido salvo:

> “Resumo semanal de atendimento para a reunião de segunda: tópicos, 3 indicadores
> (tickets abertos, tickets ~~resolvidos~~, tempo médio de resposta), máximo meia página.
> [DADOS DA SEMANA: colar aqui]”

- FIXO: tarefa (resumir o atendimento da semana) e formato (tópicos, 3 indicadores, meia página, reunião de segunda).
- VARIÁVEL: os dados da semana, colados no lugar marcado.

Painel desta semana (a fonte):

| Ticket | Status |
| --- | --- |
| t-01 | aberto |
| t-02 | aberto |
| t-03 | fechado |
| t-04 | fechado |
| t-05 | **reaberto ← status novo** |
| t-06 | fechado |

Total de tickets no painel: 6.

O que chegou na sexta (saída da rotina):

> “abertos: 2 · resolvidos: 4 · tempo médio: 3h” — no padrão das outras semanas.

O que mudou por fora: o sistema atualizou — “resolvidos” virou “FECHADOS” e entrou o status
“REABERTO”. A rotina continuou lendo como antes: contou o reaberto (t-05) dentro de “resolvidos”.

Repare: 2 + 4 = 6, o total até fecha — mas ONDE cada ticket caiu está errado. Conferir só o
total não pega esse erro; é preciso conferir por categoria na fonte.

### Depois (reparo mínimo, com conferência)

1. O que mudou no dado:
   “A coluna ‘resolvidos’ agora se chama ‘fechados’; use o nome novo. O status ‘reaberto’
   conta à parte, separado dos fechados.”
2. Como o combinado acomoda o número novo (decisão declarada, não escondida):
   “O resumo passa a listar 4 indicadores: abertos, fechados, reabertos e tempo médio.
   Meia página continua dando.”
3. O que continua valendo:
   “O resto segue como combinado: tópicos, para a reunião de segunda, máximo meia página.”
4. Conferência com os números da fonte (o cálculo, de verdade):
   abertos 2 (t-01, t-02) · fechados 3 (t-03, t-04, t-06) · reabertos 1 (t-05) ·
   cada ticket tem um único status → 2 + 3 + 1 = 6 = total do painel ✓
5. Pergunta de validação humana: “antes de enviar: abertos + fechados + reabertos somam o
   total do painel? e o t-05 aparece como reaberto, não como fechado?”

Mariana NÃO reescreveu o pedido inteiro, NÃO deixou a coluna velha e NÃO pediu só “atualize”.

---

## 2. Seu caso — a rotina de pedidos da loja

Cenário inventado (não use dados reais). Toda sexta, a rotina resume os pedidos da loja para o
chat da operação. Esta semana a plataforma mudou.

### Antes

Pedido salvo:

> “Resumo semanal de pedidos da loja para o chat da operação: lista com 3 números
> (pedidos feitos, pedidos entregues, pedidos devolvidos), máximo 10 linhas.
> [DADOS DA SEMANA: colar aqui]”

- FIXO: tarefa (resumir pedidos da semana) e formato (lista, 3 números, 10 linhas, chat da operação).
- VARIÁVEL: os números de pedidos da semana.

Plataforma desta semana — semana 1 (a fonte):

| Pedido | Status |
| --- | --- |
| p-101 | entregue no prazo |
| p-102 | entregue no prazo |
| p-103 | entregue com atraso |
| p-104 | entregue com atraso |
| p-105 | devolvido |
| p-106 | **troca ← status novo** |

Total de pedidos na fonte: 6. “Entregues” deixou de ser uma coluna só: agora é no prazo + com atraso.

O que chegou na sexta (saída da rotina):

> “pedidos feitos: 6 · pedidos entregues: 5 · pedidos devolvidos: 1” — no padrão das outras semanas.

O que mudou por fora: a plataforma dividiu “entregues” em “no prazo” e “com atraso”, e as
devoluções agora incluem “trocas”. Lendo como antes, a rotina contou a troca (p-106) como
entrega e só reconheceu a devolução literal.

De novo o total engana: 5 + 1 = 6 fecha. O erro está na DIVISÃO — confira por categoria na
fonte antes de reparar.

### Campo 1 — Pedido reutilizável: separe o fixo do variável

- 1a) Tarefa (o que a rotina pede, sempre igual):
  ________________________________________________
- 1b) Formato (a forma fixa da saída):
  ________________________________________________
- 1c) Dado que muda toda semana (o único campo variável):
  ________________________________________________

### Campo 2 — Confira na fonte, por categoria (semana 1)

Conte você, na fonte acima — não no resumo de sexta:

- pedidos feitos: ________
- pedidos entregues (no prazo + com atraso): ________
- pedidos devolvidos (devoluções + trocas): ________
- conferência (entregues + devolvidos = total?): ________

Onde a saída de sexta errou? (compare seus números com os dela; aponte qual categoria foi
contada errada, e por quê):
  ________________________________________________

### Campo 3 — Reparo mínimo de contexto (semana 1)

- 3a) O que mudou no dado desta semana (nomeie a mudança — sem “atualize aí”):
  ________________________________________________
- 3b) Como o combinado acomoda o número novo (declare a decisão, como a Mariana fez com o
  4º indicador: somar junto, linha separada, outra saída — o que você decide, fica dito):
  ________________________________________________
- 3c) O que continua valendo (a regra que não mudou):
  ________________________________________________
- 3d) Seu pedido de reparo em 1–2 frases (3a + 3b + 3c juntos):
  ________________________________________________

### Campo 4 — Pergunta final de validação humana

- 4) A pergunta que você faria ao resultado antes de usar — com resposta fora da saída da IA,
  que um erro silencioso (bonito e desatualizado) NÃO passaria:
  ________________________________________________

---

## 3. Semana 2 — o reparo aguenta os números novos?

Na semana seguinte, a plataforma marcou alguns pedidos como “URGENTE” (uma marca, não um
status) e entrou o status “CANCELADO”.

Plataforma — semana 2 (a fonte):

| Pedido | Status | Urgente? |
| --- | --- | --- |
| p-201 | entregue no prazo | sim |
| p-202 | entregue no prazo | não |
| p-203 | entregue com atraso | não |
| p-204 | devolvido | não |
| p-205 | troca | não |
| p-206 | **cancelado ← status novo** | sim |

Total de pedidos na fonte: 6. “Urgente” é uma marca que atravessa os status (um pedido
urgente continua sendo entrega, devolução…) — não entra na soma de conferência.

- a) Confira na fonte (semana 2) e conte você:
  - pedidos feitos: ________
  - pedidos entregues (prazo + atraso): ________
  - pedidos devolvidos (devoluções + trocas): ________
  - pedidos cancelados: ________
  - conferência (entregues + devolvidos + cancelados = total?): ________
  - pedidos urgentes (contagem à parte): ________
- b) O que do seu reparo da semana 1 ainda vale?
  ________________________________________________
- c) Como o combinado acomoda o “cancelado”? Marque uma decisão e justifique em 1 frase:
  ( ) substituir um número existente
  ( ) somar dentro de um número existente
  ( ) renegociar o formato (linha nova)
  Justificativa: ________________________________________________
- d) Seu novo reparo mínimo (1 frase — só o que mudou de novo; o pedido salvo continua bom):
  ________________________________________________

---

## 4. Autochecagem (confira antes de entregar)

- [ ] Contei os números NA FONTE, POR CATEGORIA (não só o total — e não no resumo de sexta).
- [ ] Apontei O QUE MUDOU no dado (não escrevi só “atualize”).
- [ ] Preservei o combinado e declarei como o número novo entrou (nada implícito).
- [ ] Não reescrevi tudo — o reparo coube em 1–2 frases justificáveis.

### Tente de novo, se falhou (volte só ao campo indicado)

| Se seu reparo… | Volte a | Pergunta-guia |
| --- | --- | --- |
| conferiu só o total (que fecha mesmo com erro) | Campo 2 | Cada item da fonte caiu na categoria certa? Onde o t-05/p-106 foram parar? |
| usou a coluna antiga como se nada tivesse mudado | Campo 3a | Qual coluna a plataforma renomeou ou criou nesta semana? |
| foi vago (“atualize o resumo, por favor”) | Campo 3a → 3d | O que só eu vi na fonte nova? |
| deixou o número novo sem casa (implícito) | Campo 3b | Substituir, agregar ou renegociar o formato — qual foi a minha decisão? |
| perdeu o formato/público do combinado | Campo 3c | O que seguia valendo e não pode se perder? |
| apagou/reescreveu o pedido inteiro | Campo 1 vs 3 | O que exatamente quebrou: o pedido, ou o dado que ele lê? |

---

## O que não fazer (concreto)

- ✗ MANTER O INPUT VELHO — deixar a rotina lendo “entregues” como antes: a troca vira entrega,
  o reaberto vira fechado — a saída sai bonita lendo um dado que só existe na memória da rotina.
- ✗ PEDIDO VAGO “ATUALIZE” — “atualiza aí o resumo” não diz o que mudou. Quem viu a plataforma
  nova foi você; a correção repõe o contexto que só você tem.
- ✗ REESCRITA TOTAL — apagar o pedido salvo e começar do zero joga fora semanas de acerto,
  esconde a causa, e o pedido novo nasce com o mesmo buraco.

---

## Para lembrar

Exercício de papel com dados inventados: nada é automatizado, nada fica salvo, nada é
publicado — e nenhum resultado é “garantido”; quem valida é você (Campo 4).
Notas técnicas para docentes (procedência, fontes das lições, limites): `README.md`.
