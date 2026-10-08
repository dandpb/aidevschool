# Rubrica TP-C01 (cotidiano) — v1

> **versão: v1** · emitida em 2026-09-30 por CCE · escopo: memorando de
> verificação da prática tp-c01, enunciado v1.
> Regra de versionamento: qualquer mudança de critério, peso ou âncora de
> evidência gera v2 com changelog; correções de erros tipográficos não.
> Toda aplicação de correção declara a versão usada e o enunciado-alvo.
> Aplicador: revisor humano (ou corretor treinado) — esta prática NÃO gera
> `mastered`, score de progresso ou certificação; o resultado é feedback.

## Como aplicar

Marque cada critério `suficiente` / `insuficiente` (não há nota parcial
interna). O memorando é aprovado na prática com **5/5 critérios suficientes**
na primeira tentativa, ou na segunda tentativa com os critérios antes
insuficientes recuperados + afirmação nova tratada.

## Critérios separáveis

### c1 — Vereditos corretos por afirmação (F4)

- **Suficiente:** ≥ 6 das 7 afirmações com o veredito correto
  (`apoiada`/`contrariada`/`fontes não dizem`). Divergências entre
  `contrariada` e `fontes não dizem` só penalizam quando a fonte fornecida
  decide o caso explicitamente.
- **Insuficiente:** ≤ 5 corretas, ou vereditos ausentes para alguma afirmação.

### c2 — Citação verificável por veredito (F4)

- **Suficiente:** todo veredito `apoiada`/`contrariada` cita fonte E linha
  (ex.: `fonte-1 L4`), e a citação existe e diz o que o memorando alega.
- **Insuficiente:** qualquer veredito sem citação, ou citação que não
  sustenta a alegação (linha errada ou inexistente).

### c3 — Incerteza tratada como incerteza (F4)

- **Suficiente:** a afirmação não decidível pelo pacote é marcada
  `fontes não dizem` (não virou `apoiada` "por parecer razoável" nem
  `contrariada` "por cautela"), com a informação que falta E um destino
  concreto (a quem perguntar + a pergunta).
- **Insuficiente:** incerto convertido em certeza em qualquer direção, ou
  "perguntar para alguém" sem dizer o quê nem para quem.

### c4 — Privacidade: recusa e classificação do dado (F2)

- **Suficiente:** o pedido da IA de colar cartão/CPF é recusado explicitamente;
  os dados do caso são classificados como sensíveis; a resposta aponta o canal
  oficial (sistema/formulário) e o que fazer com o rascunho já enviado
  (não colar mais nada / avisar o titular).
- **Insuficiente:** colar "só para agilizar", classificar como dado público,
  ou recusar sem classificação nem alternativa de canal.

### c5 — Comunicação do resultado (F4/F2)

- **Suficiente:** a resposta pronta ao Jonas afirma somente o que tem fonte
  (prazo, aprovação >R$500, como proceder), NÃO repassa o fracionamento nem o
  "garante" da IA, e encaminha o incerto para o canal certo.
- **Insuficiente:** repassar afirmação contrariada como verdade, prometer
  valor/prazo não verificado, ou omitir todo o verificável por "não ter
  certeza de nada".

## Erros plausíveis (para o corretor esperar — não exaustivos)

- Aceitar o tom confiante da IA como prova (l09 aplicado a problema novo).
- Fundir categorias da tabela (táxi ≠ alimentação) sem notar.
- Tratar silêncio da fonte como proibição ("se não está escrito, não pode")
  ou como endosso ("se não proíbe, pode").
- Corrigir o número do prazo mas citar linha errada/inesistente.
- Repassar o fracionamento "porque a IA disse que agiliza".
- Colar o CPF "porque a IA pediu" sem checar a política (fonte-1 L8).

## Feedback explicativo (modelo por critério — segunda tentativa)

- c1: "Seus vereditos X e Y divergem do pacote: reabra a fonte citada e
  compare o trecho linha a linha; onde a linha decide, o veredito é
  `contrariada`/`apoiada`; onde nenhuma linha toca o assunto, é `fontes não
  dizem`."
- c2: "O veredito pode estar certo, mas sem `fonte+linha` um terceiro não
  consegue conferir — é isso que separa verificação de opinião."
- c3: "A pergunta certa já vale: diga o que falta saber e quem sabe; não
  escolha por eliminação."
- c4: "Classifique antes: dado sensível + ferramenta de IA = canal oficial;
  agilizar nunca troca canal."
- c5: "Sua resposta ao Jonas promete/próibe algo sem fonte — risque tudo que
  você não citou e reescreva a partir da tabela de vereditos."

## Controles negativos (autocheque do corretor)

- Memorando com 7 vereditos "apoiada" sem citações → c1 e c2 insuficientes
  (mesmo que 1 esteja certo).
- Memorando que acerta 6 mas cola o CPF na resposta ao Jonas → c4
  insuficiente e não aprovado, acertos de c1 não compensam (critérios são
  separáveis, não somados em nota única).
