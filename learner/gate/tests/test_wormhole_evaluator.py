from __future__ import annotations

import copy
import math
from typing import Any

import pytest

from learner.gate.wormhole_evaluator import evaluate_wormhole


L1 = [
    ("https://delta.app/8ril9k-0", "35y4"),
    ("https://delta.app/9rd4jn-1", "REDI"),
    ("https://flux.sys/8wbont-2", "3qEK"),
    ("https://ada.io/8ruko7-3", "1buv"),
    ("https://delta.app/7g40wq-4", "442O"),
    ("https://cache.net/dy7kps-5", "1Nfi"),
]
L2 = [
    ("3B8b", "https://delta.app/3wxzra-0"),
    ("4DF2", "https://bytes.dev/3e8o2g-1"),
    ("1f4R", "https://cache.net/eu4mct-2"),
    ("2vGN", "https://cache.net/b4u2g8-3"),
    ("2PJA", "https://edge.run/9u4i7-4"),
    ("2xqJ", "https://ada.io/280dma-5"),
]
L3 = [
    ("https://delta.app/c89yjl-0", False),
    ("https://delta.app/9rgfr-1", False),
    ("https://wormhole.collide/133", False),
    ("https://wormhole.collide/163", True),
    ("https://edge.run/fx6tp8-4", False),
    ("https://bytes.dev/ddbqp2-5", False),
]


def level_payload(level: str, resolution: str = "salted") -> tuple[dict[str, Any], dict[str, Any]]:
    if level == "L1":
        return (
            {
                "kind": "wormhole-L1",
                "predictions": [
                    {"url": url, "predictedCode": predicted_code}
                    for url, predicted_code in L1
                ],
            },
            {
                "code_predictions": 6,
                "code_prediction_accuracy": 1,
                "strategy": "hash_trunc",
            },
        )
    if level == "L2":
        return (
            {
                "kind": "wormhole-L2",
                "predictions": [
                    {"code": code, "predictedUrl": predicted_url}
                    for code, predicted_url in L2
                ],
            },
            {"redirect_predictions": 6, "redirect_prediction_accuracy": 1},
        )
    if level == "L3":
        return (
            {
                "kind": "wormhole-L3",
                "predictions": [
                    {"url": url, "predictedCollision": prediction}
                    for url, prediction in L3
                ],
            },
            {
                "collision_predictions": 6,
                "collision_prediction_accuracy": 1,
                "collisions_present": 1,
            },
        )
    resolved_code = "1drY" if resolution == "salted" else "3MCB"
    return (
        {
            "kind": "wormhole-L4",
            "colliderUrl": "https://wormhole.collide/163",
            "chosenResolution": resolution,
        },
        {
            "resolution_chosen": resolution,
            "resolved_code": resolved_code,
            "resolved_unique": True,
            "redirect_ok": True,
        },
    )


@pytest.mark.parametrize("level", ["L1", "L2", "L3"])
def test_accepts_complete_canonical_prediction_trace(level):
    observations, metrics = level_payload(level)
    errors: list[str] = []

    assert evaluate_wormhole(level, observations, metrics, errors) is True
    assert errors == []


@pytest.mark.parametrize("resolution", ["salted", "increment"])
def test_recomputes_both_collision_resolutions(resolution):
    observations, metrics = level_payload("L4", resolution)
    errors: list[str] = []

    assert evaluate_wormhole("L4", observations, metrics, errors) is True
    assert errors == []


def test_scores_player_input_instead_of_trusting_favorable_metrics():
    observations, metrics = level_payload("L1")
    for prediction in observations["predictions"][:2]:
        prediction["predictedCode"] = "nope"
    errors: list[str] = []

    assert evaluate_wormhole("L1", observations, metrics, errors) is False
    assert errors == ["producer metrics disagree with independently recomputed observations"]

    metrics["code_prediction_accuracy"] = 0.67
    errors = []
    assert evaluate_wormhole("L1", observations, metrics, errors) is False
    assert errors == []


@pytest.mark.parametrize(
    "mutation",
    ["missing", "extra", "reordered", "altered", "duplicate", "truncated", "truth"],
)
def test_rejects_noncanonical_or_truth_bearing_trace(mutation):
    observations, metrics = level_payload("L1")
    predictions = observations["predictions"]
    if mutation == "missing":
        predictions[0].pop("predictedCode")
    elif mutation == "extra":
        predictions[0]["extra"] = True
    elif mutation == "reordered":
        predictions[0], predictions[1] = predictions[1], predictions[0]
    elif mutation == "altered":
        predictions[0]["url"] = "https://attacker.invalid/"
    elif mutation == "duplicate":
        predictions[1] = copy.deepcopy(predictions[0])
    elif mutation == "truncated":
        predictions.pop()
    else:
        predictions[0]["actualCode"] = predictions[0]["predictedCode"]
    errors: list[str] = []

    assert evaluate_wormhole("L1", observations, metrics, errors) is False
    assert errors == ["observations do not match the closed L1 scenario trace"]


@pytest.mark.parametrize("strategy", ["retry", "hash_trunc", "", None, 1, [], {}])
def test_rejects_invalid_resolution_strategy(strategy):
    observations, metrics = level_payload("L4")
    observations["chosenResolution"] = strategy
    errors: list[str] = []

    assert evaluate_wormhole("L4", observations, metrics, errors) is False
    assert errors == ["observations do not match the closed L4 scenario trace"]


@pytest.mark.parametrize("forged", [math.nan, math.inf, -math.inf, True, "1.0"])
def test_rejects_nonfinite_or_wrongly_typed_metrics(forged):
    observations, metrics = level_payload("L2")
    metrics["redirect_prediction_accuracy"] = forged
    errors: list[str] = []

    assert evaluate_wormhole("L2", observations, metrics, errors) is False
    assert errors == ["producer metrics disagree with independently recomputed observations"]
