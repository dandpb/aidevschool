"""Suíte existente da fixture notas.py (verde no estado atual do repo).

Roda sem framework: python3 testes.py  (exit 0 = todos passaram).
Também compatível com pytest, se preferir.
"""

from notas import consolidar, media, situacao


def test_media_simples():
    assert media([7.0, 8.0]) == 7.5


def test_situacao_acima_da_minima():
    assert situacao(7.5) == "APROVADO"


def test_situacao_bem_abaixo_da_minima():
    assert situacao(5.0) == "REPROVADO"


def test_consolidar_formata_linha():
    linhas = consolidar(["Ana 7.0 8.0"])
    assert linhas == ["Ana média 7.5 — APROVADO"]


def test_estudante_sem_notas_erro():
    try:
        consolidar(["Bia"])
        raise AssertionError("devia ter lançado ValueError")
    except ValueError:
        pass


if __name__ == "__main__":
    testes = [valor for nome, valor in sorted(globals().items()) if nome.startswith("test_")]
    for teste in testes:
        teste()
        print(f"ok {teste.__name__}")
    print(f"{len(testes)} testes passaram")
