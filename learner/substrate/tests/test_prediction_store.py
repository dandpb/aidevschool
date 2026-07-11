from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import yaml

from learner.substrate.prediction_store import PredictionRecordError, record_prediction


def _record(metric: str) -> dict[str, str | bool]:
    return {
        "project": "01_rate_limiter",
        "run": "2026-06-25T18:00:00Z",
        "metric": metric,
        "predicted": "rust",
        "actual": "go",
        "correct": False,
    }


class TestPredictionStore(unittest.TestCase):
    def test_record_prediction_atomically_appends_to_temporary_store(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "predictions.yaml"

            record_prediction(_record("latency"), path)
            record_prediction(_record("memory"), path)

            data = yaml.safe_load(path.read_text(encoding="utf-8"))
            self.assertEqual([item["metric"] for item in data["predictions"]], ["latency", "memory"])

    def test_invalid_metric_does_not_create_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "predictions.yaml"

            with self.assertRaises(PredictionRecordError):
                record_prediction(_record("cpu"), path)

            self.assertFalse(path.exists())

    def test_required_record_fields_reject_empty_values(self) -> None:
        for field in ("project", "run", "metric", "predicted", "actual"):
            with self.subTest(field=field), tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp) / "predictions.yaml"
                record = _record("latency")
                record[field] = ""

                with self.assertRaises(PredictionRecordError) as raised:
                    record_prediction(record, path)

                self.assertEqual(raised.exception.field, field)
                self.assertFalse(path.exists())

    def test_correct_is_derived_from_verified_winners(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "predictions.yaml"
            record = _record("latency")
            record["actual"] = "rust"
            record["correct"] = False

            record_prediction(record, path)

            data = yaml.safe_load(path.read_text(encoding="utf-8"))
            self.assertIs(data["predictions"][0]["correct"], True)

    def test_malformed_existing_store_raises_typed_error(self) -> None:
        malformed_stores = {
            "root": "- not-a-mapping\n",
            "predictions": "predictions: {}\n",
            "predictions[0]": "predictions:\n  - not-a-mapping\n",
            "predictions[0].project": "predictions:\n  - project: ''\n",
            "predictions[0].correct": (
                "predictions:\n"
                "  - project: 01_rate_limiter\n"
                "    run: '2026-06-25T18:00:00Z'\n"
                "    metric: latency\n"
                "    predicted: rust\n"
                "    actual: go\n"
                "    correct: true\n"
            ),
            "yaml": "predictions: [\n",
        }
        for expected_field, content in malformed_stores.items():
            with self.subTest(expected_field=expected_field), tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp) / "predictions.yaml"
                path.write_text(content, encoding="utf-8")

                with self.assertRaises(PredictionRecordError) as raised:
                    record_prediction(_record("latency"), path)

                self.assertEqual(raised.exception.field, expected_field)


if __name__ == "__main__":
    unittest.main()
