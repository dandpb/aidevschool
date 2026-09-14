from __future__ import annotations

from typing import Any

import pytest

from learner.gate.river_delta_evaluator import evaluate_river_delta

# Ground-truth traces replay the deterministic stream (mirroring the TS sim
# in engines/voxelDojo/game-14-river-delta/src/sim) — pinned so any evaluator
# drift or producer disagreement fails here.

PASSING: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {
    # Perfect source attribution over the 12 merged L1 logs.
    "L1": (
        {
            "kind": "river-delta-L1",
            "predictions": [
                "api", "api", "api", "api",
                "worker", "worker", "worker", "worker",
                "auth", "auth", "auth", "auth",
            ],
        },
        {
            "kind": "voxeldoj-river-delta",
            "source_predictions": 12,
            "source_prediction_accuracy": 1.0,
        },
    ),
    # Only api-4 (level "trace") is dropped by the filter stage.
    "L2": (
        {
            "kind": "river-delta-L2",
            "predictions": [True, True, True, True, False, True, True, True, True, True, True, True],
        },
        {
            "kind": "voxeldoj-river-delta",
            "filter_predictions": 12,
            "filter_prediction_accuracy": 1.0,
        },
    ),
    # The dye (req-dye) spans api+worker: 28 trace events across 6 records.
    "L3": (
        {
            "kind": "river-delta-L3",
            "injectSource": "api",
            "predictedSources": ["api", "worker"],
        },
        {
            "kind": "voxeldoj-river-delta",
            "dyed_sources_predicted": 2,
            "dyed_sources_actual": 2,
            "source_set_correct": True,
            "inject_source_valid": True,
            "trace_events": 28,
        },
    ),
    # The exact trace: 6 log ids across the two dyed tributaries.
    "L4": (
        {
            "kind": "river-delta-L4",
            "collectedLogIds": ["api-0", "api-2", "api-4", "worker-0", "worker-2", "worker-4"],
        },
        {
            "kind": "voxeldoj-river-delta",
            "trace_log_ids_actual": 6,
            "trace_log_ids_collected": 6,
            "missing_log_ids": 0,
            "extra_log_ids": 0,
            "trace_exact": True,
        },
    ),
}


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_accepts_each_complete_passing_level(level: str) -> None:
    observations, metrics = PASSING[level]

    errors: list[str] = []

    assert evaluate_river_delta(level, observations, metrics, errors) is True
    assert errors == []


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_rejects_forged_metrics(level: str) -> None:
    observations, _ = PASSING[level]
    forged = {"kind": "voxeldoj-river-delta", "trace_events": 999}
    errors: list[str] = []

    assert evaluate_river_delta(level, observations, forged, errors) is False
    assert errors == ["producer metrics disagree with independently recomputed observations"]


def test_rejects_l1_below_the_accuracy_bar() -> None:
    # 3 wrong attributions = 9/12 = 0.75: fails the 80% bar.
    predictions = ["worker", "auth", "worker"] + PASSING["L1"][0]["predictions"][3:]
    observations = {"kind": "river-delta-L1", "predictions": predictions}
    errors: list[str] = []
    recomputed = {
        "kind": "voxeldoj-river-delta",
        "source_predictions": 12,
        "source_prediction_accuracy": 0.75,
    }

    assert evaluate_river_delta("L1", observations, recomputed, errors) is False
    assert errors == []


def test_rejects_l2_below_the_accuracy_bar() -> None:
    # 3 flipped pass/drop answers = 9/12 = 0.75: fails the 80% bar.
    predictions = [not value for value in PASSING["L2"][0]["predictions"][:3]] \
        + PASSING["L2"][0]["predictions"][3:]
    observations = {"kind": "river-delta-L2", "predictions": predictions}
    errors: list[str] = []
    recomputed = {
        "kind": "voxeldoj-river-delta",
        "filter_predictions": 12,
        "filter_prediction_accuracy": 0.75,
    }

    assert evaluate_river_delta("L2", observations, recomputed, errors) is False
    assert errors == []


def test_rejects_l3_dye_injected_at_an_unvisited_tributary() -> None:
    # auth carries no dyed record: injecting there is invalid even with the
    # right predicted set.
    observations = {
        "kind": "river-delta-L3",
        "injectSource": "auth",
        "predictedSources": ["api", "worker"],
    }
    errors: list[str] = []
    recomputed = {
        "kind": "voxeldoj-river-delta",
        "dyed_sources_predicted": 2,
        "dyed_sources_actual": 2,
        "source_set_correct": True,
        "inject_source_valid": False,
        "trace_events": 28,
    }

    assert evaluate_river_delta("L3", observations, recomputed, errors) is False
    assert errors == []


def test_rejects_l3_predicting_all_tributaries() -> None:
    # The correlation id spans SOME sources, not all — predicting all three
    # is the classic over-collection trap.
    observations = {
        "kind": "river-delta-L3",
        "injectSource": "api",
        "predictedSources": ["api", "worker", "auth"],
    }
    errors: list[str] = []
    recomputed = {
        "kind": "voxeldoj-river-delta",
        "dyed_sources_predicted": 3,
        "dyed_sources_actual": 2,
        "source_set_correct": False,
        "inject_source_valid": True,
        "trace_events": 28,
    }

    assert evaluate_river_delta("L3", observations, recomputed, errors) is False
    assert errors == []


def test_rejects_l4_with_a_missing_trace_record() -> None:
    # Dropping api-4 from the collection leaves the trace incomplete.
    observations = {
        "kind": "river-delta-L4",
        "collectedLogIds": ["api-0", "api-2", "worker-0", "worker-2", "worker-4"],
    }
    errors: list[str] = []
    recomputed = {
        "kind": "voxeldoj-river-delta",
        "trace_log_ids_actual": 6,
        "trace_log_ids_collected": 5,
        "missing_log_ids": 1,
        "extra_log_ids": 0,
        "trace_exact": False,
    }

    assert evaluate_river_delta("L4", observations, recomputed, errors) is False
    assert errors == []


def test_rejects_l4_with_an_extra_record() -> None:
    # Pulling an un-dyed record into the trace is over-collection.
    observations = {
        "kind": "river-delta-L4",
        "collectedLogIds": ["api-0", "api-2", "api-4", "cron-1", "worker-0", "worker-2", "worker-4"],
    }
    errors: list[str] = []
    recomputed = {
        "kind": "voxeldoj-river-delta",
        "trace_log_ids_actual": 6,
        "trace_log_ids_collected": 7,
        "missing_log_ids": 0,
        "extra_log_ids": 1,
        "trace_exact": False,
    }

    assert evaluate_river_delta("L4", observations, recomputed, errors) is False
    assert errors == []


@pytest.mark.parametrize(
    "mutation",
    ["short", "long", "unknown_source", "wrong_kind", "extra_key", "bad_bools", "bad_log_id"],
)
def test_rejects_nonclosed_or_malformed_traces(mutation: str) -> None:
    observations: dict[str, Any]
    level = "L1"
    if mutation in {"short", "long", "unknown_source", "bad_bools"}:
        predictions = list(PASSING["L1"][0]["predictions"])
        if mutation == "short":
            predictions = predictions[:11]
        elif mutation == "long":
            predictions = predictions + ["api"]
        elif mutation == "unknown_source":
            predictions[0] = "gateway"
        else:
            level = "L2"
            predictions = [1] * 12
        observations = {"kind": f"river-delta-{level}", "predictions": predictions}
    elif mutation == "wrong_kind":
        observations = dict(PASSING["L3"][0])
        observations["kind"] = "river-delta-L2"
        level = "L3"
    elif mutation == "extra_key":
        observations = dict(PASSING["L3"][0])
        observations["extra"] = True
        level = "L3"
    else:
        observations = {
            "kind": "river-delta-L4",
            "collectedLogIds": ["api-0", "api-99"],
        }
        level = "L4"
    errors: list[str] = []

    assert evaluate_river_delta(level, observations, {}, errors) is False
    assert errors


def test_rejects_unsupported_level_and_non_object_observations() -> None:
    errors: list[str] = []

    assert evaluate_river_delta("L5", {}, {}, errors) is False
    assert evaluate_river_delta("L1", None, {}, errors) is False
    assert errors == [
        "unsupported RIVER DELTA level",
        "observations must be a bounded object",
    ]


# --- Bridge-level: the full record (identity + observations + metrics) must
# verify through the same dispatcher the OS bridge uses. ---


def _bridge_record(level: str, passed: bool = True) -> dict[str, Any]:
    observations, metrics = PASSING[level]
    record: dict[str, Any] = {
        "source": "voxeldojo",
        "unit_id": "U14-log-aggregator",
        "project": "14_log_aggregator",
        "scenario_id": f"river-delta-{level}",
        "game": "RIVER DELTA",
        "ts": "2026-09-14T00:00:00.000Z",
        "pass": passed,
        "metrics": metrics,
        "observations": observations,
        "review_context": {"verifier_required": True},
        "curriculum_context": {
            "concept": "log pipelines + correlation IDs",
            "mechanic": "converging log tributaries, dye trace",
        },
    }
    return record


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_bridge_verifies_each_passing_river_delta_level(level: str) -> None:
    from learner.gate.teaching_game_bridge import verify_teaching_game_evidence

    receipt = verify_teaching_game_evidence(_bridge_record(level))

    assert receipt["verdict"] == "PASS"
    assert receipt["producer_writes_mastered"] is False
    assert receipt["unit_id"] == "U14-log-aggregator"


def test_bridge_rejects_a_false_pass_claim() -> None:
    from learner.gate.teaching_game_bridge import verify_teaching_game_evidence

    receipt = verify_teaching_game_evidence(_bridge_record("L1", passed=False))

    assert receipt["verdict"] == "FAIL"
    assert "producer pass claim disagrees with the fixed independent evaluator" in receipt["errors"]
