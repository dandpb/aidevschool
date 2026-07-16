"""Tests for the substrate-owned gated write seam."""

from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path
from typing import Any
from unittest.mock import patch

import yaml

import learner.substrate as substrate
from learner.substrate import commit_canonical, is_repo_canonical_path, save_canonical, validate
from learner.substrate.catalog import CatalogFormatError
from learner.substrate.fsio import atomic_write_text


def _mastered_state(
    root: Path,
    evidence: dict[str, Any],
    *,
    attempt_file: str = "learner/attempts/attempt.md",
) -> dict[str, Any]:
    evidence_path = root / "evidence.json"
    evidence_path.write_text(json.dumps(evidence), encoding="utf-8")
    return {
        "version": 2,
        "system": "agora-continuum",
        "learner": {
            "id": "test",
            "level": "intermediate",
            "aidi": {
                "current": 0.2,
                "threshold_amber": 0.6,
                "threshold_red": 0.75,
                "measurement_source": "self_reported",
                "history": [],
            },
        },
        "active_unit": {
            "id": "U-test",
            "project": "01_test",
            "state": "mastered",
            "retry_count": 0,
            "retry_limit": 3,
        },
        "empirical_gates": {
            "learning": {"requires_attempt_before_solution": True}
        },
        "units_log": [
            {
                "unit_id": "U-test",
                "project": "01_test",
                "mastered": True,
                "attempt_file": attempt_file,
                "evidence_file": "evidence.json",
                "reviews": [
                    {
                        "event": "gate",
                        "gate_outcome": "pass_first_try",
                        "rating": "good",
                    }
                ],
            }
        ],
        "streak": {
            "current": 0,
            "longest": 0,
            "last_gate_date": None,
            "freezes": {"equipped": 2, "max": 2},
        },
    }


class TestSaveCanonical(unittest.TestCase):
    def test_validate_and_save_reject_bare_producer_pass(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            attempt = root / "learner" / "attempts" / "attempt.md"
            attempt.parent.mkdir(parents=True)
            attempt.write_text("attempt", encoding="utf-8")
            state = _mastered_state(root, {"pass": True})

            errors = validate(state, root)

            self.assertTrue(any("independent verifier" in error for error in errors))
            with self.assertRaisesRegex(ValueError, "independent verifier"):
                save_canonical(state, root / "learner" / "learning_state.yaml")

    def test_validate_rejects_mastered_attempt_outside_attempts_root(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            state = _mastered_state(
                root,
                {
                    "verifier": {
                        "verdict": "PASS",
                        "mutation_score": 0.65,
                        "coverage_core": 0.8,
                        "context_isolated": True,
                    }
                },
                attempt_file="/etc/hosts",
            )

            errors = validate(state, root)

            self.assertTrue(any("repository root" in error for error in errors))
            with self.assertRaisesRegex(ValueError, "repository root"):
                save_canonical(state, root / "learner" / "learning_state.yaml")

    def test_validate_and_save_reject_mastered_attempt_symlink_escape(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            attempts = root / "learner" / "attempts"
            attempts.mkdir(parents=True)
            outside = root / "outside.md"
            outside.write_text("attempt", encoding="utf-8")
            (attempts / "escape.md").symlink_to(outside)
            state = _mastered_state(
                root,
                {
                    "verifier": {
                        "verdict": "PASS",
                        "mutation_score": 0.65,
                        "coverage_core": 0.8,
                        "context_isolated": True,
                    }
                },
                attempt_file="learner/attempts/escape.md",
            )

            errors = validate(state, root)

            self.assertTrue(any("symlink" in error for error in errors))
            with self.assertRaisesRegex(ValueError, "symlink"):
                save_canonical(state, root / "learner" / "learning_state.yaml")

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
                "aidi": {
                    "current": 0.34,
                    "threshold_amber": 0.6,
                    "threshold_red": 0.75,
                    "measurement_source": "self_reported",
                    "history": [],
                },
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
            "units_log": [
                {"unit_id": "U-test", "concept": "test concept", "reviews": []}
            ],
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

    def test_commit_canonical_preserves_files_when_projection_build_fails(self) -> None:
        import tempfile

        state = {
            "version": 2,
            "system": "agora-continuum",
            "learner": {
                "id": "t",
                "level": "intermediate",
                "languages": ["go"],
                "active_language": "go",
                "aidi": {
                    "current": 0.34,
                    "threshold_amber": 0.6,
                    "threshold_red": 0.75,
                    "measurement_source": "self_reported",
                    "history": [],
                },
            },
            "active_unit": {
                "id": "U-before",
                "state": "evaluating",
                "retry_count": 0,
                "retry_limit": 3,
            },
            "empirical_gates": {
                "learning": {"requires_attempt_before_solution": True}
            },
            "units_log": [
                {"unit_id": "U-before", "concept": "test concept", "reviews": []}
            ],
            "streak": {
                "current": 0,
                "longest": 0,
                "last_gate_date": None,
                "freezes": {"equipped": 2, "max": 2},
            },
        }
        candidate = yaml.safe_load(yaml.safe_dump(state))
        candidate["active_unit"]["id"] = "U-after"
        candidate["units_log"][0]["unit_id"] = "U-after"

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            canonical = root / "learner" / "learning_state.yaml"
            projection = root / "curriculum" / "BACKLOG_STATUS.md"
            save_canonical(state, canonical)
            projection.parent.mkdir(parents=True, exist_ok=True)
            projection.write_text("stable projection\n", encoding="utf-8")
            (root / "curriculum" / "catalog.md").write_text(
                "## Level 1\n### 01. Malformed\n",
                encoding="utf-8",
            )
            canonical_hash = hashlib.sha256(canonical.read_bytes()).hexdigest()
            projection_hash = hashlib.sha256(projection.read_bytes()).hexdigest()

            with patch.multiple(
                substrate,
                ROOT=root,
                SOURCE_ROOT=root,
                CANONICAL_STATE_PATH=canonical,
            ):
                with self.assertRaises(CatalogFormatError):
                    commit_canonical(candidate, canonical)

            self.assertEqual(hashlib.sha256(canonical.read_bytes()).hexdigest(), canonical_hash)
            self.assertEqual(hashlib.sha256(projection.read_bytes()).hexdigest(), projection_hash)


if __name__ == "__main__":
    unittest.main()
