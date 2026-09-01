from __future__ import annotations

from typing import Any

from .evaluator_primitives import closed_dict, metrics_match


# Deterministic scenario table for PIPELINE PLANT, mirrored from
# engines/voxelDojo/game-06-pipeline-plant/src/sim/levels.ts (seeds 61-64,
# capacity 100, chunk 40; sizes regenerated with the shared mulberry32 port).
# The verifier never trusts the producer's job parameters; it replays the fixed
# scenario and recomputes every outcome from the player's bounded inputs.
JOBS = {
    "L1": {"size": 115, "capacity": 100, "chunk_size": 0, "drain_rate": 0, "time_ms": 0},
    "L2": {"size": 1023, "capacity": 100, "chunk_size": 40, "drain_rate": 0, "time_ms": 0},
    "L3": {"size": 496, "capacity": 100, "chunk_size": 40, "drain_rate": 0, "time_ms": 0},
    "L4": {"size": 1308, "capacity": 100, "chunk_size": 40, "drain_rate": 0.1, "time_ms": 1000},
}


def _buffered(size: int, capacity: int) -> dict[str, Any]:
    overflowed = max(0, size - capacity)
    return {
        "delivered": min(size, capacity),
        "overflowed": overflowed,
        "peak_mem": size,
    }


def _backpressured(size: int, capacity: int, drain_rate: float, time_ms: int) -> dict[str, Any]:
    drained = min(size, drain_rate * time_ms)
    backlog = size - drained
    held_in_tank = min(backlog, capacity)
    overflowed = max(0, backlog - capacity)
    result = {
        "delivered": drained + held_in_tank,
        "drained": drained,
        "overflowed": overflowed,
        "peak_mem": size,
        "stalled": overflowed == 0 and drained < size,
    }
    return result


def _streaming(size: int, chunk_size: int, capacity: int) -> dict[str, Any]:
    full_chunks = size // chunk_size
    remainder = size - full_chunks * chunk_size
    per_chunk_delivered = min(chunk_size, capacity)
    remainder_delivered = min(remainder, capacity)
    delivered = full_chunks * per_chunk_delivered + remainder_delivered
    return {
        "delivered": delivered,
        "overflowed": max(0, size - delivered),
        "peak_mem": chunk_size,
    }


def _int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _overflow_prediction_result(
    level: str, observations: dict[str, Any]
) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictedOverflow"}):
        return None
    predicted = observations["predictedOverflow"]
    if observations["kind"] != f"pipeline-plant-{level}" or not isinstance(predicted, bool):
        return None
    job = JOBS[level]
    if level == "L4":
        truth = _backpressured(
            job["size"], job["capacity"], job["drain_rate"], job["time_ms"]
        )
    else:
        truth = _buffered(job["size"], job["capacity"])
    actual_overflow = truth["overflowed"] > 0
    metrics: dict[str, Any] = {
        "kind": "voxeldoj-pipeline-plant",
        "size": job["size"],
        "capacity": job["capacity"],
        "mode": "buffered",
        "overflow_predicted": predicted,
        "overflow_actual": actual_overflow,
        "peak_mem": truth["peak_mem"],
        "delivered": truth["delivered"],
        "overflowed": truth["overflowed"],
    }
    if level == "L4":
        metrics["stalled"] = truth["stalled"]
        metrics["drained"] = truth["drained"]
        metrics["drain_rate"] = job["drain_rate"]
        metrics["time_ms"] = job["time_ms"]
    return predicted == actual_overflow, metrics


def _bounded_result(observations: dict[str, Any]) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "predictedBounded"}):
        return None
    predicted = observations["predictedBounded"]
    if observations["kind"] != "pipeline-plant-L2" or not isinstance(predicted, bool):
        return None
    job = JOBS["L2"]
    truth = _streaming(job["size"], job["chunk_size"], job["capacity"])
    actual_bounded = truth["overflowed"] == 0
    passed = predicted == actual_bounded and actual_bounded
    return passed, {
        "kind": "voxeldoj-pipeline-plant",
        "size": job["size"],
        "capacity": job["capacity"],
        "chunk_size": job["chunk_size"],
        "mode": "streaming",
        "bounded_predicted": predicted,
        "bounded_actual": actual_bounded,
        "peak_mem": truth["peak_mem"],
        "delivered": truth["delivered"],
        "overflowed": truth["overflowed"],
    }


def _chunk_tune_result(observations: dict[str, Any]) -> tuple[bool, dict[str, Any]] | None:
    if not closed_dict(observations, {"kind", "chunkSize", "predictedPeak"}):
        return None
    chunk_size = observations["chunkSize"]
    predicted_peak = observations["predictedPeak"]
    if (
        observations["kind"] != "pipeline-plant-L3"
        or not _int(chunk_size)
        or not _int(predicted_peak)
        or chunk_size <= 0
        or predicted_peak < 0
    ):
        return None
    job = JOBS["L3"]
    truth = _streaming(job["size"], chunk_size, job["capacity"])
    fits = truth["overflowed"] == 0
    peak_accurate = abs(predicted_peak - truth["peak_mem"]) <= 1
    return fits and peak_accurate, {
        "kind": "voxeldoj-pipeline-plant",
        "size": job["size"],
        "capacity": job["capacity"],
        "chunk_size": chunk_size,
        "mode": "streaming",
        "peak_predicted": predicted_peak,
        "peak_actual": truth["peak_mem"],
        "delivered": truth["delivered"],
        "overflowed": truth["overflowed"],
        "chunk_fits": fits,
    }


def evaluate_pipeline(
    level: str, observations: Any, producer_metrics: Any, errors: list[str]
) -> bool:
    if level not in JOBS:
        errors.append("unsupported PIPELINE PLANT level")
        return False
    if not isinstance(observations, dict):
        errors.append("observations must be a bounded object")
        return False
    evaluated = (
        _chunk_tune_result(observations)
        if level == "L3"
        else (
            _bounded_result(observations)
            if level == "L2"
            else _overflow_prediction_result(level, observations)
        )
    )
    if evaluated is None:
        errors.append(f"observations do not match the closed {level} scenario trace")
        return False
    passed, expected_metrics = evaluated
    if not metrics_match(producer_metrics, expected_metrics):
        errors.append("producer metrics disagree with independently recomputed observations")
        return False
    return passed
