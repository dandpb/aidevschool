"""Tests for the hard prediction gate + reveal."""

import sys
import tempfile
import unittest
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))

from curriculum._shared import arena as A
from curriculum._shared.arena import gate as G
from curriculum._shared.benchmarks import runner as R

# Reuse the all-pass seeding helper from the arena module tests.
from curriculum._shared.arena.tests.test_arena import make_cfg, seed_all_pass


def locked_report(tmp: Path) -> tuple[Path, dict]:
    cfg = make_cfg()
    seed_all_pass(tmp, cfg, mem_by_lang={"go": 12, "rust": 8, "node": 40})
    res = A.run_arena(tmp, "02_key_value_store", run_id="2026-06-25T18:00:00Z", n=3, cfg=cfg)
    return res.report_path, res.winners


class TestHardGate(unittest.TestCase):
    def test_missing_metric_keeps_report_locked(self):
        with tempfile.TemporaryDirectory() as d:
            tmp = Path(d)
            report, winners = locked_report(tmp)
            preds_path = tmp / "predictions.yaml"
            with self.assertRaises(ValueError):
                # Only two of three metrics -> hard gate refuses.
                G.commit_predictions(
                    report, "02", "t", {"latency": "rust", "memory": "rust"},
                    winners, predictions_path=preds_path,
                )
            self.assertIn("gate: locked", report.read_text())  # still locked
            self.assertFalse(preds_path.exists())               # nothing logged

    def test_missing_actual_winner_keeps_report_locked_and_unlogged(self):
        with tempfile.TemporaryDirectory() as d:
            tmp = Path(d)
            report, winners = locked_report(tmp)
            preds_path = tmp / "predictions.yaml"
            del winners["memory"]
            with self.assertRaises(ValueError):
                G.commit_predictions(
                    report, "02", "t",
                    {"latency": "rust", "memory": "rust", "throughput": "go"},
                    winners, predictions_path=preds_path,
                )
            self.assertIn("gate: locked", report.read_text())
            self.assertFalse(preds_path.exists())

    def test_untrustworthy_actual_winner_keeps_report_locked_and_unlogged(self):
        with tempfile.TemporaryDirectory() as d:
            tmp = Path(d)
            report, winners = locked_report(tmp)
            preds_path = tmp / "predictions.yaml"
            winners["latency"] = "untrustworthy"
            with self.assertRaises(ValueError):
                G.commit_predictions(
                    report, "02", "t",
                    {"latency": "rust", "memory": "rust", "throughput": "go"},
                    winners, predictions_path=preds_path,
                )
            self.assertIn("gate: locked", report.read_text())
            self.assertFalse(preds_path.exists())

    def test_full_predictions_reveal_and_log(self):
        with tempfile.TemporaryDirectory() as d:
            tmp = Path(d)
            report, winners = locked_report(tmp)
            preds_path = tmp / "predictions.yaml"
            predicted = {"latency": "rust", "memory": "rust", "throughput": "node"}
            records = G.commit_predictions(
                report, "02_key_value_store", "2026-06-25T18:00:00Z",
                predicted, winners, predictions_path=preds_path,
            )
            text = report.read_text()
            self.assertIn("gate: revealed", text)
            self.assertNotIn("gate: locked", text)
            self.assertIn("Your guess", text)            # prediction table rendered
            self.assertEqual(len(records), 3)
            # latency winner is rust (seeded) -> a correct guess.
            lat = next(r for r in records if r["metric"] == "latency")
            self.assertEqual(lat["actual"], "rust")
            self.assertTrue(lat["correct"])
            logged = yaml.safe_load(preds_path.read_text())["predictions"]
            self.assertEqual(len(logged), 3)


if __name__ == "__main__":
    unittest.main()
