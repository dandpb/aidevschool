from __future__ import annotations

from typing import Any

from .evaluator_primitives import closed_dict, metrics_match, round2


# Deterministic scenario table for TIMELINE TOWER, mirrored from
# engines/voxelDojo/game-08-timeline-tower/src/game/controller.ts (scenarioFor)
# and src/sim/sourcing.ts (order_status / shipment_list folds). The verifier
# never trusts the producer's log; it refolds the fixed scenarios from the
# player's bounded inputs (append picks; status predictions) and recomputes
# every outcome.
LIFECYCLE_ORDER = [
    "OrderCreated",
    "PaymentAuthorized",
    "InventoryReserved",
    "OrderConfirmed",
    "OrderShipped",
    "OrderDelivered",
]
STATUS_BY_EVENT = {
    "OrderCreated": "pending",
    "PaymentAuthorized": "payment_authorized",
    "PaymentFailed": "payment_failed",
    "InventoryReserved": "inventory_reserved",
    "InventoryRejected": "inventory_rejected",
    "OrderConfirmed": "confirmed",
    "OrderCancelled": "cancelled",
    "OrderShipped": "shipped",
    "OrderDelivered": "delivered",
}
# Base log (ord-1): the happy lifecycle; checkpoint index 3.
BASE_LOG = [
    "OrderCreated",
    "PaymentAuthorized",
    "InventoryReserved",
    "OrderConfirmed",
    "OrderShipped",
    "OrderDelivered",
]
BASE_CHECKPOINT_INDEX = 3
# L4 log (ord-2): payment fails and the order is cancelled; never shipped.
L4_LOG = ["OrderCreated", "PaymentFailed", "OrderCancelled"]
STATUS_CHOICES = frozenset(STATUS_BY_EVENT.values())


def _fold_status(event_types: list[str]) -> str:
    status = "pending"
    for event_type in event_types:
        status = STATUS_BY_EVENT.get(event_type, status)
    return status


def _string_list(value: Any) -> bool:
    return isinstance(value, list) and all(isinstance(item, str) for item in value)


def _append_order_result(
    observations: dict[str, Any],
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "appends"}):
        return None
    appends = observations["appends"]
    if observations["kind"] != "timeline-tower-L1" or not _string_list(appends):
        return None
    if len(appends) != len(LIFECYCLE_ORDER) or not set(appends) <= set(LIFECYCLE_ORDER):
        return None
    correct = sum(1 for picked, truth in zip(appends, LIFECYCLE_ORDER) if picked == truth)
    accuracy = correct / len(LIFECYCLE_ORDER)
    return (
        accuracy >= 0.8,
        {
            "kind": "voxeldoj-timeline-tower",
            "append_predictions": len(LIFECYCLE_ORDER),
            "append_order_accuracy": round2(accuracy),
        },
    )


def _projection_result(observations: dict[str, Any]) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictedStatus"}):
        return None
    predicted = observations["predictedStatus"]
    if observations["kind"] != "timeline-tower-L2" or predicted not in STATUS_CHOICES:
        return None
    truth = _fold_status(BASE_LOG)
    passed = predicted == truth
    return (
        passed,
        {
            "kind": "voxeldoj-timeline-tower",
            "events_folded": len(BASE_LOG),
            "predicted_status_ok": passed,
            "final_status_correct": 1 if passed else 0,
        },
    )


def _replay_result(observations: dict[str, Any]) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictedAtCheckpoint", "predictedAfterReplay"}):
        return None
    at_checkpoint = observations["predictedAtCheckpoint"]
    after_replay = observations["predictedAfterReplay"]
    if (
        observations["kind"] != "timeline-tower-L3"
        or at_checkpoint not in STATUS_CHOICES
        or after_replay not in STATUS_CHOICES
    ):
        return None
    truth_at_checkpoint = _fold_status(BASE_LOG[:BASE_CHECKPOINT_INDEX])
    truth_after_replay = _fold_status(BASE_LOG)
    check_ok = at_checkpoint == truth_at_checkpoint
    replay_ok = after_replay == truth_after_replay
    passed = check_ok and replay_ok
    return (
        passed,
        {
            "kind": "voxeldoj-timeline-tower",
            "checkpoint_index": BASE_CHECKPOINT_INDEX,
            "status_at_checkpoint_ok": check_ok,
            "status_after_replay_ok": replay_ok,
            "replay_deterministic": passed,
        },
    )


def _two_view_result(observations: dict[str, Any]) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictedOrderStatus", "predictedShipped"}):
        return None
    predicted_status = observations["predictedOrderStatus"]
    predicted_shipped = observations["predictedShipped"]
    if (
        observations["kind"] != "timeline-tower-L4"
        or predicted_status not in STATUS_CHOICES
        or not isinstance(predicted_shipped, bool)
    ):
        return None
    truth_status = _fold_status(L4_LOG)
    truth_shipped = any(event == "OrderShipped" for event in L4_LOG)
    status_ok = predicted_status == truth_status
    shipped_ok = predicted_shipped == truth_shipped
    passed = status_ok and shipped_ok
    return (
        passed,
        {
            "kind": "voxeldoj-timeline-tower",
            "order_status_view_ok": status_ok,
            "shipment_list_view_ok": shipped_ok,
            "same_log_two_views": True,
            "views_correct": (1 if status_ok else 0) + (1 if shipped_ok else 0),
        },
    )


def evaluate_timeline(
    level: str, observations: Any, producer_metrics: Any, errors: list[str]
) -> bool:
    if level not in {"L1", "L2", "L3", "L4"}:
        errors.append("unsupported TIMELINE TOWER level")
        return False
    if not isinstance(observations, dict):
        errors.append("observations must be a bounded object")
        return False
    evaluated = {
        "L1": _append_order_result,
        "L2": _projection_result,
        "L3": _replay_result,
        "L4": _two_view_result,
    }[level](observations)
    if evaluated is None:
        errors.append(f"observations do not match the closed {level} scenario trace")
        return False
    passed, expected_metrics = evaluated
    if not metrics_match(producer_metrics, expected_metrics):
        errors.append("producer metrics disagree with independently recomputed observations")
        return False
    return passed
