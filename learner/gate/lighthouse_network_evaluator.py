"""Independent evaluator for the LIGHTHOUSE NETWORK teaching game (U17 config service).

The verifier replays the player's bounded trace against the deterministic
consensus quorum, watch/notify, network partition, and re-merge rules — it
never trusts the producer's metrics or ``pass`` claim.

Observation contract (closed per level):

- L1 ``{"kind": "lighthouse-network-L1", "predictedQuorum": <int>, "ackedNodeIds": [<nodeId>, ...]}``
- L2 ``{"kind": "lighthouse-network-L2", "predictedLit": [<nodeId>, ...], "ackedNodeIds": [<nodeId>, ...]}``
- L3 ``{"kind": "lighthouse-network-L3", "predictedMajoritySide": <"left" | "right">}``
- L4 ``{"kind": "lighthouse-network-L4", "committedValue": <str>, "syncedNodeIds": [<nodeId>, ...]}``
"""

from __future__ import annotations

from typing import Any

from .evaluator_primitives import closed_dict, metrics_match

METRIC_KIND = "voxeldoj-lighthouse-network"

LEVELS: dict[str, dict[str, Any]] = {
    "L1": {
        "cluster_size": 5,
        "key": "heading",
        "new_value": "045",
        "watchers": {},
        "partition_side": (),
    },
    "L2": {
        "cluster_size": 5,
        "key": "heading",
        "new_value": "090",
        "watchers": {
            "lh-0": ("heading",),
            "lh-1": ("heading",),
            "lh-2": ("colour",),
        },
        "partition_side": (),
    },
    "L3": {
        "cluster_size": 5,
        "key": "heading",
        "new_value": "120",
        "watchers": {},
        "partition_side": ("lh-0", "lh-1"),
    },
    "L4": {
        "cluster_size": 5,
        "key": "heading",
        "new_value": "180",
        "watchers": {},
        "partition_side": ("lh-0",),
    },
}


def _nodes_for(cluster_size: int) -> frozenset[str]:
    return frozenset(f"lh-{i}" for i in range(cluster_size))


def _quorum_of(cluster_size: int) -> int:
    return (cluster_size // 2) + 1


def _reject(errors: list[str], level: str) -> None:
    errors.append(f"observations do not match the closed {level} scenario trace")


def _valid_node_list(items: Any, allowed: frozenset[str]) -> bool:
    return (
        isinstance(items, list)
        and len(items) == len(set(items))
        and all(isinstance(x, str) and x in allowed for x in items)
    )


def _valid_l1_fields(
    predicted_quorum: Any, acked: Any, nodes: frozenset[str]
) -> bool:
    return (
        isinstance(predicted_quorum, int)
        and not isinstance(predicted_quorum, bool)
        and 1 <= predicted_quorum <= len(nodes)
        and _valid_node_list(acked, nodes)
    )


def _lighthouse_l1(
    cfg: dict[str, Any], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictedQuorum", "ackedNodeIds"}):
        _reject(errors, "L1")
        return None
    predicted_quorum = observations["predictedQuorum"]
    acked = observations["ackedNodeIds"]
    nodes = _nodes_for(cfg["cluster_size"])
    if observations["kind"] != "lighthouse-network-L1" or not _valid_l1_fields(
        predicted_quorum, acked, nodes
    ):
        _reject(errors, "L1")
        return None
    truth = _quorum_of(cfg["cluster_size"])
    predicted_ok = predicted_quorum == truth
    reached = len(set(acked)) > cfg["cluster_size"] / 2.0
    metrics = {
        "kind": METRIC_KIND,
        "cluster_size": cfg["cluster_size"],
        "quorum_required": truth,
        "quorum_predicted_ok": predicted_ok,
        "acks_given": len(acked),
        "committed": reached,
    }
    return predicted_ok and reached, metrics


def _actual_lit(watchers: dict[str, tuple[str, ...]], key: str, reached: bool) -> list[str]:
    if not reached:
        return []
    return sorted(node_id for node_id, keys in watchers.items() if key in keys)


def _lighthouse_l2(
    cfg: dict[str, Any], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictedLit", "ackedNodeIds"}):
        _reject(errors, "L2")
        return None
    predicted_lit = observations["predictedLit"]
    acked = observations["ackedNodeIds"]
    nodes = _nodes_for(cfg["cluster_size"])
    if (
        observations["kind"] != "lighthouse-network-L2"
        or not _valid_node_list(predicted_lit, nodes)
        or not _valid_node_list(acked, nodes)
    ):
        _reject(errors, "L2")
        return None
    reached = len(set(acked)) > cfg["cluster_size"] / 2.0
    watchers: dict[str, tuple[str, ...]] = cfg["watchers"]
    actual_lit = _actual_lit(watchers, cfg["key"], reached)
    predicted_sorted = sorted(set(predicted_lit))
    prediction_ok = reached and predicted_sorted == actual_lit
    metrics = {
        "kind": METRIC_KIND,
        "watchers_total": len(watchers),
        "watchers_predicted": len(predicted_sorted),
        "watchers_actual": len(actual_lit),
        "watcher_set_ok": prediction_ok,
        "committed": reached,
    }
    return prediction_ok, metrics


def _lighthouse_l3(
    cfg: dict[str, Any], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictedMajoritySide"}):
        _reject(errors, "L3")
        return None
    predicted_side = observations["predictedMajoritySide"]
    if observations["kind"] != "lighthouse-network-L3" or predicted_side not in {
        "left",
        "right",
    }:
        _reject(errors, "L3")
        return None
    total_n = cfg["cluster_size"]
    left_size = len(cfg["partition_side"])
    right_size = total_n - left_size
    left_can = left_size > total_n / 2.0
    right_can = right_size > total_n / 2.0
    majority_side = "left" if left_can else "right"
    predicted_ok = predicted_side == majority_side
    metrics = {
        "kind": METRIC_KIND,
        "cluster_size": total_n,
        "left_size": left_size,
        "right_size": right_size,
        "quorum": _quorum_of(total_n),
        "left_can_commit": left_can,
        "right_can_commit": right_can,
        "majority_predicted_ok": predicted_ok,
    }
    return predicted_ok and (left_can != right_can), metrics


def _lighthouse_l4(
    cfg: dict[str, Any], observations: dict[str, Any], errors: list[str]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "committedValue", "syncedNodeIds"}):
        _reject(errors, "L4")
        return None
    committed_val = observations["committedValue"]
    synced = observations["syncedNodeIds"]
    nodes = _nodes_for(cfg["cluster_size"])
    if (
        observations["kind"] != "lighthouse-network-L4"
        or not isinstance(committed_val, str)
        or not committed_val
        or not _valid_node_list(synced, nodes)
    ):
        _reject(errors, "L4")
        return None
    stale_set = frozenset(cfg["partition_side"])
    synced_set = frozenset(synced)
    set_ok = stale_set.issubset(synced_set)
    value_ok = committed_val == cfg["new_value"]
    metrics = {
        "kind": METRIC_KIND,
        "stale_nodes": len(stale_set),
        "synced_nodes": len(synced),
        "sync_set_ok": set_ok,
        "committed_value_ok": value_ok,
    }
    return set_ok and value_ok, metrics


_LEVEL_HANDLERS = {
    "L1": _lighthouse_l1,
    "L2": _lighthouse_l2,
    "L3": _lighthouse_l3,
    "L4": _lighthouse_l4,
}


def evaluate_lighthouse_network(
    level: str, observations: Any, producer_metrics: Any, errors: list[str]
) -> bool:
    if level not in LEVELS:
        errors.append("unsupported LIGHTHOUSE NETWORK level")
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
