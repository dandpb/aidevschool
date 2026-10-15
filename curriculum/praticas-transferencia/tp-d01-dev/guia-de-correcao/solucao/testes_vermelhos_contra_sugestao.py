"""Prova do VERMELHO: os mesmos critérios da spec aplicados à SUGESTÃO original.

Rode a partir de guia-de-correcao/solucao/:
    PYTHONPATH=../../fixture python3 -m unittest testes_vermelhos_contra_sugestao -v

Estes testes codificam o comportamento da SPEC (não o da sugestão). Ajudar a
sugestão a 'passar neles' sem mexer na sugestão é impossível por construção —
é justamente isso que prova que os testes detectam os defeitos (disciplina
reproduzir → vermelho → correção mínima do workflow de correção de bug).
"""

import unittest

from tarifa_sugerida import calcular_tarifa


class ToleranciaSpec(unittest.TestCase):
    def test_exatamente_15_min_e_cortesia(self):
        self.assertEqual(calcular_tarifa(15, 500, 5000), 0)


class HoraIniciadaSpec(unittest.TestCase):
    def test_61_min_2_horas(self):
        self.assertEqual(calcular_tarifa(61, 500, 5000), 1000)

    def test_90_min_2_horas(self):
        self.assertEqual(calcular_tarifa(90, 500, 5000), 1000)


class TetoDiarioSpec(unittest.TestCase):
    def test_24h_exatas_1_bloco(self):
        self.assertEqual(calcular_tarifa(1440, 500, 5000), 5000)

    def test_24h_e_1_min_2_blocos(self):
        self.assertEqual(calcular_tarifa(1441, 500, 5000), 10000)

    def test_30h_2_blocos(self):
        self.assertEqual(calcular_tarifa(1800, 500, 5000), 10000)


class ContratoDeErroSpec(unittest.TestCase):
    def test_minutos_negativo_erro(self):
        with self.assertRaises(ValueError):
            calcular_tarifa(-5, 500, 5000)


if __name__ == "__main__":
    unittest.main()
