from __future__ import annotations

import copy
import math
from typing import Any

import pytest

from learner.gate.relay_evaluator import evaluate_relay


PASSING: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {
    "L1": (
        {"kind": "relay-L1", "predictions": ["st-0", "st-2", "st-4"]},
        {
            "kind": "voxeldoj-relay-station",
            "connected_accuracy": 1,
            "connected_predicted": 3,
            "connected_truth": 3,
            "connected_total": 5,
        },
    ),
    "L2": (
        {"kind": "relay-L2", "predictions": ["st-0", "st-3"]},
        {
            "kind": "voxeldoj-relay-station",
            "delivery_accuracy": 1,
            "delivery_predicted": 2,
            "delivery_truth": 2,
            "delivery_total": 5,
        },
    ),
    "L3": (
        {"kind": "relay-L3", "predictions": ["st-0", "st-2", "st-4"]},
        {
            "kind": "voxeldoj-relay-station",
            "survivor_accuracy": 1,
            "survivor_predicted": 3,
            "survivor_truth": 3,
            "survivor_total": 5,
            "missed_heartbeat_dropped": 2,
        },
    ),
    "L4": (
        {"kind": "relay-L4", "reconnectedId": "st-2"},
        {
            "kind": "voxeldoj-relay-station",
            "target_correct": True,
            "rejoined_fanout": True,
            "delivered_after": 4,
            "was_dropped": True,
        },
    ),
}


def evaluate(level: str, observations: Any, metrics: Any) -> tuple[bool, list[str]]:
    errors: list[str] = []
    return evaluate_relay(level, observations, metrics, errors), errors


@pytest.mark.parametrize("level", PASSING)
def test_recomputes_passing_fixed_scenarios(level):
    observations, metrics = PASSING[level]

    assert evaluate(level, observations, metrics) == (True, [])


def test_recomputes_valid_failing_prediction():
    observations: dict[str, Any] = {"kind": "relay-L1", "predictions": []}
    metrics: dict[str, Any] = {
        "kind": "voxeldoj-relay-station",
        "connected_accuracy": 0.4,
        "connected_predicted": 0,
        "connected_truth": 3,
        "connected_total": 5,
    }

    assert evaluate("L1", observations, metrics) == (False, [])


def test_recomputes_valid_wrong_recovery_target():
    observations: dict[str, Any] = {
        "kind": "relay-L4",
        "reconnectedId": "st-0",
    }
    metrics: dict[str, Any] = {
        "kind": "voxeldoj-relay-station",
        "target_correct": False,
        "rejoined_fanout": False,
        "delivered_after": 3,
        "was_dropped": False,
    }

    assert evaluate("L4", observations, metrics) == (False, [])


@pytest.mark.parametrize(
    "mutation",
    ["missing", "extra", "kind", "unknown", "duplicate", "altered", "truncated"],
)
def test_rejects_unbounded_or_tampered_prediction_trace(mutation):
    observations, metrics = copy.deepcopy(PASSING["L1"])
    if mutation == "missing":
        observations.pop("predictions")
    elif mutation == "extra":
        observations["extra"] = True
    elif mutation == "kind":
        observations["kind"] = "relay-L2"
    elif mutation == "unknown":
        observations["predictions"][0] = "st-unknown"
    elif mutation == "duplicate":
        observations["predictions"][1] = observations["predictions"][0]
    elif mutation == "altered":
        observations["predictions"][0] = "st-1"
    else:
        observations["predictions"].pop()

    passed, errors = evaluate("L1", observations, metrics)

    assert passed is False
    assert errors


@pytest.mark.parametrize("target", ["", "st-unknown", 2, None])
def test_rejects_invalid_recovery_target(target):
    observations, metrics = copy.deepcopy(PASSING["L4"])
    observations["reconnectedId"] = target

    passed, errors = evaluate("L4", observations, metrics)

    assert passed is False
    assert errors


@pytest.mark.parametrize("forgery", ["value", "missing", "extra", "kind", "nan", "infinity"])
def test_rejects_forged_or_nonfinite_metrics(forgery):
    observations, metrics = copy.deepcopy(PASSING["L2"])
    if forgery == "value":
        metrics["delivery_accuracy"] = 0.99
    elif forgery == "missing":
        metrics.pop("delivery_truth")
    elif forgery == "extra":
        metrics["pass"] = True
    elif forgery == "kind":
        metrics["kind"] = "voxeldoj-kv-warehouse"
    elif forgery == "nan":
        metrics["delivery_accuracy"] = math.nan
    else:
        metrics["delivery_accuracy"] = math.inf

    passed, errors = evaluate("L2", observations, metrics)

    assert passed is False
    assert errors
