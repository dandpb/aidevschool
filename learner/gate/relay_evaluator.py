from __future__ import annotations

from typing import Any

from .evaluator_primitives import closed_dict, metrics_match, round2


STATIONS = {
    "L1": {
        "st-0": (True, "", 100),
        "st-1": (False, "", 0),
        "st-2": (True, "", 100),
        "st-3": (False, "", 0),
        "st-4": (True, "", 100),
    },
    "L2": {
        "st-0": (True, "alerts", 100),
        "st-1": (True, "", 100),
        "st-2": (False, "alerts", 0),
        "st-3": (True, "alerts", 100),
        "st-4": (True, "other", 100),
    },
    "L3": {
        "st-0": (True, "alerts", 200),
        "st-1": (True, "alerts", 50),
        "st-2": (True, "alerts", 190),
        "st-3": (True, "alerts", 0),
        "st-4": (True, "alerts", 195),
    },
    "L4": {
        "st-0": (True, "alerts", 300),
        "st-1": (True, "alerts", 300),
        "st-2": (False, "", 0),
        "st-3": (True, "alerts", 300),
    },
}


def _prediction_result(level: str, observations: dict[str, Any]):
    if not closed_dict(observations, {"kind", "predictions"}):
        return None
    predictions = observations["predictions"]
    station_ids = set(STATIONS[level])
    if (
        observations["kind"] != f"relay-{level}"
        or not isinstance(predictions, list)
        or any(not isinstance(item, str) for item in predictions)
        or len(predictions) != len(set(predictions))
        or not set(predictions) <= station_ids
    ):
        return None

    if level == "L1":
        truth = {station_id for station_id, (connected, _, _) in STATIONS[level].items() if connected}
        label = "connected"
    elif level == "L2":
        truth = {
            station_id
            for station_id, (connected, channel, _) in STATIONS[level].items()
            if connected and channel == "alerts"
        }
        label = "delivery"
    else:
        truth = {
            station_id
            for station_id, (connected, _, heartbeat) in STATIONS[level].items()
            if connected and 200 - heartbeat <= 100
        }
        label = "survivor"

    predicted = set(predictions)
    accuracy = round2((len(truth & predicted) + len(station_ids - truth - predicted)) / len(station_ids))
    metrics: dict[str, Any] = {
        "kind": "voxeldoj-relay-station",
        f"{label}_accuracy": accuracy,
        f"{label}_predicted": len(predicted),
        f"{label}_truth": len(truth),
        f"{label}_total": len(station_ids),
    }
    if level == "L3":
        metrics["missed_heartbeat_dropped"] = sum(
            connected and 200 - heartbeat > 100
            for connected, _, heartbeat in STATIONS[level].values()
        )
    return accuracy >= 0.8, metrics


def _recovery_result(observations: dict[str, Any]):
    if not closed_dict(observations, {"kind", "reconnectedId"}):
        return None
    station_id = observations["reconnectedId"]
    if (
        observations["kind"] != "relay-L4"
        or not isinstance(station_id, str)
        or station_id not in STATIONS["L4"]
    ):
        return None
    connected, _, _ = STATIONS["L4"][station_id]
    before = {
        item_id
        for item_id, (item_connected, channel, _) in STATIONS["L4"].items()
        if item_connected and channel == "alerts"
    }
    after = before | {station_id}
    rejoined = station_id not in before
    was_dropped = not connected
    passed = rejoined and was_dropped
    return passed, {
        "kind": "voxeldoj-relay-station",
        "target_correct": station_id == "st-2",
        "rejoined_fanout": rejoined,
        "delivered_after": len(after),
        "was_dropped": was_dropped,
    }


def evaluate_relay(
    level: str, observations: Any, producer_metrics: Any, errors: list[str]
) -> bool:
    if level not in STATIONS:
        errors.append("unsupported RELAY STATION level")
        return False
    if not isinstance(observations, dict):
        errors.append("observations must be a bounded object")
        return False
    evaluated = (
        _recovery_result(observations)
        if level == "L4"
        else _prediction_result(level, observations)
    )
    if evaluated is None:
        errors.append(f"observations do not match the closed {level} scenario trace")
        return False
    passed, expected_metrics = evaluated
    if not metrics_match(producer_metrics, expected_metrics):
        errors.append("producer metrics disagree with independently recomputed observations")
        return False
    return passed
