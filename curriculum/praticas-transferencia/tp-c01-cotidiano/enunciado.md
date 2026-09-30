# TP-C01 (cotidiano) — Verificar antes de repassar: o rascunho de reembolso da IA

> Prática de transferência inédita · público **cotidiano** · evidência-alvo **T3**
> (aplicação a problema novo, com justificativa verificável).
> Competências (glossário `intent/AID-3453-unify-school/spec.md:7-21`
> @579ce995): **P F4** verificação · **S F2** uso seguro.
> Versão do enunciado: v1 (2026-09-30). Solução e gabarito ficam FORA deste
> enunciado, em `../guia-de-correcao/`.

## Objetivo observável

Dado um rascunho de resposta de IA **não verificado** e um **pacote de fontes
fornecido**, você produz um memorando de verificação que classifica **cada
afirmação** do rascunho em `apoiada` / `contrariada` / `fontes não dizem`,
cada veredito **citando fonte e linha**, decide o que fazer quando a fonte é
silente, e **recusa o envio de dado sensível** à ferramenta — sem tratar o
tom confiante da IA como evidência.

## Cenário

Você é Marina (suporte administrativo). O Jonas voltou de uma viagem de Poços
de Caldas e pediu ajuda com o reembolso. Para ganhar tempo, você colou a
pergunta dele no chat de IA da empresa e recebeu um rascunho de resposta
(`insumos/resposta-ia.md`). Você tem **20 minutos antes do almoço** para
decidir o que pode — e o que não pode — ser repassado ao Jonas.

Você NÃO vai procurar na internet: tudo o que precisa está no pacote abaixo.
Se uma afirmação não puder ser decidida com o pacote, o memorando precisa
dizer isso e nomear **a quem perguntar e o quê**.

## Insumos (sintéticos e seguros — nenhum dado real)

| Arquivo | O que é |
|---|---|
| `insumos/resposta-ia.md` | O rascunho do chat de IA com as afirmações a verificar (1 a 7) |
| `insumos/fonte-1-politica-reembolso.md` | Política de reembolso v3, com linhas L1–L8 |
| `insumos/fonte-2-tabela-limites.md` | Tabela de limites diários por categoria, com linhas L1–L6 |
| `insumos/fonte-3-thread-email.md` | Thread de e-mail que originou a pergunta, com linhas L1–L6 |

## Entrega esperada (memorando de verificação)

Um documento curto (meia página a uma página) com QUATRO partes — sem escolher
alternativa pronta, a evidência é a sua justificativa citada:

1. **Tabela de vereditos** — uma linha por afirmação (1–7) do rascunho:
   `nº · veredito (apoiada/contrariada/fontes não dizem) · citação (fonte,
   linha) · uma frase de justificativa`.
2. **Incertos e próximos passos** — para cada "fontes não dizem": qual informação
   falta, a quem perguntar e o que exatamente perguntar.
3. **Decisão de privacidade** — sobre o pedido da IA de colar cartão e CPF:
   classifique os dados do caso (fonte 3, L4), diga o que a política manda
   (se mandar algo) e o que você faria no lugar da Marina.
4. **Resposta pronta para o Jonas** — 3 a 6 linhas afirmando SOMENTE o que
   suas fontes sustentam, com o passo a passo que você tem certeza (ou
   apontando onde confirmar).

## Regras

- Citações no formato `fonte-1 L3` (arquivo + linha). Veredito sem citação não
  conta como evidência.
- "Fontes não dizem" é um veredito legítimo — silêncio da fonte não é endosso
  nem proibição; converta em pergunta para a pessoa certa.
- Não use conhecimento externo sobre "políticas de empresa" para decidir: vale
  o pacote fornecido.
- Não prometa ao Jonas prazos, garantias ou valores que você não verificou.

## Segunda tentativa

Se algum critério da rubrica ficar `insuficiente`, você recebe o feedback
marcado por critério e refaz SOMENTE as partes insuficientes, mais uma
afirmação NOVA que aparece na versão revisada do rascunho (o chat "insiste"
numa das afirmações contrariadas) — o memorando da segunda tentativa precisa
sustentar a posição contra a insistência da IA, re-citando as fontes.
