from __future__ import annotations

from typing import Any

import pytest

from learner.gate.task_queue_evaluator import evaluate_task_queue

# Ground-truth decision traces replay the deterministic canonical wave
# (mirroring the TS controller in engines/voxelDojo/game-04-task-queue/src,
# merged via PR #424/AID-1901) — pinned so any evaluator drift or producer
# disagreement fails here. Each tuple is (type, predicted/held task id,
# classify route, gate action); the replay consumes them in prompt-answer
# order. The four perfect traces were cross-checked bit-for-bit against
# first-hand QA dumps (AID-1937 evidence: perfect waves played on the real
# canonical controller and emitted by the #425 observations emitter @341154c6;
# replayed here — 4/4 PASS with metrics matching the producer's). The four
# failing traces were derived deterministically on the same mirror (wrong
# predictions, misroute, poison requeue, unrejected duplicate landing) and
# fail on the frozen pass rule only — the replay itself stays exact.
TRACES: dict[str, list[tuple[str, str | None, str | None, str | None]]] = {
    "L1-perfect": [
        ("dispatch", "t1", None, None),
        ("dispatch", "t2", None, None),
        ("dispatch", "t3", None, None),
        ("dispatch", "t4", None, None),
        ("dispatch", "t5", None, None),
        ("dispatch", "t7", None, None),
        ("dispatch", "t6", None, None),
        ("dispatch", "t8", None, None),
        ("dispatch", "t9", None, None),
        ("dispatch", "t10", None, None),
    ],
    "L2-perfect": [
        ("dispatch", "u1", None, None),
        ("dispatch", "u2", None, None),
        ("dispatch", "u3", None, None),
        ("dispatch", "u4", None, None),
        ("dispatch", "u5", None, None),
        ("dispatch", "u7", None, None),
        ("gate", None, None, "reject"),
        ("gate", None, None, "reject"),
        ("dispatch", "u6", None, None),
        ("dispatch", "u9", None, None),
        ("dispatch", "u8", None, None),
        ("dispatch", "u13", None, None),
        ("dispatch", "u12", None, None),
        ("dispatch", "u14", None, None),
    ],
    "L3-perfect": [
        ("dispatch", "v1", None, None),
        ("dispatch", "v2", None, None),
        ("dispatch", "v3", None, None),
        ("classify", "v2", "retry", None),
        ("dispatch", "v4", None, None),
        ("dispatch", "v2", None, None),
        ("classify", "v4", "retry", None),
        ("dispatch", "v6", None, None),
        ("classify", "v2", "retry", None),
        ("dispatch", "v4", None, None),
        ("classify", "v6", "retry", None),
        ("dispatch", "v7", None, None),
        ("classify", "v4", "retry", None),
        ("dispatch", "v9", None, None),
        ("dispatch", "v6", None, None),
        ("dispatch", "v4", None, None),
        ("classify", "v6", "dlq", None),
        ("dispatch", "v2", None, None),
        ("classify", "v4", "dlq", None),
        ("dispatch", "v5", None, None),
        ("classify", "v2", "dlq", None),
        ("dispatch", "v8", None, None),
        ("classify", "v8", "retry", None),
        ("dispatch", "v8", None, None),
        ("classify", "v8", "retry", None),
        ("dispatch", "v8", None, None),
        ("classify", "v8", "dlq", None),
    ],
    "L4-perfect": [
        ("dispatch", "w1", None, None),
        ("dispatch", "w2", None, None),
        ("dispatch", "w3", None, None),
        ("classify", "w2", "dlq", None),
        ("dispatch", "w4", None, None),
        ("dispatch", "w5", None, None),
        ("classify", "w4", "dlq", None),
        ("dispatch", "w6", None, None),
        ("dispatch", "w7", None, None),
        ("classify", "w7", "dlq", None),
        ("gate", None, None, "reject"),
        ("dispatch", "w8", None, None),
        ("dispatch", "w9", None, None),
        ("dispatch", "w11", None, None),
        ("classify", "w9", "retry", None),
        ("dispatch", "w12", None, None),
        ("dispatch", "w9", None, None),
        ("classify", "w12", "retry", None),
        ("classify", "w9", "retry", None),
        ("dispatch", "w12", None, None),
        ("dispatch", "w9", None, None),
        ("classify", "w12", "dlq", None),
        ("classify", "w9", "dlq", None),
    ],
    "L1-wrong3": [
        ("dispatch", "t1-miss", None, None),
        ("dispatch", "t2-miss", None, None),
        ("dispatch", "t3-miss", None, None),
        ("dispatch", "t4", None, None),
        ("dispatch", "t5", None, None),
        ("dispatch", "t7", None, None),
        ("dispatch", "t6", None, None),
        ("dispatch", "t8", None, None),
        ("dispatch", "t9", None, None),
        ("dispatch", "t10", None, None),
    ],
    "L3-misroute": [
        ("dispatch", "v1", None, None),
        ("dispatch", "v2", None, None),
        ("dispatch", "v3", None, None),
        ("classify", "v2", "dlq", None),
        ("dispatch", "v4", None, None),
        ("dispatch", "v5", None, None),
        ("classify", "v4", "retry", None),
        ("dispatch", "v6", None, None),
        ("dispatch", "v4", None, None),
        ("classify", "v6", "retry", None),
        ("dispatch", "v7", None, None),
        ("classify", "v4", "retry", None),
        ("dispatch", "v9", None, None),
        ("dispatch", "v6", None, None),
        ("dispatch", "v4", None, None),
        ("classify", "v6", "dlq", None),
        ("dispatch", "v8", None, None),
        ("classify", "v4", "dlq", None),
        ("classify", "v8", "retry", None),
        ("dispatch", "v8", None, None),
        ("classify", "v8", "retry", None),
        ("dispatch", "v8", None, None),
        ("classify", "v8", "dlq", None),
    ],
    "L4-poison-retry": [
        ("dispatch", "w1", None, None),
        ("dispatch", "w2", None, None),
        ("dispatch", "w3", None, None),
        ("classify", "w2", "retry", None),
        ("dispatch", "w2", None, None),
        ("dispatch", "w4", None, None),
        ("dispatch", "w5", None, None),
        ("classify", "w2", "dlq", None),
        ("classify", "w4", "dlq", None),
        ("dispatch", "w6", None, None),
        ("dispatch", "w7", None, None),
        ("classify", "w7", "dlq", None),
        ("gate", None, None, "reject"),
        ("dispatch", "w8", None, None),
        ("dispatch", "w9", None, None),
        ("dispatch", "w11", None, None),
        ("classify", "w9", "retry", None),
        ("dispatch", "w12", None, None),
        ("dispatch", "w9", None, None),
        ("classify", "w12", "retry", None),
        ("classify", "w9", "retry", None),
        ("dispatch", "w12", None, None),
        ("dispatch", "w9", None, None),
        ("classify", "w12", "dlq", None),
        ("classify", "w9", "dlq", None),
    ],
    # No-reject play: at the required-reject prompt for the w10 duplicate the
    # player keeps answering dispatch prompts; the dock window closes and the
    # duplicate lands (idempotency_duplicates_enqueued 1 — pass-rule failure).
    "L4-no-reject": [
        ("dispatch", "w1", None, None),
        ("dispatch", "w2", None, None),
        ("dispatch", "w3", None, None),
        ("classify", "w2", "dlq", None),
        ("dispatch", "w4", None, None),
        ("dispatch", "w5", None, None),
        ("classify", "w4", "dlq", None),
        ("dispatch", "w6", None, None),
        ("dispatch", "w7", None, None),
        ("classify", "w7", "dlq", None),
        ("dispatch", "w8", None, None),
        ("dispatch", "w9", None, None),
        ("classify", "w9", "retry", None),
        ("dispatch", "w11", None, None),
        ("dispatch", "w12", None, None),
        ("dispatch", "w9", None, None),
        ("classify", "w12", "retry", None),
        ("classify", "w9", "retry", None),
        ("dispatch", "w12", None, None),
        ("dispatch", "w9", None, None),
        ("classify", "w12", "dlq", None),
        ("classify", "w9", "dlq", None),
    ],
}

METRICS: dict[str, dict[str, Any]] = {
    "L1-perfect": {"kind": "voxeldojo-task-queue", "dispatch_predictions": 10, "dispatch_correct": 10, "retry_classifications": 0, "retry_correct": 0, "dlq_classifications": 0, "dlq_correct": 0, "poison_requeued": 0, "backpressure_violations": 0, "idempotency_duplicates_enqueued": 0, "queue_overflowed": False, "max_concurrent_running": 2, "worker_count": 2},
    "L2-perfect": {"kind": "voxeldojo-task-queue", "dispatch_predictions": 12, "dispatch_correct": 12, "retry_classifications": 0, "retry_correct": 0, "dlq_classifications": 0, "dlq_correct": 0, "poison_requeued": 0, "backpressure_violations": 0, "idempotency_duplicates_enqueued": 0, "queue_overflowed": False, "max_concurrent_running": 2, "worker_count": 2},
    "L3-perfect": {"kind": "voxeldojo-task-queue", "dispatch_predictions": 16, "dispatch_correct": 16, "retry_classifications": 7, "retry_correct": 7, "dlq_classifications": 4, "dlq_correct": 4, "poison_requeued": 0, "backpressure_violations": 0, "idempotency_duplicates_enqueued": 0, "queue_overflowed": False, "max_concurrent_running": 2, "worker_count": 2},
    "L4-perfect": {"kind": "voxeldojo-task-queue", "dispatch_predictions": 14, "dispatch_correct": 14, "retry_classifications": 3, "retry_correct": 3, "dlq_classifications": 5, "dlq_correct": 5, "poison_requeued": 0, "backpressure_violations": 0, "idempotency_duplicates_enqueued": 0, "queue_overflowed": False, "max_concurrent_running": 3, "worker_count": 3},
    "L1-wrong3": {"kind": "voxeldojo-task-queue", "dispatch_predictions": 10, "dispatch_correct": 7, "retry_classifications": 0, "retry_correct": 0, "dlq_classifications": 0, "dlq_correct": 0, "poison_requeued": 0, "backpressure_violations": 0, "idempotency_duplicates_enqueued": 0, "queue_overflowed": False, "max_concurrent_running": 2, "worker_count": 2},
    "L3-misroute": {"kind": "voxeldojo-task-queue", "dispatch_predictions": 14, "dispatch_correct": 14, "retry_classifications": 5, "retry_correct": 5, "dlq_classifications": 4, "dlq_correct": 3, "poison_requeued": 0, "backpressure_violations": 0, "idempotency_duplicates_enqueued": 0, "queue_overflowed": False, "max_concurrent_running": 2, "worker_count": 2},
    "L4-poison-retry": {"kind": "voxeldojo-task-queue", "dispatch_predictions": 15, "dispatch_correct": 15, "retry_classifications": 4, "retry_correct": 3, "dlq_classifications": 5, "dlq_correct": 5, "poison_requeued": 1, "backpressure_violations": 0, "idempotency_duplicates_enqueued": 0, "queue_overflowed": False, "max_concurrent_running": 3, "worker_count": 3},
    "L4-no-reject": {"kind": "voxeldojo-task-queue", "dispatch_predictions": 14, "dispatch_correct": 14, "retry_classifications": 3, "retry_correct": 3, "dlq_classifications": 5, "dlq_correct": 5, "poison_requeued": 0, "backpressure_violations": 0, "idempotency_duplicates_enqueued": 1, "queue_overflowed": False, "max_concurrent_running": 3, "worker_count": 3},
}

PASSING = ("L1-perfect", "L2-perfect", "L3-perfect", "L4-perfect")
FAILING = {
    "L1-wrong3": "3 wrong dispatch predictions (7/10 = 0.7, below the 0.8 bar)",
    "L3-misroute": "one transient crack misrouted to the DLQ (dlq 3/4)",
    "L4-poison-retry": "poison requeued through the rack (poison_requeued 1)",
    "L4-no-reject": "duplicate forklift never rejected and landed (1 dup enqueued)",
}


def _observations(trace: str) -> dict[str, Any]:
    """Decisions in recorded order (dispatch/classify/gate interleaved)."""
    level = trace.split("-")[0]
    decisions: list[dict[str, Any]] = []
    for kind, task_id, route, action in TRACES[trace]:
        if kind == "dispatch":
            decisions.append({"type": "dispatch", "taskId": task_id})
        elif kind == "classify":
            decisions.append({"type": "classify", "taskId": task_id, "route": route})
        else:
            decisions.append({"type": "gate", "action": action})
    return {"kind": "task-forge-" + level, "decisions": decisions}


@pytest.mark.parametrize("trace", PASSING)
def test_accepts_each_complete_passing_level(trace: str) -> None:
    errors: list[str] = []

    result = evaluate_task_queue(
        trace.split("-")[0], _observations(trace), METRICS[trace], errors
    )

    assert result is True
    assert errors == []


@pytest.mark.parametrize("trace", FAILING)
def test_rejects_each_failing_trace_on_the_frozen_rule_only(trace: str) -> None:
    # The replay itself is exact (no errors, metrics agree) — the FAIL comes
    # from the frozen pass rule, never from a trace/replay mismatch.
    errors: list[str] = []

    result = evaluate_task_queue(
        trace.split("-")[0], _observations(trace), METRICS[trace], errors
    )

    assert result is False
    assert errors == []


def test_rejects_forged_metrics() -> None:
    observations = _observations("L1-perfect")
    forged = dict(METRICS["L1-perfect"], dispatch_correct=9)
    errors: list[str] = []

    result = evaluate_task_queue("L1", observations, forged, errors)

    assert result is False
    assert errors == [
        "producer metrics disagree with independently recomputed observations"
    ]


def test_rejects_pass_claim_over_a_failing_rule_via_metrics() -> None:
    # The L1-wrong3 trace genuinely fails the 0.8 bar; a producer that claims
    # the passing L1 metrics alongside it disagrees with the replay.
    observations = _observations("L1-wrong3")
    errors: list[str] = []

    result = evaluate_task_queue("L1", observations, METRICS["L1-perfect"], errors)

    assert result is False
    assert errors == [
        "producer metrics disagree with independently recomputed observations"
    ]


def test_rejects_truncated_trace() -> None:
    # A wave that stalls on an open prompt (e.g. L2's duplicate gates left
    # unanswered) must run out of decisions — fail-closed.
    observations = _observations("L4-perfect")
    observations["decisions"] = observations["decisions"][:-1]
    errors: list[str] = []

    result = evaluate_task_queue("L4", observations, METRICS["L4-perfect"], errors)

    assert result is False
    assert errors == ["observations do not match the closed L4 scenario trace"]


def test_rejects_extra_decisions() -> None:
    observations = _observations("L1-perfect")
    observations["decisions"] = observations["decisions"] + [
        {"type": "gate", "action": "reject"}
    ]
    errors: list[str] = []

    result = evaluate_task_queue("L1", observations, METRICS["L1-perfect"], errors)

    assert result is False
    assert errors == ["observations do not match the closed L1 scenario trace"]


def test_rejects_gate_admit_not_producible_by_this_producer() -> None:
    # The canonical controller has no admit action: admitting happens by
    # letting the dock window close, which is not a recorded decision. A
    # gate/admit entry cannot come from this producer — rejected fail-closed
    # as a trace mismatch (violations arrive via unrejected landings instead,
    # see L4-no-reject).
    observations = _observations("L4-perfect")
    index = observations["decisions"].index({"type": "gate", "action": "reject"})
    observations["decisions"][index] = {"type": "gate", "action": "admit"}
    errors: list[str] = []

    result = evaluate_task_queue("L4", observations, METRICS["L4-perfect"], errors)

    assert result is False
    assert errors == ["observations do not match the closed L4 scenario trace"]


def test_rejects_wrong_level_kind() -> None:
    observations = _observations("L1-perfect")
    observations["kind"] = "task-forge-L2"
    errors: list[str] = []

    result = evaluate_task_queue("L1", observations, METRICS["L1-perfect"], errors)

    assert result is False
    assert errors == ["observations do not match the closed L1 scenario trace"]


def test_rejects_open_decision_shape() -> None:
    observations = _observations("L1-perfect")
    observations["decisions"][0]["hint"] = "please"
    errors: list[str] = []

    result = evaluate_task_queue("L1", observations, METRICS["L1-perfect"], errors)

    assert result is False
    assert errors == ["observations do not match the closed L1 scenario trace"]


def test_rejects_empty_decisions() -> None:
    errors: list[str] = []

    result = evaluate_task_queue("L1", {"kind": "task-forge-L1", "decisions": []}, {}, errors)

    assert result is False
    assert errors == ["observations do not match the closed L1 scenario trace"]


def test_rejects_unsupported_level_and_non_object_observations() -> None:
    errors: list[str] = []

    result = evaluate_task_queue(
        "L5", {"kind": "task-forge-L5", "decisions": []}, None, errors
    )

    assert result is False
    assert errors == ["unsupported TASK FORGE level"]

    errors = []
    result = evaluate_task_queue("L1", None, None, errors)
    assert result is False
    assert errors == ["observations must be a bounded object"]


def test_rejects_orphan_sim_ids_fail_closed() -> None:
    # Ground truth re-pin guard (AID-1939): decisions carrying ids from the
    # orphan #421 sim (t-0-order-101...) never match the canonical wave.
    observations = _observations("L1-perfect")
    observations["decisions"][0]["taskId"] = "t-0-order-101"
    errors: list[str] = []

    result = evaluate_task_queue("L1", observations, METRICS["L1-perfect"], errors)

    assert result is False
    # dispatch ids are free predictions, so the trace replays — but the
    # recomputed metrics expose the forged first-prediction mismatch.
    assert errors == [
        "producer metrics disagree with independently recomputed observations"
    ]


def test_pins_the_canonical_sim_ground_truth() -> None:
    # Cross-checked against first-hand QA dumps (AID-1937 evidence run on the
    # canonical controller + #425 emitter): these are the exact metrics the
    # real producer emits for perfect play — the evaluator recomputes them
    # independently and must keep agreeing.
    assert METRICS["L1-perfect"]["dispatch_predictions"] == 10
    assert METRICS["L1-perfect"]["dispatch_correct"] == 10
    assert METRICS["L1-perfect"]["max_concurrent_running"] == 2
    assert METRICS["L2-perfect"]["dispatch_predictions"] == 12
    assert METRICS["L3-perfect"]["dispatch_predictions"] == 16
    assert METRICS["L3-perfect"]["retry_classifications"] == 7
    assert METRICS["L3-perfect"]["dlq_classifications"] == 4
    assert METRICS["L3-perfect"]["poison_requeued"] == 0
    assert METRICS["L4-perfect"]["dispatch_predictions"] == 14
    assert METRICS["L4-perfect"]["retry_classifications"] == 3
    assert METRICS["L4-perfect"]["dlq_classifications"] == 5
    assert METRICS["L4-perfect"]["backpressure_violations"] == 0
    assert METRICS["L4-perfect"]["idempotency_duplicates_enqueued"] == 0
    assert METRICS["L1-wrong3"]["dispatch_correct"] == 7
    assert METRICS["L4-poison-retry"]["poison_requeued"] == 1
    assert METRICS["L4-no-reject"]["idempotency_duplicates_enqueued"] == 1
