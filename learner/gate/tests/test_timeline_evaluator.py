from __future__ import annotations

import copy
from typing import Any

import pytest

from learner.gate.timeline_evaluator import evaluate_timeline


LIFECYCLE = [
    "OrderCreated",
    "PaymentAuthorized",
    "InventoryReserved",
    "OrderConfirmed",
    "OrderShipped",
    "OrderDelivered",
]

PASSING: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {
    "L1": (
        {"kind": "timeline-tower-L1", "appends": list(LIFECYCLE)},
        {
            "kind": "voxeldoj-timeline-tower",
            "append_predictions": 6,
            "append_order_accuracy": 1.0,
        },
    ),
    "L2": (
        {"kind": "timeline-tower-L2", "predictedStatus": "delivered"},
        {
            "kind": "voxeldoj-timeline-tower",
            "events_folded": 6,
            "predicted_status_ok": True,
            "final_status_correct": 1,
        },
    ),
    "L3": (
        {
            "kind": "timeline-tower-L3",
            "predictedAtCheckpoint": "inventory_reserved",
            "predictedAfterReplay": "delivered",
        },
        {
            "kind": "voxeldoj-timeline-tower",
            "checkpoint_index": 3,
            "status_at_checkpoint_ok": True,
            "status_after_replay_ok": True,
            "replay_deterministic": True,
        },
    ),
    "L4": (
        {
            "kind": "timeline-tower-L4",
            "predictedOrderStatus": "cancelled",
            "predictedShipped": False,
        },
        {
            "kind": "voxeldoj-timeline-tower",
            "order_status_view_ok": True,
            "shipment_list_view_ok": True,
            "same_log_two_views": True,
            "views_correct": 2,
        },
    ),
}


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_passing_closed_traces_recomputed_from_observations(level):
    observations, metrics = copy.deepcopy(PASSING[level])

    errors: list[str] = []
    assert evaluate_timeline(level, observations, metrics, errors) is True
    assert errors == []


def test_wrong_append_order_fails_l1_even_with_honest_metrics():
    observations, metrics = copy.deepcopy(PASSING["L1"])
    appends = observations["appends"]
    appends[0], appends[1] = appends[1], appends[0]
    appends[3], appends[4] = appends[4], appends[3]
    metrics["append_order_accuracy"] = 0.33

    errors: list[str] = []
    assert evaluate_timeline("L1", observations, metrics, errors) is False
    assert errors == []


def test_wrong_final_status_fails_l2():
    observations, metrics = copy.deepcopy(PASSING["L2"])
    observations["predictedStatus"] = "shipped"
    metrics["predicted_status_ok"] = False
    metrics["final_status_correct"] = 0

    errors: list[str] = []
    assert evaluate_timeline("L2", observations, metrics, errors) is False
    assert errors == []


def test_wrong_checkpoint_status_fails_l3_even_with_correct_replay():
    observations, metrics = copy.deepcopy(PASSING["L3"])
    observations["predictedAtCheckpoint"] = "confirmed"
    metrics["status_at_checkpoint_ok"] = False
    metrics["replay_deterministic"] = False

    errors: list[str] = []
    assert evaluate_timeline("L3", observations, metrics, errors) is False
    assert errors == []


def test_l4_wrong_shipped_view_fails_even_with_correct_status():
    observations, metrics = copy.deepcopy(PASSING["L4"])
    observations["predictedShipped"] = True
    metrics["shipment_list_view_ok"] = False
    metrics["views_correct"] = 1

    errors: list[str] = []
    assert evaluate_timeline("L4", observations, metrics, errors) is False
    assert errors == []


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_forged_metrics_are_rejected(level):
    observations, metrics = copy.deepcopy(PASSING[level])
    metrics["forged"] = 1

    errors: list[str] = []
    assert evaluate_timeline(level, observations, metrics, errors) is False
    assert errors == ["producer metrics disagree with independently recomputed observations"]


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_nonclosed_observations_are_rejected(level):
    observations, _ = copy.deepcopy(PASSING[level])
    observations["extra"] = True

    errors: list[str] = []
    assert evaluate_timeline(level, observations, {}, errors) is False
    assert errors == [f"observations do not match the closed {level} scenario trace"]


def test_unknown_status_choice_is_rejected():
    observations = {"kind": "timeline-tower-L2", "predictedStatus": "archived"}

    errors: list[str] = []
    assert evaluate_timeline("L2", observations, {}, errors) is False
    assert errors == ["observations do not match the closed L2 scenario trace"]


def test_unsupported_level_is_rejected():
    errors: list[str] = []
    assert evaluate_timeline("L5", {}, {}, errors) is False
    assert errors == ["unsupported TIMELINE TOWER level"]
