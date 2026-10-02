"""Testes da correção tp-d01 (guia de correção).

Rode a partir de guia-de-correcao/solucao/:
    python3 -m unittest testes_da_correcao -v

Casos-limite nomeados por regra da spec: tolerância (14/15/16), hora iniciada
(59/60/61/90), teto (1439/1440/1441/1800) e contrato de erro (negativo).
"""

import unittest

from tarifa_corrigida import calcular_tarifa


class Tolerancia(unittest.TestCase):
    def test_abaixo_da_tolerancia(self):
        self.assertEqual(calcular_tarifa(14, 500, 5000), 0)

    def test_exatamente_15_min_e_cortesia(self):
        self.assertEqual(calcular_tarifa(15, 500, 5000), 0)

    def test_16_min_cobra_1_hora(self):
        self.assertEqual(calcular_tarifa(16, 500, 5000), 500)

    def test_zero_minuto(self):
        self.assertEqual(calcular_tarifa(0, 500, 5000), 0)


class HoraIniciada(unittest.TestCase):
    def test_59_min_1_hora(self):
        self.assertEqual(calcular_tarifa(59, 500, 5000), 500)

    def test_60_min_1_hora(self):
        self.assertEqual(calcular_tarifa(60, 500, 5000), 500)

    def test_61_min_2_horas(self):
        self.assertEqual(calcular_tarifa(61, 500, 5000), 1000)

    def test_90_min_2_horas(self):
        self.assertEqual(calcular_tarifa(90, 500, 5000), 1000)


class TetoDiario(unittest.TestCase):
    def test_23h59_abaixo_do_teto_1_bloco(self):
        # 24 horas iniciadas = 12000, mas ainda 1 bloco: teto 5000 domina
        self.assertEqual(calcular_tarifa(1439, 500, 5000), 5000)

    def test_24h_exatas_1_bloco(self):
        self.assertEqual(calcular_tarifa(1440, 500, 5000), 5000)

    def test_24h_e_1_min_2_blocos(self):
        # 25 horas iniciadas = 12500; 2 blocos de teto = 10000 dominam
        self.assertEqual(calcular_tarifa(1441, 500, 5000), 10000)

    def test_30h_2_blocos(self):
        # 30 horas iniciadas = 15000; 2 blocos de teto = 10000 dominam
        self.assertEqual(calcular_tarifa(1800, 500, 5000), 10000)


class ContratoDeErro(unittest.TestCase):
    def test_minutos_negativo_erro(self):
        with self.assertRaises(ValueError):
            calcular_tarifa(-5, 500, 5000)


class Saida(unittest.TestCase):
    def test_saida_e_int_em_centavos(self):
        valor = calcular_tarifa(61, 500, 5000)
        self.assertIsInstance(valor, int)


if __name__ == "__main__":
    unittest.main()
