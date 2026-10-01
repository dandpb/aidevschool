#!/usr/bin/env python3
"""Verificador mecânico de formato do pedido de 5 campos (pg-d02).

Uso (a partir do diretório do pacote, sem rede):

    python3 insumos/verifica_pedido.py pedido.md             # 5 campos
    python3 insumos/verifica_pedido.py --caminhos pedido.md  # CONTEXTO por caminho

Checagens (rúbrica c1 e c2): campos rotulados presentes uma vez cada,
conteúdo não-vazio, limite de concisão, ACEITE com comando executável e,
em --caminhos, cada caminho de arquivo citado no CONTEXTO resolve na
árvore local. Exit 0 = tudo verde; exit 1 = há falhas listadas;
exit 2 = uso inválido.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

CAMPOS = ("CONTEXTO", "OBJETIVO", "RESTRIÇÕES", "ACEITE", "NÃO-META")
MAX_LINHAS_CAMPO = 6
MAX_LINHAS_ARQUIVO = 30
_PATH_RE = re.compile(r"[\w./-]+\.(?:py|md|json|ya?ml|ts)")


def blocos(linhas: list[str]) -> dict[str, list[str]]:
    """Divide o arquivo em blocos {campo: linhas de conteúdo}."""
    out: dict[str, list[str]] = {}
    atual: str | None = None
    for linha in linhaS_limpa(linhas):
        campo = next((c for c in CAMPOS if linha.startswith(c + ":")), None)
        if campo:
            atual = campo
            out.setdefault(atual, [])
            resto = linha[len(campo) + 1:].strip()
            if resto:
                out[atual].append(resto)
        elif atual:
            out[atual].append(linha)
    return out


def linhaS_limpa(linhas: list[str]) -> list[str]:
    return [l.rstrip() for l in linhas]


def repo_root() -> Path:
    for pai in Path(__file__).resolve().parents:
        if (pai / ".git").exists():
            return pai
    return Path.cwd()


def main(argv: list[str]) -> int:
    args = [a for a in argv if a != "--caminhos"]
    so_caminhos = "--caminhos" in argv
    if len(args) != 1:
        print("uso: verifica_pedido.py [--caminhos] pedido.md", file=sys.stderr)
        return 2
    arquivo = Path(args[0])
    if not arquivo.is_file():
        print(f"erro: arquivo não encontrado: {arquivo}", file=sys.stderr)
        return 2

    linhas = arquivo.read_text(encoding="utf-8").splitlines()
    rotulados = [l for l in linhas for c in CAMPOS if l.startswith(c + ":")]
    falhas: list[str] = []
    bloco = blocos(linhas)

    if so_caminhos:
        contexto = " ".join(bloco.get("CONTEXTO", []))
        caminhos = sorted(set(_PATH_RE.findall(contexto)))
        if not caminhos:
            falhas.append("CONTEXTO não cita nenhum caminho de arquivo")
        raiz = repo_root()
        for caminho in caminhos:
            alvo = raiz / caminho
            if alvo.is_file():
                print(f"ok caminho {caminho}")
            else:
                falhas.append(f"caminho citado não resolve na árvore: {caminho}")
    else:
        for campo in CAMPOS:
            conteudo = [l for l in bloco.get(campo, []) if l.strip()]
            if not conteudo:
                falhas.append(f"campo vazio ou ausente: {campo}")
            elif len(conteudo) > MAX_LINHAS_CAMPO:
                falhas.append(
                    f"{campo}: {len(conteudo)} linhas (máx {MAX_LINHAS_CAMPO})"
                )
        nao_vazias = [l for l in linhas if l.strip()]
        if len(nao_vazias) > MAX_LINHAS_ARQUIVO:
            falhas.append(
                f"pedido com {len(nao_vazias)} linhas não-vazias (máx {MAX_LINHAS_ARQUIVO})"
            )
        aceite = " ".join(bloco.get("ACEITE", []))
        if aceite and not ("python3" in aceite or "pytest" in aceite):
            falhas.append("ACEITE não contém comando executável (python3/pytest)")
        presentes = sum(1 for c in CAMPOS if bloco.get(c))
        print(f"campos: {presentes}/5")

    for falta in falhas:
        print(f"FALHA {falta}")
    print("veredito: " + ("met" if not falhas else "not_met"))
    return 0 if not falhas else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
