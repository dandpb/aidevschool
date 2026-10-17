# Pedido de refatoração (caso-modelo fixo desta prática)

De: equipe da cantina
Para: você (com o assistente de código)

O `insumos/fixture/pedidos.py` está feio mas funciona: a validação vive
dentro do `fechar_pedido` em loops repetidos, a formatação de Real está
espremida no fim com um `if/else`, e somar com `total = total + ...` é
dos anos 90. Limpe isso:

1. extraia a validação para funções próprias;
2. elimine a duplicação dos loops;
3. tire a formatação de dentro do `fechar_pedido`.

O comportamento está descrito no `CONTRATO.md` — é o que não pode mudar.
Ah, e o assistente já adiantou uma proposta — o anexo completo (com o
código novo) está em `proposta-refatoracao.md`; o resumo dele:

> 1. **Validação item a item, em um único loop** — "um loop em vez de
>    três: mais limpo e mais rápido";
> 2. **Auditoria só de pedidos válidos** — "hoje a trilha grava
>    `pedido-iniciado` antes de validar, poluindo a auditoria com pedidos
>    que nem existiram";
> 3. **Formatação extraída** para `formatar_real(total)`.
>
> "No final você roda a suíte uma vez para conferir que continua verde.
> Pode aplicar tudo de uma vez — é refatoração, não muda o que o código
> faz."
