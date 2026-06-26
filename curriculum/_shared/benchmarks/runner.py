"""Generic, per-project benchmark runner for aidevschool curriculum projects.

Extracted from 01_rate_limiter/benchmarks/{run_matrix.sh, analyze_results.py},
which hardcoded image names, ports, container names, and paths to project 01.
Here those values come from a per-project ``benchmark.yaml`` (see ADR-003), so
the same runner drives any project.

Pipeline per (lang, scenario, run):
  docker run -> readiness probe -> k6 run -> docker stats snapshot -> parse.

The parsed per-run metrics are bridged into the shape
``{scenario: {lang: [sample, ...]}}`` that ``BenchmarkAnalyzer`` already
consumes (analyzer.py is reused unchanged).

    cfg = load_benchmark_config(project_dir / "benchmark.yaml")
    run_benchmark(project_dir, "go", "baseline", 1, cfg)          # live (needs docker+k6)
    report = aggregate(project_dir, cfg, "01_rate_limiter", n=3)  # offline, from result files
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path

import yaml

LANGS: tuple[str, ...] = ("go", "rust", "node")
_SCENARIO_NAME = re.compile(r"^[A-Za-z0-9_-]+$")

# Indirection so tests can stub docker/k6 without a real environment.
_RUN = subprocess.run


# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class BenchmarkConfig:
    """Per-project benchmark metadata parsed from ``benchmark.yaml``."""

    container_prefix: str
    images: dict[str, str]
    ports: dict[str, int]
    host_ports: dict[str, int]
    scenarios: tuple[str, ...]

    def host_port(self, lang: str) -> int:
        """Host port for a language: the override if present, else the container port."""
        return int(self.host_ports.get(lang, self.ports[lang]))

    def container_name(self, lang: str) -> str:
        return f"{self.container_prefix}-{lang}-bench"


def load_benchmark_config(path: Path) -> BenchmarkConfig:
    """Parse a ``benchmark.yaml`` into a BenchmarkConfig."""
    raw = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
    scenarios = tuple(str(s) for s in (raw.get("scenarios") or ()))
    for scenario in scenarios:
        _validate_scenario(scenario)
    return BenchmarkConfig(
        container_prefix=raw.get("container_prefix", "bench"),
        images={k: str(v) for k, v in (raw.get("images") or {}).items()},
        ports={k: int(v) for k, v in (raw.get("ports") or {}).items()},
        host_ports={k: int(v) for k, v in (raw.get("host_ports") or {}).items()},
        scenarios=scenarios,
    )


# --------------------------------------------------------------------------- #
# Result paths
# --------------------------------------------------------------------------- #
def result_path(
    project_dir: Path, lang: str, scenario: str, run_num: int, suffix: str = ".json"
) -> Path:
    """Canonical raw-result path, e.g. results/rust/spike_run2.json (or _stats.json)."""
    _validate_scenario(scenario)
    return (
        Path(project_dir)
        / "benchmarks"
        / "results"
        / lang
        / f"{scenario}_run{run_num}{suffix}"
    )


def _validate_scenario(scenario: str) -> None:
    if not _SCENARIO_NAME.fullmatch(scenario):
        raise ValueError(f"invalid benchmark scenario name: {scenario!r}")


# --------------------------------------------------------------------------- #
# Parsing (lifted verbatim from analyze_results.py to preserve behavior)
# --------------------------------------------------------------------------- #
def compute_percentiles(values, percentiles=(50, 90, 95, 99)) -> dict:
    if not values:
        return {f"p{p}": 0.0 for p in percentiles}
    s = sorted(values)
    n = len(s)
    return {f"p{p}": s[min(int(n * p / 100), n - 1)] for p in percentiles}


def _latency_dict(values: list[float], failed: int, checks_pass: int, checks_fail: int) -> dict:
    pctls = compute_percentiles(values)
    return {
        "n_requests": len(values),
        "duration_avg": sum(values) / len(values),
        "duration_min": min(values),
        "duration_max": max(values),
        "p50": pctls["p50"], "p90": pctls["p90"],
        "p95": pctls["p95"], "p99": pctls["p99"],
        "failed": failed, "checks_pass": checks_pass, "checks_fail": checks_fail,
    }


def parse_raw_k6_json(path: Path) -> dict | None:
    """Read a k6 streaming-JSON file into a per-run latency/throughput dict.

    HTTP runs key off ``http_req_duration``. WebSocket runs (k6/ws) emit no
    http_req_duration, so we fall back to ``ws_session_duration`` as the
    latency-equivalent and the session count as the throughput-equivalent —
    producing the SAME dict shape so the analyzer/scoreboard need no changes.
    Returns None if neither metric is present.
    """
    path = Path(path)
    durations: list[float] = []
    ws_durations: list[float] = []
    failed = checks_pass = checks_fail = 0
    if not path.exists():
        return None
    with open(path) as f:
        for line in f:
            try:
                d = json.loads(line)
                if not isinstance(d, dict):
                    raise ValueError("k6 JSON line must be an object")
                if d.get("type") != "Point":
                    continue
                m = d.get("metric")
                data = d.get("data", {})
                if not isinstance(data, dict):
                    raise ValueError("k6 point data must be an object")
                v = data.get("value")
                if v is None:
                    continue
                if m == "http_req_duration":
                    durations.append(v)
                elif m == "ws_session_duration":
                    ws_durations.append(v)
                elif m == "http_req_failed":
                    failed += 1 if v else 0
                elif m == "checks":
                    if v:
                        checks_pass += 1
                    else:
                        checks_fail += 1
            except json.JSONDecodeError as e:
                raise ValueError(f"malformed k6 JSON line in {path}: {line!r}") from e
    if durations:
        return _latency_dict(durations, failed, checks_pass, checks_fail)
    if ws_durations:  # WebSocket run: session duration is the latency-equivalent
        return _latency_dict(ws_durations, failed, checks_pass, checks_fail)
    return None


def parse_stats_json(path: Path) -> dict | None:
    """Parse a ``docker stats --format json`` snapshot into numeric fields."""
    path = Path(path)
    if not path.exists():
        return None
    try:
        snap = json.loads(Path(path).read_text().strip())
        if not isinstance(snap, dict):
            raise TypeError("docker stats JSON must be an object")
        cpu = float(snap.get("CPUPerc", "0%").rstrip("%"))
        mem = snap.get("MemUsage", "0B / 0B").split("/")[0].strip()
        num = float(re.sub(r"[^0-9.]", "", mem))
        unit = re.sub(r"[0-9.\s]", "", mem)
        mult = {
            "B": 1, "KiB": 1024, "MiB": 1024 ** 2, "GiB": 1024 ** 3,
            "KB": 1000, "MB": 1000 ** 2, "GB": 1000 ** 3,
        }.get(unit, 1)
        return {
            "cpu_pct": cpu,
            "mem_mb": num * mult / (1024 ** 2),
            "mem_pct": float(snap.get("MemPerc", "0%").rstrip("%")),
            "container": snap.get("Name", "?"),
        }
    except (json.JSONDecodeError, ValueError, TypeError, AttributeError) as e:
        return {"error": str(e)}


# --------------------------------------------------------------------------- #
# Bridge to the analyzer's input shape
# --------------------------------------------------------------------------- #
def _sample(metrics: dict, stats: dict | None) -> dict:
    """One analyzer sample = numeric k6 metrics merged with numeric docker stats."""
    sample = dict(metrics)
    for key in ("cpu_pct", "mem_mb", "mem_pct"):
        if stats and key in stats:
            sample[key] = stats[key]
    return sample


def build_raw_data(project_dir: Path, cfg: BenchmarkConfig, n: int = 3) -> dict:
    """Assemble ``{scenario: {lang: [sample, ...]}}`` from result files on disk."""
    data: dict[str, dict[str, list[dict]]] = {}
    for scenario in cfg.scenarios:
        data[scenario] = {}
        for lang in LANGS:
            samples: list[dict] = []
            for run in range(1, n + 1):
                metrics = parse_raw_k6_json(result_path(project_dir, lang, scenario, run))
                if not metrics:
                    continue
                stats = parse_stats_json(
                    result_path(project_dir, lang, scenario, run, "_stats.json")
                )
                samples.append(_sample(metrics, stats))
            data[scenario][lang] = samples
    return data


def aggregate(project_dir: Path, cfg: BenchmarkConfig, project_id: str, n: int = 3):
    """Bridge result files through the reused BenchmarkAnalyzer into a report."""
    from curriculum._shared.benchmarks.analyzer import BenchmarkAnalyzer

    raw = build_raw_data(project_dir, cfg, n)
    return BenchmarkAnalyzer().analyze_raw_samples(project_id, raw)


# --------------------------------------------------------------------------- #
# Live runner (docker + k6) — pure arg builders are unit-tested directly
# --------------------------------------------------------------------------- #
def docker_run_args(cfg: BenchmarkConfig, lang: str) -> list[str]:
    return [
        "docker", "run", "-d",
        "--name", cfg.container_name(lang),
        "-p", f"{cfg.host_port(lang)}:{cfg.ports[lang]}",
        cfg.images[lang],
    ]


def k6_args(
    project_dir: Path, lang: str, scenario: str, run_num: int, cfg: BenchmarkConfig
) -> tuple[list[str], dict]:
    scen_js = Path(project_dir) / "benchmarks" / "scenarios" / f"{scenario}.js"
    out = result_path(project_dir, lang, scenario, run_num)
    summary = result_path(project_dir, lang, scenario, run_num, "_summary.json")
    env = {**os.environ, "TARGET_PORT": str(cfg.host_port(lang))}
    args = [
        "k6", "run",
        "--summary-export", str(summary),
        "--out", f"json={out}",
        str(scen_js),
    ]
    return args, env


def _probe_ready(host_port: int, attempts: int = 30, delay: float = 0.3) -> bool:
    url = f"http://localhost:{host_port}/"
    for _ in range(attempts):
        proc = _RUN(
            ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", url],
            capture_output=True, text=True, check=False,
        )
        if (proc.stdout or "").strip() in ("200", "429"):
            return True
        time.sleep(delay)
    return False


def _snapshot_stats(name: str, out: Path) -> None:
    proc = _RUN(
        ["docker", "stats", "--no-stream", "--no-trunc", "--format", "json", name],
        capture_output=True, text=True, check=False,
    )
    text = proc.stdout if proc.returncode == 0 and proc.stdout else '{"error":"no-stats"}'
    Path(out).write_text(text, encoding="utf-8")


def run_benchmark(
    project_dir: Path, lang: str, scenario: str, run_num: int, cfg: BenchmarkConfig
) -> dict:
    """Run one (lang, scenario, run) live: container -> k6 -> stats -> parse.

    Writes results/{lang}/{scenario}_run{run_num}.json (+ _summary/_stats) and
    returns ``{"metrics": ..., "stats": ...}``. Requires docker + k6.
    """
    name = cfg.container_name(lang)
    out = result_path(project_dir, lang, scenario, run_num)
    out.parent.mkdir(parents=True, exist_ok=True)
    stats_path = result_path(project_dir, lang, scenario, run_num, "_stats.json")

    _RUN(["docker", "rm", "-f", name], capture_output=True, check=False)
    _RUN(docker_run_args(cfg, lang), capture_output=True, check=True)
    try:
        _probe_ready(cfg.host_port(lang))
        time.sleep(1)
        args, env = k6_args(project_dir, lang, scenario, run_num, cfg)
        _RUN(args, env=env, capture_output=True, check=False)
        _snapshot_stats(name, stats_path)
    finally:
        _RUN(["docker", "rm", "-f", name], capture_output=True, check=False)

    return {"metrics": parse_raw_k6_json(out), "stats": parse_stats_json(stats_path)}
