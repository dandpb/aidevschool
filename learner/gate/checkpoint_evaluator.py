from __future__ import annotations

from typing import Any

from .evaluator_primitives import closed_dict, metrics_match, round2


# Deterministic scenario table for CHECKPOINT CITY, mirrored from
# engines/voxelDojo/game-07-checkpoint-city/src/sim/levels.ts (seeds 11/22/33/44;
# L1 all-valid, L2 kinds regenerated with the shared mulberry32 port, L3 cap 5,
# L4 probe = forged token under the canonical order). The verifier never trusts
# the producer's wave; it recomputes every answer from the player's bounded
# inputs (their gate predictions; for L4 the wall order + probe prediction).
WAVE_ANSWERS: dict[str, list[str]] = {
    "L1": ["reaches-handler"] * 8,
    "L2": [
        "auth",
        "reaches-handler",
        "reaches-handler",
        "reaches-handler",
        "auth",
        "auth",
        "auth",
        "auth",
    ],
    "L3": ["reaches-handler"] * 5 + ["rate-limit"] * 3,
}
PREDICTION_TARGETS = frozenset({"reaches-handler", "logging", "auth", "rate-limit"})
L4_GIVEN_ORDER = ["rate-limit", "logging", "auth"]
L4_TARGET_ORDER = ["logging", "auth", "rate-limit"]
# forged token under logging → auth → rate-limit is rejected at the auth wall
L4_PROBE_ANSWER = "auth"


def _string_list(value: Any) -> bool:
    return isinstance(value, list) and all(isinstance(item, str) for item in value)


def _prediction_wave_result(
    level: str, observations: dict[str, Any]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictions"}):
        return None
    predictions = observations["predictions"]
    if observations["kind"] != f"checkpoint-city-{level}" or not _string_list(predictions):
        return None
    answers = WAVE_ANSWERS[level]
    if len(predictions) != len(answers) or not set(predictions) <= PREDICTION_TARGETS:
        return None
    correct = sum(1 for predicted, answer in zip(predictions, answers) if predicted == answer)
    accuracy = correct / len(answers)
    reached_handler = any(answer == "reaches-handler" for answer in answers)
    return (
        accuracy >= 0.8,
        {
            "kind": "voxeldoj-checkpoint-city",
            "predictions": len(answers),
            "prediction_accuracy": round2(accuracy),
            "correct_predictions": correct,
            "reached_handler": reached_handler,
            "rejected_at": answers[-1],
        },
    )


def _reorder_result(observations: dict[str, Any]) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "order", "probePrediction"}):
        return None
    order = observations["order"]
    probe_prediction = observations["probePrediction"]
    if (
        observations["kind"] != "checkpoint-city-L4"
        or not _string_list(order)
        or not isinstance(probe_prediction, str)
        or probe_prediction not in PREDICTION_TARGETS
    ):
        return None
    order_correct = order == L4_TARGET_ORDER
    probe_correct = probe_prediction == L4_PROBE_ANSWER
    return (
        order_correct and probe_correct,
        {
            "kind": "voxeldoj-checkpoint-city",
            "reorder_correct": order_correct,
            "given_order": ",".join(L4_GIVEN_ORDER),
            "player_order": ",".join(order),
            "target_order": ",".join(L4_TARGET_ORDER),
            "probe_prediction_ok": probe_correct,
            "probe_answer": L4_PROBE_ANSWER,
        },
    )


def evaluate_checkpoint(
    level: str, observations: Any, producer_metrics: Any, errors: list[str]
) -> bool:
    if level not in WAVE_ANSWERS and level != "L4":
        errors.append("unsupported CHECKPOINT CITY level")
        return False
    if not isinstance(observations, dict):
        errors.append("observations must be a bounded object")
        return False
    evaluated = (
        _reorder_result(observations)
        if level == "L4"
        else _prediction_wave_result(level, observations)
    )
    if evaluated is None:
        errors.append(f"observations do not match the closed {level} scenario trace")
        return False
    passed, expected_metrics = evaluated
    if not metrics_match(producer_metrics, expected_metrics):
        errors.append("producer metrics disagree with independently recomputed observations")
        return False
    return passed
