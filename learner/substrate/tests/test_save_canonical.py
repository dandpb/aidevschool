"""Tests for the substrate-owned gated write seam."""

from __future__ import annotations

import unittest
from pathlib import Path

import yaml

from learner.substrate import is_repo_canonical_path, save_canonical, validate
from learner.substrate.fsio import atomic_write_text


class TestSaveCanonical(unittest.TestCase):
    def test_atomic_write_roundtrip(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "nested" / "state.yaml"
            atomic_write_text(path, "hello: world\n")
            self.assertEqual(path.read_text(encoding="utf-8"), "hello: world\n")

    def test_save_canonical_rejects_invalid_state(self) -> None:
        with self.assertRaises(ValueError):
            save_canonical({"version": 1}, path="/tmp/should-not-exist-aidevschool.yaml")

    def test_is_repo_canonical_path(self) -> None:
        self.assertTrue(is_repo_canonical_path("learner/learning_state.yaml"))
        self.assertFalse(is_repo_canonical_path("/tmp/learner/learning_state.yaml"))

    def test_save_canonical_writes_valid_tmp_state(self) -> None:
        import tempfile

        state = {
            "version": 2,
            "system": "agora-continuum",
            "learner": {
                "id": "t",
                "level": "intermediate",
                "languages": ["go"],
                "active_language": "go",
                "aidi": {"current": 0.34, "threshold_amber": 0.6, "threshold_red": 0.75},
            },
            "active_unit": {
                "id": "U-test",
                "state": "evaluating",
                "retry_count": 0,
                "retry_limit": 3,
            },
            "empirical_gates": {
                "learning": {"requires_attempt_before_solution": True}
            },
            "units_log": [],
            "streak": {
                "current": 0,
                "longest": 0,
                "last_gate_date": None,
                "freezes": {"equipped": 2, "max": 2},
            },
        }
        self.assertEqual(validate(state), [])
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "learning_state.yaml"
            save_canonical(state, path)
            loaded = yaml.safe_load(path.read_text(encoding="utf-8"))
            self.assertEqual(loaded["active_unit"]["id"], "U-test")


if __name__ == "__main__":
    unittest.main()
