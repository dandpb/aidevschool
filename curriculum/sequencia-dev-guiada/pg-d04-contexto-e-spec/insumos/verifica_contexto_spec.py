#!/usr/bin/env python3
"""Verificador mecânico de formato do pacote contexto+PRD+SPEC (pg-d04).

Uso (a partir do diretório do pacote, sem rede):

    python3 insumos/verifica_contexto_spec.py <dir-da-sua-entrega>

Onde <dir-da-sua-entrega> contém `CONTEXTO.md`, `PRD.md` e `SPEC.md`
(os três obrigatórios).

Checagens (piso mecânico das rúbricas c1–c6; a rúbrica revisa substância
acima deste piso):

  contexto   — duas tabelas (Incluído/Excluído), ≥2 linhas cada, cada linha
               com justificativa (≥3 palavras na 2ª coluna);
  resolve    — todo caminho citado consta do inventário fictício
               (`insumos/inventario-repo.txt`);
  ruído      — categorias do checklist M4 §4.2 (dependências, builds,
               lockfiles, logs sem recorte, segredos, views geradas, .git)
               nunca na tabela Incluído;
  prd        — seções do PRD mínimo (M5 §5.1) presentes e não-vazias;
  limite     — PRD declara o limite de 30 min da tarefa;
  fora       — Fora de escopo com ≥2 itens (o pedido embute ≥2 extras);
  aceite     — ≥3 critérios `- [ ]`, cada um ≥4 palavras, ≥1 com comando
               executável (python3/pytest);
  spec       — Interface com código, ≥3 casos de borda numerados, Arquivos
               permitidos resolvendo no inventário, Não-metas, estratégia
               de teste/ordem;
  bordas     — SPEC decide B1 (ciclo), B2 (dependência inexistente) e
               B3 (lista vazia).

Exit 0 = veredito `met`; exit 1 = `not_met` (falhas listadas); exit 2 = uso
inválido. Determinístico e offline (stdlib).
"""

from __future__ import annotations

import re
import sys
import unicodedata
from pathlib import Path

ARQUIVOS = ("CONTEXTO.md", "PRD.md", "SPEC.md")
PRD_SECOES = (
    "Problema",
    "Usuario",
    "Objetivo",
    "Escopo",
    "Fora de escopo",
    "Criterios de aceite",
)
MIN_ITENS_TABELA = 2
MIN_PALAVRAS_JUSTIFICATIVA = 3
MIN_FORA_DE_ESCOPO = 2
MIN_ACEITE = 3
MIN_PALAVRAS_ACEITE = 4
MIN_BORDAS = 3
BANIDOS = (
    "node_modules",
    ".venv",
    "build/",
    "package-lock.json",
    ".env",
    ".git",
    "logs/",
    ".view.md",
)
_PATH_RE = re.compile(r"[\w./-]+/?")
_GLYPH_RE = re.compile(r"^[│├└─\s]+")


def sem_acento(texto: str) -> str:
    norm = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in norm if not unicodedata.combining(c)).lower()


def secoes(linhas: list[str]) -> dict[str, list[str]]:
    """Divide o arquivo em {título normalizado: linhas até o próximo ##}."""
    out: dict[str, list[str]] = {}
    atual: str | None = None
    for linha in linhas:
        m = re.match(r"^#{2,3}\s+(.+?)\s*$", linha)
        if m:
            atual = sem_acento(m.group(1))
            out.setdefault(atual, [])
        elif atual:
            out[atual].append(linha)
    return out


def achar(secoes: dict[str, list[str]], pedaco: str) -> tuple[str, list[str]] | None:
    pedaco = sem_acento(pedaco)
    for titulo, corpo in secoes.items():
        if pedaco in titulo:
            return titulo, corpo
    return None


def linhas_tabela(corpo: list[str]) -> list[list[str]]:
    """Linhas de tabela markdown (| a | b |) com células limpas.

    A linha imediatamente anterior a um separador (| --- | --- |) é o
    cabeçalho e é descartada.
    """
    linhas_cruas = [l for l in corpo if l.strip().startswith("|")]
    celulas: list[list[str]] = []
    for linha in linhas_cruas:
        partes = [p.strip() for p in linha.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-{2,}:?", p) for p in partes if p):
            if celulas:
                celulas.pop()  # a linha anterior era o cabeçalho
            continue
        if len(partes) >= 2:
            celulas.append(partes)
    return celulas


def itens_lista(corpo: list[str]) -> list[str]:
    return [
        re.sub(r"^[-*\d.)\[\]x\s]+", "", l.strip())
        for l in corpo
        if re.match(r"^\s*[-*]\s+", l)
    ]


def caminhos(texto: str) -> list[str]:
    brutos = _PATH_RE.findall(texto)
    return [c for c in brutos if re.search(r"\w", c) and ("." in c or c.endswith("/"))]


def ler_inventario(caminho: Path) -> set[str]:
    """Extrai caminhos planos do tree fictício (sem glifos, sem / final)."""
    base = set()
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        limpa = _GLYPH_RE.sub("", linha).strip()
        if not limpa or limpa.startswith("#") or limpa.startswith("="):
            continue
        m = re.match(r"^([\w./-]+)", limpa)
        if m:
            base.add(m.group(1).rstrip("/"))
    return base


def resolve(caminho: str, inventario: set[str]) -> bool:
    alvo = caminho.removeprefix("./").rstrip("/")
    if not alvo:
        return False
    for item in inventario:
        if alvo == item or item.startswith(alvo + "/") or alvo.startswith(item + "/"):
            return True
    return False


def verificar(dir_entrega: Path, inventario: Path) -> list[str]:
    falhas: list[str] = []
    textos = {}
    for nome in ARQUIVOS:
        alvo = dir_entrega / nome
        if not alvo.is_file():
            print(f"FALHA arquivo ausente: {nome}")
            falhas.append(f"arquivo ausente: {nome}")
            textos[nome] = []
        else:
            textos[nome] = alvo.read_text(encoding="utf-8").splitlines()

    invent = ler_inventario(inventario)

    # --- CONTEXTO: duas tabelas com justificativa --------------------------
    sec = secoes(textos.get("CONTEXTO.md", []))
    tabelas: dict[str, list[list[str]]] = {}
    for rotulo, pedaco in (("incluido", "inclu"), ("excluido", "exclu")):
        achado = achar(sec, pedaco)
        if not achado:
            print(f"FALHA contexto: seção '{rotulo}' ausente (precisa de duas tabelas)")
            falhas.append(f"contexto: seção {rotulo} ausente")
            tabelas[rotulo] = []
        else:
            tabelas[rotulo] = linhas_tabela(achado[1])
            if len(tabelas[rotulo]) < MIN_ITENS_TABELA:
                print(
                    f"FALHA contexto/{rotulo}: {len(tabelas[rotulo])} linha(s) de "
                    f"tabela (mín {MIN_ITENS_TABELA})"
                )
                falhas.append(f"contexto/{rotulo}: poucas linhas")
            for row in tabelas[rotulo]:
                just = row[1] if len(row) > 1 else ""
                if len(just.split()) < MIN_PALAVRAS_JUSTIFICATIVA:
                    print(
                        f"FALHA contexto/{rotulo}: linha '{row[0]}' sem "
                        f"justificativa (≥{MIN_PALAVRAS_JUSTIFICATIVA} palavras)"
                    )
                    falhas.append(f"contexto/{rotulo}: sem justificativa")

    # --- resolve + ruído (só na tabela Incluído/Excluído: resolve em ambas) -
    for rotulo in ("incluido", "excluido"):
        for row in tabelas.get(rotulo, []):
            for cam in caminhos(row[0]):
                if not resolve(cam, invent):
                    print(f"FALHA contexto/{rotulo}: caminho fora do inventário: {cam}")
                    falhas.append(f"contexto/{rotulo}: fora do inventário: {cam}")
                if rotulo == "incluido":
                    norma = sem_acento(cam)
                    for proibido in BANIDOS:
                        if sem_acento(proibido) in norma:
                            print(
                                f"FALHA contexto/incluido: categoria de exclusão "
                                f"do checklist M4 §4.2 citada como incluída: {cam}"
                            )
                            falhas.append(f"contexto/incluido: ruído incluído: {cam}")
                            break

    # --- PRD ---------------------------------------------------------------
    prd = secoes(textos.get("PRD.md", []))
    prd_texto = "\n".join(textos.get("PRD.md", []))
    for nome_secao in PRD_SECOES:
        alvo = achar(prd, nome_secao)
        if not alvo:
            print(f"FALHA prd: seção ausente: {nome_secao}")
            falhas.append(f"prd: seção ausente: {nome_secao}")
        elif not [l for l in alvo[1] if l.strip()]:
            print(f"FALHA prd: seção vazia: {nome_secao}")
            falhas.append(f"prd: seção vazia: {nome_secao}")

    if not re.search(r"30\s*min", prd_texto, re.IGNORECASE):
        print("FALHA prd: limite da tarefa (30 min) não declarado")
        falhas.append("prd: limite 30 min ausente")

    fora = achar(prd, "fora de escopo")
    itens_fora = itens_lista(fora[1]) if fora else []
    if len(itens_fora) < MIN_FORA_DE_ESCOPO:
        print(
            f"FALHA prd: Fora de escopo com {len(itens_fora)} item(ns) "
            f"(mín {MIN_FORA_DE_ESCOPO} extras embutidos no pedido)"
        )
        falhas.append("prd: fora de escopo insuficiente")

    aceite = achar(prd, "criterios de aceite")
    checkboxes = (
        [l for l in aceite[1] if re.match(r"^\s*-\s*\[\s*\]\s+", l)] if aceite else []
    )
    if len(checkboxes) < MIN_ACEITE:
        print(f"FALHA prd: {len(checkboxes)} critério(s) de aceite (mín {MIN_ACEITE})")
        falhas.append("prd: poucos critérios de aceite")
    curtos = [
        c
        for c in checkboxes
        if len(re.sub(r"^\s*-\s*\[\s*\]\s+", "", c).split()) < MIN_PALAVRAS_ACEITE
    ]
    if curtos:
        print(f"FALHA prd: aceite vago (<{MIN_PALAVRAS_ACEITE} palavras): {curtos[0].strip()}")
        falhas.append("prd: aceite vago")
    if checkboxes and not any(
        "python3" in c or "pytest" in c for c in checkboxes
    ):
        print("FALHA prd: nenhum critério de aceite cita comando executável (python3/pytest)")
        falhas.append("prd: aceite sem comando executável")

    # --- SPEC ---------------------------------------------------------------
    spec = secoes(textos.get("SPEC.md", []))
    spec_texto = sem_acento("\n".join(textos.get("SPEC.md", [])))

    interface = achar(spec, "interface")
    if not interface:
        print("FALHA spec: seção Interface ausente")
        falhas.append("spec: interface ausente")
    elif "```" not in "\n".join(interface[1]):
        print("FALHA spec: Interface sem bloco de código (assinatura exata)")
        falhas.append("spec: interface sem código")

    borda = achar(spec, "borda")
    numeradas = (
        [l for l in borda[1] if re.match(r"^\s*\d+[.)]\s+", l)] if borda else []
    )
    if len(numeradas) < MIN_BORDAS:
        print(f"FALHA spec: {len(numeradas)} caso(s) de borda numerado(s) (mín {MIN_BORDAS}: B1/B2/B3)")
        falhas.append("spec: bordas insuficientes")

    permitidos = achar(spec, "permitido")
    caminhos_permitidos = (
        [c for l in permitidos[1] for c in caminhos(l)] if permitidos else []
    )
    if not caminhos_permitidos:
        print("FALHA spec: Arquivos permitidos sem caminhos (allowlist)")
        falhas.append("spec: sem allowlist")
    for cam in caminhos_permitidos:
        if not resolve(cam, invent):
            print(f"FALHA spec: arquivo permitido fora do inventário: {cam}")
            falhas.append(f"spec: permitido fora do inventário: {cam}")

    nao_metas = achar(spec, "meta")
    itens_nm = itens_lista(nao_metas[1]) if nao_metas else []
    if not itens_nm:
        print("FALHA spec: Não-metas ausente ou sem itens")
        falhas.append("spec: não-metas ausentes")

    if not (achar(spec, "estrategia de teste") or achar(spec, "ordem de implementacao") or achar(spec, "teste")):
        print("FALHA spec: sem Estratégia de teste / Ordem de implementação")
        falhas.append("spec: sem estratégia de teste")

    # --- bordas fechadas (B1/B2/B3) -----------------------------------------
    if "ciclo" not in spec_texto:
        print("FALHA spec/bordas: B1 (ciclo em depends_on) não decidida")
        falhas.append("spec: B1 ciclo não decidido")
    if not (
        "dependencia" in spec_texto
        and any(p in spec_texto for p in ("desconhecid", "inexist", "invalid"))
    ):
        print("FALHA spec/bordas: B2 (dependência inexistente) não decidida")
        falhas.append("spec: B2 dependência inexistente não decidida")
    if "vazi" not in spec_texto:
        print("FALHA spec/bordas: B3 (lista vazia) não decidida")
        falhas.append("spec: B3 lista vazia não decidida")

    return falhas


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("uso: verifica_contexto_spec.py <dir-com CONTEXTO.md PRD.md SPEC.md>", file=sys.stderr)
        return 2
    dir_entrega = Path(argv[0])
    if not dir_entrega.is_dir():
        print(f"erro: diretório não encontrado: {dir_entrega}", file=sys.stderr)
        return 2
    inventario = Path(__file__).resolve().parent / "inventario-repo.txt"
    if not inventario.is_file():
        print(f"erro: inventário não encontrado: {inventario}", file=sys.stderr)
        return 2

    falhas = verificar(dir_entrega, inventario)
    print(f"falhas: {len(falhas)}")
    print("veredito: " + ("met" if not falhas else "not_met"))
    return 0 if not falhas else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
