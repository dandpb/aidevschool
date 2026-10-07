# Anexo do pedido — proposta de refatoração recebida do assistente

> Reproduzida na íntegra (é o insumo que você recebeu; o que fazer com ela
> é a prática). O código abaixo substituiria `pedidos.py` por inteiro,
> conforme o item 2 da proposta: "aplicar tudo de uma vez".

```python
"""pedidos.py — versão proposta pelo assistente (nao revisada)."""

CATALOGO = {
    "cafe": 12.0,
    "arroz": 7.5,
    "feijao": 6.0,
}

CUPONS = {"BEM10": 0.10, "BEM20": 0.20}

AUDITORIA = []


def validar_item(produto, qtd):
    if produto not in CATALOGO:
        raise ValueError("produto desconhecido: %s" % produto)
    if qtd <= 0:
        raise ValueError("quantidade invalida: %s=%d" % (produto, qtd))


def formatar_real(total):
    if total == int(total):
        return "R$ %d,00" % int(total)
    return "R$ " + ("%.2f" % total).replace(".", ",")


def fechar_pedido(itens, cupom=None):
    for produto, qtd in itens:
        validar_item(produto, qtd)
    if cupom is not None and cupom not in CUPONS:
        raise ValueError("cupom invalido: %s" % cupom)
    total = sum(CATALOGO[produto] * qtd for produto, qtd in itens)
    if cupom is not None:
        total = total * (1.0 - CUPONS[cupom])
    AUDITORIA.append(("pedido-iniciado", len(itens)))
    AUDITORIA.append(("pedido-fechado", total))
    return formatar_real(total)
```

A proposta promete: "um loop em vez de três", "trilha só com eventos
úteis", "suíte continua verde". A prática pergunta: **antes de aplicar,
o que te permite dizer que o comportamento vai continuar o mesmo?**
