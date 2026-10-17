"""Teste de caracterização da fixture pedidos.py (prática pg-d03).

Caracteriza o comportamento OBSERVÁVEL que a suíte existente
(insumos/fixture/testes.py) nao enxerga, citando as clausulas do
CONTRATO.md:

- C2: prioridade de erro (produto desconhecido > quantidade invalida,
  independente da ordem dos itens);
- C3: trilha de auditoria de pedido rejeitado ("pedido-iniciado" fica).

Verde sobre o original = o comportamento atual esta descrito aqui.
Vermelho sob qualquer versao = o comportamento mudou (regressao de
contrato), MESMO que testes.py continue 6/6 verde.

Roda sem framework:  PYTHONPATH=<dir-do-pedidos.py> python3 teste_caracterizacao.py
"""

from pedidos import AUDITORIA, fechar_pedido


def caracteriza_c2_prioridade_de_erro():
    # dois problemas no mesmo pedido: quantidade invalida vem PRIMEIRO na
    # lista, mas produto desconhecido tem prioridade (CONTRATO C2).
    try:
        fechar_pedido([("cafe", -1), ("pizza", 1)])
        raise AssertionError("C2: devia ter recusado o pedido")
    except ValueError as erro:
        assert "produto desconhecido: pizza" in str(erro), (
            "C2 violada: ordem de erro trocada — obtido: %r" % str(erro)
        )


def caracteriza_c3_auditoria_de_rejeitado():
    # pedido rejeitado deixa exatamente 1 linha "pedido-iniciado" (C3):
    # o registro acontece ANTES da validacao.
    AUDITORIA.clear()
    try:
        fechar_pedido([("pizza", 1)])
    except ValueError:
        pass
    assert AUDITORIA == [("pedido-iniciado", 1)], (
        "C3 violada: trilha de rejeitado mudou — obtido: %r" % (AUDITORIA,)
    )


def caracteriza_c3_auditoria_de_cupom_invalido():
    # cupom invalido tambem eh rejeicao pos-"pedido-iniciado" (C2 item 3 + C3).
    AUDITORIA.clear()
    try:
        fechar_pedido([("cafe", 1)], cupom="XPTO")
    except ValueError:
        pass
    assert AUDITORIA == [("pedido-iniciado", 1)], (
        "C3 violada: rejeicao de cupom nao deixou a linha — obtido: %r"
        % (AUDITORIA,)
    )


if __name__ == "__main__":
    testes = [
        valor
        for nome, valor in sorted(globals().items())
        if nome.startswith("caracteriza_")
    ]
    for teste in testes:
        teste()
        print(f"ok {teste.__name__}")
    print(f"{len(testes)} caracterizacoes passaram")
