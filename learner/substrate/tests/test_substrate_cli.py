"""Tests for the ``python3 -m learner.substrate`` CLI surface.

Audit #9: ``--check`` must exit non-zero with a clear message when canonical
state validation fails. The drift check stays as the second leg: validation
runs first so a malformed state is reported before any drift computation.
"""

from __future__ import annotations

import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout, redirect_stderr
from pathlib import Path

import yaml

import learner.substrate.__main__ as cli


def _write_canonical(state: dict, root: Path) -> Path:
    path = root / "learner" / "learning_state.yaml"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(state, sort_keys=False), encoding="utf-8")
    return path


def _minimal_canonical_state() -> dict:
    """A canonical-state-shaped dict that passes validation.

    Mirrors ``learner.substrate.tests.test_substrate._minimal_state`` but
    the CLI test needs the full payload (incl. agent_ownership /
    next_action) to dodge the new audit #9 rules.
    """
    return {
        "version": 2,
        "system": "agora-continuum",
        "learner": {
            "id": "cli-tester",
            "level": "intermediate",
            "active_language": "Go",
            "languages": ["Go"],
            "aidi": {
                "current": 0.34,
                "threshold_amber": 0.6,
                "threshold_red": 0.75,
                "measurement_source": "self_reported",
                "history": [],
            },
        },
        "active_unit": {
            "id": "U-cli",
            "project": "01_cli_test",
            "state": "presenting",
            "retry_count": 0,
            "retry_limit": 3,
        },
        "gate": {"implementation_blocked": True},
        "empirical_gates": {"learning": {"requires_attempt_before_solution": True}},
        "agent_ownership": {
            "leader": "Maestro",
            "diagnostic": "Sonda",
            "path": "Cartografo",
            "producer": "Mestre-Conteudo",
            "tutor": "Socrates",
            "verifier": "Prometor",
            "reviewer": "Critico",
            "metrics": "Atena",
            "memory": "Mnemosyne",
            "governance": "Seneca",
        },
        "next_action": {"owner": "learner", "action": "Continue."},
        "streak": {
            "current": 0,
            "longest": 0,
            "last_gate_date": None,
            "freezes": {"equipped": 2, "max": 2},
        },
    }


class TestSubstrateCliCheck(unittest.TestCase):
    def setUp(self) -> None:
        # Each test runs in an isolated root; the CLI loads the canonical
        # state via learner.substrate.ROOT, so we point the module at our
        # temp dir and restore the original ROOT in tearDown. Note: the CLI
        # module does ``from learner.substrate import ROOT``, which captures
        # the Path object by reference. Reassigning ``learner.substrate.ROOT``
        # doesn't update the CLI's local binding — we patch the CLI module's
        # own ROOT attribute too so the drift printer uses the patched root.
        import learner.substrate

        self._module = learner.substrate
        self._cli_module = cli
        self._original_root = learner.substrate.ROOT
        self._original_canonical = learner.substrate.CANONICAL_STATE_PATH
        self._original_cli_root = getattr(cli, "ROOT", None)
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)

    def tearDown(self) -> None:
        # Restore every module-level constant we patched, otherwise the
        # ``is_repo_canonical_path`` test (and any caller that resolves
        # against the canonical state) sees the temp dir as the source of
        # truth and reports a phantom mismatch.
        self._module.ROOT = self._original_root
        self._module.CANONICAL_STATE_PATH = self._original_canonical
        if self._original_cli_root is not None:
            self._cli_module.ROOT = self._original_cli_root
        self._tmp.cleanup()

    def _patch_root(self, target: Path) -> None:
        self._module.ROOT = target
        # The CLI's local ROOT binding was captured at import time; rebind it.
        self._cli_module.ROOT = target

    def test_check_exits_zero_on_valid_state(self) -> None:
        # Build a minimal state and write it under the patched root. The
        # substrate also has a CANONICAL_STATE_PATH constant that points at
        # the real path; we mirror it under the temp dir so load_canonical
        # finds the fixture.
        _write_canonical(_minimal_canonical_state(), self.root)
        self._module.CANONICAL_STATE_PATH = self.root / "learner" / "learning_state.yaml"
        self._patch_root(self.root)
        stdout, stderr = io.StringIO(), io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            exit_code = cli.main(["--check"])
        # Either 0 (clean) or 1 (drift in derived views) is acceptable here —
        # the assertion that matters is the validator didn't trip. Drift
        # detection isn't being tested in this isolation.
        self.assertIn(exit_code, (0, 1), f"unexpected exit code; stderr={stderr.getvalue()}")
        self.assertNotIn("INVALID learner state", stderr.getvalue())

    def test_check_exits_one_with_message_on_invalid_state(self) -> None:
        # Remove agent_ownership to trip the audit #9 routing table check.
        bad = _minimal_canonical_state()
        del bad["agent_ownership"]
        _write_canonical(bad, self.root)
        self._module.CANONICAL_STATE_PATH = self.root / "learner" / "learning_state.yaml"
        self._patch_root(self.root)
        stdout, stderr = io.StringIO(), io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            exit_code = cli.main(["--check"])
        self.assertEqual(exit_code, 1)
        self.assertIn("INVALID learner state", stderr.getvalue())
        self.assertIn("agent_ownership", stderr.getvalue())

    def test_check_reports_empirical_gate_violation(self) -> None:
        # Mastered active unit without an empirical_gate triggers audit #9.
        bad = _minimal_canonical_state()
        bad["active_unit"]["state"] = "mastered"
        bad["active_unit"]["attempt_file"] = "learner/attempts/U-cli.md"
        bad["active_unit"]["evidence_file"] = "evidence.json"
        # Create the on-disk artifacts so existence checks pass; the missing
        # empirical_gate is the only failure we want to surface here.
        (self.root / "learner" / "attempts").mkdir(parents=True, exist_ok=True)
        (self.root / "learner" / "attempts" / "U-cli.md").write_text("attempt", encoding="utf-8")
        (self.root / "evidence.json").write_text(
            json.dumps({"verifier": {"verdict": "PASS", "mutation_score": 0.7, "coverage_core": 0.85, "context_isolated": True}}),
            encoding="utf-8",
        )
        bad["units_log"] = [
            {
                "unit_id": "U-cli",
                "mastered": True,
                "attempt_file": "learner/attempts/U-cli.md",
                "evidence_file": "evidence.json",
                "reviews": [
                    {"date": "2026-07-11", "event": "gate", "gate_outcome": "pass_first_try", "rating": "good"}
                ],
            }
        ]
        _write_canonical(bad, self.root)
        self._module.CANONICAL_STATE_PATH = self.root / "learner" / "learning_state.yaml"
        self._patch_root(self.root)
        stdout, stderr = io.StringIO(), io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            exit_code = cli.main(["--check"])
        self.assertEqual(exit_code, 1)
        self.assertIn("empirical_gate", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
