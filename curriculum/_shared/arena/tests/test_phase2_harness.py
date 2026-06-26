"""Regression for the Phase-2 (project 02 + 05) benchmark harness artifacts:
configs parse and the four scenario files exist for each project. The live arena
runs are docker-gated and verified separately."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))

from curriculum._shared.benchmarks.runner import load_benchmark_config

REPO = Path(__file__).resolve().parents[4]
SCENARIOS = ("baseline", "stress", "spike", "endurance")


class TestPhase2Harness(unittest.TestCase):
    def _check(self, project, prefix):
        proj = REPO / "curriculum" / project
        cfg = load_benchmark_config(proj / "benchmark.yaml")
        self.assertEqual(cfg.container_prefix, prefix)
        self.assertEqual(set(cfg.images), {"go", "rust", "node"})
        self.assertEqual(cfg.scenarios, SCENARIOS)
        for sc in SCENARIOS:
            self.assertTrue(
                (proj / "benchmarks" / "scenarios" / f"{sc}.js").exists(),
                f"missing {project} scenario {sc}.js",
            )

    def test_02_key_value_store_harness(self):
        self._check("02_key_value_store", "kv")

    def test_05_websocket_chat_harness(self):
        self._check("05_websocket_chat", "ws")


if __name__ == "__main__":
    unittest.main()
