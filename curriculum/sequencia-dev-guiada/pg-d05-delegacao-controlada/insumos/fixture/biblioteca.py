"""biblioteca.py — registra empréstimos da biblioteca do bairro (fixture pg-d05).

Estado APÓS a fatia 1 do plano (tabela de categorias). A fatia 2 em
avaliação é "extrair a validação de `emprestar` para função própria".
O comportamento observável é o declarado em ../CONTRATO.md — dentro
desta prática, o CONTRATO é a autoridade.

Sem dependências, sem rede, sem relógio: tudo determinístico.
"""

CATEGORIAS = {
    "geral": 3,
    "reserva": 7,
    "acervo": 14,
}

MAX_RENOVACOES = 2
DIAS_POR_RENOVACAO = 7

EMPRESTIMOS = []


def emprestar(isbn, categoria="geral", renovacoes=0):
    if categoria not in CATEGORIAS:
        raise ValueError("categoria desconhecida: %s" % categoria)
    if not isbn:
        raise ValueError("isbn vazio")
    if renovacoes < 0 or renovacoes > MAX_RENOVACOES:
        raise ValueError("renovacoes invalidas: %d" % renovacoes)
    dias = CATEGORIAS[categoria] + renovacoes * DIAS_POR_RENOVACAO
    EMPRESTIMOS.append(("aberto", isbn, categoria, dias))
    return "EMPRESTIMO %s %s %dd" % (isbn, categoria, dias)
