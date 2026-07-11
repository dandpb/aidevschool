"""Tests for the append-only arena prediction log writer."""

import sys
import tempfile
import unittest
from pathlib import Path

import yaml
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))

from curriculum._shared.arena import predictions as P


def rec(metric, correct, **extra):
    return {
        "project": "01_rate_limiter", "run": "2026-06-25T18:00:00Z",
        "metric": metric, "predicted": "rust",
        "actual": "rust" if correct else "go", "correct": correct, **extra,
    }


class TestAppend(unittest.TestCase):
    def test_writer_delegates_to_learner_substrate(self):
        record = rec("latency", True)
        path = Path("custom-predictions.yaml")

        with patch.object(P, "record_prediction", return_value=path) as store:
            returned = P.append_prediction(record, path)

        store.assert_called_once_with(record, path)
        self.assertEqual(returned, path)

    def test_append_only_preserves_existing_bytes(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "predictions.yaml"
            P.append_prediction(rec("latency", True), p)
            P.append_prediction(rec("memory", False), p)
            after_two = p.read_text()
            P.append_prediction(rec("throughput", True), p)
            after_three = p.read_text()
            # Genuine append: the first two records' bytes are untouched.
            self.assertTrue(after_three.startswith(after_two))
            data = yaml.safe_load(after_three)
            self.assertEqual(len(data["predictions"]), 3)
            self.assertEqual(data["predictions"][0]["metric"], "latency")

    def test_optional_reason_round_trips(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "p.yaml"
            P.append_prediction(rec("latency", True, reason="ownership avoids GC"), p)
            data = yaml.safe_load(p.read_text())
            self.assertEqual(data["predictions"][0]["reason"], "ownership avoids GC")

    def test_record_without_reason_is_accepted(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "p.yaml"
            P.append_prediction(rec("memory", False), p)
            data = yaml.safe_load(p.read_text())
            self.assertNotIn("reason", data["predictions"][0])

    def test_invalid_metric_raises(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError):
                P.append_prediction(rec("cpu", True), Path(d) / "p.yaml")


if __name__ == "__main__":
    unittest.main()
