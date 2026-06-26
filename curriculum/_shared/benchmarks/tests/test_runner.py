"""Tests for the generic benchmark runner.

Covers config parsing (host-port overrides + defaults), result paths, the
docker/k6 command builders, the analyzer-shape bridge, a mocked live
``run_benchmark`` (no docker/k6 needed), and a regression check that the
extracted parsers reproduce project 01's committed ``aggregated.json``.
"""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

# Repo root on path so ``curriculum._shared...`` imports resolve.
sys.path.insert(0, str(Path(__file__).resolve().parents[4]))

from curriculum._shared.benchmarks import runner as R
from curriculum._shared.benchmarks.analyzer import BenchmarkAnalyzer

REPO = Path(__file__).resolve().parents[4]
PROJ01 = REPO / "curriculum" / "01_rate_limiter"

# A 3-point k6 stream fixture (durations 1/2/3 ms, all checks pass).
K6_FIXTURE = "\n".join(
    json.dumps({"type": "Point", "metric": "http_req_duration", "data": {"value": v}})
    for v in (1.0, 2.0, 3.0)
) + "\n" + json.dumps({"type": "Point", "metric": "checks", "data": {"value": 1}}) + "\n"

STATS_FIXTURE = json.dumps(
    {"CPUPerc": "5.00%", "MemUsage": "8MiB / 23.19GiB", "MemPerc": "0.03%", "Name": "rl-go-bench"}
)


def make_cfg(host_ports=None):
    return R.BenchmarkConfig(
        container_prefix="rl",
        images={"go": "rl-go", "rust": "rl-rust", "node": "rl-node"},
        ports={"go": 8080, "rust": 8082, "node": 8081},
        host_ports=host_ports if host_ports is not None else {"go": 18080},
        scenarios=("baseline", "stress", "spike", "endurance"),
    )


def assert_rejects_path_traversal_scenario_names(case):
    with tempfile.TemporaryDirectory() as d:
        cfg_path = Path(d) / "benchmark.yaml"
        cfg_path.write_text(
            "\n".join((
                "container_prefix: bad",
                "images: {go: bad-go}",
                "ports: {go: 8080}",
                "scenarios: ['../../outside']",
            )),
            encoding="utf-8",
        )

        with case.assertRaises(ValueError):
            R.load_benchmark_config(cfg_path)

    cfg = make_cfg()
    with case.assertRaises(ValueError):
        R.result_path(Path("/x/p"), "go", "../../outside", 1)
    with case.assertRaises(ValueError):
        R.k6_args(Path("/x/p"), "go", "../../outside", 1, cfg)


class TestConfig(unittest.TestCase):
    def test_loads_project01_yaml(self):
        cfg = R.load_benchmark_config(PROJ01 / "benchmark.yaml")
        self.assertEqual(cfg.images["go"], "rl-go")
        self.assertEqual(cfg.ports["rust"], 8082)
        self.assertEqual(cfg.scenarios, ("baseline", "stress", "spike", "endurance"))

    def test_host_port_uses_override_for_go(self):
        cfg = make_cfg()
        self.assertEqual(cfg.host_port("go"), 18080)  # override, not container port 8080

    def test_host_port_falls_back_to_container_port(self):
        cfg = make_cfg()
        self.assertEqual(cfg.host_port("rust"), 8082)
        self.assertEqual(cfg.host_port("node"), 8081)

    def test_no_overrides_uses_container_ports_for_all(self):
        cfg = make_cfg(host_ports={})
        self.assertEqual(
            [cfg.host_port(l) for l in ("go", "rust", "node")], [8080, 8082, 8081]
        )

    def test_container_name(self):
        self.assertEqual(make_cfg().container_name("rust"), "rl-rust-bench")


class TestPathsAndArgs(unittest.TestCase):
    def test_result_path(self):
        p = R.result_path(Path("/x/02_kv"), "rust", "spike", 2)
        self.assertEqual(p, Path("/x/02_kv/benchmarks/results/rust/spike_run2.json"))
        s = R.result_path(Path("/x/02_kv"), "rust", "spike", 2, "_stats.json")
        self.assertEqual(s.name, "spike_run2_stats.json")

    def test_docker_run_args_maps_host_to_container_port(self):
        args = R.docker_run_args(make_cfg(), "go")
        self.assertIn("rl-go", args)
        self.assertIn("18080:8080", args)  # host override : container port
        self.assertIn("rl-go-bench", args)

    def test_k6_args_sets_target_port_to_host_port(self):
        args, env = R.k6_args(Path("/x/p"), "go", "baseline", 1, make_cfg())
        self.assertEqual(env["TARGET_PORT"], "18080")
        self.assertIn("json=/x/p/benchmarks/results/go/baseline_run1.json", " ".join(args))
        self.assertTrue(args[-1].endswith("scenarios/baseline.js"))

    def test_rejects_path_traversal_scenario_names(self):
        assert_rejects_path_traversal_scenario_names(self)


class TestBenchmarkRunner(unittest.TestCase):
    def test_rejects_path_traversal_scenario_names(self):
        assert_rejects_path_traversal_scenario_names(self)


class TestBridge(unittest.TestCase):
    def test_sample_merges_metrics_and_stats(self):
        s = R._sample({"p99": 9.1, "n_requests": 100}, {"mem_mb": 8.0, "container": "x"})
        self.assertEqual(s["p99"], 9.1)
        self.assertEqual(s["mem_mb"], 8.0)
        self.assertNotIn("container", s)  # only numeric stat keys are merged

    def test_build_raw_data_is_accepted_by_analyzer(self):
        with tempfile.TemporaryDirectory() as d:
            proj = Path(d)
            for lang in R.LANGS:
                for sc in ("baseline", "stress", "spike", "endurance"):
                    p = R.result_path(proj, lang, sc, 1)
                    p.parent.mkdir(parents=True, exist_ok=True)
                    p.write_text(K6_FIXTURE)
                    R.result_path(proj, lang, sc, 1, "_stats.json").write_text(STATS_FIXTURE)
            cfg = make_cfg()
            raw = R.build_raw_data(proj, cfg, n=1)
            # Shape: {scenario: {lang: [sample,...]}} with numeric metric keys.
            self.assertEqual(set(raw), set(cfg.scenarios))
            self.assertIn("p99", raw["baseline"]["go"][0])
            report = BenchmarkAnalyzer().analyze_raw_samples("tmp", raw)
            self.assertIn("p99", report.scenarios["baseline"]["go"].metrics)

    def test_aggregate_builds_report_from_committed_files(self):
        # End-to-end bridge over real committed project-01 result files (N=1).
        cfg = R.load_benchmark_config(PROJ01 / "benchmark.yaml")
        report = R.aggregate(PROJ01, cfg, "01_rate_limiter", n=1)
        self.assertEqual(report.project_id, "01_rate_limiter")
        self.assertEqual(set(report.scenarios), set(cfg.scenarios))
        self.assertIn("p99", report.scenarios["baseline"]["go"].metrics)
        # N=1 committed data cannot pass the N>=3 gate; the report still builds.
        self.assertFalse(report.all_pass)


class TestRunBenchmarkMocked(unittest.TestCase):
    """Exercise the live pipeline with docker/k6 stubbed out."""

    def test_run_benchmark_writes_files_and_returns_parsed(self):
        calls = []

        def fake_run(argv, **kw):
            calls.append(argv[0] + ("/" + argv[1] if len(argv) > 1 else ""))
            if argv[0] == "curl":
                return subprocess.CompletedProcess(argv, 0, stdout="200")
            if argv[0] == "k6":
                out = next(a.split("json=", 1)[1] for a in argv if a.startswith("json="))
                Path(out).write_text(K6_FIXTURE)
                return subprocess.CompletedProcess(argv, 0, stdout="")
            if argv[:2] == ["docker", "stats"]:
                return subprocess.CompletedProcess(argv, 0, stdout=STATS_FIXTURE)
            return subprocess.CompletedProcess(argv, 0, stdout="")

        orig_run, orig_sleep = R._RUN, R.time.sleep
        R._RUN, R.time.sleep = fake_run, lambda *_: None
        try:
            with tempfile.TemporaryDirectory() as d:
                proj = Path(d)
                res = R.run_benchmark(proj, "go", "baseline", 1, make_cfg())
                # Assert inside the block, before the temp dir is cleaned up.
                self.assertEqual(res["metrics"]["n_requests"], 3)
                self.assertAlmostEqual(res["metrics"]["p50"], 2.0)
                self.assertAlmostEqual(res["stats"]["mem_mb"], 8.0)
                self.assertTrue(R.result_path(proj, "go", "baseline", 1).exists())
                self.assertTrue(any(c.startswith("docker/run") for c in calls))
        finally:
            R._RUN, R.time.sleep = orig_run, orig_sleep


class TestParserFaithfulness(unittest.TestCase):
    """The extracted parsers must produce exact, stable output for a known k6 stream
    and a known docker-stats snapshot.

    Uses committed, deterministic fixtures rather than the project-01 results dir:
    those raw k6 streams are gitignored scratch output (only the aggregated.json is
    tracked), so depending on them is fragile. This fixture-based check pins the
    parser behaviour reproducibly. parse_raw_k6_json/parse_stats_json are lifted
    verbatim from analyze_results.py, so this also guards the lift.
    """

    def test_parse_raw_k6_json_exact(self):
        durations = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]
        stream = "\n".join(
            json.dumps({"type": "Point", "metric": "http_req_duration", "data": {"value": v}})
            for v in durations
        )
        stream += "\n" + "\n".join(
            json.dumps({"type": "Point", "metric": "checks", "data": {"value": 1}})
            for _ in range(3)
        ) + "\n"
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "baseline_run1.json"
            p.write_text(stream)
            m = R.parse_raw_k6_json(p)
        # percentile rule: s[min(int(n*p/100), n-1)] over the 10 sorted samples.
        self.assertEqual(m, {
            "n_requests": 10, "duration_avg": 5.5, "duration_min": 1.0, "duration_max": 10.0,
            "p50": 6.0, "p90": 10.0, "p95": 10.0, "p99": 10.0,
            "failed": 0, "checks_pass": 3, "checks_fail": 0,
        })

    def test_parse_raw_k6_json_websocket_fallback(self):
        # WebSocket runs have no http_req_duration; ws_session_duration is the
        # latency-equivalent and yields the same dict shape.
        stream = "\n".join(
            json.dumps({"type": "Point", "metric": "ws_session_duration", "data": {"value": v}})
            for v in (100.0, 200.0, 300.0)
        ) + "\n"
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "baseline_run1.json"
            p.write_text(stream)
            m = R.parse_raw_k6_json(p)
        self.assertEqual(m["n_requests"], 3)        # 3 sessions = throughput-equiv
        self.assertEqual(m["duration_avg"], 200.0)  # session-duration latency-equiv
        self.assertEqual(m["p50"], 200.0)
        self.assertEqual(set(m), {
            "n_requests", "duration_avg", "duration_min", "duration_max",
            "p50", "p90", "p95", "p99", "failed", "checks_pass", "checks_fail",
        })

    def test_parse_raw_k6_json_missing_file_is_none(self):
        self.assertIsNone(R.parse_raw_k6_json(Path("/nonexistent/x.json")))

    def test_parse_raw_k6_json_rejects_malformed_lines(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "baseline_run1.json"
            p.write_text("{not-json}\n", encoding="utf-8")

            with self.assertRaises(ValueError):
                R.parse_raw_k6_json(p)

    def test_parse_raw_k6_json_rejects_non_object_records(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "baseline_run1.json"
            p.write_text("[]\n", encoding="utf-8")

            with self.assertRaises(ValueError):
                R.parse_raw_k6_json(p)

    def test_parse_stats_json_units(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "s.json"
            p.write_text(json.dumps(
                {"CPUPerc": "12.50%", "MemUsage": "8MiB / 23GiB", "MemPerc": "0.03%", "Name": "rl-go-bench"}
            ))
            s = R.parse_stats_json(p)
        self.assertAlmostEqual(s["cpu_pct"], 12.5)
        self.assertAlmostEqual(s["mem_mb"], 8.0)   # 8 MiB -> 8.0 MB-as-MiB
        self.assertAlmostEqual(s["mem_pct"], 0.03)
        self.assertEqual(s["container"], "rl-go-bench")


if __name__ == "__main__":
    unittest.main()
