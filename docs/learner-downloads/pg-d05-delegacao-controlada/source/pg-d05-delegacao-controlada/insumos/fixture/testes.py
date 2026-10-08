"""Suíte existente da fixture biblioteca.py (verde no estado atual).

Roda sem framework: python3 testes.py  (exit 0 = todos passaram).
Também compatível com pytest, se preferir.

Esta suíte é o contrato de teste EXISTENTE da fatia. No regime de
delegação desta prática, testes existentes são intocáveis: proposta que
edita este arquivo para ficar verde deve ser rejeitada por escopo.
"""

from biblioteca import EMPRESTIMOS, emprestar


def test_recibo_simples():
    EMPRESTIMOS.clear()
    assert emprestar("978-85") == "EMPRESTIMO 978-85 geral 3d"


def test_recibo_com_renovacao():
    EMPRESTIMOS.clear()
    assert emprestar("978-85", "acervo", 1) == "EMPRESTIMO 978-85 acervo 21d"


def test_categoria_desconhecida_sozinha():
    try:
        emprestar("978-85", "rabisco")
        raise AssertionError("devia ter lancado ValueError")
    except ValueError as erro:
        assert "categoria desconhecida: rabisco" in str(erro)


def test_isbn_vazio_sozinho():
    try:
        emprestar("", "geral")
        raise AssertionError("devia ter lancado ValueError")
    except ValueError as erro:
        assert "isbn vazio" in str(erro)


def test_renovacoes_invalidas_sozinha():
    try:
        emprestar("978-85", "geral", 3)
        raise AssertionError("devia ter lancado ValueError")
    except ValueError as erro:
        assert "renovacoes invalidas: 3" in str(erro)


def test_trilha_registra_apenas_sucesso():
    EMPRESTIMOS.clear()
    try:
        emprestar("978-85", "rabisco")
    except ValueError:
        pass
    emprestar("978-85", "geral")
    assert EMPRESTIMOS == [("aberto", "978-85", "geral", 3)]


if __name__ == "__main__":
    testes = [valor for nome, valor in sorted(globals().items()) if nome.startswith("test_")]
    for teste in testes:
        teste()
        print(f"ok {teste.__name__}")
    print(f"{len(testes)} testes passaram")
