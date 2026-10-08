"""notas.py — CLI de consolidação de notas da turma (fixture da prática pg-d01).

Recebe um ou mais argumentos no formato "Nome nota1 nota2 ..." e imprime,
para cada estudante, a média simples e a situação segundo a REGRA vigente.

Uso:
    python3 notas.py "Ana 5.5 6.5" "Bia 6.0 6.0" "Caio 7.0 5.0"

Sem argumentos, imprime o uso e sai com código 2.
"""

import sys

MEDIA_MINIMA = 6.0


def media(notas):
    """Média simples de uma lista de notas."""
    return sum(notas) / len(notas)


def situacao(media_final):
    """Situação final conforme a regra da escola (ver REGRA.md)."""
    if media_final > MEDIA_MINIMA:
        return "APROVADO"
    return "REPROVADO"


def consolidar(argumentos):
    """Consolida cada argumento 'Nome n1 n2 ...' em linha de saída."""
    linhas = []
    for argumento in argumentos:
        partes = argumento.split()
        nome = partes[0]
        notas = [float(valor) for valor in partes[1:]]
        if not notas:
            raise ValueError(f"estudante {nome} sem notas")
        media_final = media(notas)
        linhas.append(f"{nome} média {media_final:.1f} — {situacao(media_final)}")
    return linhas


def main(argv):
    if len(argv) < 2:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    for linha in consolidar(argv[1:]):
        print(linha)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
