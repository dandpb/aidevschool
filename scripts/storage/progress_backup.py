#!/usr/bin/env python3
"""Envelope de integridade (sha256) para backups de progresso do learner.

Ferramenta da camada de storage (plano AID-2876, spike AID-2884): o app
LiteracyDojo exporta o LearnerProgress como JSON puro (`Baixar backup JSON`).
Este CLI adiciona o recibo verificável — checksum sha256 no formato GNU
coreutils (`sha256sum -c` compatible) — e um check estrutural de corrupção
antes da restauração.

Contratos (docs/runbooks/LEARNER_PROGRESS_BACKUP.md):
- `seal FILE`   : grava `FILE.sha256` e imprime o recibo.
- `verify FILE` : recalcula o sha256, compara com o sidecar (ou `--expect`),
                  valida a forma do JSON e sai 0 somente se tudo bate.
- `info FILE`   : resumo legível do estado no backup (sem tocar no navegador).

A camada de storage preserva evidência, nunca avalia: nenhum comando aqui
marca lição, skill ou mastery — o teto do produtor continua `completed`.
Local-first permanece: o arquivo é do learner, no aparelho do learner.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

SCHEMA_VERSIONS_MIGRABLE = {1, 2, 3, 4}
READ_SIZE = 1 << 20


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(READ_SIZE):
            digest.update(chunk)
    return digest.hexdigest()


def load_backup(path: Path) -> dict:
    """Carrega e valida a forma base do LearnerProgress (espelha migration.ts)."""
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise ValueError(f"JSON ilegível: {error}") from error
    if not isinstance(doc, dict):
        raise ValueError("backup não é um objeto JSON")
    version = doc.get("schemaVersion")
    if version not in SCHEMA_VERSIONS_MIGRABLE:
        raise ValueError(
            f"schemaVersion {version!r} (esperado um de {sorted(SCHEMA_VERSIONS_MIGRABLE)})"
        )
    for field in ("lessonStatus", "skills", "streak"):
        if not isinstance(doc.get(field), dict):
            raise ValueError(f"forma inválida: campo {field!r} ausente ou não-objeto")
    onboarding = doc.get("onboarding")
    if not isinstance(onboarding, dict) or not isinstance(
        onboarding.get("completed"), bool
    ):
        raise ValueError("forma inválida: onboarding.completed ausente ou não-booleano")
    mastered = [
        lesson_id
        for lesson_id, status in doc["lessonStatus"].items()
        if status == "mastered"
    ]
    if mastered:
        raise ValueError(
            f"status 'mastered' proibido em backup do produtor (lições: {mastered})"
        )
    return doc


def cmd_seal(args: argparse.Namespace) -> int:
    path: Path = args.file
    if not path.is_file():
        print(f"erro: arquivo não encontrado: {path}", file=sys.stderr)
        return 2
    try:
        load_backup(path)
    except ValueError as error:
        print(f"erro: backup inválido, nada selado: {error}", file=sys.stderr)
        return 1
    checksum = sha256_of(path)
    sidecar = path.with_name(path.name + ".sha256")
    sidecar.write_text(f"{checksum}  {path.name}\n", encoding="utf-8")
    print(f"sealed\t{path.name}\tsha256={checksum}")
    print(f"sidecar\t{sidecar}")
    return 0


def cmd_verify(args: argparse.Namespace) -> int:
    path: Path = args.file
    if not path.is_file():
        print(f"erro: arquivo não encontrado: {path}", file=sys.stderr)
        return 2
    try:
        load_backup(path)
    except ValueError as error:
        print(f"FAIL estrutura\t{path.name}\t{error}", file=sys.stderr)
        return 1
    actual = sha256_of(path)
    if args.expect:
        expected, source = args.expect, "--expect"
    else:
        sidecar = path.with_name(path.name + ".sha256")
        if not sidecar.is_file():
            print(
                f"erro: sidecar ausente: {sidecar} (rode `seal` ou passe --expect)",
                file=sys.stderr,
            )
            return 2
        expected = sidecar.read_text(encoding="utf-8").split()[0].strip()
        source = sidecar.name
    if actual != expected.lower():
        print(
            f"FAIL checksum\t{path.name}\tesperado={expected} recalculado={actual}",
            file=sys.stderr,
        )
        return 1
    print(f"OK\t{path.name}\tsha256={actual}\tfonte={source}")
    return 0


def cmd_info(args: argparse.Namespace) -> int:
    path: Path = args.file
    try:
        doc = load_backup(path)
    except ValueError as error:
        print(f"erro: {error}", file=sys.stderr)
        return 1
    statuses = doc["lessonStatus"]
    completed = sum(1 for status in statuses.values() if status == "completed")
    streak = doc["streak"]
    print(f"arquivo\t{path.name}")
    print(f"sha256\t{sha256_of(path)}")
    print(f"schemaVersion\t{doc.get('schemaVersion')}")
    print(f"contentVersion\t{doc.get('contentVersion')}")
    print(f"currentLessonId\t{doc.get('currentLessonId')}")
    print(f"lições completed\t{completed}/{len(statuses)}")
    print(f"xp\t{doc.get('xp')}")
    print(
        f"streak\tcurrent={streak.get('current')} longest={streak.get('longest')} "
        f"last={streak.get('lastActivityDate', '-')}"
    )
    print(f"skills praticadas\t{len(doc['skills'])}")
    print(f"conquistas\t{len(doc.get('achievements', []))}")
    print(f"aplicações reais\t{len(doc.get('applications', []))}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="progress_backup.py",
        description="Envelope sha256 para backups de progresso do LiteracyDojo (AID-2884).",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    seal = sub.add_parser("seal", help="grava o sidecar FILE.sha256 com o sha256 do backup")
    seal.add_argument("file", type=Path)
    seal.set_defaults(func=cmd_seal)

    verify = sub.add_parser("verify", help="verifica checksum + estrutura; sai 0 se íntegro")
    verify.add_argument("file", type=Path)
    verify.add_argument(
        "--expect",
        help="sha256 esperado em vez do sidecar (útil em outro aparelho)",
    )
    verify.set_defaults(func=cmd_verify)

    info = sub.add_parser("info", help="resumo do estado guardado no backup")
    info.add_argument("file", type=Path)
    info.set_defaults(func=cmd_info)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
