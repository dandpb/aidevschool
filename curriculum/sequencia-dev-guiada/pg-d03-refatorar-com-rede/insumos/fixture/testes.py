"""Suíte existente da fixture pedidos.py (verde no estado atual do repo).

Roda sem framework: python3 testes.py  (exit 0 = todos passaram).
Também compatível com pytest, se preferir.

Esta suíte é o teste de UNIDADE existente. Ela NÃO cobre todo o CONTRATO.md
(duas cláusulas ficam de fora — descobrir quais é parte da prática).
Os testes daqui são o contrato existente: refatorar não inclui editá-los.
"""

from pedidos import AUDITORIA, fechar_pedido


def test_total_simples():
    assert fechar_pedido([("cafe", 2)]) == "R$ 24,00"


def test_total_composto_com_cupom():
    AUDITORIA.clear()
    assert fechar_pedido([("arroz", 2), ("feijao", 1)], cupom="BEM10") == "R$ 18,90"


def test_produto_desconhecido_sozinho():
    try:
        fechar_pedido([("pizza", 1)])
        raise AssertionError("devia ter lancado ValueError")
    except ValueError as erro:
        assert "produto desconhecido: pizza" in str(erro)


def test_quantidade_invalida_sozinha():
    try:
        fechar_pedido([("cafe", 0)])
        raise AssertionError("devia ter lancado ValueError")
    except ValueError as erro:
        assert "quantidade invalida: cafe=0" in str(erro)


def test_cupom_invalido_com_itens_validos():
    try:
        fechar_pedido([("cafe", 1)], cupom="XPTO")
        raise AssertionError("devia ter lancado ValueError")
    except ValueError as erro:
        assert "cupom invalido: XPTO" in str(erro)


def test_auditoria_registra_sucesso_em_ordem():
    AUDITORIA.clear()
    fechar_pedido([("cafe", 1)])
    fechar_pedido([("arroz", 1)])
    assert AUDITORIA == [
        ("pedido-iniciado", 1),
        ("pedido-fechado", 12.0),
        ("pedido-iniciado", 1),
        ("pedido-fechado", 7.5),
    ]


if __name__ == "__main__":
    testes = [valor for nome, valor in sorted(globals().items()) if nome.startswith("test_")]
    for teste in testes:
        teste()
        print(f"ok {teste.__name__}")
    print(f"{len(testes)} testes passaram")
