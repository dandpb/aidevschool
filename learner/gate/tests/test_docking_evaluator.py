from __future__ import annotations

import copy
from typing import Any

import pytest

from learner.gate.docking_evaluator import evaluate_docking


def _dock_observations(predicted: list[bool]) -> dict[str, Any]:
    return {
        "kind": "docking-bay-L1",
        "dockPredictions": [
            {"podId": f"pod-{index}", "predictedDock": value}
            for index, value in enumerate(predicted)
        ],
    }


# L1 truth (seed 11, 6 pods): docks, rejected, rejected, docks, rejected, rejected
L1_TRUTH = [True, False, False, True, False, False]
# L2 truth (seed 22, 5 pods): first missing host method per pod
L2_TRUTH = ["readState", "readState", "none", "readState", "readState"]
# L3 truth (seed 33): cap = connect, readState, writeState; invoked = all four
L3_TRUTH = [True, True, True, False]

PASSING: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {
    "L1": (
        _dock_observations(L1_TRUTH),
        {
            "kind": "voxeldoj-docking-bay",
            "dock_predictions": 6,
            "dock_prediction_accuracy": 1.0,
            "contracts_checked": 6,
        },
    ),
    "L2": (
        {
            "kind": "docking-bay-L2",
            "missingPredictions": [
                {"podId": f"pod-{index}", "predictedMissing": value}
                for index, value in enumerate(L2_TRUTH)
            ],
        },
        {
            "kind": "voxeldoj-docking-bay",
            "mismatch_predictions": 5,
            "mismatch_prediction_accuracy": 1.0,
            "missing_methods_named": 5,
        },
    ),
    "L3": (
        {
            "kind": "docking-bay-L3",
            "classifications": [
                {"method": method, "predictedAllow": value}
                for method, value in zip(
                    ["connect", "readState", "writeState", "log"], L3_TRUTH
                )
            ],
        },
        {
            "kind": "voxeldoj-docking-bay",
            "sandbox_probes": 4,
            "sandbox_accuracy": 1.0,
            "capabilities_granted": 3,
        },
    ),
    "L4": (
        {"kind": "docking-bay-L4", "chosenCapabilities": ["connect", "writeState"]},
        {
            "kind": "voxeldoj-docking-bay",
            "required_calls_covered": True,
            "no_overgrant": True,
            "least_privilege": True,
            "granted_count": 2,
            "required_count": 2,
        },
    ),
}


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_passing_closed_traces_recomputed_from_observations(level):
    observations, metrics = copy.deepcopy(PASSING[level])

    errors: list[str] = []
    assert evaluate_docking(level, observations, metrics, errors) is True
    assert errors == []


def test_wrong_dock_predictions_fail_l1_even_with_honest_metrics():
    predicted = list(L1_TRUTH)
    predicted[3] = not predicted[3]
    predicted[0] = not predicted[0]
    observations = _dock_observations(predicted)

    errors: list[str] = []
    assert evaluate_docking("L1", observations, {}, errors) is False
    assert errors == ["producer metrics disagree with independently recomputed observations"]


def test_partial_missing_names_fail_l2():
    observations, metrics = copy.deepcopy(PASSING["L2"])
    observations["missingPredictions"][0]["predictedMissing"] = "writeState"
    metrics["missing_methods_named"] = 4
    metrics["mismatch_prediction_accuracy"] = 0.8

    errors: list[str] = []
    assert evaluate_docking("L2", observations, metrics, errors) is False
    assert errors == []


def test_wrong_classification_fails_l3():
    observations, metrics = copy.deepcopy(PASSING["L3"])
    observations["classifications"][3]["predictedAllow"] = True
    metrics["sandbox_accuracy"] = 0.75

    errors: list[str] = []
    assert evaluate_docking("L3", observations, metrics, errors) is False
    assert errors == []


def test_overgranted_set_fails_l4_even_though_sufficient():
    observations, metrics = copy.deepcopy(PASSING["L4"])
    observations["chosenCapabilities"] = ["connect", "readState", "writeState", "log"]
    metrics["no_overgrant"] = False
    metrics["least_privilege"] = False
    metrics["granted_count"] = 4

    errors: list[str] = []
    assert evaluate_docking("L4", observations, metrics, errors) is False
    assert errors == []


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_nonclosed_observations_are_rejected(level):
    observations, _ = copy.deepcopy(PASSING[level])
    observations["extra"] = True

    errors: list[str] = []
    assert evaluate_docking(level, observations, {}, errors) is False
    assert errors == [f"observations do not match the closed {level} scenario trace"]


def test_reordered_pod_ids_are_rejected_l1():
    observations = _dock_observations(L1_TRUTH)
    observations["dockPredictions"].reverse()

    errors: list[str] = []
    assert evaluate_docking("L1", observations, {}, errors) is False
    assert errors == ["observations do not match the closed L1 scenario trace"]


def test_unknown_capability_is_rejected_l4():
    observations = {"kind": "docking-bay-L4", "chosenCapabilities": ["root"]}

    errors: list[str] = []
    assert evaluate_docking("L4", observations, {}, errors) is False
    assert errors == ["observations do not match the closed L4 scenario trace"]


def test_unsupported_level_is_rejected():
    errors: list[str] = []
    assert evaluate_docking("L5", {}, {}, errors) is False
    assert errors == ["unsupported DOCKING BAY level"]
