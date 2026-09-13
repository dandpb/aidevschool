"""Independent evaluator for the AIR TRAFFIC teaching game (U11 load balancer).

The verifier replays the player's bounded prediction trace against the
deterministic wave seeded by the level config — it never trusts the
producer's metrics or ``pass`` claim. The scenario tables mirror
``engines/voxelDojo/game-11-air-traffic/src/sim/levels.ts`` (seeds 11/22/33/44,
request counts 9/9/8/9, pad rosters, hidden unhealthy pads, L3 initial
connections). Requests carry cost 1 at every level because every level runs
with ``skew = 0`` (``requestStream`` then never draws the rng and never
produces a long-lived connection), so the evaluator needs no rng here.

Observation contract (closed per level, mirroring the other evaluators):

- L1 ``{"kind": "air-traffic-L1", "predictions": [<pad id> x 9]}``
- L2 ``{"kind": "air-traffic-L2", "probeAfter": <int|null>, "predictions": [...x 9]}``
- L3 ``{"kind": "air-traffic-L3", "policy": <"round_robin"|"least_connections">, "predictions": [...x 8]}``
- L4 ``{"kind": "air-traffic-L4", "probeAfter": <int|null>, "predictions": [...x 9]}``

``predictions[i]`` is the pad the player predicted (and routed to) for
``req-i``. ``probeAfter`` is the number of predictions that had been committed
when the health probe fired (``null`` = never probed); on L4 the probe
recovers the dead pad, so requests after that index see it back in rotation.

The replay reproduces ``GameController.predictPad`` exactly: the health-aware
policy pick (round-robin cursor or least-connections minimum, ties to the
first pad) is the ground truth AND applies its own connection/routed side
effects, then the player's override applies its side effects and counts as an
error when it targets an unhealthy pad. Producer metrics must match the
recomputed metrics exactly.
"""

from __future__ import annotations

from typing import Any

from .evaluator_primitives import closed_dict, metrics_match, round2

PADS = ("b-0", "b-1", "b-2")
POLICIES = frozenset({"round_robin", "least_connections"})

# Mirrors game-11-air-traffic/src/sim/levels.ts (LEVELS table). All levels run
# skew=0, so every request costs 1 and no rng draws are consumed.
LEVELS: dict[str, dict[str, Any]] = {
    "L1": {"requests": 9, "policy": "round_robin", "unhealthy": None, "initial": None},
    "L2": {"requests": 9, "policy": "round_robin", "unhealthy": "b-1", "initial": None},
    "L3": {"requests": 8, "policy": None, "unhealthy": None, "initial": [4, 0, 3]},
    "L4": {"requests": 9, "policy": "round_robin", "unhealthy": "b-2", "initial": None},
}

METRIC_KIND = "voxeldoj-air-traffic"


class _Pad:
    __slots__ = ("pad_id", "healthy", "connections", "routed", "errors")

    def __init__(self, pad_id: str) -> None:
        self.pad_id = pad_id
        self.healthy = True
        self.connections = 0
        self.routed = 0
        self.errors = 0


def _policy_route(
    policy: str, pads: list[_Pad], cursor: int
) -> tuple[_Pad | None, int]:
    live = [pad for pad in pads if pad.healthy]
    if not live:
        return None, cursor
    if policy == "round_robin":
        chosen = live[cursor % len(live)]
        cursor = (cursor + 1) % len(live)
    else:
        chosen = live[0]
        for pad in live[1:]:
            if pad.connections < chosen.connections:
                chosen = pad
    chosen.connections += 1
    chosen.routed += 1
    return chosen, cursor


def _load_skew(pads: list[_Pad]) -> float:
    counts = [pad.routed for pad in pads]
    mean = sum(counts) / len(counts)
    if mean == 0:
        return 1.0
    return max(counts) / mean


def _replay(
    level: str,
    predictions: list[str],
    policy: str,
    probe_after: int | None,
) -> tuple[bool, dict[str, Any]]:
    cfg = LEVELS[level]
    pads = [_Pad(pad) for pad in PADS]
    if cfg["unhealthy"] is not None:
        for pad in pads:
            if pad.pad_id == cfg["unhealthy"]:
                pad.healthy = False
    if cfg["initial"] is not None:
        for pad, connections in zip(pads, cfg["initial"]):
            pad.connections = connections

    cursor = 0
    correct = 0
    errors = 0
    probe_fired = probe_after is not None
    recovered_reentered = False

    for index, predicted in enumerate(predictions):
        if level == "L4" and probe_fired and index == probe_after:
            # The probe recovers the dead pad with probability 1 on L4.
            for pad in pads:
                if pad.pad_id == cfg["unhealthy"]:
                    pad.healthy = True
        truth, cursor = _policy_route(policy, pads, cursor)
        actual = truth.pad_id if truth is not None else "dropped"
        if predicted == actual:
            correct += 1
        target = next((pad for pad in pads if pad.pad_id == predicted), None)
        if target is not None:
            target.connections += 1
            target.routed += 1
            if not target.healthy:
                target.errors += 1
                errors += 1
            elif level == "L4" and target.pad_id == cfg["unhealthy"]:
                recovered_reentered = True

    total = len(predictions)
    raw_accuracy = correct / total if total else 0.0
    accuracy = round2(raw_accuracy)
    metrics: dict[str, Any] = {
        "kind": METRIC_KIND,
        "predictions": total,
        "prediction_accuracy": accuracy,
        "policy": policy,
        "load_skew": round2(_load_skew(pads)),
    }
    if level in {"L1", "L2", "L4"}:
        metrics["errors"] = errors
    if level in {"L2", "L4"}:
        metrics["probe_fired"] = probe_fired
    if level == "L3":
        metrics["correct_policy"] = policy == "least_connections"
    if level == "L4":
        metrics["recovered_pad_reentered"] = recovered_reentered

    if level == "L1":
        passed = raw_accuracy >= 0.8 and errors == 0
    elif level == "L2":
        passed = raw_accuracy >= 0.8 and errors == 0 and probe_fired
    elif level == "L3":
        passed = policy == "least_connections" and raw_accuracy >= 0.8
    else:
        passed = (
            raw_accuracy >= 0.8
            and errors == 0
            and probe_fired
            and recovered_reentered
        )
    return passed, metrics


def _prediction_list(value: Any) -> bool:
    return (
        isinstance(value, list)
        and bool(value)
        and all(isinstance(item, str) and item in PADS for item in value)
    )


def evaluate_air_traffic(
    level: str, observations: Any, producer_metrics: Any, errors: list[str]
) -> bool:
    if level not in LEVELS:
        errors.append("unsupported AIR TRAFFIC level")
        return False
    if not isinstance(observations, dict):
        errors.append("observations must be a bounded object")
        return False

    expected_keys = {"kind", "predictions"}
    if level in {"L2", "L4"}:
        expected_keys = expected_keys | {"probeAfter"}
    if level == "L3":
        expected_keys = expected_keys | {"policy"}
    if not closed_dict(observations, expected_keys):
        errors.append(f"observations do not match the closed {level} scenario trace")
        return False

    if observations["kind"] != f"air-traffic-{level}":
        errors.append(f"observations do not match the closed {level} scenario trace")
        return False
    predictions = observations["predictions"]
    if not _prediction_list(predictions) or len(predictions) != LEVELS[level]["requests"]:
        errors.append(f"observations do not match the closed {level} scenario trace")
        return False

    policy = LEVELS[level]["policy"] or "round_robin"
    if level == "L3":
        claimed = observations["policy"]
        if claimed not in POLICIES:
            errors.append("observations do not match the closed L3 scenario trace")
            return False
        policy = claimed

    probe_after: int | None = None
    if level in {"L2", "L4"}:
        raw_probe = observations["probeAfter"]
        if raw_probe is not None and (
            not isinstance(raw_probe, int)
            or isinstance(raw_probe, bool)
            or not 0 <= raw_probe <= len(predictions)
        ):
            errors.append(f"observations do not match the closed {level} scenario trace")
            return False
        probe_after = raw_probe

    passed, expected_metrics = _replay(level, list(predictions), policy, probe_after)
    if not metrics_match(producer_metrics, expected_metrics):
        errors.append("producer metrics disagree with independently recomputed observations")
        return False
    return passed
