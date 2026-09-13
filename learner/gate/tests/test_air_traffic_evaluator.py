from __future__ import annotations

from typing import Any

import pytest

from learner.gate.air_traffic_evaluator import evaluate_air_traffic

# Ground-truth traces replay the deterministic wave (mirroring the TS
# GameController.predictPad side effects) — pinned so any evaluator drift or
# producer disagreement fails here.

PASSING: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {
    # Round-robin over 3 healthy pads: perfect alternation 0,1,2,...
    "L1": (
        {
            "kind": "air-traffic-L1",
            "predictions": ["b-0", "b-1", "b-2", "b-0", "b-1", "b-2", "b-0", "b-1", "b-2"],
        },
        {
            "kind": "voxeldoj-air-traffic",
            "predictions": 9,
            "prediction_accuracy": 1.0,
            "policy": "round_robin",
            "load_skew": 1.0,
            "errors": 0,
        },
    ),
    # b-1 hidden-unhealthy; probed before the first ship; rotation b-0,b-2.
    "L2": (
        {
            "kind": "air-traffic-L2",
            "probeAfter": 0,
            "predictions": ["b-0", "b-2", "b-0", "b-2", "b-0", "b-2", "b-0", "b-2", "b-0"],
        },
        {
            "kind": "voxeldoj-air-traffic",
            "predictions": 9,
            "prediction_accuracy": 1.0,
            "policy": "round_robin",
            "load_skew": 1.67,
            "errors": 0,
            "probe_fired": True,
        },
    ),
    # least-connections over initial [4,0,3]: b-1 twice, then b-2/b-0 churn.
    "L3": (
        {
            "kind": "air-traffic-L3",
            "policy": "least_connections",
            "predictions": ["b-1", "b-1", "b-2", "b-0", "b-1", "b-2", "b-0", "b-1"],
        },
        {
            "kind": "voxeldoj-air-traffic",
            "predictions": 8,
            "prediction_accuracy": 1.0,
            "policy": "least_connections",
            "load_skew": 1.5,
            "correct_policy": True,
        },
    ),
    # b-2 dead; probe after 3 ships; the recovered pad re-enters rotation.
    "L4": (
        {
            "kind": "air-traffic-L4",
            "probeAfter": 3,
            "predictions": ["b-0", "b-1", "b-0", "b-1", "b-2", "b-0", "b-1", "b-2", "b-0"],
        },
        {
            "kind": "voxeldoj-air-traffic",
            "predictions": 9,
            "prediction_accuracy": 1.0,
            "policy": "round_robin",
            "load_skew": 1.33,
            "errors": 0,
            "probe_fired": True,
            "recovered_pad_reentered": True,
        },
    ),
}


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_accepts_each_complete_passing_level(level: str) -> None:
    observations, metrics = PASSING[level]

    errors: list[str] = []

    assert evaluate_air_traffic(level, observations, metrics, errors) is True
    assert errors == []


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_rejects_forged_metrics(level: str) -> None:
    observations, _ = PASSING[level]
    forged = {"kind": "voxeldoj-air-traffic", "predictions": 999}
    errors: list[str] = []

    assert evaluate_air_traffic(level, observations, forged, errors) is False
    assert errors == ["producer metrics disagree with independently recomputed observations"]


def test_rejects_routing_to_the_hidden_dead_pad() -> None:
    # L2 without probing: predicting the dead pad b-1 is an error — a wave
    # with 89% accuracy still fails because of the error (and no probe).
    observations = {
        "kind": "air-traffic-L2",
        "probeAfter": None,
        "predictions": ["b-1", "b-2", "b-0", "b-2", "b-0", "b-2", "b-0", "b-2", "b-0"],
    }
    errors: list[str] = []
    recomputed = {
        "kind": "voxeldoj-air-traffic",
        "predictions": 9,
        "prediction_accuracy": 0.89,
        "policy": "round_robin",
        "load_skew": 1.5,
        "errors": 1,
        "probe_fired": False,
    }

    assert evaluate_air_traffic("L2", observations, recomputed, errors) is False
    assert errors == []


def test_rejects_l2_without_a_probe() -> None:
    # Perfect health-aware predictions still fail without the probe lesson.
    observations = {
        "kind": "air-traffic-L2",
        "probeAfter": None,
        "predictions": ["b-0", "b-2", "b-0", "b-2", "b-0", "b-2", "b-0", "b-2", "b-0"],
    }
    errors: list[str] = []

    assert evaluate_air_traffic("L2", observations, {"kind": "voxeldoj-air-traffic"}, errors) is False


def test_rejects_l3_that_never_switches_policy() -> None:
    # Perfect round-robin predictions on L3 fail: the lesson is the switch to
    # least-connections under skewed initial connections.
    observations = {
        "kind": "air-traffic-L3",
        "policy": "round_robin",
        "predictions": ["b-0", "b-1", "b-2", "b-0", "b-1", "b-2", "b-0", "b-1"],
    }
    errors: list[str] = []
    metrics = {
        "kind": "voxeldoj-air-traffic",
        "predictions": 8,
        "prediction_accuracy": 1.0,
        "policy": "round_robin",
        "load_skew": 1.13,
        "correct_policy": False,
    }

    assert evaluate_air_traffic("L3", observations, metrics, errors) is False
    assert errors == []


def test_rejects_l4_when_the_recovered_pad_never_reenters() -> None:
    # Probe fired only after the last ship: recovered_pad_reentered is false.
    observations = {
        "kind": "air-traffic-L4",
        "probeAfter": 9,
        "predictions": ["b-0", "b-1", "b-0", "b-1", "b-2", "b-0", "b-1", "b-2", "b-0"],
    }
    errors: list[str] = []

    assert evaluate_air_traffic("L4", observations, {"kind": "voxeldoj-air-traffic"}, errors) is False


@pytest.mark.parametrize(
    "mutation",
    ["short", "long", "unknown_pad", "wrong_kind", "extra_key", "bad_probe", "bad_policy"],
)
def test_rejects_nonclosed_or_malformed_traces(mutation: str) -> None:
    observations = {
        "kind": "air-traffic-L4",
        "probeAfter": 3,
        "predictions": ["b-0", "b-1", "b-0", "b-1", "b-2", "b-0", "b-1", "b-2", "b-0"],
    }
    if mutation == "short":
        observations["predictions"] = observations["predictions"][:8]
    elif mutation == "long":
        observations["predictions"] = observations["predictions"] + ["b-0"]
    elif mutation == "unknown_pad":
        observations["predictions"] = ["b-9"] + observations["predictions"][1:]
    elif mutation == "wrong_kind":
        observations["kind"] = "air-traffic-L2"
    elif mutation == "extra_key":
        observations["extra"] = True
    elif mutation == "bad_probe":
        observations["probeAfter"] = -1
    else:
        observations = {
            "kind": "air-traffic-L3",
            "policy": "random",
            "predictions": ["b-0"] * 8,
        }
    errors: list[str] = []

    verdict = evaluate_air_traffic("L4" if mutation != "bad_policy" else "L3", observations, {}, errors)

    assert verdict is False
    assert errors


def test_rejects_unsupported_level_and_non_object_observations() -> None:
    errors: list[str] = []

    assert evaluate_air_traffic("L5", {}, {}, errors) is False
    assert evaluate_air_traffic("L1", None, {}, errors) is False
    assert errors == [
        "unsupported AIR TRAFFIC level",
        "observations must be a bounded object",
    ]


# --- Bridge-level: the full record (identity + observations + metrics) must
# verify through the same dispatcher the OS bridge uses. ---


def _bridge_record(level: str, passed: bool = True) -> dict[str, Any]:
    observations, metrics = PASSING[level]
    record: dict[str, Any] = {
        "source": "voxeldojo",
        "unit_id": "U11-load-balancer",
        "project": "11_load_balancer",
        "scenario_id": f"air-traffic-{level}",
        "game": "AIR TRAFFIC",
        "ts": "2026-09-13T00:00:00.000Z",
        "pass": passed,
        "metrics": metrics,
        "observations": observations,
        "review_context": {"verifier_required": True},
        "curriculum_context": {
            "concept": "load-balancer routing + health checks",
            "mechanic": "air traffic to landing pads",
        },
    }
    return record


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_bridge_verifies_each_passing_air_traffic_level(level: str) -> None:
    from learner.gate.teaching_game_bridge import verify_teaching_game_evidence

    receipt = verify_teaching_game_evidence(_bridge_record(level))

    assert receipt["verdict"] == "PASS"
    assert receipt["producer_writes_mastered"] is False
    assert receipt["unit_id"] == "U11-load-balancer"


def test_bridge_rejects_a_false_pass_claim() -> None:
    from learner.gate.teaching_game_bridge import verify_teaching_game_evidence

    receipt = verify_teaching_game_evidence(_bridge_record("L1", passed=False))

    assert receipt["verdict"] == "FAIL"
    assert "producer pass claim disagrees with the fixed independent evaluator" in receipt["errors"]
