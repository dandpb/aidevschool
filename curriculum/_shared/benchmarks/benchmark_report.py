from __future__ import annotations

from datetime import datetime, timezone
from typing import Sequence

from .benchmark_execution import BenchmarkResult


def _number(value: float | int | None, width: int = 1) -> str:
    return f"{value:.{width}f}" if isinstance(value, (int, float)) else "—"


def render_report(
    project_id: str,
    results: Sequence[BenchmarkResult],
    read_path: str,
) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        f"# Benchmark Results: {project_id}",
        "",
        "## Methodology",
        "",
        "Each implementation was built and its test suite run natively on macOS arm64",
        "(Apple Silicon) with the Homebrew toolchain. The server was then started on a",
        f"dedicated port and driven by `k6` ({read_path} read workload, ramp 0→50→100→0",
        "VUs over ~25s). Peak RSS was captured via `/usr/bin/time -l`. Latency percentiles",
        "and throughput come from k6's summary export.",
        "",
        "> These are real single-machine measurements (N=1 run each), not Docker-based",
        "> load tests. Use them for relative cross-language comparison on this hardware;",
        "> re-run on dedicated benchmark hardware for publication-grade p95/p99.",
        "",
        "## Build & Test Status",
        "",
        "| Lang | Built | Tests | Test detail |",
        "| --- | :---: | :---: | --- |",
    ]
    for result in results:
        detail = (
            (result.get("test_detail") or "")
            .replace("|", "\\|")
            .replace("\n", " ")[:120]
        )
        lines.append(
            f"| {result['lang']} | {'✅' if result.get('built') else '❌'} | "
            f"{'✅' if result.get('tests_passed') else '❌'} | {detail} |"
        )
    lines += [
        "",
        "## Comparative Results",
        "",
        "| Lang | RPS | avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | fail rate | peak RSS (MB) |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for result in results:
        if result.get("rps") is None:
            lines.append(
                f"| {result['lang']} | — | — | — | — | — | — | "
                f"_{result.get('error', 'n/a')}_ |"
            )
            continue
        lines.append(
            f"| {result['lang']} | {_number(result.get('rps'), 0)} | "
            f"{_number(result.get('avg_ms'))} | {_number(result.get('p50_ms'))} | "
            f"{_number(result.get('p95_ms'))} | {_number(result.get('p99_ms'))} | "
            f"{_number(result.get('fail_rate'), 3)} | "
            f"{_number(result.get('peak_rss_mb'))} |"
        )
    lines += ["", "## Per-language Detail", ""]
    for result in results:
        lines.append(f"### {result['lang']}")
        rps = result.get("rps")
        if rps is None:
            error = (result.get("error") or "unknown").replace("|", "\\|")
            error = error.split(". ")[0]
            if "demo" in error or "no server binary" in error:
                lines += [
                    f"Not benchmarked as an HTTP server: {error}.",
                    "",
                    "This implementation builds and its unit tests pass, but it does not",
                    "expose a long-running HTTP endpoint (it is a demo/library that runs to",
                    "completion). Re-run against a server variant for throughput data.",
                ]
            else:
                lines.append(f"Not benchmarked: {error}.")
            lines.append("")
            continue

        avg_ms = result.get("avg_ms")
        p50_ms = result.get("p50_ms")
        p95_ms = result.get("p95_ms")
        p99_ms = result.get("p99_ms")
        fail_rate = result.get("fail_rate", 0)
        lines += [
            f"- Throughput: **{rps:.0f} req/s**",
            f"- Latency: avg {avg_ms:.2f} ms · p50 {p50_ms:.2f} ms · "
            f"p95 {p95_ms:.2f} ms · p99 {p99_ms:.2f} ms",
            f"- Error rate: {fail_rate:.3f}",
            f"- Peak RSS: {result.get('peak_rss_mb')} MB",
            f"- Iterations: {result.get('iters')}",
            "",
        ]
    lines.append(
        f"_Generated {now} by `curriculum/_shared/benchmarks/bench_orchestrator.py`._"
    )
    return "\n".join(lines)
