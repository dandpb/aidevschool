"""ARMADILHA (nao use em producao) — pedidos.py conforme a proposta do
assistente (insumos/proposta-refatoracao.md), aplicada na integra.

Este arquivo existe para ser OBSERVADO:
  - a suíte existente passa nele (6/6 verde);
  - o teste de caracterizacao fica VERMELHO (C2 e C3 violadas).

E o contraexemplo executavel da pratica: "suíte verde" nao provou que o
comportamento foi preservado.
"""

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
