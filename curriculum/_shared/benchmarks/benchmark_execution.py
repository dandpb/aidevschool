from __future__ import annotations

import json
import os
import subprocess
import time
from collections.abc import Mapping
from pathlib import Path
from typing import Final, NotRequired, TypeAlias, TypedDict

from .benchmark_build import Language, build_and_test
from .benchmark_process import (
    peak_rss_mb,
    start_server,
    stop_server,
)

PORTS: Final[dict[Language, int]] = {"go": 28080, "rust": 28082, "node": 28081}
JsonValue: TypeAlias = (
    str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]
)


class K6Result(TypedDict):
    rps: float | None
    avg_ms: float | None
    min_ms: float | None
    max_ms: float | None
    p50_ms: float | None
    p90_ms: float | None
    p95_ms: float | None
    p99_ms: float | None
    fail_rate: float | None
    iters: int | float | None


class BenchmarkResult(TypedDict):
    lang: Language
    built: bool
    tests_passed: bool
    test_detail: str
    error: NotRequired[str]
    bound_port: NotRequired[int]
    peak_rss_mb: NotRequired[float | None]
    rps: NotRequired[float | None]
    avg_ms: NotRequired[float | None]
    min_ms: NotRequired[float | None]
    max_ms: NotRequired[float | None]
    p50_ms: NotRequired[float | None]
    p90_ms: NotRequired[float | None]
    p95_ms: NotRequired[float | None]
    p99_ms: NotRequired[float | None]
    fail_rate: NotRequired[float | None]
    iters: NotRequired[int | float | None]


def _run_k6_command(
    command: list[str],
    *,
    environment: dict[str, str],
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        env=environment,
        timeout=120,
        capture_output=True,
        text=True,
        check=False,
    )


def run_k6(port: int, workload: Path, read_path: str) -> K6Result | None:
    summary = Path("/tmp") / f"bench-k6-{os.getpid()}.json"
    environment = {
        **os.environ,
        "TARGET_PORT": str(port),
        "READ_PATH": read_path,
    }
    try:
        _run_k6_command(
            [
                "k6",
                "run",
                "--quiet",
                f"--summary-export={summary}",
                str(workload),
            ],
            environment=environment,
        )
    except subprocess.TimeoutExpired:
        return None
    if not summary.exists():
        return None
    try:
        raw = summary.read_text()
        decoded: JsonValue
        decoded, _ = json.JSONDecoder().raw_decode(raw.lstrip())
    except (OSError, UnicodeError, json.JSONDecodeError):
        return None
    if not isinstance(decoded, dict):
        return None

    metrics = decoded.get("metrics", {})
    if not isinstance(metrics, dict):
        return None
    duration = metrics.get("http_req_duration", {})
    if not isinstance(duration, dict):
        return None

    def metric_group(name: str) -> Mapping[str, JsonValue]:
        group = metrics.get(name, {})
        return group if isinstance(group, dict) else {}

    return {
        "rps": _numeric(metric_group("http_reqs").get("rate")),
        "avg_ms": _numeric(duration.get("avg")),
        "min_ms": _numeric(duration.get("min")),
        "max_ms": _numeric(duration.get("max")),
        "p50_ms": _numeric(duration.get("med")),
        "p90_ms": _numeric(duration.get("p(90)")),
        "p95_ms": _numeric(duration.get("p(95)")),
        "p99_ms": _numeric(duration.get("p(99)")),
        "fail_rate": _numeric(metric_group("http_req_failed").get("value")),
        "iters": _numeric(metric_group("iterations").get("count")),
    }


def _numeric(value: JsonValue) -> int | float | None:
    return value if isinstance(value, (int, float)) else None


def benchmark_lang(
    project_dir: Path,
    lang: Language,
    workload: Path,
    read_path: str,
) -> BenchmarkResult:
    build = build_and_test(project_dir, lang)
    result: BenchmarkResult = {
        "lang": lang,
        "built": build.built,
        "tests_passed": build.tests_passed,
        "test_detail": build.test_detail.strip(),
    }
    if not build.start_cmd or (not build.built and not build.tests_passed):
        result["error"] = "build failed or no server binary"
        return result

    process, readiness_detail, live_port = start_server(build, PORTS[lang], read_path)
    if process is None or live_port is None:
        result["error"] = f"did not become ready: {readiness_detail}"
        return result

    result["bound_port"] = live_port
    try:
        time.sleep(0.5)
        k6_result = run_k6(live_port, workload, read_path)
        if k6_result is not None:
            result["rps"] = k6_result["rps"]
            result["avg_ms"] = k6_result["avg_ms"]
            result["min_ms"] = k6_result["min_ms"]
            result["max_ms"] = k6_result["max_ms"]
            result["p50_ms"] = k6_result["p50_ms"]
            result["p90_ms"] = k6_result["p90_ms"]
            result["p95_ms"] = k6_result["p95_ms"]
            result["p99_ms"] = k6_result["p99_ms"]
            result["fail_rate"] = k6_result["fail_rate"]
            result["iters"] = k6_result["iters"]
        time.sleep(0.3)
    finally:
        stop_server(process)
        time.sleep(0.4)
    result["peak_rss_mb"] = peak_rss_mb(
        Path("/tmp") / f"bench-{lang}-{os.getpid()}.log"
    )
    return result
