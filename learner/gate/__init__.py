"""Independent learner gate for JSON and NDJSON executable evidence.

Producer evidence never writes mastery; verified outcomes persist only through
``learner.substrate.gate``.
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import date
from pathlib import Path
from typing import Any

from curriculum._shared.evidence import game_metric_violations
from learner.gate.evidence_io import (
    load_evidence,
    load_evidence_ndjson,
    select_evidence,
)
from learner.substrate.scheduling import RATING_FROM_GATE
from learner.gate.security import (
    build_attempt_identity,
    build_receipt,
    independently_verified_pass,
    latest_gated_evidence_timestamp,
    parse_aware_timestamp,
    replay_violations,
    secure_attempt_path,
)
from learner.gate.verifier_receipt import (
    VerifierReceipt,
    load_verifier_receipt,
    receipt_violations,
)
from learner.substrate import load_and_validate
from learner.substrate.gate import commit_gate_transition, transition_gate
from learner.substrate.gate import GateEvidenceReceipt

#: Fields every evidence record must carry regardless of game.
REQUIRED_EVIDENCE_FIELDS = ("unit_id", "project", "game", "ts", "pass")

__all__ = [
    "GateDecision",
    "check_evidence",
    "check_evidence_semantics",
    "decide",
    "load_evidence",
    "load_evidence_ndjson",
    "select_evidence",
    "verify_and_gate",
]


class GateIntegrityError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class GateDecision:
    """Outcome of a verification run (before anything is written)."""

    passed: bool
    gate_outcome: str  # fail | pass_retried | pass_first_try | pass_exceeds
    rating: str  # derived via RATING_FROM_GATE — the gate is the only rating producer
    errors: tuple[str, ...] = field(default_factory=tuple)
    receipt: GateEvidenceReceipt | None = None

    @property
    def ok(self) -> bool:
        return not self.errors


def check_evidence(
    evidence: dict[str, Any],
    active_unit: dict[str, Any],
    root: Path,
    units_log: list[dict[str, Any]] | None = None,
    verifier_receipt: VerifierReceipt | None = None,
) -> list[str]:
    """Return the list of gate-precondition violations (empty means eligible).

    Checks are about *eligibility to be gated*, not pass/fail of the run itself:
    a well-formed evidence file with ``pass: false`` is eligible — it gates to
    ``fail``. A malformed or mismatched file is not eligible at all.
    """
    errors = check_evidence_semantics(evidence, active_unit, verifier_receipt)
    for fname in REQUIRED_EVIDENCE_FIELDS:
        if fname not in evidence:
            break
    if errors:
        return errors

    # Learning gate: a learner attempt must exist before any mastery transition.
    attempt = active_unit.get("attempt_file")
    receipt: GateEvidenceReceipt | None = None
    if not attempt:
        errors.append("active_unit has no attempt_file; attempt-before-solution unmet")
    else:
        attempt_path, attempt_errors = secure_attempt_path(root, str(attempt))
        errors.extend(attempt_errors)
        if attempt_path is not None:
            attempt_identity = build_attempt_identity(attempt_path, root)
            attempt_id = attempt_identity.id
            declared_attempt_id = evidence.get("attempt_id")
            if declared_attempt_id is not None and declared_attempt_id != attempt_id:
                errors.append(
                    f"evidence attempt_id {declared_attempt_id!r} does not match {attempt_id!r}"
                )
            elif not attempt_path.read_text(encoding="utf-8").strip():
                errors.append(
                    f"attempt file is empty (stub): {attempt}; attempt-before-solution unmet"
                )
            else:
                receipt = build_receipt(evidence, attempt_identity, str(evidence["ts"]))

    if active_unit.get("state") != "evaluating":
        errors.append(
            f"active_unit.state is {active_unit.get('state')!r}; the gate only "
            "runs on 'evaluating' (attempt made, awaiting verification)"
        )

    # Anti-replay: evidence already consumed by a previous gate (or older than
    # it) cannot be graded again. Gate reviews record the evidence 'ts' they
    # consumed (see apply_gate); a new record must be strictly newer.
    try:
        evidence_ts = parse_aware_timestamp(str(evidence["ts"]))
    except ValueError:
        errors.append(
            f"evidence ts {evidence['ts']!r} is not a valid timezone-aware ISO-8601 timestamp"
        )
    else:
        last_ts = latest_gated_evidence_timestamp(units_log or [], str(active_unit.get("id", "")))
        if last_ts is not None:
            try:
                previous_ts = parse_aware_timestamp(last_ts)
            except ValueError:
                errors.append(f"last gated evidence timestamp {last_ts!r} is invalid")
            else:
                if evidence_ts <= previous_ts:
                    errors.append(
                        f"evidence ts {evidence['ts']!r} is not newer than the last gated "
                        f"evidence for this unit ({last_ts!r}) — stale or duplicate record; "
                        "replay the mission to produce fresh evidence"
                    )
        if receipt is not None:
            errors.extend(
                replay_violations(
                    receipt, units_log or [], str(active_unit.get("id", ""))
                )
            )

    return errors


def check_evidence_semantics(
    evidence: dict[str, Any],
    active_unit: dict[str, Any],
    verifier_receipt: VerifierReceipt | None = None,
) -> list[str]:
    errors: list[str] = []
    for field_name in REQUIRED_EVIDENCE_FIELDS:
        if field_name not in evidence:
            errors.append(f"evidence missing required field {field_name!r}")
    if errors:
        return errors
    if not isinstance(evidence["pass"], bool):
        errors.append("evidence field 'pass' must be a boolean")
    if evidence["unit_id"] != active_unit.get("id"):
        errors.append(
            f"evidence unit_id {evidence['unit_id']!r} does not match "
            f"active_unit {active_unit.get('id')!r}"
        )
    if evidence["project"] != active_unit.get("project"):
        errors.append(
            f"evidence project {evidence['project']!r} does not match "
            f"active_unit project {active_unit.get('project')!r}"
        )
    metrics = evidence.get("metrics")
    if metrics is not None and not isinstance(metrics, dict):
        errors.append("evidence.metrics must be an object")
    elif isinstance(metrics, dict) and "kind" in metrics and not metrics.get("kind"):
        errors.append("evidence.metrics.kind must be a non-empty discriminator when set")
    try:
        parse_aware_timestamp(str(evidence["ts"]))
    except ValueError:
        errors.append(
            f"evidence ts {evidence['ts']!r} is not a valid timezone-aware ISO-8601 timestamp"
        )
    if "verifier" in evidence:
        errors.append(
            "embedded verifier is producer-controlled and cannot authorize mastery; "
            "provide a separate verifier receipt"
        )
    producer_evidence = {
        field_name: value
        for field_name, value in evidence.items()
        if field_name != "verifier"
    }
    rubric_pass, rubric_errors = independently_verified_pass(producer_evidence)
    if verifier_receipt is not None:
        errors.extend(receipt_violations(verifier_receipt, producer_evidence))
    elif evidence.get("pass") is True:
        if rubric_pass is not True:
            errors.extend(rubric_errors)
            violations = game_metric_violations(producer_evidence) or [
                "empirical rubric did not pass"
            ]
            errors.extend(
                "claimed-versus-verified disagreement: " + violation
                for violation in violations
            )
    return errors


def decide(
    evidence: dict[str, Any],
    active_unit: dict[str, Any],
    root: Path,
    units_log: list[dict[str, Any]] | None = None,
    verifier_receipt: VerifierReceipt | None = None,
) -> GateDecision:
    """Check eligibility and map the run result to a gate outcome + rating."""
    errors = check_evidence(
        evidence,
        active_unit,
        root,
        units_log,
        verifier_receipt=verifier_receipt,
    )
    if errors:
        return GateDecision(
            passed=False,
            gate_outcome="fail",
            rating="again",
            errors=tuple(errors),
        )

    producer_evidence = {
        field_name: value
        for field_name, value in evidence.items()
        if field_name != "verifier"
    }
    rubric_pass, _ = independently_verified_pass(producer_evidence)
    passed = (
        verifier_receipt.passed
        if verifier_receipt is not None
        else bool(evidence["pass"]) and rubric_pass is True
    )
    attempt_path, _ = secure_attempt_path(root, str(active_unit["attempt_file"]))
    if attempt_path is None:
        return GateDecision(
            passed=False,
            gate_outcome="fail",
            rating="again",
            errors=("attempt path became unavailable",),
        )
    attempt_identity = build_attempt_identity(attempt_path, root)
    receipt = build_receipt(evidence, attempt_identity, str(evidence["ts"]))
    if verifier_receipt is not None:
        receipt = replace(receipt, verifier_source=verifier_receipt.source)
    if passed:
        outcome = "pass_first_try" if int(active_unit.get("retry_count", 0)) == 0 else "pass_retried"
    else:
        outcome = "fail"
    return GateDecision(
        passed=passed,
        gate_outcome=outcome,
        rating=RATING_FROM_GATE[outcome],
        receipt=receipt,
    )


def verify_and_gate(
    root: str | Path,
    evidence_path: str | Path,
    today: date | None = None,
    dry_run: bool = False,
    verifier_receipt_path: str | Path | None = None,
) -> GateDecision | None:
    """End-to-end run: load, decide, and (unless dry_run) persist + resync views.

    ``evidence_path`` may be a legacy single-record ``.json`` file or the
    NDJSON contract (``*.ndjson``); for NDJSON the latest record matching the
    active unit is graded. Returns ``None`` when the NDJSON file holds no
    record for the active unit — nothing to grade (distinct from a rejection).
    ``verifier_receipt_path`` must resolve under ``learner/verifier_receipts``.
    """
    root = Path(root)
    today = today or date.today()

    state = load_and_validate(root / "learner" / "learning_state.yaml")
    if Path(evidence_path).suffix == ".ndjson":
        evidence = select_evidence(load_evidence_ndjson(evidence_path), state["active_unit"])
        if evidence is None:
            return None
    else:
        evidence = load_evidence(evidence_path)
    verifier_receipt = (
        load_verifier_receipt(verifier_receipt_path, root)
        if verifier_receipt_path is not None
        else None
    )
    decision = decide(
        evidence,
        state["active_unit"],
        root,
        state.get("units_log"),
        verifier_receipt=verifier_receipt,
    )
    if not decision.ok:
        return decision
    if decision.receipt is None:
        raise GateIntegrityError("eligible gate decision is missing its evidence receipt")
    if dry_run:
        transition_gate(
            state,
            receipt=decision.receipt,
            passed=decision.passed,
            gate_outcome=decision.gate_outcome,
            rating=decision.rating,
            today=today,
            root=root,
        )
        return decision
    commit_gate_transition(
        state,
        receipt=decision.receipt,
        passed=decision.passed,
        gate_outcome=decision.gate_outcome,
        rating=decision.rating,
        today=today,
        path=root / "learner" / "learning_state.yaml",
    )
    return decision
