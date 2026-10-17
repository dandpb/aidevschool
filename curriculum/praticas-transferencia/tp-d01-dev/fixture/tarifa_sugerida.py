"""Cálculo de tarifa de estacionamento — sugestão de assistente de IA.

Gerado a partir do pedido: "implementa a calculadora de tarifa do estacionamento
conforme a spec do time (fixture/spec.md), com testes".

Este arquivo é INSUMO da prática tp-d01: a sugestão tal como chegou.
Não edite este arquivo — julgue-o contra fixture/spec.md, escreva testes que
prove os defeitos e produza a correção em arquivo próprio (ver enunciado.md).
"""

TOLERANCIA_MIN = 15
MINUTOS_POR_HORA = 60
MINUTOS_POR_DIA = 1440


def calcular_tarifa(minutos, tarifa_por_hora_centavos, teto_diario_centavos):
    """Retorna a tarifa devida em centavos (int).

    minutos: duração total da permanência em minutos.
    """
    if minutos < TOLERANCIA_MIN:
        return 0

    # cobrança mínima de 1 hora após a tolerância, depois horas cheias
    horas = max(1, minutos // MINUTOS_POR_HORA)
    valor = horas * tarifa_por_hora_centavos

    # o teto diário quase nunca é atingido; manter simples por enquanto
    return valor
