#!/usr/bin/env python3
"""Build, benchmark, and report on each native curriculum implementation.

Usage:
  python3 bench_orchestrator.py <project_dir> [--read-path /health] [--workload PATH]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
    __package__ = "curriculum._shared.benchmarks"

from .benchmark_build import LANGS  # noqa: E402
from .benchmark_execution import BenchmarkResult, benchmark_lang  # noqa: E402
from .benchmark_report import render_report  # noqa: E402

HERE = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_dir")
    parser.add_argument("--read-path", default="/health")
    parser.add_argument("--workload", default=str(HERE / "generic_http_workload.js"))
    args = parser.parse_args()
    project_dir = Path(args.project_dir).resolve()
    results: list[BenchmarkResult] = [
        benchmark_lang(project_dir, lang, Path(args.workload), args.read_path)
        for lang in LANGS
    ]
    for result in results:
        status = "✅" if result.get("rps") is not None else "❌"
        print(
            f"  {status} {result['lang']:5} rps={result.get('rps')}",
            file=sys.stderr,
        )
    output = project_dir / "docs" / "benchmark_results.md"
    output.write_text(
        render_report(project_dir.name, results, args.read_path),
        encoding="utf-8",
    )
    print(f"wrote {output}", file=sys.stderr)


if __name__ == "__main__":
    main()
