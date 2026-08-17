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
from learner.substrate import _AGENT_OWNERSHIP_ROLES, commit_canonical, is_repo_canonical_path, save_canonical, validate
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

    def test_atomic_write_survives_mid_write_failure_on_existing_file(self) -> None:
        """A crash mid-write must leave the previous file intact (audit #1).

        Mocks the inner write to raise mid-flight and asserts the original
        file content is unchanged: callers (verifier, substrate, evidence
        writer) depend on this to avoid leaving a torn YAML/JSON on disk.
        """
        import tempfile
        from io import StringIO

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "state.yaml"
            original = "id: canonical\nversion: 2\n"
            path.write_text(original, encoding="utf-8")
            original_hash = hashlib.sha256(path.read_bytes()).hexdigest()

            # Inject a failure after the temp file is created but before the
            # os.replace() publishes it. The test asserts the original file is
            # untouched and no `.tmp` is left behind.
            from unittest.mock import patch

            real_write = atomic_write_text

            def _explode_on_write(*args: Any, **kwargs: Any) -> None:
                # Call the real implementation but force handle.write to raise
                # *after* the temp file exists; this is the failure mode the
                # audit called out (plain .write_text vs atomic rename).
                fake_buffer = StringIO()

                def _boom(_buf: str) -> int:
                    raise OSError("simulated mid-write crash")

                fake_buffer.write = _boom  # type: ignore[method-assign]
                with patch("os.fdopen", return_value=fake_buffer):
                    real_write(*args, **kwargs)

            with self.assertRaises(OSError):
                _explode_on_write(path, "id: corrupted\nversion: 999\n")

            # Original file is byte-for-byte unchanged.
            self.assertEqual(
                hashlib.sha256(path.read_bytes()).hexdigest(),
                original_hash,
            )
            self.assertEqual(path.read_text(encoding="utf-8"), original)
            # No temp file left behind in the same dir.
            leftovers = [p for p in path.parent.iterdir() if p.name != path.name]
            self.assertEqual(leftovers, [], f"temp file leaked: {leftovers}")

    def test_atomic_write_creates_parent_dirs(self) -> None:
        """A nested path with missing parents is still written atomically."""
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "deep" / "nest" / "state.yaml"
            atomic_write_text(path, "ok: yes\n")
            self.assertEqual(path.read_text(encoding="utf-8"), "ok: yes\n")

    def test_atomic_write_propagates_oserror_without_leaving_tempfile(self) -> None:
        """A failure to create the temp file surfaces as OSError; nothing leaks."""
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "state.yaml"
            with patch("tempfile.mkstemp", side_effect=OSError("mkstemp failed")):
                with self.assertRaises(OSError):
                    atomic_write_text(path, "anything\n")
            self.assertFalse(path.exists())
            leftovers = [p for p in path.parent.iterdir()]
            self.assertEqual(leftovers, [], f"temp file leaked: {leftovers}")

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
            "agent_ownership": {role: f"agent-{role}" for role in _AGENT_OWNERSHIP_ROLES},
            "next_action": {"owner": "learner", "action": "Continue the active unit."},
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
            "agent_ownership": {role: f"agent-{role}" for role in _AGENT_OWNERSHIP_ROLES},
            "next_action": {"owner": "learner", "action": "Continue the active unit."},
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
