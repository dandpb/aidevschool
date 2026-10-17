#!/usr/bin/env python3
"""Testes determinísticos (positivos+negativos) do verifica_contexto_spec.py.

Roda offline, stdlib apenas, a partir do diretório do pacote:

    python3 guia-de-correcao/teste_verificador.py

Cada caso executa o verificador real como subprocess e confere exit code +
conteúdo das falhas. Positivo: a solução-modelo passa. Negativos: os quatro
contraexemplos são rejeitados pelas famílias de falha certas (contexto com
ruído/fora do inventário; PRD sem limite/fora de escopo; aceite vago; SPEC
aberta sem allowlist) e o uso inválido devolve 2.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
VERIFICADOR = RAIZ.parent / "insumos" / "verifica_contexto_spec.py"

CASOS = [
    # (nome, args, exit esperado, substrings obrigatórias na saída)
    (
        "positivo: solucao-modelo",
        [str(RAIZ / "solucao")],
        0,
        ["veredito: met", "falhas: 0"],
    ),
    (
        "negativo: contexto com ruido e fora do inventario",
        [str(RAIZ / "contraexemplos" / "01-contexto-ruidoso")],
        1,
        [
            "citada como incluída: node_modules/",
            "citada como incluída: relatorios/plano.view.md",
            "fora do inventário: arquivado/",
            "veredito: not_met",
        ],
    ),
    (
        "negativo: prd sem limite e sem cortes",
        [str(RAIZ / "contraexemplos" / "02-prd-sem-limite")],
        1,
        [
            "limite da tarefa (30 min) não declarado",
            "Fora de escopo com 1 item(ns)",
            "veredito: not_met",
        ],
    ),
    (
        "negativo: aceite vago",
        [str(RAIZ / "contraexemplos" / "03-aceite-vago")],
        1,
        [
            "2 critério(s) de aceite (mín 3)",
            "prd: aceite vago",
            "nenhum critério de aceite cita comando executável",
            "veredito: not_met",
        ],
    ),
    (
        "negativo: spec aberta sem allowlist",
        [str(RAIZ / "contraexemplos" / "04-spec-aberta")],
        1,
        [
            "1 caso(s) de borda numerado(s) (mín 3: B1/B2/B3)",
            "Arquivos permitidos sem caminhos (allowlist)",
            "Não-metas ausente ou sem itens",
            "B1 (ciclo em depends_on) não decidida",
            "B2 (dependência inexistente) não decidida",
            "B3 (lista vazia) não decidida",
            "veredito: not_met",
        ],
    ),
    (
        "negativo: uso invalido",
        [],
        2,
        ["uso:"],
    ),
]


def main() -> int:
    falharam = 0
    for nome, args, exit_esperado, substrings in CASOS:
        proc = subprocess.run(
            [sys.executable, str(VERIFICADOR), *args],
            capture_output=True,
            text=True,
            timeout=30,
        )
        saida = proc.stdout + proc.stderr
        problemas = []
        if proc.returncode != exit_esperado:
            problemas.append(f"exit {proc.returncode} (esperado {exit_esperado})")
        for substr in substrings:
            if substr not in saida:
                problemas.append(f"saída sem trecho esperado: {substr!r}")
        if problemas:
            falharam += 1
            print(f"NAO-PASSOU {nome}: " + "; ".join(problemas))
            print("  saída:", saida.strip().replace("\n", "\n  "))
        else:
            print(f"passou: {nome}")
    total = len(CASOS)
    print(f"{total - falharam} testes passaram" + ("" if falharam else ""))
    if falharam:
        print(f"{falharam} testes NAO passaram")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
