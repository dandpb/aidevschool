"""Teste de regressão da correção (vermelho antes do fix, verde depois).

Roda sem framework: python3 teste_regressao_bug001.py
Cita o bug no nome e cobre a unidade (situacao) e o ponto onde o usuário
viu o sintoma (consolidar/CLI).
"""

from notas import consolidar, situacao


def teste_bug001_media_exata_6_unidade():
    # BUGBUG-001: média exatamente 6.0 deve ser APROVADO (REGRA.md item 4)
    assert situacao(6.0) == "APROVADO", (
        f"situacao(6.0) deveria ser APROVADO, obtido {situacao(6.0)!r}"
    )


def teste_bug001_media_exata_6_ponto_do_sintoma():
    # O sintoma que o usuário viu foi a linha de saída da consolidação
    linhas = consolidar(["Bia 6.0 6.0"])
    assert linhas == ["Bia média 6.0 — APROVADO"], f"obtido: {linhas!r}"


if __name__ == "__main__":
    teste_bug001_media_exata_6_unidade()
    teste_bug001_media_exata_6_ponto_do_sintoma()
    print("2 testes de regressão passaram")
