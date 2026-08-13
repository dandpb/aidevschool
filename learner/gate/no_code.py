"""Canonical no-code gate (ADR-0004): promote AI Literacy units to mastered.

The independent literacy verifier (``learner.gate.literacy_verifier``) only
JUDGES evidence and emits a receipt; it never writes canonical state. This
module closes the loop: a unit declaring ``gate_kind: no_code`` in
``evaluating`` state, with a written learner attempt and a separate receipt
whose ``mastery_eligible`` is true, is promoted through the same canonical
boundary as the code gate (``commit_gate_transition``).

The no-code class stays explicitly separate from the code gate: no
mutation/coverage metrics are consulted, and a receipt with
``producer_writes_mastered: true`` or a mismatched evidence digest is
rejected fail-closed.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

from learner.gate.evidence_io import EvidenceParseError
from learner.gate.literacy_verifier import (
    VERIFIER_SOURCE,
    literacy_evidence_digest,
    load_literacy_evidence,
)
from learner.gate.security import (
    build_attempt_identity,
    build_receipt,
    replay_violations,
    secure_attempt_path,
)
from learner.substrate import load_canonical, resolve_canonical_path, validate
from learner.substrate.gate import GateEvidenceReceipt, commit_gate_transition

GATE_KIND = "no_code"
RATING_FROM_OUTCOME = {"fail": "again", "pass_retried": "hard", "pass_first_try": "good"}


@dataclass(frozen=True, slots=True)
class NoCodeGateDecision:
    """Outcome of one no-code gate run."""

    ok: bool
    passed: bool
    gate_outcome: str | None
    rating: str | None
    errors: tuple[str, ...]


def _load_receipt(path: Path) -> tuple[dict[str, Any] | None, list[str]]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        return None, [f"receipt unreadable: {exc}"]
    except json.JSONDecodeError as exc:
        return None, [f"receipt is not parseable JSON: {exc.msg} at line {exc.lineno}"]
    if not isinstance(raw, dict):
        return None, ["receipt must be a JSON object"]
    return raw, []


def verify_and_gate_no_code(
    root: str | Path,
    evidence_path: str | Path,
    *,
    receipt_path: str | Path | None = None,
    today: date | None = None,
    dry_run: bool = False,
) -> NoCodeGateDecision:
    """Independently gate a no-code unit from raw literacy evidence + receipt.

    Persistence happens only through ``commit_gate_transition``; ``dry_run``
    decides without writing canonical state.
    """
    root_path = Path(root).resolve()
    errors: list[str] = []

    state_path = resolve_canonical_path(
        root_path / "learner" / "learning_state.yaml"
        if (root_path / "learner" / "learning_state.yaml").exists()
        else Path("learner/learning_state.yaml")
    )
    state = load_canonical(state_path)
    errors.extend(validate(state, root_path))

    active_unit = state.get("active_unit") or {}
    if not isinstance(active_unit, dict):
        errors.append("missing active_unit")
    else:
        if active_unit.get("state") != "evaluating":
            errors.append(
                f"active_unit.state is {active_unit.get('state')!r}; the no-code "
                "gate only runs on 'evaluating'"
            )
        if active_unit.get("gate_kind") != GATE_KIND:
            errors.append(
                f"active_unit.gate_kind must be {GATE_KIND!r} for the no-code gate"
            )

    if errors:
        return NoCodeGateDecision(False, False, None, None, tuple(errors))

    # --- Evidence (producer raw record) ---
    evidence_path = Path(evidence_path)
    try:
        evidence = load_literacy_evidence(evidence_path)
    except EvidenceParseError as exc:
        return NoCodeGateDecision(False, False, None, None, (str(exc),))

    # --- Independent receipt (separate file, digest-bound) ---
    receipt_file = Path(receipt_path) if receipt_path is not None else None
    if receipt_file is None or not receipt_file.is_absolute():
        receipt_file = root_path / receipt_file if receipt_file else None
    if receipt_file is None or not receipt_file.exists():
        return NoCodeGateDecision(
            False, False, None, None, ("independent verifier receipt not found",)
        )
    receipt, receipt_errors = _load_receipt(receipt_file)
    if receipt is None:
        return NoCodeGateDecision(False, False, None, None, tuple(receipt_errors))

    if receipt.get("producer_writes_mastered") is not False:
        errors.append("receipt must carry producer_writes_mastered: false")
    if receipt.get("source") != VERIFIER_SOURCE:
        errors.append(f"receipt source must be {VERIFIER_SOURCE!r}")
    expected_digest = literacy_evidence_digest(evidence)
    if receipt.get("evidence_digest") != expected_digest:
        errors.append("receipt evidence_digest does not match the literacy evidence")
    if errors:
        return NoCodeGateDecision(False, False, None, None, tuple(errors))

    verdict = str(receipt.get("verdict"))
    if verdict not in {"PASS", "FAIL"}:
        return NoCodeGateDecision(
            False, False, None, None, ("receipt verdict must be PASS or FAIL",)
        )
    if verdict == "FAIL" or receipt.get("mastery_eligible") is not True:
        # Recorded as an eligible gate outcome (fail), without mastery.
        passed = False
        gate_outcome = "fail"
    else:
        passed = True
        gate_outcome = "pass_first_try"
    rating = RATING_FROM_OUTCOME[gate_outcome]

    # --- Learner attempt (attempt-before-solution) ---
    attempt_path, attempt_errors = secure_attempt_path(
        root_path, str(active_unit.get("attempt_file", ""))
    )
    if attempt_path is None or attempt_errors:
        errors.extend(attempt_errors or ["attempt file missing"])
        return NoCodeGateDecision(False, False, None, None, tuple(errors))
    if attempt_path.stat().st_size == 0:
        return NoCodeGateDecision(
            False, False, None, None, ("attempt file is empty (stub)",)
        )

    # --- Anti-replay: the same evidence digest cannot be graded twice ---
    gate_receipt = GateEvidenceReceipt(
        timestamp=str(evidence.get("timestamp", "")),
        digest=expected_digest,
        run_id=f"sha256:{expected_digest}",
        attempt_id=build_attempt_identity(attempt_path, root_path).id,
        attempt_digest=build_attempt_identity(attempt_path, root_path).digest,
        scenario_id=f"literacy:{evidence.get('lessonId')}/{evidence.get('activityId')}",
        verifier_source=VERIFIER_SOURCE,
    )
    errors.extend(
        replay_violations(gate_receipt, state.get("units_log") or [], str(active_unit["id"]))
    )
    if errors:
        return NoCodeGateDecision(False, False, None, None, tuple(errors))

    if dry_run:
        return NoCodeGateDecision(True, passed, gate_outcome, rating, ())

    transitioned = commit_gate_transition(
        state,
        receipt=gate_receipt,
        passed=passed,
        gate_outcome=gate_outcome,
        rating=rating,
        today=today or date.today(),
        gate_kind=GATE_KIND,
        path=state_path,
    )
    _ = transitioned  # canonical state persisted by commit_gate_transition
    return NoCodeGateDecision(True, passed, gate_outcome, rating, ())


__all__ = ("GATE_KIND", "NoCodeGateDecision", "verify_and_gate_no_code")
