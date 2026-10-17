#!/usr/bin/env python3
"""Empacotador deterministico do kit offline pg-d04-contexto-e-spec (U09).

AID-3665. Somente stdlib + git CLI (sem dependencias externas).

Fonte: bytes congelados do head do PR #643
(32888d9f03006f3dbcdaa57811b29c54a2c09146), lidos via `git show` — NUNCA
da working tree. O builder e fail-closed:

  - arquivo-fonte ausente no pin        -> erro, nada e escrito;
  - bytes divergentes do pin (drift)    -> erro, nada e escrito;
  - zip final divergente da allowlist   -> erro, artefato removido.

Saida:
  - projecao byte-identica dos 6 learnerfiles na raiz do kit;
  - zips/pg-d04-contexto-e-spec.zip com EXATAMENTE os 6 arquivos
    (caminhos relativos preservados);
  - manifests/SHA256SUMS.txt (path/hash/bytes do payload learner).

Determinismo: entradas ordenadas, timestamp fixo 1980-01-01, modo 0644,
create_system 0, deflate nivel 9. Duas execucoes produzem o mesmo SHA256.

Uso:
  python3 tools/build-kit.py            # build + verificacao
  python3 tools/build-kit.py --selftest # cenarios negativos (expected-fail)
"""
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
PINS = json.loads((HERE / "manifests" / "pins.json").read_text(encoding="utf-8"))

SOURCE_COMMIT = PINS["source"]["commit"]
SOURCE_PATH = PINS["source"]["sourcePath"]
ALLOW = {e["path"]: e for e in PINS["allowlist"]}
EXCLUDED_PREFIXES = ("guia-de-correcao/",)
EXCLUDED_NAMES = {"MANIFEST.md"}
ZIP_PATH = HERE / PINS["zip"]["path"]
SUMS_PATH = HERE / "manifests" / "SHA256SUMS.txt"
PAYLOAD_EXTRA = ["README.md"]
FIXED_DATE = (1980, 1, 1, 0, 0, 0)


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_show(rel: str) -> bytes:
    """Le bytes congelados do pin; fail-closed se ausente."""
    proc = subprocess.run(
        ["git", "show", "%s:%s/%s" % (SOURCE_COMMIT, SOURCE_PATH, rel)],
        cwd=HERE, capture_output=True,
    )
    if proc.returncode != 0:
        raise SystemExit(
            "FALHA fail-closed: fonte ausente no pin %s: %s\n"
            "Em clone fresco: git fetch origin refs/pull/643/head" % (SOURCE_COMMIT[:12], rel)
        )
    return proc.stdout


def check_pin(rel: str, data: bytes) -> None:
    pin = ALLOW[rel]
    if len(data) != pin["bytes"]:
        raise SystemExit(
            "FALHA fail-closed (drift/bytes): %s tem %d bytes, pin exige %d"
            % (rel, len(data), pin["bytes"])
        )
    digest = sha256_hex(data)
    if digest != pin["sha256"]:
        raise SystemExit(
            "FALHA fail-closed (drift/hash): %s sha256 %s != pin %s"
            % (rel, digest, pin["sha256"])
        )


def gather_inputs(reader=git_show) -> dict:
    inputs = {}
    for rel in sorted(ALLOW):
        data = reader(rel)
        check_pin(rel, data)
        inputs[rel] = data
    return inputs


def project_inputs(inputs: dict) -> None:
    for rel, data in sorted(inputs.items()):
        dest = HERE / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)


def build_zip(inputs: dict) -> None:
    ZIP_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp_fd, tmp_name = tempfile.mkstemp(dir=str(ZIP_PATH.parent), suffix=".zip")
    os.close(tmp_fd)
    try:
        with zipfile.ZipFile(tmp_name, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
            for rel in sorted(inputs):
                info = zipfile.ZipInfo(rel, date_time=FIXED_DATE)
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o644 << 16
                info.create_system = 0
                zf.writestr(info, inputs[rel])
        shutil.move(tmp_name, ZIP_PATH)
    finally:
        if os.path.exists(tmp_name):
            os.remove(tmp_name)


def verify_zip(inputs: dict) -> None:
    with zipfile.ZipFile(ZIP_PATH) as zf:
        names = zf.namelist()
        expected = sorted(inputs)
        if names != expected:
            raise SystemExit(
                "FALHA fail-closed (allowlist do zip): %s != %s" % (names, expected)
            )
        for rel in expected:
            if sha256_hex(zf.read(rel)) != ALLOW[rel]["sha256"]:
                raise SystemExit("FALHA fail-closed (bytes do zip): %s diverge do pin" % rel)
        banned = [
            n for n in names
            if n in EXCLUDED_NAMES or n.startswith(EXCLUDED_PREFIXES)
        ]
        if banned:
            raise SystemExit("FALHA fail-closed (docente no zip): %s" % banned)


def write_sums() -> None:
    lines = []
    payload = sorted(ALLOW) + PAYLOAD_EXTRA + [PINS["zip"]["path"]]
    for rel in payload:
        fp = HERE / rel
        if not fp.is_file():
            raise SystemExit("FALHA fail-closed: payload ausente: %s" % rel)
        data = fp.read_bytes()
        lines.append("%s  %s (%d bytes)" % (sha256_hex(data), rel, len(data)))
    SUMS_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def check_teacher_absent() -> None:
    hits = []
    for root, _dirs, files in os.walk(HERE):
        for name in files:
            rel = (Path(root) / name).relative_to(HERE).as_posix()
            if rel in EXCLUDED_NAMES or rel.startswith(EXCLUDED_PREFIXES):
                hits.append(rel)
    if hits:
        raise SystemExit("FALHA fail-closed (docente na arvore): %s" % hits)


def selftest() -> int:
    """Cenarios negativos com leitores simulados (expected-fail)."""
    def missing_reader(rel: str) -> bytes:
        raise SystemExit("FALHA fail-closed: fonte ausente no pin (simulado): %s" % rel)

    real = git_show

    def drifted_reader(rel: str) -> bytes:
        data = real(rel)
        return data + b"\n" if rel == sorted(ALLOW)[0] else data

    scenarios = [
        ("input ausente", missing_reader),
        ("drift de bytes", drifted_reader),
    ]
    ok = 0
    for name, reader in scenarios:
        try:
            gather_inputs(reader)
            print("[selftest] ERRO: %s passou quando deveria falhar" % name)
        except SystemExit as exc:
            print("[selftest] ok (expected-fail) %s: %s" % (name, exc))
            ok += 1
    print("[selftest] %d/2 cenarios reprovaram como esperado" % ok)
    return 0 if ok == 2 else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args()
    if args.selftest:
        return selftest()
    inputs = gather_inputs()
    project_inputs(inputs)
    build_zip(inputs)
    verify_zip(inputs)
    write_sums()
    check_teacher_absent()
    print("OK: %d arquivos projetados; zip=%s (%d bytes); sums=%s" % (
        len(inputs), PINS["zip"]["path"], ZIP_PATH.stat().st_size,
        SUMS_PATH.relative_to(HERE).as_posix()))
    return 0


if __name__ == "__main__":
    sys.exit(main())
