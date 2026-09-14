from __future__ import annotations

from typing import Any

import pytest

from learner.gate.task_queue_evaluator import evaluate_task_queue

# Ground-truth decision traces replay the deterministic wave (mirroring the TS
# controller in engines/voxelDojo/game-04-task-queue/src) — pinned so any
# evaluator drift or producer disagreement fails here. Each tuple is
# (type, predicted/held task id, classify route, gate action); the replay
# consumes them in prompt order. Cross-checked against the TS sim (AID-1902
# dump run): GameController was driven headless with these decisions and these
# are the exact metrics it emitted.
TRACES: dict[str, list[tuple[str, str | None, str | None, str | None]]] = {
    "L1-perfect": [
        ("dispatch", "t-0-order-101", None, None),
        ("dispatch", "t-1-order-102", None, None),
        ("dispatch", "t-2-email-5", None, None),
        ("dispatch", "t-3-render-42", None, None),
        ("dispatch", "t-4-webhook-7", None, None),
        ("dispatch", "t-5-digest", None, None),
        ("dispatch", "t-7-audit", None, None),
        ("dispatch", "t-6-thumb-200", None, None),
        ("dispatch", "t-8-order-103", None, None),
        ("dispatch", "t-9-fanout-9", None, None),
        ("dispatch", "t-10-report", None, None),
        ("dispatch", "t-11-order-104", None, None),
    ],
    "L2-perfect": [
        ("dispatch", "t-0-warmup", None, None),
        ("dispatch", "t-2-quick-1", None, None),
        ("dispatch", "t-1-hold-1", None, None),
        ("dispatch", "t-4-quick-2", None, None),
        ("dispatch", "t-3-hold-2", None, None),
        ("dispatch", "t-6-quick-3", None, None),
        ("dispatch", "t-7-bright", None, None),
        ("dispatch", "t-5-hold-3", None, None),
        ("dispatch", "t-8-quick-4", None, None),
        ("dispatch", "t-9-closer", None, None),
    ],
    "L3-perfect": [
        ("dispatch", "t-0-order-201", None, None),
        ("dispatch", "t-1-flake-1", None, None),
        ("dispatch", "t-2-webhook-8", None, None),
        ("classify", "t-1-flake-1", "retry", None),
        ("dispatch", "t-3-poison-ocr", None, None),
        ("dispatch", "t-4-digest", None, None),
        ("dispatch", "t-1-flake-1", None, None),
        ("classify", "t-3-poison-ocr", "dlq", None),
        ("dispatch", "t-5-brittle-csv", None, None),
        ("dispatch", "t-6-flake-2", None, None),
        ("classify", "t-5-brittle-csv", "retry", None),
        ("dispatch", "t-7-poison-json", None, None),
        ("classify", "t-6-flake-2", "retry", None),
        ("dispatch", "t-5-brittle-csv", None, None),
        ("dispatch", "t-8-render-43", None, None),
        ("classify", "t-7-poison-json", "dlq", None),
        ("dispatch", "t-6-flake-2", None, None),
        ("classify", "t-5-brittle-csv", "retry", None),
        ("dispatch", "t-9-flake-3", None, None),
        ("dispatch", "t-10-audit", None, None),
        ("classify", "t-9-flake-3", "retry", None),
        ("dispatch", "t-11-order-202", None, None),
        ("dispatch", "t-5-brittle-csv", None, None),
        ("dispatch", "t-9-flake-3", None, None),
        ("classify", "t-5-brittle-csv", "dlq", None),
    ],
    "L4-perfect": [
        ("dispatch", "t-0-order-301", None, None),
        ("dispatch", "t-1-order-302", None, None),
        ("dispatch", "t-2-render-50", None, None),
        ("dispatch", "t-5-digest", None, None),
        ("dispatch", "t-6-webhook-10", None, None),
        ("dispatch", "t-7-fanout-11", None, None),
        ("gate", None, None, "reject"),
        ("gate", None, None, "reject"),
        ("gate", None, None, "reject"),
        ("dispatch", "t-8-flake-9", None, None),
        ("dispatch", "t-14-poison-csv", None, None),
        ("dispatch", "t-9-spike-1", None, None),
        ("classify", "t-8-flake-9", "retry", None),
        ("dispatch", "t-15-flake-10", None, None),
        ("classify", "t-14-poison-csv", "dlq", None),
        ("dispatch", "t-3-hold-1", None, None),
        ("dispatch", "t-4-hold-2", None, None),
        ("classify", "t-15-flake-10", "retry", None),
        ("dispatch", "t-16-report-9", None, None),
        ("dispatch", "t-8-flake-9", None, None),
        ("dispatch", "t-10-audit", None, None),
        ("dispatch", "t-17-brittle-xml", None, None),
        ("dispatch", "t-15-flake-10", None, None),
        ("dispatch", "t-18-closer", None, None),
        ("classify", "t-17-brittle-xml", "retry", None),
        ("dispatch", "t-17-brittle-xml", None, None),
        ("classify", "t-17-brittle-xml", "retry", None),
        ("dispatch", "t-17-brittle-xml", None, None),
        ("classify", "t-17-brittle-xml", "dlq", None),
    ],
    "L1-wrong3": [
        ("dispatch", "t-0-order-101-miss", None, None),
        ("dispatch", "t-1-order-102-miss", None, None),
        ("dispatch", "t-2-email-5-miss", None, None),
        ("dispatch", "t-3-render-42", None, None),
        ("dispatch", "t-4-webhook-7", None, None),
        ("dispatch", "t-5-digest", None, None),
        ("dispatch", "t-7-audit", None, None),
        ("dispatch", "t-6-thumb-200", None, None),
        ("dispatch", "t-8-order-103", None, None),
        ("dispatch", "t-9-fanout-9", None, None),
        ("dispatch", "t-10-report", None, None),
        ("dispatch", "t-11-order-104", None, None),
    ],
    "L3-wrongroute-cracked": [
        ("dispatch", "t-0-order-201", None, None),
        ("dispatch", "t-1-flake-1", None, None),
        ("dispatch", "t-2-webhook-8", None, None),
        ("classify", "t-1-flake-1", "dlq", None),
        ("dispatch", "t-3-poison-ocr", None, None),
        ("dispatch", "t-4-digest", None, None),
        ("classify", "t-3-poison-ocr", "dlq", None),
        ("dispatch", "t-5-brittle-csv", None, None),
        ("dispatch", "t-6-flake-2", None, None),
        ("classify", "t-5-brittle-csv", "retry", None),
        ("dispatch", "t-7-poison-json", None, None),
        ("classify", "t-6-flake-2", "retry", None),
        ("dispatch", "t-8-render-43", None, None),
        ("dispatch", "t-5-brittle-csv", None, None),
        ("classify", "t-7-poison-json", "dlq", None),
        ("dispatch", "t-6-flake-2", None, None),
        ("dispatch", "t-9-flake-3", None, None),
        ("classify", "t-5-brittle-csv", "retry", None),
        ("dispatch", "t-10-audit", None, None),
        ("classify", "t-9-flake-3", "retry", None),
        ("dispatch", "t-11-order-202", None, None),
        ("dispatch", "t-9-flake-3", None, None),
        ("dispatch", "t-5-brittle-csv", None, None),
        ("classify", "t-5-brittle-csv", "dlq", None),
    ],
    "L4-admit1": [
        ("dispatch", "t-0-order-301", None, None),
        ("dispatch", "t-1-order-302", None, None),
        ("dispatch", "t-2-render-50", None, None),
        ("dispatch", "t-5-digest", None, None),
        ("dispatch", "t-6-webhook-10", None, None),
        ("dispatch", "t-7-fanout-11", None, None),
        ("gate", None, None, "admit"),
        ("gate", None, None, "reject"),
        ("gate", None, None, "reject"),
        ("dispatch", "t-8-flake-9", None, None),
        ("gate", None, None, "reject"),
        ("dispatch", "t-9-spike-1", None, None),
        ("dispatch", "t-10-audit", None, None),
        ("classify", "t-8-flake-9", "retry", None),
        ("dispatch", "t-15-flake-10", None, None),
        ("dispatch", "t-3-hold-1", None, None),
        ("dispatch", "t-4-hold-2", None, None),
        ("classify", "t-15-flake-10", "retry", None),
        ("dispatch", "t-16-report-9", None, None),
        ("dispatch", "t-8-flake-9", None, None),
        ("dispatch", "t-11-spike-2", None, None),
        ("dispatch", "t-17-brittle-xml", None, None),
        ("dispatch", "t-15-flake-10", None, None),
        ("dispatch", "t-18-closer", None, None),
        ("classify", "t-17-brittle-xml", "retry", None),
        ("dispatch", "t-17-brittle-xml", None, None),
        ("classify", "t-17-brittle-xml", "retry", None),
        ("dispatch", "t-17-brittle-xml", None, None),
        ("classify", "t-17-brittle-xml", "dlq", None),
    ],
    "L4-admitdup": [
        ("dispatch", "t-0-order-301", None, None),
        ("dispatch", "t-1-order-302", None, None),
        ("dispatch", "t-2-render-50", None, None),
        ("dispatch", "t-5-digest", None, None),
        ("dispatch", "t-6-webhook-10", None, None),
        ("dispatch", "t-7-fanout-11", None, None),
        ("gate", None, None, "reject"),
        ("gate", None, None, "reject"),
        ("gate", None, None, "admit"),
        ("dispatch", "t-13-digest-AGAIN", None, None),
        ("gate", None, None, "reject"),
        ("dispatch", "t-8-flake-9", None, None),
        ("dispatch", "t-9-spike-1", None, None),
        ("dispatch", "t-15-flake-10", None, None),
        ("classify", "t-8-flake-9", "retry", None),
        ("dispatch", "t-3-hold-1", None, None),
        ("dispatch", "t-4-hold-2", None, None),
        ("classify", "t-15-flake-10", "retry", None),
        ("dispatch", "t-16-report-9", None, None),
        ("dispatch", "t-10-audit", None, None),
        ("dispatch", "t-17-brittle-xml", None, None),
        ("dispatch", "t-8-flake-9", None, None),
        ("dispatch", "t-15-flake-10", None, None),
        ("classify", "t-17-brittle-xml", "retry", None),
        ("dispatch", "t-18-closer", None, None),
        ("dispatch", "t-17-brittle-xml", None, None),
        ("classify", "t-17-brittle-xml", "retry", None),
        ("dispatch", "t-17-brittle-xml", None, None),
        ("classify", "t-17-brittle-xml", "dlq", None),
    ],}

METRICS: dict[str, dict[str, Any]] = {
    "L1-perfect": {"kind": "voxeldojo-task-queue", "dispatch_predictions": 12, "dispatch_correct": 12, "retry_classifications": 0, "retry_correct": 0, "dlq_classifications": 0, "dlq_correct": 0, "poison_requeued": 0, "backpressure_violations": 0, "idempotency_duplicates_enqueued": 0, "queue_overflowed": False, "max_concurrent_running": 3, "worker_count": 3},
    "L2-perfect": {"kind": "voxeldojo-task-queue", "dispatch_predictions": 10, "dispatch_correct": 10, "retry_classifications": 0, "retry_correct": 0, "dlq_classifications": 0, "dlq_correct": 0, "poison_requeued": 0, "backpressure_violations": 0, "idempotency_duplicates_enqueued": 0, "queue_overflowed": False, "max_concurrent_running": 2, "worker_count": 2},
    "L3-perfect": {"kind": "voxeldojo-task-queue", "dispatch_predictions": 17, "dispatch_correct": 17, "retry_classifications": 5, "retry_correct": 5, "dlq_classifications": 3, "dlq_correct": 3, "poison_requeued": 0, "backpressure_violations": 0, "idempotency_duplicates_enqueued": 0, "queue_overflowed": False, "max_concurrent_running": 3, "worker_count": 3},
    "L4-perfect": {"kind": "voxeldojo-task-queue", "dispatch_predictions": 20, "dispatch_correct": 20, "retry_classifications": 4, "retry_correct": 4, "dlq_classifications": 2, "dlq_correct": 2, "poison_requeued": 0, "backpressure_violations": 0, "idempotency_duplicates_enqueued": 0, "queue_overflowed": False, "max_concurrent_running": 3, "worker_count": 3},
    "L1-wrong3": {"kind": "voxeldojo-task-queue", "dispatch_predictions": 12, "dispatch_correct": 9, "retry_classifications": 0, "retry_correct": 0, "dlq_classifications": 0, "dlq_correct": 0, "poison_requeued": 0, "backpressure_violations": 0, "idempotency_duplicates_enqueued": 0, "queue_overflowed": False, "max_concurrent_running": 3, "worker_count": 3},
    "L3-wrongroute-cracked": {"kind": "voxeldojo-task-queue", "dispatch_predictions": 16, "dispatch_correct": 16, "retry_classifications": 4, "retry_correct": 4, "dlq_classifications": 4, "dlq_correct": 3, "poison_requeued": 0, "backpressure_violations": 0, "idempotency_duplicates_enqueued": 0, "queue_overflowed": False, "max_concurrent_running": 3, "worker_count": 3},
    "L4-admit1": {"kind": "voxeldojo-task-queue", "dispatch_predictions": 20, "dispatch_correct": 20, "retry_classifications": 4, "retry_correct": 4, "dlq_classifications": 1, "dlq_correct": 1, "poison_requeued": 0, "backpressure_violations": 1, "idempotency_duplicates_enqueued": 0, "queue_overflowed": True, "max_concurrent_running": 3, "worker_count": 3},
    "L4-admitdup": {"kind": "voxeldojo-task-queue", "dispatch_predictions": 20, "dispatch_correct": 20, "retry_classifications": 4, "retry_correct": 4, "dlq_classifications": 1, "dlq_correct": 1, "poison_requeued": 0, "backpressure_violations": 0, "idempotency_duplicates_enqueued": 1, "queue_overflowed": False, "max_concurrent_running": 3, "worker_count": 3},
}

PASSING = ("L1-perfect", "L2-perfect", "L3-perfect", "L4-perfect")
FAILING = {
    "L1-wrong3": "3 wrong dispatch predictions (9/12 = 0.75, below the 0.8 bar)",
    "L3-wrongroute-cracked": "one cracked ingot misrouted to DLQ",
    "L4-admit1": "the full-hopper gate admitted (overflow)",
    "L4-admitdup": "the duplicate-sigil gate admitted",
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
    forged = dict(METRICS["L1-perfect"], dispatch_correct=11)
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


def test_pins_the_ts_controller_ground_truth() -> None:
    # Cross-checked against the TS controller dump: a perfect L1 wave answers
    # 12 dispatch prompts (12/12, max_concurrent_running 3); a perfect L3 wave
    # classifies 5 retry + 3 DLQ with zero poison requeues; a perfect L4 wave
    # rejects every gate (no overflow, no duplicate enqueued).
    assert METRICS["L1-perfect"]["dispatch_predictions"] == 12
    assert METRICS["L1-perfect"]["dispatch_correct"] == 12
    assert METRICS["L1-perfect"]["max_concurrent_running"] == 3
    assert METRICS["L3-perfect"]["dispatch_predictions"] == 17
    assert METRICS["L3-perfect"]["retry_classifications"] == 5
    assert METRICS["L3-perfect"]["dlq_classifications"] == 3
    assert METRICS["L3-perfect"]["poison_requeued"] == 0
    assert METRICS["L4-perfect"]["backpressure_violations"] == 0
    assert METRICS["L4-perfect"]["idempotency_duplicates_enqueued"] == 0
    assert METRICS["L1-wrong3"]["dispatch_correct"] == 9
    assert METRICS["L4-admit1"]["queue_overflowed"] is True
    assert METRICS["L4-admitdup"]["idempotency_duplicates_enqueued"] == 1
