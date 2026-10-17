"""pedidos.py — fecha pedidos da cantina (fixture da prática pg-d03).

Código FUNCIONAL e feio, de propósito: é o alvo de uma refatoração com rede
de segurança. O comportamento observável dele é o declarado em
../CONTRATO.md — dentro desta prática, o CONTRATO é a autoridade.

Sem dependências, sem rede, sem estado global além de AUDITORIA
(lista pública que faz parte do comportamento observável).
"""

CATALOGO = {
    "cafe": 12.0,
    "arroz": 7.5,
    "feijao": 6.0,
}

CUPONS = {"BEM10": 0.10, "BEM20": 0.20}

AUDITORIA = []


def fechar_pedido(itens, cupom=None):
    AUDITORIA.append(("pedido-iniciado", len(itens)))
    for produto, _ in itens:
        if produto not in CATALOGO:
            raise ValueError("produto desconhecido: %s" % produto)
    for produto, qtd in itens:
        if qtd <= 0:
            raise ValueError("quantidade invalida: %s=%d" % (produto, qtd))
    if cupom is not None and cupom not in CUPONS:
        raise ValueError("cupom invalido: %s" % cupom)
    total = 0.0
    for produto, qtd in itens:
        total = total + CATALOGO[produto] * qtd
    if cupom is not None:
        total = total * (1.0 - CUPONS[cupom])
    texto = "R$ "
    if total == int(total):
        texto = texto + "%d,00" % int(total)
    else:
        texto = texto + ("%.2f" % total).replace(".", ",")
    AUDITORIA.append(("pedido-fechado", total))
    return texto
