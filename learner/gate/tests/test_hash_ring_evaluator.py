from __future__ import annotations

from typing import Any

import pytest

from learner.gate.hash_ring_evaluator import evaluate_hash_ring

# Ground-truth traces replay the deterministic wave (mirroring the TS sim in
# engines/voxelDojo/game-10-hash-ring/src/sim) — pinned so any evaluator drift
# or producer disagreement fails here.

PASSING: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {
    # Perfect ownership over the seeded wave (seeds 11/22/33/44).
    "L1": (
        {
            "kind": "hash-ring-L1",
            "predictions": [
                "st-0", "st-2", "st-0", "st-0", "st-1", "st-0",
                "st-1", "st-0", "st-0", "st-1", "st-1", "st-0",
            ],
        },
        {
            "kind": "voxeldoj-hash-ring",
            "owner_predictions": 12,
            "owner_prediction_accuracy": 1.0,
        },
    ),
    # Join of st-new (32 vnodes each): 106/400 keys move, biggest loser st-2.
    "L2": (
        {"kind": "hash-ring-L2", "predictedLoser": "st-2"},
        {
            "kind": "voxeldoj-hash-ring",
            "moved_keys": 106,
            "moved_ratio": 0.27,
            "theoretical_kn": 0.2,
            "arc_prediction_ok": True,
            "modulo_mode": False,
            "modulo_contrast_stated": False,
        },
    ),
    # Skewed world fixed with the vnode dial (v=16 brings skew to 1.06).
    "L3": (
        {"kind": "hash-ring-L3", "vnodes": 16},
        {"kind": "voxeldoj-hash-ring", "load_skew": 1.06, "vnodes_used": 16},
    ),
    # Modulo storm: consistent moves ~K/N (0.2), modulo moves ~everything (0.8).
    "L4": (
        {"kind": "hash-ring-L4", "consistent": 0.2, "modulo": 0.8},
        {
            "kind": "voxeldoj-hash-ring",
            "moved_keys": 320,
            "moved_ratio": 0.8,
            "theoretical_kn": 0.2,
            "arc_prediction_ok": True,
            "modulo_mode": True,
            "modulo_contrast_stated": True,
        },
    ),
}


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_accepts_each_complete_passing_level(level: str) -> None:
    observations, metrics = PASSING[level]

    errors: list[str] = []

    assert evaluate_hash_ring(level, observations, metrics, errors) is True
    assert errors == []


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_rejects_forged_metrics(level: str) -> None:
    observations, _ = PASSING[level]
    forged = {"kind": "voxeldoj-hash-ring", "moved_keys": 999}
    errors: list[str] = []

    assert evaluate_hash_ring(level, observations, forged, errors) is False
    assert errors == ["producer metrics disagree with independently recomputed observations"]


def test_rejects_l1_below_the_accuracy_bar() -> None:
    # 9/12 correct = 0.75: metrics recompute cleanly, but the wave fails.
    observations = {
        "kind": "hash-ring-L1",
        "predictions": ["st-1", "st-1", "st-1"] + PASSING["L1"][0]["predictions"][3:],
    }
    errors: list[str] = []
    recomputed = {
        "kind": "voxeldoj-hash-ring",
        "owner_predictions": 12,
        "owner_prediction_accuracy": 0.75,
    }

    assert evaluate_hash_ring("L1", observations, recomputed, errors) is False
    assert errors == []


def test_rejects_l2_with_the_wrong_loser() -> None:
    # Predicting st-0 (23 keys lost) instead of st-2 (44 keys lost) fails
    # even though the ring behaved: the arc prediction is the lesson.
    observations = {"kind": "hash-ring-L2", "predictedLoser": "st-0"}
    errors: list[str] = []
    recomputed = {
        "kind": "voxeldoj-hash-ring",
        "moved_keys": 106,
        "moved_ratio": 0.27,
        "theoretical_kn": 0.2,
        "arc_prediction_ok": False,
        "modulo_mode": False,
        "modulo_contrast_stated": False,
    }

    assert evaluate_hash_ring("L2", observations, recomputed, errors) is False
    assert errors == []


def test_rejects_l3_with_the_default_topology() -> None:
    # v=1 leaves skew at 3.14 — the vnode dial is the lesson.
    observations = {"kind": "hash-ring-L3", "vnodes": 1}
    errors: list[str] = []
    recomputed = {"kind": "voxeldoj-hash-ring", "load_skew": 3.14, "vnodes_used": 1}

    assert evaluate_hash_ring("L3", observations, recomputed, errors) is False
    assert errors == []


def test_rejects_l4_with_the_wrong_contrast_answers() -> None:
    # Claiming consistent-hashing also moves ~everything (0.5/0.5) fails.
    observations = {"kind": "hash-ring-L4", "consistent": 0.5, "modulo": 0.5}
    errors: list[str] = []
    recomputed = {
        "kind": "voxeldoj-hash-ring",
        "moved_keys": 320,
        "moved_ratio": 0.8,
        "theoretical_kn": 0.2,
        "arc_prediction_ok": True,
        "modulo_mode": True,
        "modulo_contrast_stated": False,
    }

    assert evaluate_hash_ring("L4", observations, recomputed, errors) is False
    assert errors == []


@pytest.mark.parametrize(
    "mutation",
    ["short", "long", "unknown_station", "wrong_kind", "extra_key", "bad_vnodes", "bad_contrast"],
)
def test_rejects_nonclosed_or_malformed_traces(mutation: str) -> None:
    observations: dict[str, Any] = {
        "kind": "hash-ring-L4", "consistent": 0.2, "modulo": 0.8,
    }
    if mutation == "short":
        observations = {
            "kind": "hash-ring-L1",
            "predictions": PASSING["L1"][0]["predictions"][:11],
        }
    elif mutation == "long":
        observations = {
            "kind": "hash-ring-L1",
            "predictions": PASSING["L1"][0]["predictions"] + ["st-0"],
        }
    elif mutation == "unknown_station":
        observations = {
            "kind": "hash-ring-L1",
            "predictions": ["st-9"] + PASSING["L1"][0]["predictions"][1:],
        }
    elif mutation == "wrong_kind":
        observations = {"kind": "hash-ring-L2", "predictedLoser": "st-2"}
    elif mutation == "extra_key":
        observations["extra"] = True
    elif mutation == "bad_vnodes":
        observations = {"kind": "hash-ring-L3", "vnodes": 65}
    else:
        observations = {"kind": "hash-ring-L4", "consistent": 0.7, "modulo": 0.8}
    errors: list[str] = []

    level = "L4"
    if mutation in {"short", "long", "unknown_station"}:
        level = "L1"
    elif mutation == "bad_vnodes":
        level = "L3"
    elif mutation == "wrong_kind":
        level = "L2"
    verdict = evaluate_hash_ring(level, observations, {}, errors)

    assert verdict is False
    assert errors


def test_rejects_unsupported_level_and_non_object_observations() -> None:
    errors: list[str] = []

    assert evaluate_hash_ring("L5", {}, {}, errors) is False
    assert evaluate_hash_ring("L1", None, {}, errors) is False
    assert errors == [
        "unsupported HASH RING level",
        "observations must be a bounded object",
    ]


# --- Bridge-level: the full record (identity + observations + metrics) must
# verify through the same dispatcher the OS bridge uses. ---


def _bridge_record(level: str, passed: bool = True) -> dict[str, Any]:
    observations, metrics = PASSING[level]
    record: dict[str, Any] = {
        "source": "voxeldojo",
        # catalog.json:48 still pins game-10 to the U9 quirk unitId.
        "unit_id": "U9-distributed-cache",
        "project": "10_distributed_cache",
        "scenario_id": f"hash-ring-{level}",
        "game": "HASH RING",
        "ts": "2026-09-14T00:00:00.000Z",
        "pass": passed,
        "metrics": metrics,
        "observations": observations,
        "review_context": {"verifier_required": True},
        "curriculum_context": {
            "concept": "consistent hashing",
            "mechanic": "orbital hash ring",
        },
    }
    return record


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_bridge_verifies_each_passing_hash_ring_level(level: str) -> None:
    from learner.gate.teaching_game_bridge import verify_teaching_game_evidence

    receipt = verify_teaching_game_evidence(_bridge_record(level))

    assert receipt["verdict"] == "PASS"
    assert receipt["producer_writes_mastered"] is False
    assert receipt["unit_id"] == "U9-distributed-cache"


def test_bridge_rejects_a_false_pass_claim() -> None:
    from learner.gate.teaching_game_bridge import verify_teaching_game_evidence

    receipt = verify_teaching_game_evidence(_bridge_record("L1", passed=False))

    assert receipt["verdict"] == "FAIL"
    assert "producer pass claim disagrees with the fixed independent evaluator" in receipt["errors"]
