# Resolver a colisão de nome "IA na Prática" — duas trilhas ou três?

Type: grilling
Status: open

## Question

`curriculum/00_ai_in_practice/` e `curriculum/ai-literacy/` são coisas declaradamente diferentes:
o ADR-0005 (`0005-ai-literacy-bounded-context.md:46-51`) afirma que `ai-literacy/` **não** é a
materialização de `00_ai_in_practice/` — a trilha 00 é escolarização do aprendiz único gateada
pelo Prometor, e `ai-literacy/` é conteúdo de produto do LiteracyDojo com gate próprio que não
promove nada no substrato. `docs/VISION.md:21` e `:166-167` tratam as duas como uma coisa só.
São **três** modelos de gate no repo, não dois.

Qual delas é a "IA na Prática" deste mapa? A outra vira fora de escopo, vira uma terceira trilha
declarada, ou as duas se fundem — e, se fundem, qual dos dois gates sobrevive?

Enquanto isso não estiver decidido, a pergunta "topologia das duas trilhas" está mal formada.

Contexto: [Delimitar o contrato pedagógico compartilhado](02-delimitar-o-contrato-pedagogico-compartilhado.md),
seção (c).
