"""Fail-closed verdict fallback tests (AID-5002).

The canonical-state fallback in ``curriculum/_shared/evidence.py`` must never
mint a ``PASS``: a verdict only comes from an intact verification chain
(gate-bound evidence digest + gate-bound attempt identity + separate verifier
receipt). Missing/stale/tampered/contradictory chains stay ``UNKNOWN``; a real
``FAIL`` receipt with an intact chain is preserved.
"""

from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from typing import Any

import yaml

from curriculum._shared.evidence import inspect
from curriculum._shared.tests.test_evidence import _make_challenge
from learner.gate.evidence_io import canonical_evidence_digest

PROJECT = "01_rate_limiter"
UNIT = "U0"
ATTEMPT_REL = "learner/attempts/u0-attempt.md"
EVIDENCE_REL = "engines/pixelDojo/.logs/evidence.json"

DEFAULT_RECORD: dict[str, Any] = {
    "source": "pixeldojo",
    "unit_id": UNIT,
    "project": PROJECT,
    "scenario_id": "rate-limiter-basics",
    "game": "PIXEL QUEST",
    "ts": "2026-10-17T10:00:00.000Z",
    "pass": True,
    "metrics": {"accuracy": 1.0},
}


def _default_receipt(digest: str) -> dict[str, Any]:
    return {
        "verdict": "PASS",
        "context_isolated": True,
        "mutation_score": 0.9,
        "coverage_core": 0.95,
        "source": "pixeldojo-verifier-u0",
        "evidence_digest": digest,
    }


def _default_gate(digest: str, attempt_digest: str) -> dict[str, Any]:
    return {
        "date": "2026-10-17",
        "event": "gate",
        "rating": "mastered",
        "gate_outcome": "pass",
        "evidence_ts": "2026-10-17T10:00:01.000Z",
        "evidence_digest": digest,
        "evidence_run_id": "run-u0",
        "evidence_attempt_id": ATTEMPT_REL,
        "evidence_attempt_digest": attempt_digest,
        "evidence_scenario_id": "rate-limiter-basics",
    }


def write_chain(
    root: Path,
    *,
    record: dict[str, Any] | None = None,
    evidence_text: str | None = None,
    mutate_evidence_after_gate: bool = False,
    mutate_attempt_after_gate: bool = False,
    receipt: dict[str, Any] | None = None,
    extra_receipts: list[dict[str, Any]] | None = None,
    gate: dict[str, Any] | None = None,
    mastered: bool = True,
    with_gate: bool = True,
) -> None:
    """Build the canonical chain for one unit under ``root``.

    Defaults produce a valid PASS chain; keyword flags break one link at a
    time so each failure mode is asserted independently. ``receipt`` and
    ``gate`` templates may carry ``None`` for computed digest fields.
    """
    record = dict(record if record is not None else DEFAULT_RECORD)

    _make_challenge(root, project_id=PROJECT)
    attempt = root / ATTEMPT_REL
    attempt.parent.mkdir(parents=True, exist_ok=True)
    attempt.write_text("# Learner attempt\n", encoding="utf-8")

    evidence_file = root / EVIDENCE_REL
    evidence_file.parent.mkdir(parents=True, exist_ok=True)
    if evidence_text is not None:
        evidence_file.write_text(evidence_text, encoding="utf-8")
    else:
        evidence_file.write_text(
            json.dumps(record, indent=2) + "\n", encoding="utf-8"
        )

    evidence_digest = canonical_evidence_digest(record)
    attempt_digest = hashlib.sha256(attempt.read_bytes()).hexdigest()

    # Post-gate mutations: the gate bound the ORIGINAL content; the file on
    # disk no longer matches it.
    if mutate_evidence_after_gate:
        mutated = dict(record)
        mutated["pass"] = False
        mutated["metrics"] = {"accuracy": 0.1}
        evidence_file.write_text(
            json.dumps(mutated, indent=2) + "\n", encoding="utf-8"
        )
    if mutate_attempt_after_gate:
        attempt.write_text("# Rewritten after the gate\n", encoding="utf-8")

    resolved_receipt = receipt if receipt is not None else _default_receipt(
        evidence_digest
    )
    if resolved_receipt.get("evidence_digest") is None:
        resolved_receipt["evidence_digest"] = evidence_digest
    receipts_dir = root / "learner" / "verifier_receipts"
    receipts_dir.mkdir(parents=True, exist_ok=True)
    (receipts_dir / "u0.json").write_text(
        json.dumps(resolved_receipt, indent=2) + "\n", encoding="utf-8"
    )
    for index, extra in enumerate(extra_receipts or []):
        (receipts_dir / f"extra-{index}.json").write_text(
            json.dumps(extra, indent=2) + "\n", encoding="utf-8"
        )

    resolved_gate = gate if gate is not None else _default_gate(
        evidence_digest, attempt_digest
    )
    if resolved_gate.get("evidence_digest") is None:
        resolved_gate["evidence_digest"] = evidence_digest
    if resolved_gate.get("evidence_attempt_digest") is None:
        resolved_gate["evidence_attempt_digest"] = attempt_digest

    entry: dict[str, Any] = {
        "unit_id": UNIT,
        "project": PROJECT,
        "mastered": mastered,
        "attempt_file": ATTEMPT_REL,
        "evidence_file": EVIDENCE_REL,
    }
    if with_gate:
        entry["reviews"] = [
            {"date": "2026-10-17", "event": "presented"},
            resolved_gate,
        ]
    (root / "learner" / "learning_state.yaml").write_text(
        yaml.safe_dump({"units_log": [entry]}, sort_keys=False),
        encoding="utf-8",
    )


class TestVerdictFallbackChain(unittest.TestCase):
    def _inspect(self, **kwargs: Any):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_chain(root, **kwargs)
            return inspect(PROJECT, root=root)

    def test_mastered_with_unverified_evidence_text_is_unknown(self) -> None:
        ev = self._inspect(
            evidence_text="this is not verifier evidence\n",
            with_gate=False,
        )
        self.assertTrue(ev.attempt_present)
        self.assertEqual(ev.verdict.verdict, "UNKNOWN")
        self.assertFalse(ev.gate_ready)

    def test_intact_chain_returns_receipt_verdict_and_metrics(self) -> None:
        ev = self._inspect()
        self.assertEqual(ev.verdict.verdict, "PASS")
        self.assertEqual(ev.verdict.mutation_score, 0.9)
        self.assertEqual(ev.verdict.coverage_core, 0.95)
        self.assertTrue(ev.verdict.context_isolated)
        self.assertEqual(ev.verdict.source, "pixeldojo-verifier-u0")
        self.assertTrue(ev.gate_ready)

    def test_real_fail_receipt_is_preserved_on_non_mastered_unit(self) -> None:
        receipt = _default_receipt("")
        receipt.update(
            {
                "verdict": "FAIL",
                "mutation_score": 0.2,
                "coverage_core": 0.3,
                "evidence_digest": None,
            }
        )
        ev = self._inspect(mastered=False, receipt=receipt)
        self.assertEqual(ev.verdict.verdict, "FAIL")
        self.assertEqual(ev.verdict.mutation_score, 0.2)
        self.assertFalse(ev.gate_ready)

    def test_receipt_bound_by_digest_when_source_label_is_reused(self) -> None:
        reused_source = _default_receipt(
            hashlib.sha256(b"another payload").hexdigest()
        )
        reused_source["mutation_score"] = 0.99
        ev = self._inspect(extra_receipts=[reused_source])
        self.assertEqual(ev.verdict.verdict, "PASS")
        self.assertEqual(ev.verdict.mutation_score, 0.9)

    def test_same_source_wrong_digest_receipt_only_means_unknown(self) -> None:
        wrong = _default_receipt(hashlib.sha256(b"wrong digest").hexdigest())
        ev = self._inspect(receipt=wrong)
        self.assertEqual(ev.verdict.verdict, "UNKNOWN")
        self.assertFalse(ev.gate_ready)

    def test_non_finite_receipt_score_is_rejected(self) -> None:
        digest = canonical_evidence_digest(DEFAULT_RECORD)
        receipt_path_text = (
            '{"verdict": "PASS", "context_isolated": true, '
            '"mutation_score": NaN, "coverage_core": 0.95, '
            '"source": "pixeldojo-verifier-u0", "evidence_digest": "%s"}\n'
            % digest
        )
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_chain(root)
            (root / "learner" / "verifier_receipts" / "u0.json").write_text(
                receipt_path_text, encoding="utf-8"
            )
            ev = inspect(PROJECT, root=root)
            self.assertEqual(ev.verdict.verdict, "UNKNOWN")

    def test_mutated_evidence_file_after_gate_is_unknown(self) -> None:
        ev = self._inspect(mutate_evidence_after_gate=True)
        self.assertEqual(ev.verdict.verdict, "UNKNOWN")

    def test_mutated_attempt_file_after_gate_is_unknown(self) -> None:
        ev = self._inspect(mutate_attempt_after_gate=True)
        self.assertEqual(ev.verdict.verdict, "UNKNOWN")

    def test_mastered_without_gate_review_is_unknown(self) -> None:
        ev = self._inspect(with_gate=False)
        self.assertEqual(ev.verdict.verdict, "UNKNOWN")

    def test_pass_receipt_without_mastered_commit_is_contradiction(self) -> None:
        ev = self._inspect(mastered=False)
        self.assertEqual(ev.verdict.verdict, "UNKNOWN")

    def test_gate_without_well_formed_digest_is_unknown(self) -> None:
        gate = _default_gate("", "")
        gate["evidence_digest"] = "not-a-digest"
        ev = self._inspect(gate=gate)
        self.assertEqual(ev.verdict.verdict, "UNKNOWN")

    # --- hardening: static coordination review 6239895063 (AID-5002) ---

    def test_conflicting_receipts_for_same_digest_are_unknown(self) -> None:
        # A PASS receipt cannot hide a contradictory FAIL for the same
        # digest: filename order must never decide a verdict.
        digest = canonical_evidence_digest(DEFAULT_RECORD)
        contradictory = _default_receipt(digest)
        contradictory.update(
            {
                "verdict": "FAIL",
                "mutation_score": 0.1,
                "coverage_core": 0.1,
                "source": "second-verifier",
            }
        )
        ev = self._inspect(extra_receipts=[contradictory])
        self.assertEqual(ev.verdict.verdict, "UNKNOWN")
        self.assertFalse(ev.gate_ready)

    def test_agreeing_duplicate_receipts_still_pass(self) -> None:
        digest = canonical_evidence_digest(DEFAULT_RECORD)
        agreeing = _default_receipt(digest)
        agreeing["source"] = "second-verifier"
        ev = self._inspect(extra_receipts=[agreeing])
        self.assertEqual(ev.verdict.verdict, "PASS")
        self.assertEqual(ev.verdict.mutation_score, 0.9)

    def test_malformed_receipt_never_crashes_inspect(self) -> None:
        digest = canonical_evidence_digest(DEFAULT_RECORD)
        malformed = [
            '{"verdict": [], "context_isolated": true, "mutation_score": 0.9, '
            '"coverage_core": 0.95, "source": "v", "evidence_digest": '
            '"%s"}' % digest,
            '{"verdict": "PASS", "context_isolated": true, "mutation_score": 1%s, '
            '"coverage_core": 0.95, "source": "v", "evidence_digest": '
            '"%s"}' % ("0" * 400, digest),
        ]
        for text in malformed:
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                write_chain(root)
                (root / "learner" / "verifier_receipts" / "u0.json").write_text(
                    text, encoding="utf-8"
                )
                ev = inspect(PROJECT, root=root)
                self.assertEqual(ev.verdict.verdict, "UNKNOWN")
                self.assertFalse(ev.gate_ready)

    def test_undecodable_evidence_file_is_unknown_no_crash(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_chain(root)
            (root / EVIDENCE_REL).write_bytes(b"\xff\xfe\x00 not utf-8")
            ev = inspect(PROJECT, root=root)
            self.assertEqual(ev.verdict.verdict, "UNKNOWN")
            self.assertFalse(ev.gate_ready)

    def test_gate_attempt_file_must_be_the_units_own(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_chain(root)
            state_path = root / "learner" / "learning_state.yaml"
            state = yaml.safe_load(state_path.read_text(encoding="utf-8"))
            state["units_log"][0]["attempt_file"] = "learner/attempts/other.md"
            state_path.write_text(
                yaml.safe_dump(state, sort_keys=False), encoding="utf-8"
            )
            ev = inspect(PROJECT, root=root)
            self.assertEqual(ev.verdict.verdict, "UNKNOWN")
            self.assertFalse(ev.gate_ready)

    def test_copied_chain_cannot_establish_another_project(self) -> None:
        # The whole intact chain (evidence + attempt + receipt + gate) copied
        # under a victim project entry must not mint that project's verdict.
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_chain(root)
            state_path = root / "learner" / "learning_state.yaml"
            state = yaml.safe_load(state_path.read_text(encoding="utf-8"))
            copied = dict(state["units_log"][0])
            copied["project"] = "99_victim_project"
            state["units_log"].append(copied)
            state_path.write_text(
                yaml.safe_dump(state, sort_keys=False), encoding="utf-8"
            )
            ev = inspect("99_victim_project", root=root)
            self.assertEqual(ev.verdict.verdict, "UNKNOWN")
            self.assertFalse(ev.gate_ready)
            # the legitimate owner keeps its verdict
            self.assertEqual(
                inspect(PROJECT, root=root).verdict.verdict, "PASS"
            )

    def test_gate_scenario_must_match_evidence_record(self) -> None:
        evidence_digest = canonical_evidence_digest(DEFAULT_RECORD)
        attempt_digest = hashlib.sha256(
            b"# Learner attempt\n"
        ).hexdigest()
        gate = _default_gate(evidence_digest, attempt_digest)
        gate["evidence_scenario_id"] = "some-other-scenario"
        ev = self._inspect(gate=gate)
        self.assertEqual(ev.verdict.verdict, "UNKNOWN")
        self.assertFalse(ev.gate_ready)

    # --- hardening round 2: follow-up 6243873612 (AID-5002) ---

    def test_record_without_unit_id_cannot_claim_any_unit(self) -> None:
        # unit_id is required producer structure (evidence_validator); a
        # digest-bound record without it must not establish mastery even
        # when the whole chain is otherwise intact (copied to another unit
        # of the same project).
        incomplete = {
            key: value
            for key, value in DEFAULT_RECORD.items()
            if key != "unit_id"
        }
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_chain(
                root, record=incomplete, evidence_text=None
            )
            # write_chain wrote the DEFAULT record; rewrite file + chain
            (root / EVIDENCE_REL).write_text(
                json.dumps(incomplete, indent=2) + "\n", encoding="utf-8"
            )
            digest = canonical_evidence_digest(incomplete)
            state_path = root / "learner" / "learning_state.yaml"
            state = yaml.safe_load(state_path.read_text(encoding="utf-8"))
            entry = state["units_log"][0]
            entry["unit_id"] = "U1"
            entry["reviews"][-1]["evidence_digest"] = digest
            (root / "learner" / "verifier_receipts" / "u0.json").write_text(
                json.dumps(_default_receipt(digest)), encoding="utf-8"
            )
            state_path.write_text(
                yaml.safe_dump(state, sort_keys=False), encoding="utf-8"
            )
            ev = inspect(PROJECT, root=root)
            self.assertEqual(ev.verdict.verdict, "UNKNOWN")
            self.assertFalse(ev.gate_ready)

    def test_record_with_malformed_unit_id_is_unknown(self) -> None:
        # Non-string unit_id values must not skip the ownership check
        # (follow-up 6243873612); the digest-bound record has to carry a
        # well-formed unit_id equal to the unit's own.
        for bad in (None, 7, ["U0"], {}):
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                write_chain(root)
                record = dict(DEFAULT_RECORD)
                record["unit_id"] = bad
                (root / EVIDENCE_REL).write_text(
                    json.dumps(record, indent=2) + "\n", encoding="utf-8"
                )
                digest = canonical_evidence_digest(record)
                state_path = root / "learner" / "learning_state.yaml"
                state = yaml.safe_load(state_path.read_text(encoding="utf-8"))
                state["units_log"][0]["reviews"][-1]["evidence_digest"] = digest
                (root / "learner" / "verifier_receipts" / "u0.json").write_text(
                    json.dumps(_default_receipt(digest)), encoding="utf-8"
                )
                state_path.write_text(
                    yaml.safe_dump(state, sort_keys=False), encoding="utf-8"
                )
                ev = inspect(PROJECT, root=root)
                self.assertEqual(ev.verdict.verdict, "UNKNOWN")
                self.assertFalse(ev.gate_ready)

    def test_gate_identity_absent_or_malformed_is_unknown(self) -> None:
        for mutate in (
            lambda gate: gate.pop("evidence_scenario_id"),
            lambda gate: gate.update(evidence_scenario_id=None),
            lambda gate: gate.update(evidence_scenario_id=["x"]),
        ):
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                write_chain(root)
                digest = canonical_evidence_digest(DEFAULT_RECORD)
                attempt_digest = hashlib.sha256(
                    b"# Learner attempt\n"
                ).hexdigest()
                gate = _default_gate(digest, attempt_digest)
                mutate(gate)
                state_path = root / "learner" / "learning_state.yaml"
                state = yaml.safe_load(state_path.read_text(encoding="utf-8"))
                state["units_log"][0]["reviews"][-1] = gate
                state_path.write_text(
                    yaml.safe_dump(state, sort_keys=False), encoding="utf-8"
                )
                ev = inspect(PROJECT, root=root)
                self.assertEqual(ev.verdict.verdict, "UNKNOWN")
                self.assertFalse(ev.gate_ready)

    def test_legacy_identity_normalization_matches_gate(self) -> None:
        # Compatibility (6243873612): raw scenario_id is not universally
        # required — the gate writer normalizes scenario_id -> encounter_id
        # -> legacy:<game> (security.build_receipt); the fallback compares
        # through that same normalization.
        for replace in (
            ({"scenario_id": None, "encounter_id": None}, "legacy:PIXEL QUEST"),
            ({"scenario_id": None, "encounter_id": "enc-42"}, "enc-42"),
            ({"scenario_id": None, "encounter_id": None}, "legacy:OTHER GAME"),
        ):
            overrides, gate_identity = replace
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                write_chain(root)
                record = dict(DEFAULT_RECORD)
                record.update(overrides)
                (root / EVIDENCE_REL).write_text(
                    json.dumps(record, indent=2) + "\n", encoding="utf-8"
                )
                digest = canonical_evidence_digest(record)
                attempt_digest = hashlib.sha256(
                    b"# Learner attempt\n"
                ).hexdigest()
                gate = _default_gate(digest, attempt_digest)
                gate["evidence_scenario_id"] = gate_identity
                state_path = root / "learner" / "learning_state.yaml"
                state = yaml.safe_load(state_path.read_text(encoding="utf-8"))
                state["units_log"][0]["reviews"][-1] = gate
                (root / "learner" / "verifier_receipts" / "u0.json").write_text(
                    json.dumps(_default_receipt(digest)), encoding="utf-8"
                )
                state_path.write_text(
                    yaml.safe_dump(state, sort_keys=False), encoding="utf-8"
                )
                ev = inspect(PROJECT, root=root)
                if gate_identity == "legacy:OTHER GAME":
                    self.assertEqual(ev.verdict.verdict, "UNKNOWN")
                else:
                    self.assertEqual(ev.verdict.verdict, "PASS")



