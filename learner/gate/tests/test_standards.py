"""Standards tests: the numeric bar binds to the declared seam.

Threshold binding (C1), per-unit overlay (C2), loud seam failure (C3), and the
shape-detecting evidence gate moved from ``curriculum/_shared/tests/test_evidence.py``
with the judgment (2026-09-13).
"""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import yaml

from learner.gate import standards
from learner.gate.evidence_io import canonical_evidence_digest
from learner.gate.standards import (
    Thresholds,
    ThresholdSeamError,
    VerifierVerdict,
    check_evidence,
    effective_thresholds,
    independently_verified_pass,
    load_thresholds,
    passes_gate,
)
from learner.gate.verifier_receipt import VerifierReceipt, receipt_violations


class _SeamFixture(unittest.TestCase):
    """Pin the empirical bar to a tmp seam; helpers rewrite it in place."""

    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.seam_path = Path(self._tmp.name) / "learner.yaml"
        self._write_seam(0.65, 0.80)
        self._original = standards.DEFAULT_SEAM_PATH
        standards.DEFAULT_SEAM_PATH = self.seam_path

    def tearDown(self) -> None:
        standards.DEFAULT_SEAM_PATH = self._original
        self._tmp.cleanup()

    def _write_seam(self, mutation: float, coverage: float, *, raw: str | None = None) -> None:
        self.seam_path.write_text(
            raw if raw is not None else yaml.safe_dump(
                {"gates": {"mutation_score_min": mutation, "cobertura_nucleo_min": coverage}}
            ),
            encoding="utf-8",
        )


class TestSeamBinding(_SeamFixture):
    """C1 — flipping the seam flips the enforced bar through both gate paths."""

    def test_seam_flip_flips_enforced_bar(self) -> None:
        verifier_block = {
            "verifier": {
                "verdict": "PASS",
                "mutation_score": 0.58,
                "coverage_core": 0.92,
                "context_isolated": True,
            }
        }
        producer = {"unit_id": "U2", "pass": True}
        receipt = VerifierReceipt(
            verdict="PASS",
            context_isolated=True,
            mutation_score=0.58,
            coverage_core=0.92,
            source="test",
            evidence_digest=canonical_evidence_digest(producer),
        )

        # Bar at 0.65 (today's value): mutation 0.58 fails on both paths.
        ok, errors = independently_verified_pass(dict(verifier_block))
        self.assertIsNot(ok, True)
        self.assertTrue(any("0.58" in e for e in errors), errors)
        violations = receipt_violations(receipt, producer)
        self.assertTrue(any("mutation_score" in v for v in violations), violations)

        # Flip the seam to 0.55: the same evidence passes on both paths.
        self._write_seam(0.55, 0.80)
        ok2, errors2 = independently_verified_pass(dict(verifier_block))
        self.assertIs(ok2, True)
        self.assertEqual(errors2, [])
        self.assertEqual(receipt_violations(receipt, producer), [])

    def test_default_seam_path_is_the_declared_one(self) -> None:
        declared = self._original  # setUp pins DEFAULT_SEAM_PATH to a fixture
        self.assertIn("engines/minimaxDojo/config", str(declared))
        self.assertEqual(declared.name, "learner.yaml")
        # The real seam parses and yields in-range values.
        th = load_thresholds(declared)
        self.assertTrue(0.0 <= th.mutation_min <= 1.0)
        self.assertTrue(0.0 <= th.coverage_min <= 1.0)


class TestEffectiveThresholds(_SeamFixture):
    """C2 — a unit's empirical_gate overlays the seam; absent keys fall back."""

    def test_effective_thresholds_overrides_and_falls_back(self) -> None:
        base = load_thresholds()
        self.assertEqual(base, Thresholds(mutation_min=0.65, coverage_min=0.80))
        self.assertEqual(effective_thresholds(None), base)
        self.assertEqual(effective_thresholds({}), base)
        self.assertEqual(
            effective_thresholds({"mutation_min": 0.50}),
            Thresholds(mutation_min=0.50, coverage_min=0.80),
        )
        self.assertEqual(
            effective_thresholds({"mutation_min": 0.50, "min_coverage": 0.70}),
            Thresholds(mutation_min=0.50, coverage_min=0.70),
        )

    def test_unit_overlay_binds_the_verdict(self) -> None:
        verdict = VerifierVerdict(
            mutation_score=0.55, coverage_core=0.90,
            context_isolated=True, verdict="PASS",
        )
        # Against the seam (0.65) it fails…
        self.assertFalse(verdict.verified_pass)
        # …against the unit's own bar (0.50) the same verdict passes.
        blockers = standards.verdict_blockers(
            verdict, effective_thresholds({"mutation_min": 0.50})
        )
        self.assertEqual(blockers, ())


class TestSeamFailure(_SeamFixture):
    """C3 — a missing/malformed seam fails loudly, naming the path, no fallback."""

    def test_missing_seam_raises_naming_path(self) -> None:
        missing = Path(self._tmp.name) / "nope.yaml"
        standards.DEFAULT_SEAM_PATH = missing
        try:
            with self.assertRaises(ThresholdSeamError) as ctx:
                load_thresholds()
        finally:
            standards.DEFAULT_SEAM_PATH = self.seam_path
        self.assertIn("nope.yaml", str(ctx.exception))
        # The existing gate CLI handler catches ValueError; the seam error must
        # stay compatible with it (clean exit 1, not a traceback).
        self.assertIsInstance(ctx.exception, ValueError)

    def test_malformed_seam_raises(self) -> None:
        for raw in (
            "gates: [not, a, mapping]\n",
            "no_gates_block: true\n",
            "gates:\n  mutation_score_min: abc\n  cobertura_nucleo_min: 0.8\n",
            "gates:\n  mutation_score_min: 1.5\n  cobertura_nucleo_min: 0.8\n",
        ):
            with self.subTest(raw=raw):
                self._write_seam(0.65, 0.80, raw=raw)
                with self.assertRaises(ThresholdSeamError) as ctx:
                    load_thresholds()
                self.assertIn("learner.yaml", str(ctx.exception))

    def test_receipt_violations_propagates_seam_error(self) -> None:
        missing = Path(self._tmp.name) / "nope.yaml"
        standards.DEFAULT_SEAM_PATH = missing
        try:
            producer = {"unit_id": "U2", "pass": True}
            receipt = VerifierReceipt(
                verdict="PASS", context_isolated=True,
                mutation_score=0.9, coverage_core=0.9, source="test",
                evidence_digest=canonical_evidence_digest(producer),
            )
            with self.assertRaises(ThresholdSeamError):
                receipt_violations(receipt, producer)
        finally:
            standards.DEFAULT_SEAM_PATH = self.seam_path


class TestPassesGate(_SeamFixture):
    """Moved from curriculum/_shared/tests — shape-detecting evidence gate."""

    def test_passes_gate_curriculum_verifier_block_pass(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            ev_file = Path(tmp) / "evidence.json"
            ev_file.write_text(json.dumps({
                "verifier": {
                    "verdict": "PASS",
                    "mutation_score": 0.71,
                    "coverage_core": 0.92,
                    "context_isolated": True,
                }
            }), encoding="utf-8")
            self.assertTrue(passes_gate(ev_file, root=tmp))
            self.assertEqual(check_evidence(ev_file, root=tmp), [])

    def test_passes_gate_curriculum_fails_low_mutation(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            ev_file = Path(tmp) / "evidence.json"
            ev_file.write_text(json.dumps({
                "verifier": {
                    "verdict": "PASS",
                    "mutation_score": 0.42,
                    "coverage_core": 0.92,
                    "context_isolated": True,
                }
            }), encoding="utf-8")
            self.assertFalse(passes_gate(ev_file, root=tmp))
            errors = check_evidence(ev_file, root=tmp)
            self.assertTrue(any("mutation_score" in e for e in errors))

    def test_passes_gate_curriculum_fails_bad_verdict(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            ev_file = Path(tmp) / "evidence.json"
            ev_file.write_text(json.dumps({
                "verifier": {
                    "verdict": "FAIL",
                    "mutation_score": 0.71,
                    "coverage_core": 0.92,
                    "context_isolated": True,
                }
            }), encoding="utf-8")
            errors = check_evidence(ev_file, root=tmp)
            self.assertTrue(any("FAIL" in e for e in errors))

    def test_passes_gate_curriculum_requires_well_typed_finite_metrics(self) -> None:
        invalid_fields = (
            ("mutation_score", None),
            ("mutation_score", True),
            ("mutation_score", "0.71"),
            ("mutation_score", float("nan")),
            ("coverage_core", None),
            ("coverage_core", False),
            ("coverage_core", "0.92"),
            ("coverage_core", float("nan")),
            ("context_isolated", 1),
        )
        with tempfile.TemporaryDirectory() as tmp:
            ev_file = Path(tmp) / "evidence.json"
            for field, value in invalid_fields:
                with self.subTest(field=field, value=value):
                    verifier = {
                        "verdict": "PASS",
                        "mutation_score": 0.71,
                        "coverage_core": 0.92,
                        "context_isolated": True,
                    }
                    if value is None:
                        del verifier[field]
                    else:
                        verifier[field] = value
                    ev_file.write_text(
                        json.dumps({"verifier": verifier}), encoding="utf-8"
                    )

                    errors = check_evidence(ev_file, root=tmp)

                    self.assertTrue(any(field in error for error in errors), errors)
                    self.assertFalse(passes_gate(ev_file, root=tmp))

    def test_check_evidence_rejects_relative_and_absolute_root_escapes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "root"
            root.mkdir()
            outside = Path(tmp) / "outside.json"
            outside.write_text(json.dumps({"pass": True}), encoding="utf-8")

            for evidence_path in (Path("../outside.json"), outside):
                with self.subTest(evidence_path=evidence_path):
                    errors = check_evidence(evidence_path, root=root)

                    self.assertTrue(any("escapes root" in error for error in errors))
                    self.assertFalse(passes_gate(evidence_path, root=root))

    def test_passes_gate_rejects_bare_game_pass(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            ev_file = Path(tmp) / "evidence.json"
            ev_file.write_text(json.dumps({"pass": True}), encoding="utf-8")
            errors = check_evidence(ev_file, root=tmp)
            self.assertFalse(passes_gate(ev_file, root=tmp))
            self.assertTrue(any("independent verifier" in error for error in errors))

    def test_passes_gate_game_shape_false(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            ev_file = Path(tmp) / "evidence.json"
            ev_file.write_text(json.dumps({"pass": False}), encoding="utf-8")
            self.assertFalse(passes_gate(ev_file, root=tmp))

    def test_passes_gate_missing_file_is_fail(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            missing = Path(tmp) / "nope.json"
            errors = check_evidence(missing, root=tmp)
            self.assertTrue(any("missing" in e for e in errors))
            self.assertFalse(passes_gate(missing, root=tmp))

    def test_check_evidence_unparseable_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            ev_file = Path(tmp) / "evidence.json"
            ev_file.write_text("{ not valid json", encoding="utf-8")
            errors = check_evidence(ev_file, root=tmp)
            self.assertTrue(any("not parseable JSON" in e for e in errors))

    def test_check_evidence_unknown_shape(self) -> None:
        """A JSON file with neither 'verifier' nor 'pass' is rejected."""
        with tempfile.TemporaryDirectory() as tmp:
            ev_file = Path(tmp) / "evidence.json"
            ev_file.write_text(json.dumps({"foo": "bar"}), encoding="utf-8")
            errors = check_evidence(ev_file, root=tmp)
            self.assertTrue(any("no 'verifier'" in e for e in errors))

    def test_game_pass_claim_is_rejected_when_metrics_report_a_violation(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            ev_file = Path(tmp) / "evidence.json"
            ev_file.write_text(
                json.dumps(
                    {
                        "unit_id": "U-16_mini_message_queue",
                        "project": "16_mini_message_queue",
                        "game": "MESSAGE QUEUE",
                        "ts": "2026-07-11T00:00:00Z",
                        "pass": True,
                        "metrics": {"ordering_violations": 1},
                    }
                ),
                encoding="utf-8",
            )

            errors = check_evidence(ev_file, root=tmp)

            self.assertTrue(any("claimed-versus-verified disagreement" in e for e in errors))
            self.assertFalse(passes_gate(ev_file, root=tmp))


if __name__ == "__main__":
    unittest.main()
