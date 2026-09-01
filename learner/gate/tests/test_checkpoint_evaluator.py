from __future__ import annotations

import copy
from typing import Any

import pytest

from learner.gate.checkpoint_evaluator import evaluate_checkpoint


CORRECT_L1 = ["reaches-handler"] * 8
CORRECT_L2 = [
    "auth",
    "reaches-handler",
    "reaches-handler",
    "reaches-handler",
    "auth",
    "auth",
    "auth",
    "auth",
]
CORRECT_L3 = ["reaches-handler"] * 5 + ["rate-limit"] * 3

PASSING_WAVES: dict[str, list[str]] = {
    "L1": CORRECT_L1,
    "L2": CORRECT_L2,
    "L3": CORRECT_L3,
}


def _wave_metrics(level: str, predictions: list[str]) -> dict[str, Any]:
    answers = PASSING_WAVES[level]
    correct = sum(1 for p, a in zip(predictions, answers) if p == a)
    accuracy = correct / len(answers)
    return {
        "kind": "voxeldoj-checkpoint-city",
        "predictions": len(answers),
        "prediction_accuracy": round(accuracy * 100) / 100,
        "correct_predictions": correct,
        "reached_handler": any(a == "reaches-handler" for a in answers),
        "rejected_at": answers[-1],
    }


PASSING_L4 = (
    {
        "kind": "checkpoint-city-L4",
        "order": ["logging", "auth", "rate-limit"],
        "probePrediction": "auth",
    },
    {
        "kind": "voxeldoj-checkpoint-city",
        "reorder_correct": True,
        "given_order": "rate-limit,logging,auth",
        "player_order": "logging,auth,rate-limit",
        "target_order": "logging,auth,rate-limit",
        "probe_prediction_ok": True,
        "probe_answer": "auth",
    },
)


@pytest.mark.parametrize("level", ["L1", "L2", "L3"])
def test_passing_prediction_waves_recomputed_from_observations(level):
    observations = {"kind": f"checkpoint-city-{level}", "predictions": PASSING_WAVES[level]}

    errors: list[str] = []
    assert evaluate_checkpoint(level, observations, _wave_metrics(level, PASSING_WAVES[level]), errors) is True
    assert errors == []


def test_passing_l4_reorder_recomputed_from_observations():
    observations, metrics = copy.deepcopy(PASSING_L4)

    errors: list[str] = []
    assert evaluate_checkpoint("L4", observations, metrics, errors) is True
    assert errors == []


@pytest.mark.parametrize("level", ["L1", "L2", "L3"])
def test_wrong_predictions_fail_even_with_honest_metrics(level):
    wrong = list(PASSING_WAVES[level])
    wrong[0] = "logging" if wrong[0] != "logging" else "auth"
    # flip enough predictions to drop below the 0.8 threshold on 8 requests
    wrong[1] = "logging" if wrong[1] != "logging" else "auth"

    observations = {"kind": f"checkpoint-city-{level}", "predictions": wrong}
    errors: list[str] = []
    assert evaluate_checkpoint(level, observations, _wave_metrics(level, wrong), errors) is False
    assert errors == []


def test_l4_wrong_order_fails_even_with_matching_probe():
    observations, metrics = copy.deepcopy(PASSING_L4)
    observations["order"] = ["rate-limit", "logging", "auth"]
    metrics["reorder_correct"] = False
    metrics["player_order"] = "rate-limit,logging,auth"

    errors: list[str] = []
    assert evaluate_checkpoint("L4", observations, metrics, errors) is False
    assert errors == []


def test_l4_wrong_probe_prediction_fails_even_with_correct_order():
    observations, metrics = copy.deepcopy(PASSING_L4)
    observations["probePrediction"] = "rate-limit"
    metrics["probe_prediction_ok"] = False

    errors: list[str] = []
    assert evaluate_checkpoint("L4", observations, metrics, errors) is False
    assert errors == []


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_forged_metrics_are_rejected(level):
    if level == "L4":
        observations, metrics = copy.deepcopy(PASSING_L4)
        metrics["probe_answer"] = "rate-limit"
    else:
        observations = {"kind": f"checkpoint-city-{level}", "predictions": PASSING_WAVES[level]}
        metrics = _wave_metrics(level, PASSING_WAVES[level])
        metrics["correct_predictions"] = 0

    errors: list[str] = []
    assert evaluate_checkpoint(level, observations, metrics, errors) is False
    assert errors == ["producer metrics disagree with independently recomputed observations"]


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_nonclosed_observations_are_rejected(level):
    if level == "L4":
        observations, _ = copy.deepcopy(PASSING_L4)
    else:
        observations = {"kind": f"checkpoint-city-{level}", "predictions": PASSING_WAVES[level]}
    observations["extra"] = True

    errors: list[str] = []
    assert evaluate_checkpoint(level, observations, {}, errors) is False
    assert errors == [f"observations do not match the closed {level} scenario trace"]


def test_unknown_prediction_target_is_rejected():
    observations = {"kind": "checkpoint-city-L1", "predictions": ["admin"] * 8}

    errors: list[str] = []
    assert evaluate_checkpoint("L1", observations, {}, errors) is False
    assert errors == ["observations do not match the closed L1 scenario trace"]


def test_unsupported_level_is_rejected():
    errors: list[str] = []
    assert evaluate_checkpoint("L5", {}, {}, errors) is False
    assert errors == ["unsupported CHECKPOINT CITY level"]
