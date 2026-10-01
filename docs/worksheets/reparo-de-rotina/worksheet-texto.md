# Corrija a rotina sem começar do zero — versão em texto puro

> Equivalente em texto simples do `worksheet-visual.html` (mesmo exercício, mesma numeração de campos).
> Para leitores de tela, baixa largura de banda, impressão preto-e-branco ou quem prefere texto seco.
> **Material de exercício** (~15 min, depois da lição l32 “Quando a automação erra”). Papel ou digital.
> Sem dados reais, sem automação: nada do que você escrever é salvo ou enviado.

Worksheet de projeto AiDevSchool — fora do currículo canônico. AID-3649.

---

## Roteiro

1. Exemplo acompanhado (Mariana) — caso resolvido, cenário diferente do seu.
2. Seu caso (rotina de pedidos de uma loja) — você autora o reparo.
3. Teste com a semana 2 sintética.
4. Autochecagem com retry + negativos concretos.

---

## 1. Exemplo acompanhado — a rotina da Mariana

### Antes (rotina degradada)

Pedido-padrão salvo:

> “Resumo semanal de atendimento para a reunião de segunda: tópicos, 3 indicadores
> (tickets abertos, tickets ~~resolvidos~~, tempo médio de resposta), máximo meia página.
> [DADOS DA SEMANA: colar aqui]”

- FIXO: tarefa (resumir o atendimento da semana) e formato (tópicos, 3 indicadores, meia página, reunião de segunda).
- VARIÁVEL: os dados da semana, colados no lugar marcado.

O que mudou por fora: o sistema atualizou — a coluna “tickets resolvidos” passou a se chamar
“tickets FECHADOS” e entrou a coluna “REABERTOS”.

O sinal de degradação: o resumo de segunda veio no formato de sempre, com números “na média”
das outras semanas — plausível, mas montado como se a planilha fosse a antiga.
Erro silencioso: bonito e desatualizado. Tarefa e formato continuavam bons; o que
desatualizou foi o mapeamento do dado.

### Depois (reparo mínimo)

1. O que mudou no dado:
   “A coluna ‘tickets resolvidos’ agora se chama ‘tickets fechados’; use a coluna nova.
   Entrou a coluna ‘reabertos’: conte à parte, sem somar aos fechados.”
2. O que continua valendo:
   “O resto segue como combinado: tópicos, os 3 indicadores, máximo meia página,
   para a reunião de segunda.”
3. Teste com a semana: rodou com os dados de segunda → “reabertos” apareceu separado, total bateu.
4. Validação humana: “Antes de enviar: fechados + reabertos somam o total do painel?”

Mariana NÃO reescreveu o pedido inteiro, NÃO manteve a coluna velha e NÃO pediu só “atualize”.

---

## 2. Seu caso — a rotina de pedidos da loja

Cenário sintético (inventado; não use dados reais). Toda sexta, a rotina resume os pedidos
da loja para o chat da operação. Esta semana a plataforma mudou.

### Antes

Pedido-padrão salvo:

> “Resumo semanal de pedidos da loja para o chat da operação: lista com 3 números
> (pedidos feitos, pedidos entregues, pedidos devolvidos), máximo 10 linhas.
> [DADOS DA SEMANA: colar aqui]”

- FIXO: tarefa (resumir pedidos da semana) e formato (lista, 3 números, 10 linhas, chat da operação).
- VARIÁVEL: os números de pedidos da semana.

O que mudou por fora (semana 1): a plataforma dividiu “pedidos entregues” em
“ENTREGUES NO PRAZO” e “ENTREGUES COM ATRASO”; as devoluções agora incluem “TROCAS”.

O sinal: o resumo desta sexta veio com a lista de sempre e três números “no padrão das
outras semanas” — como se a plataforma fosse a antiga.
(Dica: compare a saída com as semanas anteriores E com o dado desta semana. Com qual ela combina?)

### Campo 1 — Prompt reutilizável: separe o fixo do variável

- 1a) Tarefa (o que a rotina pede, sempre igual):
  ________________________________________________
- 1b) Formato (a forma fixa da saída):
  ________________________________________________
- 1c) Dado que muda toda semana (o único campo variável):
  ________________________________________________

### Campo 2 — Reparo mínimo de contexto (semana 1)

- 2a) O que mudou no dado desta semana (nomeie o componente desatualizado — sem “atualize aí”):
  ________________________________________________
- 2b) O que continua valendo (a regra que não mudou):
  ________________________________________________
- 2c) Seu pedido de reparo em 1–2 frases (2a + 2b juntos):
  ________________________________________________

### Campo 3 — Pergunta final de validação humana

- 3) A pergunta que você faria ao resultado antes de usar — uma pergunta que um erro
  silencioso (bonito e desatualizado) NÃO passaria:
  ________________________________________________

---

## 3. Semana 2 sintética — o reparo aguenta?

Na semana seguinte, a plataforma marcou alguns pedidos com a flag “URGENTE” e entrou a
linha “CANCELADOS”.

- 3a-teste) Qual número você conferiria primeiro no resumo da semana 2, e por quê?
  ________________________________________________
- 3b-teste) O que do seu reparo da semana 1 ainda vale?
  ________________________________________________
- 3c-teste) Seu novo reparo mínimo (1 frase — só o que mudou de novo; o pedido-padrão continua bom):
  ________________________________________________

---

## 4. Autochecagem (confira antes de entregar)

- [ ] Apontei O QUE MUDOU no dado (não escrevi só “atualize”).
- [ ] Preservei o combinado (formato, números, público) — o que estava estável continuou.
- [ ] Não reescrevi tudo — o reparo coube em 1–2 frases justificáveis.

### Retry direcionado (se falhou, volte só ao campo indicado)

| Se seu reparo… | Volte a | Pergunta-guia |
| --- | --- | --- |
| usou a coluna antiga como se nada tivesse mudado | Campo 2a | Qual coluna a plataforma renomeou ou criou nesta semana? |
| foi vago (“atualize o resumo, por favor”) | Campo 2a → 2c | O que só eu vi na fonte nova que a IA não sabe? |
| perdeu o formato/público do combinado | Campo 2b | O que seguia valendo e não pode se perder? |
| apagou/reescreveu o pedido inteiro | Campo 1 vs 2 | O que exatamente quebrou: o pedido, ou o dado que ele lê? |

---

## O que não fazer (concreto)

- ✗ MANTER O INPUT VELHO — deixar a rotina lendo “pedidos entregues” como uma coluna só:
  a coluna não existe mais; a saída sai bonita lendo um dado que só existe na memória da rotina.
- ✗ PEDIDO VAGO “ATUALIZE” — “atualiza aí o resumo” não diz o que mudou. Quem viu a
  plataforma nova foi você; a correção repõe o contexto que só você tem.
- ✗ REESCRITA TOTAL — apagar o pedido-padrão e começar do zero joga fora semanas de acerto,
  esconde a causa, e o pedido novo nasce com o mesmo buraco.

---

## Notas de fronteira e proveniência

- Exercício de papel: nada é automatizado, persistido ou publicado; nenhum dado real é usado;
  nenhuma eficácia é prometida — a validação é humana (Campo 3).
- Este worksheet não marca dominância nem progresso canônico; correção formal: ver guia docente separado.
- Fontes (somente leitura): l30-rotinas-repetitivas.yaml (blob 595e3364),
  l32-quando-a-automacao-erra.yaml (blob e6c78deb01f), l18-biblioteca-de-pedidos.yaml
  (blob 67d388ee39e4), l19-conversas-longas.yaml (blob f3611e2a36e2) — pin main 86fca779.
- Autoria: UX Designer de Aprendizagem (agente 0bfa47c1) · run 64d19f2e · 2026-10-01 · AID-3649.
