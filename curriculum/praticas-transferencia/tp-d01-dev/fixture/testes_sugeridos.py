"""Testes sugeridos pelo assistente junto com a implementação.

Rode com:  python3 -m unittest testes_sugeridos -v
(insumo da prática tp-d01 — não edite; escreva os SEUS testes em arquivo próprio)
"""

import unittest

from tarifa_sugerida import calcular_tarifa


class TestesSugeridos(unittest.TestCase):
    def test_hora_exata(self):
        self.assertEqual(calcular_tarifa(60, 500, 5000), 500)

    def test_duas_horas_exatas(self):
        self.assertEqual(calcular_tarifa(120, 500, 5000), 1000)

    def test_meia_hora_cobra_uma_hora(self):
        self.assertEqual(calcular_tarifa(30, 500, 5000), 500)

    def test_zero_minuto(self):
        self.assertEqual(calcular_tarifa(0, 500, 5000), 0)


if __name__ == "__main__":
    unittest.main()
