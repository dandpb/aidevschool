from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any

from learner.substrate import commit_canonical, validate
from learner.substrate.scheduling import RATING_FROM_GATE, record_gate_outcome


@dataclass(frozen=True, slots=True)
class GateEvidenceReceipt:
    """Immutable evidence identity persisted with a gate review."""

    timestamp: str
    digest: str
    run_id: str
    attempt_id: str
    attempt_digest: str
    scenario_id: str
    verifier_source: str | None = None


class GateTransitionError(ValueError):
    pass


def transition_gate(
    state: dict[str, Any],
    *,
    receipt: GateEvidenceReceipt,
    passed: bool,
    gate_outcome: str,
    rating: str,
    today: date,
    root: Path | None = None,
) -> dict[str, Any]:
    expected_rating = RATING_FROM_GATE.get(gate_outcome)
    if expected_rating is None or expected_rating != rating:
        raise GateTransitionError(
            f"gate outcome {gate_outcome!r} requires rating {expected_rating!r}, got {rating!r}"
        )

    new_state = deepcopy(state)
    unit = new_state["active_unit"]
    gate_review = {
        "date": today,
        "event": "gate",
        "rating": rating,
        "gate_outcome": gate_outcome,
        "evidence_ts": receipt.timestamp,
        "evidence_digest": receipt.digest,
        "evidence_run_id": receipt.run_id,
        "evidence_attempt_id": receipt.attempt_id,
        "evidence_attempt_digest": receipt.attempt_digest,
        "evidence_scenario_id": receipt.scenario_id,
    }
    if receipt.verifier_source is not None:
        gate_review["evidence_verifier_source"] = receipt.verifier_source
    units_log = new_state.setdefault("units_log", [])
    entry = next((item for item in units_log if item.get("unit_id") == unit["id"]), None)
    if entry is None:
        evidence_date = datetime.fromisoformat(receipt.timestamp.replace("Z", "+00:00")).date()
        units_log.append(
            {
                "unit_id": unit["id"],
                "concept": unit.get("title", unit["id"]),
                "kind": "concept",
                "project": unit["project"],
                "mastered": passed,
                "evidence_file": unit.get("evidence_file"),
                "attempt_file": unit.get("attempt_file"),
                "reviews": [
                    {"date": evidence_date, "event": "presented"},
                    gate_review,
                ],
            }
        )
    else:
        entry["mastered"] = passed
        entry.setdefault("reviews", []).append(gate_review)

    if passed:
        unit["state"] = "mastered"
        new_state["next_action"] = {
            "owner": "leader",
            "action": (
                f"{unit['id']} mastered with executable evidence. Pick the next "
                "unit (Cartografo) and present it before any implementation."
            ),
        }
    else:
        unit["retry_count"] = int(unit.get("retry_count", 0)) + 1
        new_state["next_action"] = {
            "owner": "learner",
            "action": (
                f"Gate failed for {unit['id']} "
                f"(retry {unit['retry_count']}/{unit.get('retry_limit', 3)}). "
                "Replay the mission and produce new evidence."
            ),
        }

    new_state["streak"] = record_gate_outcome(new_state.get("streak", {}), passed, today)
    errors = validate(new_state, root or Path.cwd())
    if errors:
        raise GateTransitionError(f"gated state violates substrate invariants: {errors}")
    return new_state


def commit_gate_transition(
    state: dict[str, Any],
    *,
    receipt: GateEvidenceReceipt,
    passed: bool,
    gate_outcome: str,
    rating: str,
    today: date,
    path: str | Path = "learner/learning_state.yaml",
) -> dict[str, Any]:
    target = Path(path).resolve()
    root = target.parent.parent if target.parent.name == "learner" else Path.cwd()
    transitioned = transition_gate(
        state,
        receipt=receipt,
        passed=passed,
        gate_outcome=gate_outcome,
        rating=rating,
        today=today,
        root=root,
    )
    commit_canonical(transitioned, path)
    return transitioned
