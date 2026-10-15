"""Correção MÍNIMA da calculadora de tarifa (guia de correção tp-d01).

Cada mudança da sugestão é justificada por uma regra da fixture/spec.md:
- validação de uso (spec OBJETIVO item 1): minutos negativo lança ValueError;
- tolerância inclusiva (item 2): `<=` e não `<`;
- horas INICIADAS (item 3): ceil — a "cobrança mínima de 1 hora" inventada da
  sugestão foi removida porque não está na spec;
- teto por bloco de 24 h iniciado (item 4): ceil(minutos/1440) blocos.

Nada além disso foi tocado (nomes, constantes e estrutura preservados).
"""

from math import ceil

TOLERANCIA_MIN = 15
MINUTOS_POR_HORA = 60
MINUTOS_POR_DIA = 1440


def calcular_tarifa(minutos, tarifa_por_hora_centavos, teto_diario_centavos):
    """Retorna a tarifa devida em centavos (int).

    minutos: duração total da permanência em minutos.
    """
    if minutos < 0:
        raise ValueError("minutos negativo: saída antes da entrada")

    if minutos <= TOLERANCIA_MIN:
        return 0

    horas = ceil(minutos / MINUTOS_POR_HORA)
    valor = horas * tarifa_por_hora_centavos

    blocos_dia = ceil(minutos / MINUTOS_POR_DIA)
    return min(valor, blocos_dia * teto_diario_centavos)
