# Contrato de comportamento do `biblioteca.py` (autoridade para a prática pg-d05)

> Documento fictício desta fixture — dentro da prática, é a autoridade que
> o plano aprovado cita. Delegar uma fatia NÃO autoriza mudar nenhuma
> cláusula daqui; proposta que muda cláusula sem pedido é retrabalho,
> mesmo que a suíte continue verde.

## C1 — Formato do recibo

`emprestar` devolve `str` no formato `EMPRESTIMO <isbn> <categoria> <dias>d`
(`"EMPRESTIMO 978-85 geral 3d"`).

## C2 — Mensagens e prioridade de erro

Erros são `ValueError` com mensagens exatas, nesta prioridade fixa
(independente da ordem dos argumentos):

1. `categoria desconhecida: <nome>`
2. `isbn vazio`
3. `renovacoes invalidas: <n>`

Exemplo decisivo: `emprestar("", "rabisco")` lança
`categoria desconhecida: rabisco` — o isbn vazio aparece primeiro na
assinatura, mas categoria desconhecida tem prioridade.

## C3 — Trilha de empréstimos

`EMPRESTIMOS` (lista pública do módulo) recebe a tupla
`("aberto", <isbn>, <categoria>, <dias>)` **somente em empréstimos
bem-sucedidos**. Rejeitados não deixam linha na trilha.

## C4 — Aritmética dos dias

`dias = CATEGORIAS[categoria] + renovacoes * DIAS_POR_RENOVACAO`
(base: geral 3, reserva 7, acervo 14; `DIAS_POR_RENOVACAO = 7`;
`renovacoes` válido: 0 a `MAX_RENOVACOES` = 2).

## C5 — API

`emprestar(isbn, categoria="geral", renovacoes=0)`; `CATEGORIAS`,
`MAX_RENOVACOES`, `DIAS_POR_RENOVACAO` e `EMPRESTIMOS` são nomes
públicos do módulo.
