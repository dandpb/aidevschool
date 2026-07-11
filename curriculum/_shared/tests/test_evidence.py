"""Unit tests for the curriculum evidence contract (curriculum/_shared/evidence.py).

Uses ``tempfile.TemporaryDirectory`` (stdlib) matching the substrate test convention
(learner/substrate/tests/test_save_canonical.py), NOT pytest ``tmp_path``.
Tests are discovered by ``make test`` / ``python3 -m pytest``.
"""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from curriculum._shared.evidence import (
    ChallengeEvidence,
    Phase,
    VerifierVerdict,
    check_evidence,
    commit,
    inspect,
    passes_gate,
    record_verdict,
    statuses,
)
from engines.openclaw.errors import StateCorruptionError


def _make_challenge(
    root: Path | str,
    project_id: str = "01_test_project",
    *,
    status_yaml: str | None = None,
    status_md: str | None = None,
    diagnostic: str | None = None,
    evidence_ndjson: str | None = None,
    artifacts: tuple[str, ...] = (),
    impls: tuple[str, ...] = (),
) -> Path:
    """Build a fake challenge tree under ``root``. Returns the challenge dir."""
    root = Path(root)
    challenge = root / "curriculum" / project_id
    docs = challenge / "docs"
    docs.mkdir(parents=True, exist_ok=True)
    if status_yaml:
        (challenge / "status.yaml").write_text(status_yaml, encoding="utf-8")
    if status_md:
        (docs / "status.md").write_text(status_md, encoding="utf-8")
    if diagnostic is not None:
        (docs / "diagnostic.md").write_text(diagnostic, encoding="utf-8")
    for art in artifacts:
        (docs / art).write_text(f"# {art} content\n" * 10, encoding="utf-8")
    for lang in impls:
        impl_dir = challenge / f"{lang}-impl"
        impl_dir.mkdir(parents=True, exist_ok=True)
        (impl_dir / "stub").write_text("x", encoding="utf-8")
    if evidence_ndjson:
        ev_dir = root / "learner" / "evidence" / project_id
        ev_dir.mkdir(parents=True, exist_ok=True)
        (ev_dir / "evidence.ndjson").write_text(evidence_ndjson, encoding="utf-8")
    return challenge


class TestInspect(unittest.TestCase):
    """Tests for inspect() — phase detection, artifact discovery, verdict reading."""

    def test_inspect_returns_default_for_missing_project(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            ev = inspect("zzz_nonexistent", root=tmp)
            self.assertEqual(ev.phase, Phase.SPEC)
            self.assertFalse(ev.gate_ready)
            self.assertFalse(ev.attempt_present)
            self.assertEqual(ev.verdict.verdict, "UNKNOWN")
            self.assertFalse(any(a.exists for a in ev.artifacts))
            self.assertFalse(any(ev.implementations.values()))

    def test_inspect_reads_status_yaml(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            _make_challenge(
                tmp,
                status_yaml=(
                    "project_id: 01_test\n"
                    "phase: cycle-complete\n"
                    "implementations:\n"
                    "  go: {status: done}\n"
                    "  rust: {status: done}\n"
                    "  node: {status: done}\n"
                ),
                diagnostic="# My attempt\n",
            )
            ev = inspect("01_test_project", root=tmp)
            # The YAML lives at curriculum/01_test_project/status.yaml
            # but project_id inside the YAML is just data; inspect takes the dir name.
            self.assertEqual(ev.phase, Phase.CYCLE_COMPLETE)
            self.assertTrue(ev.attempt_present)

    def test_inspect_falls_back_to_status_md_when_no_yaml(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            _make_challenge(
                tmp,
                status_md="# Status\n\n## Phase\n\nphase: cycle-complete\n",
            )
            ev = inspect("01_test_project", root=tmp)
            self.assertEqual(ev.phase, Phase.CYCLE_COMPLETE)

    def test_inspect_reads_verdict_from_ndjson(self) -> None:
        verdict_json = json.dumps({
            "mutation_score": 0.71,
            "coverage_core": 0.92,
            "context_isolated": True,
            "verdict": "PASS",
            "source": "docs/mutation_gate.md",
        })
        with tempfile.TemporaryDirectory() as tmp:
            _make_challenge(tmp, evidence_ndjson=verdict_json + "\n")
            ev = inspect("01_test_project", root=tmp)
            self.assertEqual(ev.verdict.verdict, "PASS")
            self.assertAlmostEqual(ev.verdict.mutation_score or 0, 0.71)

    def test_inspect_fails_closed_when_latest_verdict_line_is_tampered(self) -> None:
        valid_pass = json.dumps({
            "mutation_score": 0.71,
            "coverage_core": 0.92,
            "context_isolated": True,
            "verdict": "PASS",
        })
        for latest_line in ("{truncated", "[]"):
            with self.subTest(latest_line=latest_line):
                with tempfile.TemporaryDirectory() as tmp:
                    _make_challenge(
                        tmp, evidence_ndjson=f"{valid_pass}\n{latest_line}\n"
                    )

                    evidence = inspect("01_test_project", root=tmp)

                    self.assertEqual(evidence.verdict.verdict, "UNKNOWN")
                    self.assertFalse(evidence.gate_ready)

    def test_inspect_rejects_unknown_phase_in_yaml(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            _make_challenge(tmp, status_yaml="phase: bogus-phase\n")
            with self.assertRaises(StateCorruptionError):
                inspect("01_test_project", root=tmp)


class TestGateReadyAndBlockers(unittest.TestCase):
    """Tests for ChallengeEvidence.gate_ready and gate_blockers."""

    def _make_evidence(
        self,
        *,
        verdict: str = "PASS",
        mutation: float | None = 0.71,
        coverage: float | None = 0.92,
        isolated: bool | None = True,
        attempt: bool = True,
    ) -> ChallengeEvidence:
        return ChallengeEvidence(
            project_id="01_test",
            phase=Phase.CYCLE_COMPLETE,
            implementations={"go": True, "rust": True, "node": True},
            artifacts=(),
            attempt_present=attempt,
            verdict=VerifierVerdict(
                mutation_score=mutation,
                coverage_core=coverage,
                context_isolated=isolated,
                verdict=verdict,
            ),
            benchmark_all_pass=None,
        )

    def test_gate_ready_when_attempt_and_pass(self) -> None:
        ev = self._make_evidence()
        self.assertTrue(ev.gate_ready)
        self.assertEqual(ev.gate_blockers, ())

    def test_gate_ready_false_when_attempt_missing(self) -> None:
        ev = self._make_evidence(attempt=False)
        self.assertFalse(ev.gate_ready)
        blockers = ev.gate_blockers
        self.assertTrue(any("attempt" in b for b in blockers))

    def test_gate_ready_false_when_verdict_fail(self) -> None:
        ev = self._make_evidence(verdict="FAIL")
        self.assertFalse(ev.gate_ready)
        self.assertTrue(any("FAIL" in b for b in ev.gate_blockers))

    def test_gate_ready_false_when_low_mutation(self) -> None:
        ev = self._make_evidence(mutation=0.42)
        self.assertFalse(ev.gate_ready)
        self.assertTrue(any("mutation_score" in b for b in ev.gate_blockers))

    def test_gate_ready_false_when_pass_omits_required_proof(self) -> None:
        cases = (
            (self._make_evidence(mutation=None), "mutation_score"),
            (self._make_evidence(coverage=None), "coverage_core"),
            (self._make_evidence(isolated=None), "context-isolated"),
        )
        for evidence, blocker_text in cases:
            with self.subTest(blocker_text=blocker_text):
                self.assertFalse(evidence.gate_ready)
                self.assertTrue(
                    any(blocker_text in blocker for blocker in evidence.gate_blockers)
                )

    def test_gate_ready_false_when_pass_score_is_non_finite_or_bool(self) -> None:
        for mutation in (float("nan"), True):
            with self.subTest(mutation=mutation):
                ev = self._make_evidence(mutation=mutation)

                self.assertFalse(ev.gate_ready)
                self.assertTrue(any("mutation_score" in b for b in ev.gate_blockers))


class TestPassesGate(unittest.TestCase):
    """Tests for passes_gate / check_evidence — shape-detecting wrappers."""

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


class TestCommit(unittest.TestCase):
    """Tests for commit() — status.yaml writing."""

    def test_commit_writes_status_yaml(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            ev = ChallengeEvidence(
                project_id="01_test",
                phase=Phase.CYCLE_COMPLETE,
                implementations={"go": True, "rust": False, "node": True},
                artifacts=(),
                attempt_present=True,
                verdict=VerifierVerdict(0.71, 0.92, True, "PASS"),
                benchmark_all_pass=False,
            )
            path = commit(ev, root=tmp)
            self.assertTrue(path.exists())
            self.assertTrue(path.name == "status.yaml")

    def test_commit_does_not_clobber_status_md(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            challenge = _make_challenge(
                tmp, status_md="# Human narrative\n\nphase: cycle-complete\n"
            )
            ev = ChallengeEvidence(
                project_id="01_test_project",
                phase=Phase.IMPL,
                implementations={"go": True, "rust": False, "node": False},
                artifacts=(),
                attempt_present=False,
                verdict=VerifierVerdict(None, None, None, "UNKNOWN"),
                benchmark_all_pass=None,
            )
            commit(ev, root=tmp)
            md = challenge / "docs" / "status.md"
            self.assertIn("Human narrative", md.read_text(encoding="utf-8"))


class TestRecordVerdict(unittest.TestCase):
    """Tests for record_verdict() — append-only evidence.ndjson."""

    def test_record_verdict_appends_ndjson(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            verdict = VerifierVerdict(0.71, 0.92, True, "PASS", source="docs/mutation_gate.md")
            path = record_verdict("01_test", verdict, root=tmp)
            self.assertTrue(path.exists())
            lines = path.read_text(encoding="utf-8").strip().splitlines()
            self.assertEqual(len(lines), 1)
            rec = json.loads(lines[0])
            self.assertEqual(rec["verdict"], "PASS")

    def test_verdict_ndjson_last_line_wins(self) -> None:
        pass_json = json.dumps({"verdict": "PASS", "mutation_score": 0.71})
        fail_json = json.dumps({"verdict": "FAIL", "mutation_score": 0.42})
        with tempfile.TemporaryDirectory() as tmp:
            _make_challenge(
                tmp,
                evidence_ndjson=pass_json + "\n" + fail_json + "\n",
            )
            ev = inspect("01_test_project", root=tmp)
            self.assertEqual(ev.verdict.verdict, "FAIL")

    def test_project_id_cannot_escape_root(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            verdict = VerifierVerdict(0.71, 0.92, True, "PASS")

            for project_id in ("../escape", str(Path(tmp) / "absolute")):
                with self.subTest(project_id=project_id):
                    with self.assertRaises(StateCorruptionError):
                        record_verdict(project_id, verdict, root=tmp)
                    with self.assertRaises(StateCorruptionError):
                        inspect(project_id, root=tmp)

            self.assertFalse((Path(tmp) / "learner" / "escape").exists())


class TestStatuses(unittest.TestCase):
    """Tests for statuses() — cross-challenge enumeration."""

    def test_statuses_lists_all_challenges_sorted(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            _make_challenge(tmp, project_id="02_beta")
            _make_challenge(tmp, project_id="01_alpha")
            result = statuses(root=tmp)
            self.assertEqual(len(result), 2)
            self.assertEqual(result[0].project_id, "01_alpha")
            self.assertEqual(result[1].project_id, "02_beta")

    def test_statuses_empty_when_no_curriculum(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            result = statuses(root=tmp)
            self.assertEqual(result, [])


if __name__ == "__main__":
    unittest.main()
