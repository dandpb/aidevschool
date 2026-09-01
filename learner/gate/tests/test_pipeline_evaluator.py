from __future__ import annotations

import copy
from typing import Any

import pytest

from learner.gate.pipeline_evaluator import evaluate_pipeline


PASSING: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {
    "L1": (
        {"kind": "pipeline-plant-L1", "predictedOverflow": True},
        {
            "kind": "voxeldoj-pipeline-plant",
            "size": 115,
            "capacity": 100,
            "mode": "buffered",
            "overflow_predicted": True,
            "overflow_actual": True,
            "peak_mem": 115,
            "delivered": 100,
            "overflowed": 15,
        },
    ),
    "L2": (
        {"kind": "pipeline-plant-L2", "predictedBounded": True},
        {
            "kind": "voxeldoj-pipeline-plant",
            "size": 1023,
            "capacity": 100,
            "chunk_size": 40,
            "mode": "streaming",
            "bounded_predicted": True,
            "bounded_actual": True,
            "peak_mem": 40,
            "delivered": 1023,
            "overflowed": 0,
        },
    ),
    "L3": (
        {"kind": "pipeline-plant-L3", "chunkSize": 40, "predictedPeak": 40},
        {
            "kind": "voxeldoj-pipeline-plant",
            "size": 496,
            "capacity": 100,
            "chunk_size": 40,
            "mode": "streaming",
            "peak_predicted": 40,
            "peak_actual": 40,
            "delivered": 496,
            "overflowed": 0,
            "chunk_fits": True,
        },
    ),
    "L4": (
        {"kind": "pipeline-plant-L4", "predictedOverflow": True},
        {
            "kind": "voxeldoj-pipeline-plant",
            "size": 1308,
            "capacity": 100,
            "mode": "buffered",
            "overflow_predicted": True,
            "overflow_actual": True,
            "peak_mem": 1308,
            "delivered": 200,
            "overflowed": 1108,
            "stalled": False,
            "drained": 100,
            "drain_rate": 0.1,
            "time_ms": 1000,
        },
    ),
}


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_passing_closed_traces_recomputed_from_observations(level):
    observations, metrics = copy.deepcopy(PASSING[level])

    errors: list[str] = []
    assert evaluate_pipeline(level, observations, metrics, errors) is True
    assert errors == []


@pytest.mark.parametrize("level", ["L1", "L4"])
def test_wrong_overflow_prediction_fails_even_with_honest_metrics(level):
    observations, metrics = copy.deepcopy(PASSING[level])
    observations["predictedOverflow"] = not observations["predictedOverflow"]
    metrics["overflow_predicted"] = observations["predictedOverflow"]

    errors: list[str] = []
    assert evaluate_pipeline(level, observations, metrics, errors) is False
    assert errors == []


def test_wrong_bounded_call_fails_l2():
    observations, metrics = copy.deepcopy(PASSING["L2"])
    observations["predictedBounded"] = False
    metrics["bounded_predicted"] = False

    errors: list[str] = []
    assert evaluate_pipeline("L2", observations, metrics, errors) is False


def test_l3_oversized_chunk_fails_even_with_consistent_numbers():
    observations, metrics = copy.deepcopy(PASSING["L3"])
    # A chunk larger than capacity spills: recomputed chunk_fits is False and
    # peak honesty cannot rescue the attempt.
    observations["chunkSize"] = 120
    metrics["chunk_size"] = 120
    metrics["peak_actual"] = 120
    metrics["overflowed"] = 80
    metrics["delivered"] = 416
    metrics["chunk_fits"] = False

    errors: list[str] = []
    assert evaluate_pipeline("L3", observations, metrics, errors) is False


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_forged_metrics_are_rejected(level):
    observations, metrics = copy.deepcopy(PASSING[level])
    metrics["peak_mem"] = 0

    errors: list[str] = []
    assert evaluate_pipeline(level, observations, metrics, errors) is False
    assert errors == ["producer metrics disagree with independently recomputed observations"]


@pytest.mark.parametrize("level", ["L1", "L2", "L3", "L4"])
def test_nonclosed_observations_are_rejected(level):
    observations, metrics = copy.deepcopy(PASSING[level])
    observations["extra"] = True

    errors: list[str] = []
    assert evaluate_pipeline(level, observations, metrics, errors) is False
    assert errors == [f"observations do not match the closed {level} scenario trace"]


def test_unsupported_level_is_rejected():
    errors: list[str] = []
    assert evaluate_pipeline("L5", {}, {}, errors) is False
    assert errors == ["unsupported PIPELINE PLANT level"]
