from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from curriculum._shared.evidence import Phase, inspect
from curriculum._shared.tests.test_evidence import _make_challenge


class TestEvidenceReconciliation(unittest.TestCase):
    def test_inspect_reads_bolded_phase_in_status_md(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            _make_challenge(
                tmp,
                status_md="# Status\n\n- **phase:** cycle-complete\n",
            )
            ev = inspect("01_test_project", root=tmp)
            self.assertEqual(ev.phase, Phase.CYCLE_COMPLETE)

    def test_inspect_falls_back_to_learning_state_for_attempt_and_verdict(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _make_challenge(root, project_id="01_rate_limiter")
            attempt = root / "learner" / "attempts" / "u0-attempt.md"
            attempt.parent.mkdir(parents=True, exist_ok=True)
            attempt.write_text("# Learner attempt\n", encoding="utf-8")
            evidence_file = root / "engines" / "pixelDojo" / ".logs" / "evidence.json"
            evidence_file.parent.mkdir(parents=True, exist_ok=True)
            evidence_file.write_text('{"pass": true}\n', encoding="utf-8")
            (root / "learner" / "learning_state.yaml").write_text(
                "units_log:\n"
                "  - unit_id: U0\n"
                "    project: 01_rate_limiter\n"
                "    mastered: true\n"
                "    attempt_file: learner/attempts/u0-attempt.md\n"
                "    evidence_file: engines/pixelDojo/.logs/evidence.json\n",
                encoding="utf-8",
            )
            ev = inspect("01_rate_limiter", root=root)
            self.assertTrue(ev.attempt_present)
            self.assertEqual(ev.verdict.verdict, "PASS")
            self.assertTrue(ev.gate_ready)
