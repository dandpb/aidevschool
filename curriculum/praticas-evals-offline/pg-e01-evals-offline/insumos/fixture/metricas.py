#!/usr/bin/env python3
"""Scorer deterministico de avaliacao offline de saidas de modelo.

Pacote: pg-e01-evals-offline (AID-3648) - pratica U13/D5 (evals de produto).
Nao usa rede, contas ou chaves; nao executa nenhum modelo de IA: compara
predicoes JA EXISTENTES (arquivos sinteticos) contra rotulos dourados.

Contrato de dados (verificado, erros sao fatais):
  - casos:    {"meta": {...}, "casos": [{"id", "texto", <campo_fatia>: rotulo}]}
  - predicoes: {"meta": {...}, "predicoes": [{"id", <campo_fatia>: rotulo}]}
  - todo id de caso tem exatamente uma predicao e vice-versa.

Uso:
  python3 metricas.py comparar --casos casos.json --A saidas_A.json --B saidas_B.json
  opcoes: --fatia area   # campo usado como fatia/rotulo (padrao: area)
          --json         # saida maquina
          --fail-on-regressao  # exit 1 se houver regressao de fatia oculta
"""
import argparse
import json
import sys
from collections import OrderedDict


def carregar(caminho, chave):
    with open(caminho, encoding="utf-8") as fh:
        doc = json.load(fh)
    if not isinstance(doc, dict) or chave not in doc:
        raise ValueError("%s: falta a chave '%s'" % (caminho, chave))
    return doc[chave]


def verificar_contrato(casos, predicoes, campo):
    """Falha (ValueError) se ids nao casam 1:1 ou campo falta em algum item."""
    ids_casos = [c["id"] for c in casos]
    ids_preds = [p["id"] for p in predicoes]
    if len(set(ids_casos)) != len(ids_casos):
        raise ValueError("ids de casos duplicados")
    if len(set(ids_preds)) != len(ids_preds):
        raise ValueError("ids de predicoes duplicados")
    if set(ids_casos) != set(ids_preds):
        faltando = set(ids_casos) - set(ids_preds)
        sobrando = set(ids_preds) - set(ids_casos)
        raise ValueError(
            "contrato quebrado: faltando=%s sobrando=%s"
            % (sorted(faltando), sorted(sobrando))
        )
    for item in list(casos) + list(predicoes):
        if campo not in item:
            raise ValueError("item %s sem campo de fatia '%s'" % (item.get("id"), campo))


def indice(predicoes, campo):
    return {p["id"]: p[campo] for p in predicoes}


def acuracia_por_fatia(casos, predicoes, campo):
    """ OrderedDict fatia -> (n, corretos). GERAL entra por ultimo. """
    mapa = indice(predicoes, campo)
    contagens = {}
    for caso in casos:
        fatia = caso[campo]
        n, ok = contagens.get(fatia, (0, 0))
        contagens[fatia] = (n + 1, ok + (1 if mapa[caso["id"]] == fatia else 0))
    resultado = OrderedDict()
    for fatia in sorted(contagens):
        resultado[fatia] = contagens[fatia]
    n_total = sum(v[0] for v in contagens.values())
    ok_total = sum(v[1] for v in contagens.values())
    resultado["GERAL"] = (n_total, ok_total)
    return resultado


def comparar(casos, preds_a, preds_b, campo="area"):
    """ Estrutura: {fatia: {n, a, b, delta}} com GERAL por ultimo. """
    verificar_contrato(casos, preds_a, campo)
    verificar_contrato(casos, preds_b, campo)
    fatias_a = acuracia_por_fatia(casos, preds_a, campo)
    fatias_b = acuracia_por_fatia(casos, preds_b, campo)
    res = OrderedDict()
    for fatia in fatias_a:
        n, ok_a = fatias_a[fatia]
        _, ok_b = fatias_b[fatia]
        acc_a = ok_a / n if n else 0.0
        acc_b = ok_b / n if n else 0.0
        res[fatia] = {
            "n": n,
            "ok_a": ok_a,
            "ok_b": ok_b,
            "acc_a": acc_a,
            "acc_b": acc_b,
            "delta": acc_b - acc_a,
        }
    return res


def detectar_regressao_oculta(res):
    """ Fatias que pioraram enquanto a agregada nao piorou (delta >= 0). """
    geral = res["GERAL"]["delta"]
    return [
        {"fatia": f, "delta": v["delta"], "n": v["n"]}
        for f, v in res.items()
        if f != "GERAL" and v["delta"] < 0 and geral >= 0
    ]


def _fmt(delta):
    return "%+.3f" % delta


def formatar_tabela(res, campo, origem_a, origem_b):
    linhas = [
        "scorer=metricas.py fatia=%s casos=%d" % (campo, res["GERAL"]["n"]),
        "A=%s" % origem_a,
        "B=%s" % origem_b,
        "%-12s %5s %-9s %-9s %s" % (campo, "n", "A", "B", "delta"),
    ]
    for fatia, v in res.items():
        linhas.append(
            "%-12s %5d %4d/%-4d %4d/%-4d %s"
            % (fatia, v["n"], v["ok_a"], v["n"], v["ok_b"], v["n"], _fmt(v["delta"]))
        )
    ocultas = detectar_regressao_oculta(res)
    if ocultas:
        partes = ", ".join(
            "%s (%s, n=%d)" % (o["fatia"], _fmt(o["delta"]), o["n"]) for o in ocultas
        )
        linhas.append(
            "VEREDITO: agregada %s COM regressao de fatia: %s"
            % (_fmt(res["GERAL"]["delta"]), partes)
        )
        linhas.append("FLAG_REGRESSAO_ESCONDIDA=1")
    else:
        linhas.append("VEREDITO: nenhuma regressao de fatia oculta pela agregada")
        linhas.append("FLAG_REGRESSAO_ESCONDIDA=0")
    return "\n".join(linhas)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)
    comp = sub.add_parser("comparar", help="compara duas variantes (A vs B)")
    comp.add_argument("--casos", required=True)
    comp.add_argument("--A", required=True)
    comp.add_argument("--B", required=True)
    comp.add_argument("--fatia", default="area")
    comp.add_argument("--json", action="store_true")
    comp.add_argument("--fail-on-regressao", action="store_true")
    args = parser.parse_args(argv)

    casos = carregar(args.casos, "casos")
    preds_a = carregar(args.A, "predicoes")
    preds_b = carregar(args.B, "predicoes")
    res = comparar(casos, preds_a, preds_b, args.fatia)
    if args.json:
        payload = {"resultado": res, "regressao_oculta": detectar_regressao_oculta(res)}
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(formatar_tabela(res, args.fatia, args.A, args.B))
    if args.fail_on_regressao and detectar_regressao_oculta(res):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
