#!/usr/bin/env python3

# ─── How to run ───
# 1. Install project development dependencies:
#      python3 -m pip install -e '.[dev]'
# 2. Run (gate with frozen baseline — AID-1636):
#      python3 scripts/check_python_complexity.py --max 8 \
#          --baseline scripts/python_complexity_baseline.txt \
#          learner engines/minimaxDojo engines/openclaw \
#          engines/miniMaxEvolutionEngine engines/aiDevschoolMvp
# 3. Baseline semantics (ratchet):
#    - a violation covered by a baseline entry is waived;
#    - a violation with no entry fails the run (new debt);
#    - an entry with no matching violation fails the run (stale entry —
#      shrink the baseline in the same PR that reduced the complexity).
# ──────────────────

from __future__ import annotations

import argparse
import json
import tempfile
from collections import Counter
from collections.abc import Iterable, Sequence
from pathlib import Path
import subprocess
import sys
from typing import Final


IGNORED_DIRECTORIES: Final = frozenset(
    {"__pycache__", ".mypy_cache", ".pytest_cache", ".ruff_cache", "tests"}
)
MEASURED_BLOCK_TYPES: Final = frozenset({"function", "method"})

SELF_TEST_SOURCE: Final = '''\
def tangled(a, b, c, d, e, f, g, h, i):
    score = 0
    if a:
        score += 1
    if b:
        score += 2
    if c:
        score += 4
    if d:
        score += 8
    if e:
        score += 16
    if f:
        score += 32
    if g:
        score += 64
    if h:
        score += 128
    if i:
        score += 256
    return score


def plain(value):
    return value
'''


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


def find_violations(
    paths: Sequence[Path], maximum: int
) -> Iterable[tuple[str, str]]:
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
                key = f"{path.as_posix()}:{block['name']}"
                yield key, f"{key}:{block['lineno']}:{block['complexity']}"


def load_baseline(path: Path) -> list[str]:
    entries = []
    for line in path.read_text(encoding="utf-8").splitlines():
        entry = line.strip()
        if entry and not entry.startswith("#"):
            entries.append(entry)
    return entries


def parse_arguments(argv: Sequence[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max", type=int, default=8, dest="maximum")
    parser.add_argument("--baseline", type=Path, default=None)
    parser.add_argument(
        "--self-test", action="store_true", dest="self_test",
        help="prove the gate with synthetic violations (must fail)",
    )
    parser.add_argument("paths", nargs="*", type=Path)
    arguments = parser.parse_args(argv)
    if not arguments.self_test and not arguments.paths:
        parser.error("at least one path is required (or use --self-test)")
    return arguments


def evaluate(
    violations: Sequence[tuple[str, str]], baseline_entries: Sequence[str]
) -> list[str]:
    diagnostics: list[str] = []
    observed = Counter(key for key, _ in violations)
    frozen = Counter(baseline_entries)
    excess = observed - frozen
    if excess:
        remaining = dict(excess)
        for key, detail in violations:
            if remaining.get(key, 0) > 0:
                diagnostics.append(detail)
                remaining[key] -= 1
    for entry, count in sorted((frozen - observed).items()):
        diagnostics.extend([f"stale baseline entry: {entry}"] * count)
    return diagnostics


def run_self_test() -> int:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        source = root / "synthetic.py"
        source.write_text(SELF_TEST_SOURCE, encoding="utf-8")
        baseline = root / "baseline.txt"

        uncovered = main(["--max", "8", str(root)])
        print(f"self-test: uncovered synthetic violation fails (exit {uncovered})")
        covered = stale = None
        if uncovered == 1:
            baseline.write_text(f"{source.as_posix()}:tangled\n", encoding="utf-8")
            covered = main(["--max", "8", "--baseline", str(baseline), str(root)])
            print(f"self-test: baseline-covered violation passes (exit {covered})")
        if covered == 0:
            baseline.write_text(
                f"{source.as_posix()}:tangled\n{root.as_posix()}/ghost.py:vanished\n",
                encoding="utf-8",
            )
            stale = main(["--max", "8", "--baseline", str(baseline), str(root)])
            print(f"self-test: stale baseline entry fails (exit {stale})")
        if uncovered == 1 and covered == 0 and stale == 1:
            print("self-test: PASS")
            return 0
        print("self-test: FAIL")
        return 1


def main(argv: Sequence[str] | None = None) -> int:
    arguments = parse_arguments(argv)
    if arguments.self_test:
        return run_self_test()
    violations = list(
        find_violations(list(select_files(arguments.paths)), arguments.maximum)
    )
    baseline_entries = (
        load_baseline(arguments.baseline) if arguments.baseline else ()
    )
    diagnostics = evaluate(violations, baseline_entries)
    if diagnostics:
        print(*diagnostics, sep="\n")
    return int(bool(diagnostics))


if __name__ == "__main__":
    raise SystemExit(main())
