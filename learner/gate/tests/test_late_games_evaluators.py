"""Unit and bridge-integration tests for the U15–U18 teaching-game evaluators:
OBSERVATORY (U15), FREIGHT YARD (U16), LIGHTHOUSE NETWORK (U17), and STACKS (U18).
"""

from __future__ import annotations

from typing import Any

import pytest

from learner.gate.freight_yard_evaluator import evaluate_freight_yard
from learner.gate.lighthouse_network_evaluator import evaluate_lighthouse_network
from learner.gate.observatory_evaluator import evaluate_observatory
from learner.gate.stacks_evaluator import evaluate_stacks
from learner.gate.teaching_game_bridge import verify_teaching_game_evidence

OBSERVATORY_PASSING: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {
    "L1": (
        {
            "kind": "observatory-L1",
            "predictions": [4, 4, 4, 4, 6, 4, 0, 4, 4, 3, 3, 6],
        },
        {
            "kind": "voxeldoj-observatory",
            "bucket_predictions": 12,
            "bucket_prediction_accuracy": 1.0,
        },
    ),
    "L2": (
        {"kind": "observatory-L2", "predictedBucket": 7},
        {
            "kind": "voxeldoj-observatory",
            "percentile_bucket_prediction_ok": True,
            "predicted_bucket": 7,
            "actual_bucket": 7,
            "watched_percentile": 95,
            "percentile_value": 0.976,
        },
    ),
    "L3": (
        {"kind": "observatory-L3", "setSlo": 0.75, "predictedFiring": True},
        {
            "kind": "voxeldoj-observatory",
            "alert_prediction_ok": True,
            "slo_set": 0.75,
            "slo_target": 0.75,
            "slo_set_ok": True,
            "observed_percentile": 0.975,
            "alert_actually_firing": True,
            "predicted_firing": True,
            "watched_percentile": 95,
        },
    ),
    "L4": (
        {"kind": "observatory-L4", "chosenId": "fat"},
        {
            "kind": "voxeldoj-observatory",
            "distribution_choice_ok": True,
            "chosen": "fat",
            "alerting": "fat",
            "slo": 0.7,
            "watched_percentile": 95,
            "mean_tight": 0.5,
            "p95_tight": 0.612,
            "firing_tight": False,
            "mean_fat": 0.5,
            "p95_fat": 0.988,
            "firing_fat": True,
        },
    ),
}

FREIGHT_PASSING: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {
    "L1": (
        {
            "kind": "freight-yard-L1",
            "predictions": [2, 1, 2, 1, 1, 3, 1, 2, 3, 2],
        },
        {
            "kind": "voxeldoj-freight-yard",
            "route_predictions": 10,
            "route_accuracy": 1.0,
        },
    ),
    "L2": (
        {
            "kind": "freight-yard-L2",
            "assignment": ["crew-0", "crew-1", "crew-2", "crew-0", "crew-1", "crew-2"],
        },
        {
            "kind": "voxeldoj-freight-yard",
            "lanes_assigned": 6,
            "lanes_total": 6,
            "lanes_orphaned": 0,
            "crews_served": 3,
            "crews_total": 3,
            "assignment_valid": True,
        },
    ),
    "L3": (
        {
            "kind": "freight-yard-L3",
            "predictedOwners": ["crew-0", "crew-1", "crew-2", "crew-3", "crew-0", "crew-1"],
        },
        {
            "kind": "voxeldoj-freight-yard",
            "lanes_predicted": 6,
            "lanes_total": 6,
            "prediction_accuracy": 1.0,
            "offsets_preserved": True,
            "predicted_all_lanes": True,
        },
    ),
    "L4": (
        {
            "kind": "freight-yard-L4",
            "rewindTo": 2,
            "predictedOffsets": [2, 3, 4, 5],
        },
        {
            "kind": "voxeldoj-freight-yard",
            "lane": 1,
            "rewind_to": 2,
            "cars_replayed": 4,
            "cars_predicted": 4,
            "replay_accuracy": 1.0,
            "replay_exact": True,
        },
    ),
}

LIGHTHOUSE_PASSING: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {
    "L1": (
        {
            "kind": "lighthouse-network-L1",
            "predictedQuorum": 3,
            "ackedNodeIds": ["lh-0", "lh-1", "lh-2"],
        },
        {
            "kind": "voxeldoj-lighthouse-network",
            "cluster_size": 5,
            "quorum_required": 3,
            "quorum_predicted_ok": True,
            "acks_given": 3,
            "committed": True,
        },
    ),
    "L2": (
        {
            "kind": "lighthouse-network-L2",
            "predictedLit": ["lh-0", "lh-1"],
            "ackedNodeIds": ["lh-0", "lh-1", "lh-2"],
        },
        {
            "kind": "voxeldoj-lighthouse-network",
            "watchers_total": 3,
            "watchers_predicted": 2,
            "watchers_actual": 2,
            "watcher_set_ok": True,
            "committed": True,
        },
    ),
    "L3": (
        {
            "kind": "lighthouse-network-L3",
            "predictedMajoritySide": "right",
        },
        {
            "kind": "voxeldoj-lighthouse-network",
            "cluster_size": 5,
            "left_size": 2,
            "right_size": 3,
            "quorum": 3,
            "left_can_commit": False,
            "right_can_commit": True,
            "majority_predicted_ok": True,
        },
    ),
    "L4": (
        {
            "kind": "lighthouse-network-L4",
            "committedValue": "180",
            "syncedNodeIds": ["lh-0"],
        },
        {
            "kind": "voxeldoj-lighthouse-network",
            "stale_nodes": 1,
            "synced_nodes": 1,
            "sync_set_ok": True,
            "committed_value_ok": True,
        },
    ),
}

STACKS_PASSING: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {
    "L1": (
        {
            "kind": "stacks-L1",
            "predictions": ["fox", "quick", "sleeps", "dog"],
        },
        {
            "kind": "voxeldoj-stacks",
            "cards_total": 4,
            "cards_correct": 4,
            "filing_accuracy": 1.0,
        },
    ),
    "L2": (
        {"kind": "stacks-L2", "predictedTop": "doc-d"},
        {
            "kind": "voxeldoj-stacks",
            "top_prediction_ok": True,
            "predicted_top": "doc-d",
            "actual_top": "doc-d",
            "query": "fox",
            "top_score": 1.02,
            "matches_returned": 3,
        },
    ),
    "L3": (
        {"kind": "stacks-L3", "predictedTop": "doc-c"},
        {
            "kind": "voxeldoj-stacks",
            "top_prediction_ok": True,
            "predicted_top": "doc-c",
            "actual_top": "doc-c",
            "query": "dog fox",
            "top_has_both_terms": True,
            "top_score": 1.43,
            "matches_returned": 4,
        },
    ),
    "L4": (
        {"kind": "stacks-L4", "predictedOrder": ["p1", "p3", "p4"]},
        {
            "kind": "voxeldoj-stacks",
            "rank_order_ok": True,
            "query": "search ranking inverted terms",
            "position_matches": 3,
            "top_k": 3,
            "predicted_order": "p1,p3,p4",
            "actual_order": "p1,p3,p4",
            "top_score": 3.76,
        },
    ),
}


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_observatory_evaluator_accepts_passing_and_rejects_forged(level: str) -> None:
    obs, metrics = OBSERVATORY_PASSING[level]
    errors: list[str] = []
    assert evaluate_observatory(level, obs, metrics, errors) is True
    assert errors == []

    forged_errors: list[str] = []
    assert evaluate_observatory(level, obs, {"kind": "forged"}, forged_errors) is False
    assert forged_errors == ["producer metrics disagree with independently recomputed observations"]


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_freight_yard_evaluator_accepts_passing_and_rejects_forged(level: str) -> None:
    obs, metrics = FREIGHT_PASSING[level]
    errors: list[str] = []
    assert evaluate_freight_yard(level, obs, metrics, errors) is True
    assert errors == []

    forged_errors: list[str] = []
    assert evaluate_freight_yard(level, obs, {"kind": "forged"}, forged_errors) is False
    assert forged_errors == ["producer metrics disagree with independently recomputed observations"]


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_lighthouse_network_evaluator_accepts_passing_and_rejects_forged(level: str) -> None:
    obs, metrics = LIGHTHOUSE_PASSING[level]
    errors: list[str] = []
    assert evaluate_lighthouse_network(level, obs, metrics, errors) is True
    assert errors == []

    forged_errors: list[str] = []
    assert evaluate_lighthouse_network(level, obs, {"kind": "forged"}, forged_errors) is False
    assert forged_errors == ["producer metrics disagree with independently recomputed observations"]


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_stacks_evaluator_accepts_passing_and_rejects_forged(level: str) -> None:
    obs, metrics = STACKS_PASSING[level]
    errors: list[str] = []
    assert evaluate_stacks(level, obs, metrics, errors) is True
    assert errors == []

    forged_errors: list[str] = []
    assert evaluate_stacks(level, obs, {"kind": "forged"}, forged_errors) is False
    assert forged_errors == ["producer metrics disagree with independently recomputed observations"]


@pytest.mark.parametrize(
    ("game", "unit_id", "project", "prefix", "table"),
    [
        ("OBSERVATORY", "U15-metrics-collector", "15_metrics_collector", "observatory-", OBSERVATORY_PASSING),
        ("FREIGHT YARD", "U16-message-queue", "16_mini_message_queue", "freight-yard-", FREIGHT_PASSING),
        ("LIGHTHOUSE NETWORK", "U17-config-service", "17_distributed_config_service", "lighthouse-network-", LIGHTHOUSE_PASSING),
        ("STACKS", "U18-search-engine", "18_search_engine", "stacks-", STACKS_PASSING),
    ],
)
@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_bridge_verifies_late_games_across_all_levels(
    game: str,
    unit_id: str,
    project: str,
    prefix: str,
    table: dict[str, tuple[dict[str, Any], dict[str, Any]]],
    level: str,
) -> None:
    obs, metrics = table[level]
    record = {
        "source": "voxeldojo",
        "unit_id": unit_id,
        "project": project,
        "scenario_id": f"{prefix}{level}",
        "game": game,
        "ts": "2026-10-16T00:00:00.000Z",
        "pass": True,
        "metrics": metrics,
        "observations": obs,
        "review_context": {"verifier_required": True},
        "curriculum_context": {"concept": game.lower(), "mechanic": prefix},
    }
    receipt = verify_teaching_game_evidence(record)
    assert receipt["verdict"] == "PASS"
    assert receipt["producer_writes_mastered"] is False
    assert receipt["unit_id"] == unit_id


@pytest.mark.parametrize("bad_top", [[], ["doc-a"], {"doc": "a"}, None, 7])
def test_stacks_rejects_unhashable_or_non_string_predicted_top_without_typeerror(
    bad_top: object,
) -> None:
    # AID-5002: an unhashable predictedTop used to raise
    # TypeError: unhashable type before any verdict; the contract is a
    # structured FAIL with the closed-scenario rejection.
    for level, kind in (("L2", "stacks-L2"), ("L3", "stacks-L3")):
        errors: list[str] = []
        assert (
            evaluate_stacks(
                level, {"kind": kind, "predictedTop": bad_top}, {}, errors
            )
            is False
        )
        assert errors == [
            f"observations do not match the closed {level} scenario trace"
        ]
