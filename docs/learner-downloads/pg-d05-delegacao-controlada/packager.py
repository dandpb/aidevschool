#!/usr/bin/env python3
"""Empacotador deterministico dos downloads em etapas do kit pg-d05-delegacao-controlada.

AID-3668. Somente stdlib. Le `source/pg-d05-delegacao-controlada/` (vendored,
byte-identico ao pin PR646@f7e3228a80cecc68e426e7d59d080a234d249104) e
produz um ZIP cumulativo por etapa em `zips/`.

Determinismo: mesma entrada => mesmos bytes de saida (ordem ordenada,
timestamps fixos, modos fixos, deflate nivel 9). Duas construcoes
independentes produzem o mesmo SHA256 por arquivo (verificado por
`verify_kit.py --check-repro`).

Uso:
  python3 packager.py --out zips
"""
import argparse
import hashlib
import json
import sys
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
FIXED_DATE = (1980, 1, 1, 0, 0, 0)
ZIP_ROOT = "pg-d05"
PACKAGE = "pg-d05-delegacao-controlada"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_json(path: Path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def read_kit_file(source_dir: Path, rel: str) -> bytes:
    fp = source_dir / rel
    if not fp.is_file():
        raise SystemExit("arquivo ausente na fonte: %s" % rel)
    return fp.read_bytes()


def cumulative_files(stages: list, upto_index: int) -> list:
    files = []
    for stage in stages[: upto_index + 1]:
        files.extend(stage["adds"])
    dup = sorted({f for f in files if files.count(f) > 1})
    if dup:
        raise SystemExit("duplicados entre etapas: %s" % dup)
    return sorted(files)


def render_etapa(stage: dict, previous: dict, files: list, pin: dict) -> bytes:
    added = sorted(stage["adds"])
    lines = [
        "# %s" % stage["name"],
        "",
        "- **Pacote:** pg-d05 — pratica guiada U10/D6+D2 (delegacao controlada)",
        "- **Publico:** %s" % stage["audience"],
        "- **Arquivo:** `%s` (cumulativo: contem as etapas anteriores)" % stage["zip"],
        "",
        "## Proposito",
        "",
        stage["purpose"],
        "",
        "## Limite desta etapa",
        "",
        stage["limit"],
        "",
        "## O que esta etapa adiciona (%d arquivos)" % len(added),
        "",
    ]
    lines.extend("- `%s`" % f for f in added)
    if previous is not None:
        lines += [
            "",
            "Etapa anterior: %s (%s)." % (previous["name"], previous["zip"]),
        ]
    lines += [
        "",
        "## Como comecar",
        "",
        "1. Extraia este ZIP em uma pasta limpa (ele e cumulativo; extrair por",
        "   cima da etapa anterior na mesma pasta tambem funciona).",
        "2. Leia (ou releia) `enunciado.md` e siga a ordem dos passos: contrato",
        "   e plano ANTES do diff do produtor.",
        "3. Confira a integridade com `INVENTARIO.txt` (sha256 por arquivo); as",
        "   ancoras que o enunciado busca no MANIFEST.md do pacote estao la.",
        "",
        "## Disciplina declarada (nao barreira segura)",
        "",
        "A ordem das etapas e disciplina declarada, nao enforcement",
        "criptografico: o kit nao controla quando voce abre cada arquivo e nao",
        "emite nota ou mastery. A separacao existe para proteger o metodo",
        "(produtor != verificador: o gabarito so depois da tentativa). Dados",
        "100% sinteticos; nenhuma eficacia real de agente/aluno e alegada.",
        "",
        "## Proveniencia",
        "",
        "- Fonte imutavel: PR #%d @ `%s` (repo %s), %s" % (
            pin["pullRequest"], pin["commit"], pin["repo"], pin["sourcePath"],
        ),
        "- Construido por `packager.py` (AID-3668), stdlib apenas, ZIP deterministico.",
        "- Inventario exato desta construcao: `INVENTARIO.txt` (%d arquivos do kit)." % len(files),
        "",
    ]
    return ("\n".join(lines)).encode("utf-8")


def render_inventory(stage_id: str, entries: list) -> bytes:
    total = sum(e["bytes"] for e in entries)
    lines = [
        "# INVENTARIO — %s (construcao deterministica)" % stage_id,
        "",
        "%d arquivos do kit, %d bytes no total." % (len(entries), total),
        "Formato: sha256  bytes  caminho (verifique com: sha256sum <caminho>)",
        "",
    ]
    lines.extend(
        "%s  %d  %s" % (e["sha256"], e["bytes"], e["rel"]) for e in entries
    )
    lines.append("")
    return ("\n".join(lines)).encode("utf-8")


def write_entry(zf: zipfile.ZipFile, name: str, data: bytes) -> None:
    info = zipfile.ZipInfo(name, date_time=FIXED_DATE)
    info.create_system = 3
    info.external_attr = (0o755 if name.endswith(".py") else 0o644) << 16
    info.compress_type = zipfile.ZIP_DEFLATED
    zf.writestr(info, data)


def build_zip(dest_dir: Path, stages: list, index: int, source_dir: Path,
              pin: dict) -> dict:
    stage = stages[index]
    previous = stages[index - 1] if index > 0 else None
    kit_files = cumulative_files(stages, index)
    entries = []
    for rel in kit_files:
        data = read_kit_file(source_dir, rel)
        entries.append({"rel": rel, "data": data,
                        "sha256": sha256_bytes(data), "bytes": len(data)})
    zip_path = dest_dir / stage["zip"]
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        write_entry(zf, "%s/ETAPA.md" % ZIP_ROOT,
                    render_etapa(stage, previous, kit_files, pin))
        write_entry(zf, "%s/INVENTARIO.txt" % ZIP_ROOT,
                    render_inventory(stage["id"], entries))
        for e in entries:
            write_entry(zf, "%s/%s" % (ZIP_ROOT, e["rel"]), e["data"])
    return {"zip": stage["zip"], "sha256": sha256_bytes(zip_path.read_bytes()),
            "bytes": zip_path.stat().st_size, "files": len(entries)}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", default="source/pg-d05-delegacao-controlada",
                        help="diretorio do kit vendored (default: source/pg-d05-delegacao-controlada)")
    parser.add_argument("--manifests", default="manifests")
    parser.add_argument("--out", default="zips", help="diretorio de saida dos ZIPs")
    args = parser.parse_args(argv)

    base = HERE
    source_dir = (base / args.source).resolve()
    out_dir = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    stages = load_json(base / args.manifests / "stages.json")["stages"]
    pin = load_json(base / args.manifests / "pin-hashes.json")["sourcePin"]

    pin_hashes = load_json(base / args.manifests / "pin-hashes.json")["files"]
    for rel in cumulative_files(stages, len(stages) - 1):
        expected = pin_hashes.get("%s/%s" % (PACKAGE, rel))
        data = read_kit_file(source_dir, rel)
        if expected is None:
            raise SystemExit("sem hash de pin para: %s" % rel)
        if sha256_bytes(data) != expected["sha256"]:
            raise SystemExit("drift vs pin detectado, abortando: %s" % rel)

    report = [build_zip(out_dir, stages, i, source_dir, pin)
              for i in range(len(stages))]
    for row in report:
        print("%s  %d bytes  %d arquivos  sha256=%s"
              % (row["zip"], row["bytes"], row["files"], row["sha256"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
