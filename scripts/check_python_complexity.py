#!/usr/bin/env python3

# ─── How to run ───
# 1. Install project development dependencies:
#      python3 -m pip install -e '.[dev]'
# 2. Run:
#      python3 scripts/check_python_complexity.py --max 8 <file-or-directory>
# ──────────────────

from __future__ import annotations

import argparse
import json
from collections.abc import Iterable, Sequence
from pathlib import Path
import subprocess
import sys
from typing import Final


IGNORED_DIRECTORIES: Final = frozenset(
    {"__pycache__", ".mypy_cache", ".pytest_cache", ".ruff_cache", "tests"}
)
MEASURED_BLOCK_TYPES: Final = frozenset({"function", "method"})


def is_selected(path: Path) -> bool:
    return path.suffix == ".py" and not any(
        part in IGNORED_DIRECTORIES for part in path.parts
    )


def select_files(paths: Sequence[Path]) -> Iterable[Path]:
    for path in paths:
        if path.is_file():
            if is_selected(path):
                yield path
        elif path.is_dir() and path.name not in IGNORED_DIRECTORIES:
            yield from (candidate for candidate in path.rglob("*.py") if is_selected(candidate))
        else:
            raise FileNotFoundError(path)


def find_violations(paths: Sequence[Path], maximum: int) -> Iterable[str]:
    if not paths:
        return
    result = subprocess.run(
        (sys.executable, "-m", "radon", "cc", "-j", *map(str, paths)),
        capture_output=True,
        check=True,
        text=True,
    )
    report = json.loads(result.stdout)
    for path in paths:
        blocks = report.get(str(path), ())
        if isinstance(blocks, dict):  # entrada {"error": ...} para arquivo não parseável
            continue
        for block in sorted(blocks, key=lambda item: item["lineno"]):
            if block["type"] in MEASURED_BLOCK_TYPES and block["complexity"] > maximum:
                yield f"{path}:{block['name']}:{block['lineno']}:{block['complexity']}"


def parse_arguments(argv: Sequence[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max", type=int, default=8, dest="maximum")
    parser.add_argument("paths", nargs="+", type=Path)
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    arguments = parse_arguments(argv)
    diagnostics = list(find_violations(list(select_files(arguments.paths)), arguments.maximum))
    if diagnostics:
        print(*diagnostics, sep="\n")
    return int(bool(diagnostics))


if __name__ == "__main__":
    raise SystemExit(main())
