from __future__ import annotations

from typing import Any

import pytest

from learner.gate.breaker_grid_evaluator import evaluate_breaker_grid

# Ground-truth traces replay the deterministic wave (mirroring the TS sim in
# engines/voxelDojo/game-13-breaker-grid/src/sim) — pinned so any evaluator
# drift or producer disagreement fails here.

PASSING: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {
    # 3 consecutive failures on payments trip its breaker OPEN.
    "L1": (
        {
            "kind": "breaker-grid-L1",
            "failingDistrict": "payments",
            "failures": 3,
            "predictedState": "open",
            "predictedTrippedId": "payments",
        },
        {
            "kind": "voxeldoj-breaker-grid",
            "failing_district": "payments",
            "failures_injected": 3,
            "predicted_state": "open",
            "actual_state": "open",
            "tripped_district_ok": True,
            "threshold": 3,
        },
    ),
    # A successful half-open probe after the cooldown closes the breaker.
    "L2": (
        {
            "kind": "breaker-grid-L2",
            "district": "payments",
            "probeOutcome": "success",
            "predictedFinal": "closed",
        },
        {
            "kind": "voxeldoj-breaker-grid",
            "probe_outcome": 1,
            "predicted_final": "closed",
            "actual_final": "closed",
            "probe_prediction_ok": True,
        },
    ),
    # 5 slow calls against a cap of 2: exactly 3 bulkhead rejections.
    "L3": (
        {
            "kind": "breaker-grid-L3",
            "district": "payments",
            "requests": 5,
            "predictedRejected": 3,
        },
        {
            "kind": "voxeldoj-breaker-grid",
            "requests": 5,
            "cap": 2,
            "predicted_rejected": 3,
            "actual_rejected": 3,
            "rejection_prediction_ok": True,
            "breaker_state_after": "closed",
        },
    ),
    # Killing shipping: payments+search+auth keep serving (cascade prevented).
    "L4": (
        {
            "kind": "breaker-grid-L4",
            "failingDistrict": "shipping",
            "predictedStillServing": ["payments", "search", "auth"],
        },
        {
            "kind": "voxeldoj-breaker-grid",
            "failing_district": "shipping",
            "predicted_still_serving": 3,
            "actual_still_serving": 3,
            "still_serving_prediction_ok": True,
            "total_served": 14,
            "total_short_circuited": 5,
            "cascade_prevented": True,
        },
    ),
}


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_accepts_each_complete_passing_level(level: str) -> None:
    observations, metrics = PASSING[level]

    errors: list[str] = []

    assert evaluate_breaker_grid(level, observations, metrics, errors) is True
    assert errors == []


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_rejects_forged_metrics(level: str) -> None:
    observations, _ = PASSING[level]
    forged = {"kind": "voxeldoj-breaker-grid", "total_served": 999}
    errors: list[str] = []

    assert evaluate_breaker_grid(level, observations, forged, errors) is False
    assert errors == ["producer metrics disagree with independently recomputed observations"]


def test_accepts_l1_that_stays_closed_below_the_threshold() -> None:
    # 2 failures < threshold 3: nothing trips and the player read it right.
    observations = {
        "kind": "breaker-grid-L1",
        "failingDistrict": "payments",
        "failures": 2,
        "predictedState": "closed",
        "predictedTrippedId": None,
    }
    errors: list[str] = []
    recomputed = {
        "kind": "voxeldoj-breaker-grid",
        "failing_district": "payments",
        "failures_injected": 2,
        "predicted_state": "closed",
        "actual_state": "closed",
        "tripped_district_ok": True,
        "threshold": 3,
    }

    assert evaluate_breaker_grid("L1", observations, recomputed, errors) is True
    assert errors == []


def test_rejects_l1_with_the_wrong_final_state() -> None:
    # Claiming the breaker stayed CLOSED after 3 failures is a misread.
    observations = {
        "kind": "breaker-grid-L1",
        "failingDistrict": "payments",
        "failures": 3,
        "predictedState": "closed",
        "predictedTrippedId": None,
    }
    errors: list[str] = []
    recomputed = {
        "kind": "voxeldoj-breaker-grid",
        "failing_district": "payments",
        "failures_injected": 3,
        "predicted_state": "closed",
        "actual_state": "open",
        "tripped_district_ok": False,
        "threshold": 3,
    }

    assert evaluate_breaker_grid("L1", observations, recomputed, errors) is False
    assert errors == []


def test_rejects_l2_that_predicts_recovery_on_a_failing_probe() -> None:
    # A failed probe re-opens the breaker — predicting CLOSED fails.
    observations = {
        "kind": "breaker-grid-L2",
        "district": "payments",
        "probeOutcome": "failure",
        "predictedFinal": "closed",
    }
    errors: list[str] = []
    recomputed = {
        "kind": "voxeldoj-breaker-grid",
        "probe_outcome": 0,
        "predicted_final": "closed",
        "actual_final": "open",
        "probe_prediction_ok": False,
    }

    assert evaluate_breaker_grid("L2", observations, recomputed, errors) is False
    assert errors == []


def test_rejects_l3_with_the_wrong_rejection_count() -> None:
    # Off-by-one on the bulkhead: 2 predicted vs 3 actual rejections.
    observations = {
        "kind": "breaker-grid-L3",
        "district": "payments",
        "requests": 5,
        "predictedRejected": 2,
    }
    errors: list[str] = []
    recomputed = {
        "kind": "voxeldoj-breaker-grid",
        "requests": 5,
        "cap": 2,
        "predicted_rejected": 2,
        "actual_rejected": 3,
        "rejection_prediction_ok": False,
        "breaker_state_after": "closed",
    }

    assert evaluate_breaker_grid("L3", observations, recomputed, errors) is False
    assert errors == []


def test_rejects_l4_that_includes_the_failing_district() -> None:
    # The failing district never serves again — including it in the
    # still-serving set is exactly the cascade the breaker prevents.
    observations = {
        "kind": "breaker-grid-L4",
        "failingDistrict": "shipping",
        "predictedStillServing": ["payments", "search", "shipping", "auth"],
    }
    errors: list[str] = []
    recomputed = {
        "kind": "voxeldoj-breaker-grid",
        "failing_district": "shipping",
        "predicted_still_serving": 4,
        "actual_still_serving": 3,
        "still_serving_prediction_ok": False,
        "total_served": 14,
        "total_short_circuited": 5,
        "cascade_prevented": True,
    }

    assert evaluate_breaker_grid("L4", observations, recomputed, errors) is False
    assert errors == []


@pytest.mark.parametrize(
    "mutation",
    ["unknown_district", "wrong_kind", "extra_key", "bad_failures", "bad_state", "bad_outcome"],
)
def test_rejects_nonclosed_or_malformed_traces(mutation: str) -> None:
    observations: dict[str, Any] = dict(PASSING["L1"][0])
    if mutation == "unknown_district":
        observations["failingDistrict"] = "billing"
    elif mutation == "wrong_kind":
        observations["kind"] = "breaker-grid-L2"
    elif mutation == "extra_key":
        observations["extra"] = True
    elif mutation == "bad_failures":
        observations["failures"] = -1
    elif mutation == "bad_state":
        observations["predictedState"] = "tripped"
    else:
        observations["probeOutcome"] = "maybe"
    errors: list[str] = []

    assert evaluate_breaker_grid("L1", observations, {}, errors) is False
    assert errors


def test_rejects_unsupported_level_and_non_object_observations() -> None:
    errors: list[str] = []

    assert evaluate_breaker_grid("L5", {}, {}, errors) is False
    assert evaluate_breaker_grid("L1", None, {}, errors) is False
    assert errors == [
        "unsupported BREAKER GRID level",
        "observations must be a bounded object",
    ]


# --- Bridge-level: the full record (identity + observations + metrics) must
# verify through the same dispatcher the OS bridge uses. ---


def _bridge_record(level: str, passed: bool = True) -> dict[str, Any]:
    observations, metrics = PASSING[level]
    record: dict[str, Any] = {
        "source": "voxeldojo",
        "unit_id": "U13-circuit-breaker",
        "project": "13_api_gateway_circuit_breaker",
        "scenario_id": f"breaker-grid-{level}",
        "game": "BREAKER GRID",
        "ts": "2026-09-14T00:00:00.000Z",
        "pass": passed,
        "metrics": metrics,
        "observations": observations,
        "review_context": {"verifier_required": True},
        "curriculum_context": {
            "concept": "circuit breaker + bulkhead",
            "mechanic": "3D power grid of tripping breakers",
        },
    }
    return record


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_bridge_verifies_each_passing_breaker_grid_level(level: str) -> None:
    from learner.gate.teaching_game_bridge import verify_teaching_game_evidence

    receipt = verify_teaching_game_evidence(_bridge_record(level))

    assert receipt["verdict"] == "PASS"
    assert receipt["producer_writes_mastered"] is False
    assert receipt["unit_id"] == "U13-circuit-breaker"


def test_bridge_rejects_a_false_pass_claim() -> None:
    from learner.gate.teaching_game_bridge import verify_teaching_game_evidence

    receipt = verify_teaching_game_evidence(_bridge_record("L1", passed=False))

    assert receipt["verdict"] == "FAIL"
    assert "producer pass claim disagrees with the fixed independent evaluator" in receipt["errors"]
