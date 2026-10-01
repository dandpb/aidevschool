#!/usr/bin/env python3
"""Checks deterministicos (positivos + negativos) do pacote pg-e01-evals-offline.

AID-3648. Verifica que as fixtures sinteticas realizam o desenho
pedagogico da pratica e que o scorer/metricas.py se comporta como o
contrato declara. Sem rede, sem deps (stdlib). Rodar SEMPRE de dentro
do diretorio do pacote:

    cd curriculum/praticas-evals-offline/pg-e01-evals-offline
    python3 guia-de-correcao/testes.py

Veredito: "N testes passaram" + exit 0; qualquer violacao => erro + exit 1.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PACOTE = os.path.dirname(HERE)
FIX = os.path.join(PACOTE, "insumos", "fixture")
sys.path.insert(0, FIX)

import metricas  # noqa: E402


def carregar(caminho):
    with open(caminho, encoding="utf-8") as fh:
        return json.load(fh)


def res_base():
    return metricas.comparar(
        carregar(os.path.join(FIX, "casos_base.json"))["casos"],
        carregar(os.path.join(FIX, "saidas_A_base.json"))["predicoes"],
        carregar(os.path.join(FIX, "saidas_B_base.json"))["predicoes"],
    )


def res_heldout(a, b):
    return metricas.comparar(
        carregar(os.path.join(FIX, "heldout", "casos_heldout.json"))["casos"],
        carregar(os.path.join(FIX, "heldout", a))["predicoes"],
        carregar(os.path.join(FIX, "heldout", b))["predicoes"],
    )


def test_contrato_ids_negativo():
    casos = carregar(os.path.join(FIX, "casos_base.json"))["casos"]
    preds = carregar(os.path.join(FIX, "saidas_A_base.json"))["predicoes"]
    metricas.verificar_contrato(casos, preds, "area")  # positivo: valido
    vazou = [dict(p) for p in preds[:-1]] + [
        {"id": "PD-999", "area": "uso"}
    ]  # negativo: id fora do conjunto de casos
    try:
        metricas.verificar_contrato(casos, vazou, "area")
    except ValueError:
        return
    raise AssertionError("contrato aceitou predicao com id fora dos casos")


def test_agregada_melhora_no_base():
    res = res_base()
    assert res["GERAL"]["ok_b"] > res["GERAL"]["ok_a"], "agregada deveria melhorar (18>17)"
    assert res["GERAL"]["ok_a"] == 17 and res["GERAL"]["ok_b"] == 18


def test_regressao_oculta_no_base():
    ocultas = {o["fatia"]: o for o in metricas.detectar_regressao_oculta(res_base())}
    assert "pagamento" in ocultas, "fatia pagamento deveria regredir escondida"
    assert ocultas["pagamento"]["delta"] == -0.5, "delta pagamento esperado -0.500"
    base = res_base()
    assert base["GERAL"]["delta"] > 0, "agregada deveria melhorar (+0.042)"


def test_sem_falso_positivo_a_vs_a():
    casos = carregar(os.path.join(FIX, "casos_base.json"))["casos"]
    preds = carregar(os.path.join(FIX, "saidas_A_base.json"))["predicoes"]
    res = metricas.comparar(casos, preds, preds)
    assert metricas.detectar_regressao_oculta(res) == [], "A vs A nao pode gerar flag"


def test_heldout_disjunto_do_base():
    base = {c["id"] for c in carregar(os.path.join(FIX, "casos_base.json"))["casos"]}
    held = {
        c["id"] for c in carregar(os.path.join(FIX, "heldout", "casos_heldout.json"))["casos"]
    }
    assert base & held == set(), "heldout deve ser disjunto do base (anti-vazamento)"


def test_heldout_agregada_igual_fatia_morre():
    res = res_heldout("saidas_A_heldout.json", "saidas_B_heldout.json")
    assert res["GERAL"]["delta"] == 0.0, "agregada deveria ficar igual (8/12 = 8/12)"
    assert res["pagamento"]["ok_a"] == 2 and res["pagamento"]["ok_b"] == 0, (
        "pagamento deveria cair de 2/3 para 0/3 no heldout"
    )
    assert abs(res["pagamento"]["delta"] - (-2.0 / 3.0)) < 1e-9


def test_variante_c_recupera_sem_regressao():
    res = res_heldout("saidas_B_heldout.json", "saidas_C_heldout.json")
    assert res["pagamento"]["ok_b"] == 3, "C deveria recuperar pagamento (3/3)"
    quedas = [f for f, v in res.items() if f != "GERAL" and v["delta"] < 0]
    assert quedas == [], "C nao deveria derrubar nenhuma fatia; quedas=%s" % quedas
    assert res["GERAL"]["delta"] > 0


def test_todos_fixtures_rotulados_sinteticos():
    raizes = [
        FIX,
        os.path.join(FIX, "heldout"),
        os.path.join(PACOTE, "exemplo"),
        os.path.join(PACOTE, "exemplo", "heldout"),
    ]
    arquivos = [f for r in raizes for f in sorted(os.listdir(r)) if f.endswith(".json")]
    assert arquivos, "nenhum fixture encontrado"
    for nome in arquivos:
        raiz = next(r for r in raizes if os.path.exists(os.path.join(r, nome)))
        doc = carregar(os.path.join(raiz, nome))
        aviso = str(doc.get("meta", {}).get("aviso", ""))
        assert "SINTETIC" in aviso.upper(), "%s sem rotulo sintetico no meta.aviso" % nome


TESTES = [
    test_contrato_ids_negativo,
    test_agregada_melhora_no_base,
    test_regressao_oculta_no_base,
    test_sem_falso_positivo_a_vs_a,
    test_heldout_disjunto_do_base,
    test_heldout_agregada_igual_fatia_morre,
    test_variante_c_recupera_sem_regressao,
    test_todos_fixtures_rotulados_sinteticos,
]


def main():
    for teste in TESTES:
        teste()
        print("ok %s" % teste.__name__)
    print("%d testes passaram" % len(TESTES))
    return 0


if __name__ == "__main__":
    sys.exit(main())
