#!/usr/bin/env python3
"""Render a markdown summary of the N≥3 benchmark data.

Reads `benchmarks/results-N3-optimized/aggregated.json` and prints a markdown
table with per-(lang, scenario) medians + stddev + CV%. Use this to keep
`docs/benchmark_results.md` honest: the data exists, the script reproduces
the table, and the human only needs to paste the result.

Usage:
    python3 benchmarks/render_n3_summary.py                # full table to stdout
    python3 benchmarks/render_n3_summary.py --p99-leaders  # p99 winner per scenario
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

AGGREGATED = Path(__file__).resolve().parent / "results-N3-optimized" / "aggregated.json"
SCENARIOS = ("baseline", "stress", "spike", "endurance")
LANGS = ("go", "rust", "node")


def cv_pct(stddev: float, median: float) -> float:
    """Coefficient of variation as a percentage; 0 if median is 0."""
    if median == 0:
        return 0.0
    return round((stddev / median) * 100, 2)


def load_aggregated() -> dict:
    if not AGGREGATED.exists():
        print(
            f"ERROR: {AGGREGATED} not found. Run benchmarks/run_matrix_N3.sh first.",
            file=sys.stderr,
        )
        sys.exit(1)
    with AGGREGATED.open(encoding="utf-8") as f:
        return json.load(f).get("aggregated", {})


def render_full_table(agg: dict) -> str:
    lines: list[str] = []
    lines.append("# N≥3 benchmark summary")
    lines.append("")
    lines.append("Source: `benchmarks/results-N3-optimized/aggregated.json`")
    lines.append("Each cell: `median (stddev) [CV%]`")
    lines.append("")

    metric_keys = [
        ("p50_median", "p50_stddev", "p50 (ms)"),
        ("p95_median", "p95_stddev", "p95 (ms)"),
        ("p99_median", "p99_stddev", "p99 (ms)"),
        ("error_rate_pct", None, "error rate (%)"),
        ("mem_mb_median", "mem_mb_stddev", "mem (MB)"),
        ("cpu_pct_median", "cpu_pct_stddev", "cpu (%)"),
        ("n_runs", None, "n_runs"),
    ]

    for scenario in SCENARIOS:
        lines.append(f"## {scenario}")
        lines.append("")
        # Header row
        header = ["metric"] + list(LANGS)
        lines.append("| " + " | ".join(header) + " |")
        lines.append("|" + "|".join(["---"] * len(header)) + "|")
        for med_key, std_key, label in metric_keys:
            cells = [label]
            for lang in LANGS:
                sc = agg.get(lang, {}).get(scenario, {})
                if not sc:
                    cells.append("(no data)")
                    continue
                med = sc.get(med_key)
                if med is None:
                    cells.append("(no data)")
                    continue
                if std_key is None:
                    cells.append(str(med))
                else:
                    std = sc.get(std_key, 0)
                    cv = cv_pct(std, med)
                    cells.append(f"{med:.2f} ({std:.2f}) [{cv}%]")
            lines.append("| " + " | ".join(cells) + " |")
        lines.append("")

    return "\n".join(lines)


def render_p99_leaders(agg: dict) -> str:
    lines: list[str] = ["# p99 leader per scenario", ""]
    for scenario in SCENARIOS:
        candidates: list[tuple[str, float, float]] = []
        for lang in LANGS:
            sc = agg.get(lang, {}).get(scenario, {})
            med = sc.get("p99_median")
            std = sc.get("p99_stddev", 0)
            if med is not None:
                candidates.append((lang, med, std))
        if not candidates:
            lines.append(f"- **{scenario}**: (no data)")
            continue
        candidates.sort(key=lambda c: c[1])
        winner = candidates[0]
        margin_pct = 0.0
        if len(candidates) > 1:
            second = candidates[1][1]
            if second > 0:
                margin_pct = round((second - winner[1]) / second * 100, 2)
        lines.append(
            f"- **{scenario}**: {winner[0]} wins at p99 = {winner[1]:.2f}ms "
            f"(±{winner[2]:.2f}); {margin_pct}% faster than next"
        )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--p99-leaders", action="store_true", help="print p99 leader per scenario only"
    )
    args = parser.parse_args()

    agg = load_aggregated()
    if args.p99_leaders:
        print(render_p99_leaders(agg))
    else:
        print(render_full_table(agg))
    return 0


if __name__ == "__main__":
    sys.exit(main())
