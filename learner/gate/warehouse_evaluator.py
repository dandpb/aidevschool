from __future__ import annotations

import math
from typing import Any

from .evaluator_primitives import (
    base36 as _base36,
    closed_dict,
    hash32 as _hash,
    metrics_match,
    mulberry32 as _mulberry32,
    round2 as _round2,
)


LEVELS = {
    "L1": (11, 12, 0.0),
    "L2": (22, 10, 0.0),
    "L3": (33, 10, 0.0),
    "L4": (44, 400, 0.7),
}
def _keys(seed: int, count: int, skew: float) -> list[str]:
    random = _mulberry32(seed)
    result: list[str] = []
    for index in range(count):
        if skew > 0 and random() < skew:
            result.append(f"hot:{math.floor(random() * 50)}")
        else:
            result.append(f"key:{_base36(math.floor(random() * 1e9))}:{index}")
    return result


def _prediction_trace(
    raw: Any,
    expected_keys: list[str],
    value_key: str,
    value_type: type,
) -> list[dict[str, Any]] | None:
    if not isinstance(raw, list) or len(raw) != len(expected_keys):
        return None
    parsed: list[dict[str, Any]] = []
    for expected_key, item in zip(expected_keys, raw, strict=True):
        if not closed_dict(item, {"key", value_key}) or item["key"] != expected_key:
            return None
        value = item[value_key]
        if value_type is bool:
            valid = isinstance(value, bool)
        else:
            valid = isinstance(value, value_type) and not isinstance(value, bool)
        if not valid:
            return None
        parsed.append(item)
    return parsed


def _evaluate_predictions(level: str, observations: dict[str, Any]):
    seed, count, skew = LEVELS[level]
    keys = _keys(seed, count, skew)
    if level == "L1":
        if not closed_dict(observations, {"kind", "predictions"}):
            return None
        trace = _prediction_trace(observations["predictions"], keys, "shelf", int)
        if trace is None or observations["kind"] != "warehouse-L1":
            return None
        correct = sum(item["shelf"] == _hash(item["key"]) % 6 for item in trace)
        accuracy = _round2(correct / count)
        return accuracy >= 0.8, {
            "kind": "voxeldoj-kv-warehouse",
            "shelf_predictions": count,
            "shelf_prediction_accuracy": accuracy,
        }

    kind = f"warehouse-{level}"
    required = {"kind", "probes"} | ({"predictedSwept"} if level == "L3" else set())
    if not closed_dict(observations, required) or observations["kind"] != kind:
        return None
    trace = _prediction_trace(observations["probes"], keys, "predictedAlive", bool)
    if trace is None:
        return None
    expected_alive = level == "L2"
    correct = sum(item["predictedAlive"] is expected_alive for item in trace)
    accuracy = _round2(correct / count)
    if level == "L2":
        return accuracy == 1, {
            "kind": "voxeldoj-kv-warehouse",
            "crud_probes": count,
            "crud_accuracy": accuracy,
        }
    predicted_swept = observations["predictedSwept"]
    if not isinstance(predicted_swept, int) or isinstance(predicted_swept, bool):
        return None
    swept = len(set(keys))
    swept_ok = predicted_swept == swept
    return accuracy >= 0.8 and swept_ok, {
        "kind": "voxeldoj-kv-warehouse",
        "ttl_probes": count,
        "ttl_accuracy": accuracy,
        "expired_swept": swept,
        "swept_prediction_ok": swept_ok,
    }


def _evaluate_skew(observations: dict[str, Any]):
    if not closed_dict(observations, {"kind", "hashStrength"}):
        return None
    strength = observations["hashStrength"]
    if observations["kind"] != "warehouse-L4" or not (
        strength == "full"
        or isinstance(strength, int)
        and not isinstance(strength, bool)
        and 1 <= strength <= 32
    ):
        return None
    keys = set(_keys(*LEVELS["L4"]))
    loads = [0] * 8
    for key in keys:
        loads[_hash(key, strength) % 8] += 1
    skew = 1 if not keys else max(loads) / (len(keys) / len(loads))
    rounded_skew = _round2(skew)
    metric_strength = -1 if strength == "full" else strength
    passed = skew <= 1.6 and (metric_strength == -1 or metric_strength > 1)
    return passed, {
        "kind": "voxeldoj-kv-warehouse",
        "load_skew": rounded_skew,
        "hash_strength": metric_strength,
    }


def evaluate_warehouse(
    level: str, observations: Any, producer_metrics: Any, errors: list[str]
) -> bool:
    if not isinstance(observations, dict):
        errors.append("observations must be a bounded object")
        return False
    evaluated = (
        _evaluate_skew(observations)
        if level == "L4"
        else _evaluate_predictions(level, observations)
    )
    if evaluated is None:
        errors.append(f"observations do not match the closed {level} scenario trace")
        return False
    passed, expected_metrics = evaluated
    if not metrics_match(producer_metrics, expected_metrics):
        errors.append("producer metrics disagree with independently recomputed observations")
        return False
    return passed
