# Contrato de comportamento do `pedidos.py` (autoridade para a prática pg-d03)

> Documento fictício desta fixture — dentro da prática, é a autoridade que
> o pedido de refatoração cita (mesmo papel do `REGRA.md` na pg-d01).
> Refatorar é mudar a forma **preservando cada cláusula daqui**. Qualquer
> cláusula que deixar de valer é regressão, mesmo que a suíte existente
> continue verde.

## C1 — Formato do retorno

`fechar_pedido` devolve `str` no formato `R$ X,XX` (vírgula decimal):
valor inteiro vira `,00` (`"R$ 24,00"`); valor com centavos usa 2 casas
(`"R$ 18,90"`).

## C2 — Prioridade de erro (ordem independente da ordem dos itens)

Quando o pedido tem **mais de um problema**, o erro lançado segue esta
prioridade fixa — não a posição dos itens na lista:

1. `produto desconhecido: <nome>` (varredura de produtos primeiro);
2. `quantidade invalida: <produto>=<qtd>`;
3. `cupom invalido: <codigo>`.

Exemplo decisivo: em `[("cafe", -1), ("pizza", 1)]` o erro é
`produto desconhecido: pizza` — a quantidade inválida aparece antes na
lista, mas produto desconhecido tem prioridade.

## C3 — Trilha de auditoria (efeito colateral observável)

`AUDITORIA` (lista pública do módulo) recebe:

- `("pedido-iniciado", <nº de itens>)` **antes da validação** — ou seja,
  pedidos que serão rejeitados **deixam essa linha** na trilha;
- `("pedido-fechado", <total float>)` somente em pedidos bem-sucedidos,
  imediatamente antes do retorno.

Um pedido rejeitado deixa **exatamente 1 linha** (`pedido-iniciado`) a mais
na trilha; a ordem das linhas preserva a ordem dos acontecimentos.

## C4 — Aritmética do cupom

O cupom aplica o percentual de `CUPONS` sobre o total cheio
(`total * (1 - percentual)`); sem cupom, nada é aplicado.

## C5 — API

`fechar_pedido(itens, cupom=None)`; `itens` é lista de tuplas
`(produto, qtd)`; erros são `ValueError` com as mensagens exatas de C2;
`CATALOGO`, `CUPONS` e `AUDITORIA` são nomes públicos do módulo.
