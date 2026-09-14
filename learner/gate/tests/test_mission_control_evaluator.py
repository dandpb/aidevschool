from __future__ import annotations

from typing import Any

import pytest

from learner.gate.mission_control_evaluator import evaluate_mission_control

# Election ground truth (seed 7, cluster alpha/beta/gamma/delta), pinned by
# these constants and cross-checked against the TypeScript sim
# (election.ts electTerm port): first term -> delta @1; succession after
# killing delta -> beta @2.
FIRST_LEADER = "delta"
FIRST_TERM = 1
SUCCESSOR = "beta"
SUCCESSOR_TERM = 2

TOPO_ORDER = ["deploy", "migrate-db", "warm-cache", "smoke-test", "announce"]

PASSING: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {
    "L1": (
        {"kind": "mission-control-L1", "predictedLeader": FIRST_LEADER},
        {
            "kind": "voxeldoj-mission-control",
            "leader_prediction_ok": True,
            "predicted_leader": FIRST_LEADER,
            "actual_leader": FIRST_LEADER,
            "term": FIRST_TERM,
        },
    ),
    "L2": (
        {
            "kind": "mission-control-L2",
            "firstPredictedLeader": FIRST_LEADER,
            "killedLeader": FIRST_LEADER,
            "successorPredicted": SUCCESSOR,
        },
        {
            "kind": "voxeldoj-mission-control",
            "leader_prediction_ok": True,
            "successor_prediction_ok": True,
            "term_increased": True,
            "first_term": FIRST_TERM,
            "successor_term": SUCCESSOR_TERM,
            "successor": SUCCESSOR,
        },
    ),
    "L3": (
        {"kind": "mission-control-L3", "launchOrder": TOPO_ORDER},
        {
            "kind": "voxeldoj-mission-control",
            "jobs_completed": 5,
            "jobs_total": 5,
            "topo_valid": True,
            "blocked_attempts": 0,
        },
    ),
    "L4": (
        {
            "kind": "mission-control-L4",
            "firstPredictedLeader": FIRST_LEADER,
            "killedLeader": FIRST_LEADER,
            "successorPredicted": SUCCESSOR,
            "launchOrder": TOPO_ORDER,
        },
        {
            "kind": "voxeldoj-mission-control",
            "jobs_completed": 5,
            "jobs_total": 5,
            "topo_valid": True,
            "blocked_attempts": 0,
            "leader_killed": True,
            "killed_leader": FIRST_LEADER,
            "first_term": FIRST_TERM,
            "successor_term": SUCCESSOR_TERM,
            "term_increased": True,
            "resumed": True,
        },
    ),
}


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_accepts_each_complete_passing_level(level: str) -> None:
    observations, metrics = PASSING[level]
    errors: list[str] = []

    assert evaluate_mission_control(level, observations, metrics, errors) is True
    assert errors == []


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_rejects_forged_metrics(level: str) -> None:
    observations, _ = PASSING[level]
    errors: list[str] = []

    assert evaluate_mission_control(level, observations, {"kind": "forged"}, errors) is False
    assert errors == ["producer metrics disagree with independently recomputed observations"]


def test_rejects_wrong_leader_prediction() -> None:
    # Electing a different station: the recomputed truth must disagree.
    observations = {"kind": "mission-control-L1", "predictedLeader": "alpha"}
    metrics = {
        "kind": "voxeldoj-mission-control",
        "leader_prediction_ok": False,
        "predicted_leader": "alpha",
        "actual_leader": FIRST_LEADER,
        "term": FIRST_TERM,
    }
    errors: list[str] = []

    assert evaluate_mission_control("L1", observations, metrics, errors) is False
    assert errors == []


def test_rejects_killing_a_non_leader() -> None:
    # beta is not the first leader; the controller fails the wave on the spot,
    # so the independent evaluator must never pass it.
    observations = {
        "kind": "mission-control-L2",
        "firstPredictedLeader": FIRST_LEADER,
        "killedLeader": "beta",
        "successorPredicted": "gamma",
    }
    errors: list[str] = []

    assert evaluate_mission_control("L2", observations, {"kind": "x"}, errors) is False


def test_rejects_blocked_dag_launches() -> None:
    # Launch smoke-test first (its deps are not complete): blocked attempt.
    observations = {
        "kind": "mission-control-L3",
        "launchOrder": ["smoke-test", *TOPO_ORDER],
    }
    errors: list[str] = []
    metrics = {
        "kind": "voxeldoj-mission-control",
        "jobs_completed": 5,
        "jobs_total": 5,
        "topo_valid": False,
        "blocked_attempts": 1,
    }

    assert evaluate_mission_control("L3", observations, metrics, errors) is False
    assert errors == []


def test_rejects_incomplete_dag() -> None:
    observations = {
        "kind": "mission-control-L3",
        "launchOrder": TOPO_ORDER[:-1],
    }
    errors: list[str] = []
    metrics = {
        "kind": "voxeldoj-mission-control",
        "jobs_completed": 4,
        "jobs_total": 5,
        "topo_valid": True,
        "blocked_attempts": 0,
    }

    assert evaluate_mission_control("L3", observations, metrics, errors) is False
    assert errors == []


@pytest.mark.parametrize(
    "mutation", ["wrong_kind", "extra_key", "unknown_station", "unknown_job", "empty_order"]
)
def test_rejects_nonclosed_or_malformed_traces(mutation: str) -> None:
    observations = dict(PASSING["L4"][0])
    if mutation == "wrong_kind":
        observations["kind"] = "mission-control-L2"
    elif mutation == "extra_key":
        observations["extra"] = 1
    elif mutation == "unknown_station":
        observations["successorPredicted"] = "omega"
    elif mutation == "unknown_job":
        observations["launchOrder"] = ["deploy", "self-destruct"]
    else:
        observations["launchOrder"] = []
    errors: list[str] = []

    assert evaluate_mission_control("L4", observations, {}, errors) is False
    assert errors


def test_rejects_unsupported_level_and_non_object_observations() -> None:
    errors: list[str] = []

    assert evaluate_mission_control("L5", {}, {}, errors) is False
    assert evaluate_mission_control("L1", None, {}, errors) is False
    assert errors == [
        "unsupported MISSION CONTROL level",
        "observations must be a bounded object",
    ]


# --- Bridge-level: the full record (identity + observations + metrics) must
# verify through the same dispatcher the OS bridge uses. ---


def _bridge_record(level: str, passed: bool = True) -> dict[str, Any]:
    observations, metrics = PASSING[level]
    return {
        "source": "voxeldojo",
        "unit_id": "U12-job-scheduler",
        "project": "12_distributed_job_scheduler",
        "scenario_id": f"mission-control-{level}",
        "game": "MISSION CONTROL",
        "ts": "2026-09-13T00:00:00.000Z",
        "pass": passed,
        "metrics": metrics,
        "observations": observations,
        "review_context": {"verifier_required": True},
        "curriculum_context": {
            "concept": "leader election + DAG scheduling",
            "mechanic": "station constellation + job DAG",
        },
    }


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_bridge_verifies_each_passing_mission_control_level(level: str) -> None:
    from learner.gate.teaching_game_bridge import verify_teaching_game_evidence

    receipt = verify_teaching_game_evidence(_bridge_record(level))

    assert receipt["verdict"] == "PASS"
    assert receipt["producer_writes_mastered"] is False
    assert receipt["unit_id"] == "U12-job-scheduler"


def test_bridge_rejects_a_false_pass_claim() -> None:
    from learner.gate.teaching_game_bridge import verify_teaching_game_evidence

    receipt = verify_teaching_game_evidence(_bridge_record("L1", passed=False))

    assert receipt["verdict"] == "FAIL"
    assert "producer pass claim disagrees with the fixed independent evaluator" in receipt["errors"]
