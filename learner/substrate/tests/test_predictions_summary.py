"""Tests for the substrate's prediction-summary aggregation (ADR-004).

Verifies per-metric correct/total counts, that build_snapshot exposes the
additive `predictions` field, and that building the snapshot never mutates the
canonical `learning_state.yaml`.
"""

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from learner.substrate import dashboard_snapshot as DS
from learner.substrate import predictions_summary as PS

REPO = Path(__file__).resolve().parents[3]


def rec(metric, correct):
    return {
        "project": "01", "run": "t", "metric": metric,
        "predicted": "rust", "actual": "rust" if correct else "go", "correct": correct,
    }


class TestPredictionsSummary(unittest.TestCase):
    def test_by_metric_aggregation(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "predictions.yaml"
            p.write_text(
                "predictions:\n"
                f"  - {rec('latency', True)}\n"
                f"  - {rec('latency', False)}\n"
                f"  - {rec('memory', True)}\n",
                encoding="utf-8",
            )
            s = PS.summarize_predictions(p)
            self.assertEqual(s["count"], 3)
            self.assertEqual(s["byMetric"]["latency"], {"correct": 1, "total": 2})
            self.assertEqual(s["byMetric"]["memory"], {"correct": 1, "total": 1})
            self.assertEqual(s["byMetric"]["throughput"], {"correct": 0, "total": 0})

    def test_missing_file_yields_zeroed_stable_shape(self):
        s = PS.summarize_predictions(Path("/nonexistent/predictions.yaml"))
        self.assertEqual(s["count"], 0)
        self.assertEqual(set(s["byMetric"]), {"latency", "memory", "throughput"})

    def test_untrustworthy_actuals_are_unscored(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "predictions.yaml"
            p.write_text(
                "predictions:\n"
                f"  - {rec('latency', False) | {'actual': 'untrustworthy'}}\n"
                f"  - {rec('throughput', True)}\n",
                encoding="utf-8",
            )
            s = PS.summarize_predictions(p)
        self.assertEqual(s["count"], 1)
        self.assertEqual(s["byMetric"]["latency"], {"correct": 0, "total": 0})
        self.assertEqual(s["byMetric"]["throughput"], {"correct": 1, "total": 1})

    def test_build_snapshot_includes_predictions_without_mutating_state(self):
        state = REPO / "learner" / "learning_state.yaml"
        before = state.read_bytes()
        snap = DS.build_snapshot()
        self.assertIn("predictions", snap)
        self.assertIn("byMetric", snap["predictions"])
        self.assertEqual(state.read_bytes(), before)  # canonical state untouched


if __name__ == "__main__":
    unittest.main()
