"""Independent evaluator for the FREIGHT YARD teaching game (U16 message queue).

The verifier replays the player's bounded trace against the deterministic
partitioned append-only log and consumer-group simulation seeded by the level
config — it never trusts the producer's metrics or ``pass`` claim.

Observation contract (closed per level):

- L1 ``{"kind": "freight-yard-L1", "predictions": [<partition int 0..3> x 10]}``
- L2 ``{"kind": "freight-yard-L2", "assignment": [<crewId str> x 6]}``
- L3 ``{"kind": "freight-yard-L3", "predictedOwners": [<crewId str> x 6]}``
- L4 ``{"kind": "freight-yard-L4", "rewindTo": <int >= 0>, "predictedOffsets": [<int>, ...]}``
"""

from __future__ import annotations

from typing import Any

from .evaluator_primitives import base36, closed_dict, hash32, metrics_match, mulberry32, round2

METRIC_KIND = "voxeldoj-freight-yard"

LEVELS: dict[str, dict[str, Any]] = {
    "L1": {
        "seed": 11,
        "partition_count": 4,
        "message_count": 8,
        "hot_key_frac": 0.0,
        "crew_count": 1,
    },
    "L2": {
        "seed": 22,
        "partition_count": 6,
        "message_count": 24,
        "hot_key_frac": 0.2,
        "crew_count": 3,
    },
    "L3": {
        "seed": 33,
        "partition_count": 6,
        "message_count": 24,
        "hot_key_frac": 0.2,
        "crew_count": 3,
    },
    "L4": {
        "seed": 44,
        "partition_count": 4,
        "message_count": 20,
        "hot_key_frac": 0.4,
        "crew_count": 2,
    },
}


def _key_stream(seed: int, count: int, hot_key_frac: float = 0.0) -> list[str]:
    rng = mulberry32(seed)
    keys: list[str] = []
    for index in range(count):
        if hot_key_frac > 0 and rng() < hot_key_frac:
            keys.append(f"order:{int(rng() * 4)}")
        else:
            keys.append(f"evt:{base36(int(rng() * 1_000_000_000))}:{index}")
    return keys


def _partition_of(key: str, partition_count: int) -> int:
    return hash32(key) % partition_count


def _partition_tails(cfg: dict[str, Any]) -> list[int]:
    tails = [0] * cfg["partition_count"]
    for key in _key_stream(cfg["seed"], cfg["message_count"], cfg["hot_key_frac"]):
        tails[_partition_of(key, cfg["partition_count"])] += 1
    return tails


def _crews_for(count: int) -> list[str]:
    return [f"crew-{i}" for i in range(count)]


def _round_robin_assignment(partition_count: int, crew_ids: list[str]) -> list[str]:
    ordered = sorted(crew_ids)
    return [ordered[p % len(ordered)] for p in range(partition_count)]


def _reject(errors: list[str], level: str) -> None:
    errors.append(f"observations do not match the closed {level} scenario trace")


def _valid_int_list(items: Any, length: int, upper: int) -> bool:
    return (
        isinstance(items, list)
        and len(items) == length
        and all(
            isinstance(x, int) and not isinstance(x, bool) and 0 <= x < upper
            for x in items
        )
    )


def _valid_str_list(items: Any, length: int, allowed: frozenset[str]) -> bool:
    return (
        isinstance(items, list)
        and len(items) == length
        and all(isinstance(x, str) and x in allowed for x in items)
    )


def _freight_l1(
    cfg: dict[str, Any], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictions"}):
        _reject(errors, "L1")
        return None
    preds = observations["predictions"]
    route_keys = _key_stream(cfg["seed"] + 1, 10)
    if observations["kind"] != "freight-yard-L1" or not _valid_int_list(
        preds, len(route_keys), cfg["partition_count"]
    ):
        _reject(errors, "L1")
        return None
    correct = sum(
        1
        for key, pred in zip(route_keys, preds)
        if _partition_of(key, cfg["partition_count"]) == pred
    )
    accuracy = correct / len(route_keys)
    metrics = {
        "kind": METRIC_KIND,
        "route_predictions": len(route_keys),
        "route_accuracy": round2(accuracy),
    }
    return accuracy >= 0.8, metrics


def _freight_l2(
    cfg: dict[str, Any], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "assignment"}):
        _reject(errors, "L2")
        return None
    assignment = observations["assignment"]
    crews = _crews_for(cfg["crew_count"])
    if observations["kind"] != "freight-yard-L2" or not _valid_str_list(
        assignment, cfg["partition_count"], frozenset(crews)
    ):
        _reject(errors, "L2")
        return None
    crews_served = len(set(assignment))
    fair = crews_served == len(crews)
    metrics = {
        "kind": METRIC_KIND,
        "lanes_assigned": cfg["partition_count"],
        "lanes_total": cfg["partition_count"],
        "lanes_orphaned": 0,
        "crews_served": crews_served,
        "crews_total": len(crews),
        "assignment_valid": True,
    }
    return fair, metrics


def _freight_l3(
    cfg: dict[str, Any], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictedOwners"}):
        _reject(errors, "L3")
        return None
    predicted = observations["predictedOwners"]
    after_crews = _crews_for(cfg["crew_count"] + 1)
    if observations["kind"] != "freight-yard-L3" or not _valid_str_list(
        predicted, cfg["partition_count"], frozenset(after_crews)
    ):
        _reject(errors, "L3")
        return None
    actual = _round_robin_assignment(cfg["partition_count"], after_crews)
    correct = sum(1 for pred, truth in zip(predicted, actual) if pred == truth)
    accuracy = correct / cfg["partition_count"]
    metrics = {
        "kind": METRIC_KIND,
        "lanes_predicted": cfg["partition_count"],
        "lanes_total": cfg["partition_count"],
        "prediction_accuracy": round2(accuracy),
        "offsets_preserved": True,
        "predicted_all_lanes": True,
    }
    return accuracy >= 0.8, metrics


def _busiest_lane(tails: list[int]) -> tuple[int, int]:
    best_lane = 0
    best_tail = -1
    for lane, tail in enumerate(tails):
        if tail > best_tail:
            best_tail = tail
            best_lane = lane
    return best_lane, best_tail


def _valid_replay_fields(rewind_to: Any, predicted: Any, tail: int) -> bool:
    return (
        isinstance(rewind_to, int)
        and not isinstance(rewind_to, bool)
        and 0 <= rewind_to <= tail
        and isinstance(predicted, list)
        and all(
            isinstance(x, int) and not isinstance(x, bool) and 0 <= x < tail
            for x in predicted
        )
    )


def _replay_outcome(predicted: list[int], truth: list[int]) -> tuple[bool, bool, float]:
    truth_set = frozenset(truth)
    correct_count = sum(1 for offset in predicted if offset in truth_set)
    accuracy = 1.0 if not truth else correct_count / len(truth)
    exact = predicted == truth
    passed = exact or (accuracy >= 0.8 and len(predicted) == len(truth))
    return passed, exact, accuracy


def _freight_l4(
    cfg: dict[str, Any], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "rewindTo", "predictedOffsets"}):
        _reject(errors, "L4")
        return None
    rewind_to = observations["rewindTo"]
    raw_predicted = observations["predictedOffsets"]
    lane, tail = _busiest_lane(_partition_tails(cfg))
    if observations["kind"] != "freight-yard-L4" or not _valid_replay_fields(
        rewind_to, raw_predicted, tail
    ):
        _reject(errors, "L4")
        return None
    truth = list(range(rewind_to, tail))
    predicted = sorted(set(raw_predicted))
    passed, exact, accuracy = _replay_outcome(predicted, truth)
    metrics = {
        "kind": METRIC_KIND,
        "lane": lane,
        "rewind_to": rewind_to,
        "cars_replayed": len(truth),
        "cars_predicted": len(predicted),
        "replay_accuracy": round2(accuracy),
        "replay_exact": exact,
    }
    return passed, metrics


_LEVEL_HANDLERS = {
    "L1": _freight_l1,
    "L2": _freight_l2,
    "L3": _freight_l3,
    "L4": _freight_l4,
}


def evaluate_freight_yard(
    level: str, observations: Any, producer_metrics: Any, errors: list[str]
) -> bool:
    if level not in LEVELS:
        errors.append("unsupported FREIGHT YARD level")
        return False
    if not isinstance(observations, dict):
        errors.append("observations must be a bounded object")
        return False
    outcome = _LEVEL_HANDLERS[level](LEVELS[level], observations, errors)
    if outcome is None:
        return False
    passed, expected = outcome
    if not metrics_match(producer_metrics, expected):
        errors.append(
            "producer metrics disagree with independently recomputed observations"
        )
        return False
    return passed
