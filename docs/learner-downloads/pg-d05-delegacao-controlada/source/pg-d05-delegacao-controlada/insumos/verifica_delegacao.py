#!/usr/bin/env python3
"""Verificador mecânico de delegação controlada (pg-d05).

Uso (a partir do diretório do pacote, sem rede):

    python3 insumos/verifica_delegacao.py escopo   <patch>       # política do plano
    python3 insumos/verifica_delegacao.py evidencia <recibo.md>  # recibo do controlador
    python3 insumos/verifica_delegacao.py selftest               # prova V&E (congelada)

`escopo` aplica a política estreita do PLANO-APROVADO.md (bloco JSON
"fatia-2") a um diff unificado: caminho fora da allowlist, caminho
proibido, nº de arquivos e linhas alteradas — fail-closed: dif malformado
ou política ausente = exit 2. Saída de veredito + exit 1 quando há
violação (mesma semântica do ciclo 07 do workflow_lab:
fail-closed-narrow-policy).

`evidencia` exige do recibo do controlador: seções V1, V2 e V3, cada uma
com comando, `exit: 0` e saída própria; V3 com a saída EXATA do bloco
"aceite-v3" do plano. Alegação sem execução própria ("verde conforme
produtor") é rejeitada — é o negativo anti-falsa-comprovação.

`selftest` valida o próprio verificador nos dois sentidos (wf 11):
escopo(r1) falha, escopo(r2) passa, evidencia(recibo-falso) falha,
evidencia(recibo-exemplo) passa. Exit 0 somente se todos os quatro
comportarem como esperado.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

PACOTE = Path(__file__).resolve().parent.parent
PLANO = PACOTE / "insumos" / "PLANO-APROVADO.md"


def bloco_json(plano: str, bloco_id: str) -> dict:
    """Extrai o bloco ```json com "id": "<bloco_id>" (fail-closed)."""
    padrao = re.compile(r"```json\s*\n(.*?)```", re.DOTALL)
    for casamento in padrao.finditer(plano):
        try:
            dado = json.loads(casamento.group(1))
        except json.JSONDecodeError:
            continue
        if isinstance(dado, dict) and dado.get("id") == bloco_id:
            return dado
    print(f"erro: bloco json id={bloco_id!r} não encontrado no plano", file=sys.stderr)
    raise SystemExit(2)


def politica() -> dict:
    if not PLANO.is_file():
        print("erro: PLANO-APROVADO.md não encontrado", file=sys.stderr)
        raise SystemExit(2)
    return bloco_json(PLANO.read_text(encoding="utf-8"), "fatia-2")


def aceite_v3() -> list[str]:
    return bloco_json(PLANO.read_text(encoding="utf-8"), "aceite-v3")["esperado"]


def ler_patch(caminho: str) -> dict[str, tuple[int, int]]:
    """Parseia diff unificado → {caminho: (linhas_adicionadas, removidas)}.

    Fail-closed: cabeçalho incompleto, binary ou hunk sem cabeçalho
    levantam SystemExit (o verificador não "adivinha" dif malformado).
    """
    arquivo = Path(caminho)
    if not arquivo.is_file():
        print(f"erro: patch não encontrado: {caminho}", file=sys.stderr)
        raise SystemExit(2)
    if "\x00" in arquivo.read_text(encoding="utf-8"):
        print("erro: patch binário não suportado", file=sys.stderr)
        raise SystemExit(2)
    linhas = arquivo.read_text(encoding="utf-8").splitlines()
    alvos: dict[str, tuple[int, int]] = {}
    alvo: str | None = None
    em_hunk = False
    for i, linha in enumerate(linhas):
        if linha.startswith("diff "):
            em_hunk = False
            alvo = None
            continue
        if linha.startswith("--- ") and not em_hunk:
            seguinte = linhas[i + 1] if i + 1 < len(linhas) else ""
            alvo = None
            if seguinte.startswith("+++ "):
                novo = seguinte[4:].strip()
                if novo != "/dev/null":
                    alvo = novo.removeprefix("b/").strip()
                else:
                    alvo = linha[4:].strip().removeprefix("a/").strip()
                alvos.setdefault(alvo, (0, 0))
            continue
        if linha.startswith("+++ ") and not em_hunk:
            continue
        if alvo is None:
            if linha.startswith(("diff ", "index ", "new file mode", "old mode", "rename ", "similarity", "deleted file mode")):
                continue
            if linha.strip():
                print("erro: diff malformado (linha fora de hunk)", file=sys.stderr)
            raise SystemExit(2)
            continue
        if linha.startswith("@@"):
            em_hunk = True
            continue
        base = alvos[alvo]
        alvos[alvo] = (base[0] + (1 if linha.startswith("+") else 0),
                       base[1] + (1 if linha.startswith("-") else 0))
    if not alvos:
        print("erro: diff sem arquivos declarados", file=sys.stderr)
        raise SystemExit(2)
    return alvos


def cmd_escopo(argv: list[str]) -> int:
    if len(argv) != 1:
        print("uso: verifica_delegacao.py escopo <patch>", file=sys.stderr)
        return 2
    regras = politica()
    alvos = ler_patch(argv[0])
    falhas: list[str] = []
    for caminho in sorted(alvos):
        adicionadas, removidas = alvos[caminho]
        if caminho in regras["proibidos"]:
            falhas.append(f"proibido: {caminho} (suíte existente é contrato)")
        elif caminho not in regras["permitidos"]:
            falhas.append(f"fora da allowlist: {caminho}")
        else:
            print(f"ok escopo {caminho} (+{adicionadas} -{removidas})")
    if len(alvos) > regras["max_arquivos"]:
        falhas.append(f"{len(alvos)} arquivos no diff (máx {regras['max_arquivos']})")
    total = sum(a + r for a, r in alvos.values())
    if total > regras["max_linhas_alteradas"]:
        falhas.append(f"{total} linhas alteradas (máx {regras['max_linhas_alteradas']})")
    for falta in falhas:
        print(f"FALHA {falta}")
    print("escopo: " + ("REPROVADO" if falhas else "APROVADO"))
    return 1 if falhas else 0


def _secao(recibo: str, rotulo: str) -> str:
    casamento = re.search(rf"## {rotulo}\b(.*?)(?=\n## |\Z)", recibo, re.DOTALL)
    return casamento.group(1) if casamento else ""


def cmd_evidencia(argv: list[str]) -> int:
    if len(argv) != 1:
        print("uso: verifica_delegacao.py evidencia <recibo.md>", file=sys.stderr)
        return 2
    arquivo = Path(argv[0])
    if not arquivo.is_file():
        print(f"erro: recibo não encontrado: {argv[0]}", file=sys.stderr)
        return 2
    recibo = arquivo.read_text(encoding="utf-8")
    falhas: list[str] = []
    for rotulo in ("V1", "V2", "V3"):
        secao = _secao(recibo, rotulo)
        if not secao:
            falhas.append(f"seção {rotulo} ausente")
            continue
        if "comando:" not in secao:
            falhas.append(f"{rotulo}: sem comando registrado")
        if "exit: 0" not in secao:
            falhas.append(f"{rotulo}: sem exit 0 registrado (alegação não é evidência)")
    for linha_esperada in aceite_v3():
        if linha_esperada not in _secao(recibo, "V3"):
            falhas.append(f"V3: saída diverge do aceite congelado: {linha_esperada!r}")
    if "conforme produtor" in recibo or "informou o produtor" in recibo:
        falhas.append("recibo cita saída do produtor como evidência (produtor ≠ verificador)")
    for falta in falhas:
        print(f"FALHA {falta}")
    print("evidencia: " + ("REPROVADO" if falhas else "APROVADO"))
    return 1 if falhas else 0


def cmd_selftest() -> int:
    """Prova congelada p/ V&E: positivos E negativo anti-falsa-comprovação."""
    casos = [
        ("escopo r1 (deve REPROVAR)", ["escopo", "insumos/delegacao-r1/diff-r1.patch"], 1),
        ("escopo r2 (deve APROVAR)", ["escopo", "insumos/delegacao-r2/diff-r2.patch"], 0),
        ("evidencia recibo-falso (deve REPROVAR — negativo)",
         ["evidencia", "guia-de-correcao/exemplos/recibo-falso.md"], 1),
        ("evidencia recibo-exemplo (deve APROVAR)",
         ["evidencia", "guia-de-correcao/recibo-exemplo/recibo-aceite-r2.md"], 0),
    ]
    falhas = 0
    for nome, args, esperado in casos:
        resultado = subprocess.run(
            [sys.executable, str(Path(__file__).resolve()), *args],
            capture_output=True, text=True, cwd=PACOTE, check=False,
        )
        ok = (resultado.returncode == esperado) and (
            ("REPROVADO" in resultado.stdout) if esperado == 1 else ("APROVADO" in resultado.stdout)
        )
        print(f"{'ok' if ok else 'FALHA'} selftest {nome} (exit={resultado.returncode})")
        falhas += 0 if ok else 1
    print(f"selftest: {'REPROVADO' if falhas else 'APROVADO'} (4 sondas)")
    return 1 if falhas else 0


def main(argv: list[str]) -> int:
    if not argv:
        print("uso: verifica_delegacao.py escopo|evidencia|selftest ...", file=sys.stderr)
        return 2
    comando, resto = argv[0], argv[1:]
    if comando == "escopo":
        return cmd_escopo(resto)
    if comando == "evidencia":
        return cmd_evidencia(resto)
    if comando == "selftest":
        return cmd_selftest()
    print(f"erro: comando desconhecido: {comando}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
