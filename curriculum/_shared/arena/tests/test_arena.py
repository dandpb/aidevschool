"""Tests for arena orchestration: fail-closed gate, scoreboard winners, and
locked-report assembly."""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))

from curriculum._shared import arena as A
from curriculum._shared.benchmarks import runner as R

REPO = Path(__file__).resolve().parents[4]
PROJ01 = REPO / "curriculum" / "01_rate_limiter"


def make_cfg():
    return R.BenchmarkConfig(
        container_prefix="rl",
        images={"go": "rl-go", "rust": "rl-rust", "node": "rl-node"},
        ports={"go": 8080, "rust": 8082, "node": 8081},
        host_ports={"go": 18080},
        scenarios=("baseline", "stress", "spike", "endurance"),
    )


def _k6_stream(durations):
    return "\n".join(
        json.dumps({"type": "Point", "metric": "http_req_duration", "data": {"value": d}})
        for d in durations
    ) + "\n"


def _stats(mem_mib):
    return json.dumps(
        {"CPUPerc": "5.00%", "MemUsage": f"{mem_mib}MiB / 23GiB", "MemPerc": "0.1%", "Name": "c"}
    )


def seed_all_pass(proj: Path, cfg, *, mem_by_lang):
    """Seed 3 stable runs per lang/scenario so the analyzer gate passes (N=3, CV~0)."""
    # Distinct, stable latency per lang so winners are deterministic: rust < go < node.
    lat = {"rust": [4.0, 4.0, 4.0], "go": [6.0, 6.0, 6.0], "node": [9.0, 9.0, 9.0]}
    for lang in R.LANGS:
        for sc in cfg.scenarios:
            for run in (1, 2, 3):
                R.result_path(proj, lang, sc, run).parent.mkdir(parents=True, exist_ok=True)
                R.result_path(proj, lang, sc, run).write_text(_k6_stream(lat[lang]))
                R.result_path(proj, lang, sc, run, "_stats.json").write_text(_stats(mem_by_lang[lang]))


class TestFailClosed(unittest.TestCase):
    def test_n1_committed_data_fails_closed(self):
        # Project 01's committed data is N=1 -> cannot pass the N>=3 gate.
        res = A.run_arena(PROJ01, "01_rate_limiter", run_id="t0", n=1)
        self.assertFalse(res.gate_passed)
        self.assertIsNone(res.report_path)  # no revealable report written
        self.assertEqual(res.winners, {})


class TestScoreboardAndAssembly(unittest.TestCase):
    def test_all_pass_writes_locked_report_with_winners(self):
        cfg = make_cfg()
        with tempfile.TemporaryDirectory() as d:
            proj = Path(d)
            # rust lowest latency; rust lowest memory; throughput equal -> first lang (go).
            seed_all_pass(proj, cfg, mem_by_lang={"go": 12, "rust": 8, "node": 40})
            res = A.run_arena(proj, "02_key_value_store", run_id="2026-06-25T18:00:00Z", n=3, cfg=cfg)

            self.assertTrue(res.gate_passed)
            self.assertEqual(res.winners["latency"], "rust")
            self.assertEqual(res.winners["memory"], "rust")
            self.assertIn(res.winners["throughput"], R.LANGS)

            self.assertIsNotNone(res.report_path)
            text = res.report_path.read_text()
            self.assertIn("gate: locked", text)          # never revealed by run_arena
            self.assertIn("project: 02_key_value_store", text)
            self.assertIn("**rust**", text)              # winner highlighted in scoreboard
            self.assertIn("_pending", text)              # narrative/prediction placeholders
            self.assertIn("benchmark_results.md", text)  # links canonical docs
            self.assertNotIn('"value"', text)            # no raw sample arrays inlined

    def test_scoreboard_winner_direction(self):
        cfg = make_cfg()
        with tempfile.TemporaryDirectory() as d:
            proj = Path(d)
            seed_all_pass(proj, cfg, mem_by_lang={"go": 12, "rust": 8, "node": 40})
            report = R.aggregate(proj, cfg, "p", 3)
            board, winners, trust = A.scoreboard(report)
            # latency lower-is-better -> rust (4ms) wins over go (6) and node (9).
            self.assertEqual(winners["latency"], "rust")
            self.assertTrue(trust["latency"])  # stable seed -> trustworthy
            self.assertIn("↓", board)  # lower-is-better arrow present


class TestDecisionGate(unittest.TestCase):
    """The trust gate evaluates only decision metrics (p99/n_requests/mem_mb)."""

    def _report(self, p99, dur_max):
        from curriculum._shared.benchmarks.analyzer import BenchmarkAnalyzer
        raw = {"baseline": {}}
        for lang in R.LANGS:
            raw["baseline"][lang] = [
                {"p99": v, "n_requests": 100, "mem_mb": 10.0, "duration_max": d}
                for v, d in zip(p99, dur_max)
            ]
        return BenchmarkAnalyzer().analyze_raw_samples("p", raw)

    def test_passes_when_decision_metrics_stable_despite_noisy_incidental(self):
        # p99/n_requests/mem_mb stable (CV 0); duration_max wildly noisy.
        rep = self._report(p99=[5.0, 5.0, 5.0], dur_max=[10.0, 50.0, 200.0])
        self.assertTrue(A.decision_gate(rep))     # decision metrics trustworthy
        self.assertFalse(rep.all_pass)            # analyzer's all-metric gate would reject

    def test_fails_when_a_decision_metric_is_noisy(self):
        rep = self._report(p99=[5.0, 20.0, 80.0], dur_max=[10.0, 10.0, 10.0])
        self.assertFalse(A.decision_gate(rep))    # p99 CV too high -> not trustworthy

    def test_partial_trust_declares_only_trustworthy_winners(self):
        # The real KV case: throughput/memory stable, p99 latency noisy.
        from curriculum._shared.benchmarks.analyzer import BenchmarkAnalyzer
        raw = {"baseline": {}}
        p99 = {"go": [5.0, 50.0, 200.0], "rust": [4.0, 40.0, 180.0], "node": [9.0, 90.0, 250.0]}
        nreq = {"go": 100, "rust": 90, "node": 80}
        for lang in R.LANGS:
            raw["baseline"][lang] = [
                {"p99": v, "n_requests": nreq[lang], "mem_mb": 10.0} for v in p99[lang]
            ]
        rep = BenchmarkAnalyzer().analyze_raw_samples("p", raw)
        board, winners, trust = A.scoreboard(rep)
        self.assertFalse(trust["latency"])             # p99 too noisy
        self.assertTrue(trust["throughput"])           # n_requests stable
        self.assertNotIn("latency", winners)           # no latency winner declared
        self.assertEqual(winners["throughput"], "go")  # 100 > 90 > 80
        self.assertIn("untrustworthy", board)
        self.assertTrue(A.decision_gate(rep) is False) # strict gate still False (latency fails)

    def test_run_arena_fails_closed_when_only_one_metric_is_trustworthy(self):
        cfg = R.BenchmarkConfig(
            container_prefix="kv",
            images={"go": "kv-go", "rust": "kv-rust", "node": "kv-node"},
            ports={"go": 8080, "rust": 8082, "node": 8081},
            host_ports={},
            scenarios=("baseline",),
        )
        with tempfile.TemporaryDirectory() as d:
            proj = Path(d)
            p99 = {
                "go": [5.0, 50.0, 200.0],
                "rust": [4.0, 40.0, 180.0],
                "node": [9.0, 90.0, 250.0],
            }
            nreq = {"go": 100, "rust": 90, "node": 80}
            for lang in R.LANGS:
                for run, p99_value in enumerate(p99[lang], 1):
                    path = R.result_path(proj, lang, "baseline", run)
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_text(
                        json.dumps({
                            "type": "Point",
                            "metric": "http_req_duration",
                            "data": {"value": p99_value},
                        }) + "\n" + json.dumps({
                            "type": "Point",
                            "metric": "checks",
                            "data": {"value": 1},
                        }) + "\n",
                        encoding="utf-8",
                    )
                    R.result_path(proj, lang, "baseline", run, "_stats.json").write_text(
                        _stats(10.0),
                        encoding="utf-8",
                    )
                    summary = {"metrics": {"iterations": {"count": nreq[lang]}}}
                    R.result_path(proj, lang, "baseline", run, "_summary.json").write_text(
                        json.dumps(summary),
                        encoding="utf-8",
                    )

            res = A.run_arena(proj, "02_key_value_store", run_id="partial", n=3, cfg=cfg)

        self.assertFalse(res.gate_passed)
        self.assertIsNone(res.report_path)
        self.assertEqual(res.winners, {})

    def test_fails_on_insufficient_samples(self):
        from curriculum._shared.benchmarks.analyzer import BenchmarkAnalyzer
        raw = {"baseline": {l: [{"p99": 5.0, "n_requests": 100, "mem_mb": 10.0}] for l in R.LANGS}}
        rep = BenchmarkAnalyzer().analyze_raw_samples("p", raw)
        self.assertFalse(A.decision_gate(rep))    # N=1 < 3


if __name__ == "__main__":
    unittest.main()
