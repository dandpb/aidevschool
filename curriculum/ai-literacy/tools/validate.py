#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

if not __package__:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    __package__ = "tools"

from .compiler import PUBLIC_JOURNEY, compile_track, compile_verifier_corpus
from .schema import SchemaResolver, validate_against_schema
from .semantic import validate_track

TRACK_DIR = Path(__file__).resolve().parent.parent


def _parse_arguments(argv):
    parser = argparse.ArgumentParser(description="Valida a trilha ai-literacy e opcionalmente compila o read model TypeScript.")
    parser.add_argument("--track", default=str(TRACK_DIR), help="diretório da trilha (padrão: curriculum/ai-literacy)")
    parser.add_argument("--compile", metavar="OUTDIR", default=None, help="gera OUTDIR/lessons.ts após validação bem-sucedida")
    parser.add_argument(
        "--compile-verifier",
        metavar="OUTDIR",
        default=None,
        help="gera OUTDIR/literacy-corpus.mjs (corpus do verificador independente hospedado, AID-449)",
    )
    return parser.parse_args(argv)


def _print_errors(errors):
    print("VALIDAÇÃO FALHOU — %d erro(s):" % len(errors), file=sys.stderr)
    for err in errors:
        print("  - %s" % err, file=sys.stderr)


def main(argv=None):
    args = _parse_arguments(argv)
    track_dir = Path(args.track)
    errors, ready, catalog = validate_track(track_dir)
    out_path = None
    corpus_path = None
    if not errors and args.compile:
        errors, out_path = compile_track(track_dir, args.compile, validated=(errors, ready, catalog))
    if not errors and args.compile_verifier:
        errors, corpus_path = compile_verifier_corpus(
            track_dir, args.compile_verifier, validated=(errors, ready, catalog)
        )

    if errors:
        _print_errors(errors)
        return 1

    planned = sum(1 for entry in (catalog or {}).get("lessons", []) if entry.get("status") == "planned")
    journey_by_module = {
        module["id"]: module["journey"] for module in (catalog or {}).get("modules", [])
    }
    public_ready = sum(
        1 for lesson in ready if journey_by_module[lesson["moduleId"]] == PUBLIC_JOURNEY
    )
    print(
        "OK: %d lição(ões) ready validadas: %d IA na Prática, %d Dev; "
        "%d planned (sem arquivo exigido)."
        % (len(ready), public_ready, len(ready) - public_ready, planned)
    )
    if out_path is not None:
        print("Read model gerado: %s" % out_path)
    if corpus_path is not None:
        print("Verifier corpus gerado: %s" % corpus_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
