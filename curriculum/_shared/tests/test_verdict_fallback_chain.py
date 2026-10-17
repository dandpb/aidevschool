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


if __name__ == "__main__":
    unittest.main()
