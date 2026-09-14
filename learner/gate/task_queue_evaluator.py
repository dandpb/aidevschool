"""Independent evaluator for the TASK FORGE teaching game (U4 task queue).

The verifier replays the player's bounded decision trace against the
deterministic worker-pool wave seeded by the level config — it never trusts
the producer's metrics or ``pass`` claim.

Sim model (mirror of the canonical ``engines/voxelDojo/game-04-task-queue``
merged via PR #424/AID-1901): the wave is the data-only arrival script of
``src/sim/levels.ts`` (ids ``t1..tN``/``u..``/``v..``/``w..``, clock in beats,
``WORK_BEATS 3``/``DOCK_WINDOW 2`` cadence, per-level seeds 4104/4204/4304/
4404, worker counts 2/2/2/3, capacities 6/4/6/5). ``src/sim/queue.ts`` pins
the invariants the replay reproduces: priority-desc/FIFO/id tie-break with a
``scheduled_for`` eligibility gate (I2), transient backoff
``base * 2^retries + floor(rng()*2)`` with ``rng = mulberry32(seed)`` drawn in
completion order (I3), poison/exhausted cracks go to the DLQ (I4), duplicate
active idempotency keys and a full hopper are rejected inbound (I5/I6). The
pump mirrors the turn-based ``src/game/controller.ts``: every answered prompt
advances the clock one beat; auto-beats run only while no prompt is open.
Inbound forklifts hold the dock for ``DOCK_WINDOW`` beats and land on their
own (duplicate enqueued / overflow counted) unless the player rejects them —
this producer has no admit action, so a trace ``gate`` entry can only be a
``reject`` (the closed ``admit`` arm of the decision shape serves producers
with an explicit admit action and is rejected fail-closed here).

Ground truth re-pinned to the canonical sim (AID-1939, QA order AID-1937/F1):
a perfect L1 play answers 10 dispatch prompts (10/10, ``t1..t10`` in canonical
order, ``max_concurrent_running 2``); a perfect L2 rejects both duplicate
forklifts (u10/u11) and dispatches 12; a perfect L3 classifies 7 retry + 4
DLQ; a perfect L4 routes both poisons and the exhausted crack to the DLQ,
rejects the duplicate w10, and classifies 3 retry + 5 DLQ. The perfect-play
traces are pinned bit-for-bit in ``test_task_queue_evaluator.py`` and were
cross-checked first-hand against real controller+emitter dumps (QA AID-1937
evidence: perfect waves played on the canonical controller @341154c6 and
replayed here — 4/4 PASS).

Observation contract (closed per level):

- ``L1..L4`` ``{"kind": "task-forge-L<n>", "decisions": [<decision>, ...]}``

where each decision is one of (closed key sets):

- ``{"type": "dispatch", "taskId": <task id the player predicted>}``
- ``{"type": "classify", "taskId": <held task id>, "route": "retry"|"dlq"}``
- ``{"type": "gate", "action": "reject"}`` (admit is not producible here)

``decisions`` must cover the whole wave exactly in prompt-answer order (no
missing prompt, no extra decision): the replay consumes them against the
no-pause canonical wave; a match played with pauses can diverge and is then
rejected fail-closed. The recomputed metrics must match the producer metrics
exactly, and the frozen pass rule (plan §11, ``levels.ts`` ``evaluateWave``)
decides the verdict.
"""

from __future__ import annotations

import math
from typing import Any

from .evaluator_primitives import closed_dict, metrics_match, mulberry32

METRIC_KIND = "voxeldojo-task-queue"

# Cadence constants mirrored from game-04-task-queue/src/sim/levels.ts and
# src/sim/queue.ts (canonical contract, PR #424).
WORK_BEATS = 3
DOCK_WINDOW = 2
BACKOFF_BASE = 2
SETTLE_CAP = 10_000


def _a(
    task_id: str,
    priority: int,
    arrives_at: int,
    delay_beats: int,
    kind: str,
    idempotency_key: str | None = None,
    retries: int = 0,
    max_retries: int = 2,
) -> dict[str, Any]:
    """Mirror of the levels.ts ``a()`` arrival constructor."""
    arrival: dict[str, Any] = {
        "id": task_id,
        "idempotencyKey": idempotency_key or f"sigil-{task_id}",
        "priority": priority,
        "arrivesAt": arrives_at,
        "delayBeats": delay_beats,
        "kind": kind,
        "retries": retries,
        "maxRetries": max_retries,
    }
    return arrival


# Mirrors game-04-task-queue/src/sim/levels.ts (LEVELS table @main): ids,
# beats clock, seeds, worker counts, and capacities are data-only — the wave
# is the script, not RNG (the only stochastic element is backoff jitter).
LEVELS: dict[str, dict[str, Any]] = {
    "L1": {
        "seed": 4104,
        "worker_count": 2,
        "capacity": 6,
        "arrivals": [
            _a("t1", 1, 0, 0, "clear"),
            _a("t2", 3, 1, 0, "clear"),
            _a("t3", 2, 2, 0, "clear"),
            _a("t4", 3, 4, 0, "clear"),
            _a("t5", 1, 5, 0, "clear"),
            _a("t6", 4, 6, 3, "clear"),  # scheduled: countdown ring must drain
            _a("t7", 2, 8, 0, "clear"),
            _a("t8", 3, 9, 0, "clear"),
            _a("t9", 5, 11, 2, "clear"),  # high priority, scheduled
            _a("t10", 1, 13, 0, "clear"),
        ],
    },
    "L2": {
        "seed": 4204,
        "worker_count": 2,
        "capacity": 4,
        "arrivals": [
            _a("u1", 2, 0, 0, "clear"),
            _a("u2", 2, 1, 0, "clear"),
            _a("u3", 1, 2, 0, "clear"),
            _a("u4", 3, 3, 0, "clear"),
            _a("u5", 2, 4, 0, "clear"),
            _a("u6", 1, 5, 6, "clear"),  # scheduled: parked in the hopper
            _a("u7", 2, 6, 0, "clear"),
            _a("u8", 3, 7, 6, "clear"),  # scheduled: parked in the hopper
            _a("u9", 1, 8, 0, "clear"),
            _a("u10", 2, 10, 0, "clear", "sigil-u6"),  # duplicate of parked u6
            _a("u11", 3, 12, 0, "clear", "sigil-u8"),  # duplicate of parked u8
            _a("u12", 1, 14, 0, "clear"),
            _a("u13", 2, 15, 0, "clear"),
            _a("u14", 1, 16, 0, "clear"),
        ],
    },
    "L3": {
        "seed": 4304,
        "worker_count": 2,
        "capacity": 6,
        "arrivals": [
            _a("v1", 2, 0, 0, "clear"),
            _a("v2", 1, 1, 0, "transient"),
            _a("v3", 3, 3, 0, "clear"),
            _a("v4", 2, 4, 0, "transient"),
            _a("v5", 1, 6, 0, "clear"),
            _a("v6", 3, 8, 0, "transient", retries=1),  # at the budget edge
            _a("v7", 2, 10, 0, "clear"),
            _a("v8", 1, 12, 0, "transient"),
            _a("v9", 3, 14, 0, "clear"),
        ],
    },
    "L4": {
        "seed": 4404,
        "worker_count": 3,
        "capacity": 5,
        "arrivals": [
            _a("w1", 2, 0, 0, "clear"),
            _a("w2", 3, 1, 0, "poison"),
            _a("w3", 1, 2, 0, "clear"),
            _a("w4", 2, 3, 0, "transient", retries=2),  # exhausted -> DLQ
            _a("w5", 3, 4, 0, "clear"),
            _a("w6", 1, 5, 0, "clear"),
            _a("w7", 2, 6, 0, "poison"),
            _a("w8", 3, 8, 2, "clear"),  # scheduled high priority
            _a("w9", 1, 9, 0, "transient"),
            _a("w10", 2, 10, 0, "clear", "sigil-w9"),  # duplicate of in-flight w9
            _a("w11", 3, 12, 0, "clear"),
            _a("w12", 2, 14, 0, "transient", retries=1),
        ],
    },
}

_DISPATCH_KEYS = {"type", "taskId"}
_CLASSIFY_KEYS = {"type", "taskId", "route"}
_GATE_KEYS = {"type", "action"}


def _to_task(arrival: dict[str, Any], now: int) -> dict[str, Any]:
    """Mirror of levels.ts ``toTask``: the hopper task a landing becomes."""
    return {
        "id": arrival["id"],
        "idempotencyKey": arrival["idempotencyKey"],
        "priority": arrival["priority"],
        "enqueuedAt": now,
        "scheduledFor": now + arrival["delayBeats"],
        "kind": arrival["kind"],
        "retries": arrival["retries"],
        "maxRetries": arrival["maxRetries"],
    }


def _is_eligible(task: dict[str, Any], now: int) -> bool:
    """queue.ts ``isEligible``: scheduled_for gates grabbing (RF-008)."""
    return now >= task["scheduledFor"]


def _beats(task: dict[str, Any], best: dict[str, Any]) -> bool:
    """queue.ts tie-breaks: priority desc, then FIFO arrival, then id."""
    if task["priority"] != best["priority"]:
        return task["priority"] > best["priority"]
    if task["enqueuedAt"] != best["enqueuedAt"]:
        return task["enqueuedAt"] < best["enqueuedAt"]
    return task["id"] < best["id"]


def _pick_next(queue: list[dict[str, Any]], now: int) -> dict[str, Any] | None:
    """queue.ts ``pickNext``: priority desc, FIFO, id — a total order."""
    best: dict[str, Any] | None = None
    for task in queue:
        if not _is_eligible(task, now):
            continue
        if best is None or _beats(task, best):
            best = task
    return best


class _Replay:
    """Mirrors GameController: turn-based pump, auto-beats, metric counters."""

    def __init__(self, cfg: dict[str, Any]) -> None:
        self.cfg = cfg
        self.rng = mulberry32(cfg["seed"])
        self.now = 0
        self.arrivals = cfg["arrivals"]
        self.capacity = cfg["capacity"]
        self.slots: list[str | None] = [None] * cfg["worker_count"]
        self.queue: list[dict[str, Any]] = []
        self.running: list[dict[str, Any]] = []  # {task, completesAt}
        self.finished: list[dict[str, Any]] = []  # {task, correctRoute, retryAt}
        self.inbound: dict[str, Any] | None = None
        self.dock_deadline = 0
        self.script_index = 0
        self.dispatch_predictions = 0
        self.dispatch_correct = 0
        self.retry_classifications = 0
        self.retry_correct = 0
        self.dlq_classifications = 0
        self.dlq_correct = 0
        self.poison_requeued = 0
        self.backpressure_violations = 0
        self.duplicates_enqueued = 0
        self.queue_overflowed = False
        self.max_concurrent_running = 0

    # ── truth hooks (mirror controller.ts) ─────────────────────────────────

    def _running_count(self) -> int:
        return sum(1 for slot in self.slots if slot is not None)

    def _idle_slot(self) -> int | None:
        for index, slot in enumerate(self.slots):
            if slot is None:
                return index
        return None

    def _active_keys(self) -> set[str]:
        keys = {task["idempotencyKey"] for task in self.queue}
        keys.update(entry["task"]["idempotencyKey"] for entry in self.running)
        keys.update(entry["task"]["idempotencyKey"] for entry in self.finished)
        return keys

    def _hopper_full(self) -> bool:
        # queue.ts backpressure(): only "full" is behaviorally load-bearing
        # (reject/landing); "limited" is HUD gauge only.
        return len(self.queue) >= self.capacity

    def _requires_reject(self) -> bool:
        if self.inbound is None:
            return False
        landing = _to_task(self.inbound, self.now)
        if landing["idempotencyKey"] in self._active_keys():
            return True
        return self._hopper_full()

    def _dispatch_window_open(self) -> bool:
        return self._idle_slot() is not None and _pick_next(self.queue, self.now) is not None

    def _decision_available(self) -> bool:
        return (
            bool(self.finished)
            or self._dispatch_window_open()
            or (self.inbound is not None and self._requires_reject())
        )

    def _wave_ended(self) -> bool:
        return (
            self.script_index >= len(self.arrivals)
            and self.inbound is None
            and not self.queue
            and not self.running
            and not self.finished
        )

    # ── sim engine (mirror controller.ts tick/settle/processAutoEvents) ────

    def _fail(self, task: dict[str, Any]) -> tuple[str, int]:
        """queue.ts ``fail``: route + backoff beat for a finished crack."""
        if task["kind"] == "poison":
            return "dlq", self.now
        retries = task["retries"] + 1
        if retries > task["maxRetries"]:
            return "dlq", self.now
        jitter = math.floor(self.rng() * 2)  # 0|1 beat, drawn in completion order
        return "retry", self.now + BACKOFF_BASE * 2 ** task["retries"] + jitter

    def _process_completions(self) -> None:
        """Arms release in running order; clear tasks succeed silently, cracks
        queue a classify prompt with the fail plan."""
        survivors: list[dict[str, Any]] = []
        for entry in self.running:
            if entry["completesAt"] > self.now:
                survivors.append(entry)
                continue
            task = entry["task"]
            self.slots = [None if slot == task["id"] else slot for slot in self.slots]
            if task["kind"] == "clear":
                continue  # succeeded — no prompt, no metric
            route, retry_at = self._fail(task)
            self.finished.append(
                {"task": task, "correctRoute": route, "retryAt": retry_at}
            )
        self.running = survivors

    def _land_inbound(self) -> None:
        """The inbound lands when its dock window closes (skipping R costs)."""
        if self.inbound is None or self.now < self.dock_deadline:
            return
        landing = _to_task(self.inbound, self.now)
        if landing["idempotencyKey"] in self._active_keys():
            self.duplicates_enqueued += 1
        elif self._hopper_full():
            self.queue_overflowed = True
            self.backpressure_violations += 1
        else:
            self.queue.append(landing)
        self.inbound = None
        self.script_index += 1

    def _present_next_arrival(self) -> None:
        if self.inbound is not None or self.script_index >= len(self.arrivals):
            return
        nxt = self.arrivals[self.script_index]
        if self.now >= nxt["arrivesAt"]:
            self.inbound = nxt
            self.dock_deadline = self.now + DOCK_WINDOW

    def _process_auto_events(self) -> None:
        self._process_completions()
        self._land_inbound()
        self._present_next_arrival()

    def _tick(self) -> None:
        self.now += 1
        self._process_auto_events()

    def run(self, decisions: list[dict[str, Any]]) -> bool:
        """Replay the wave; True iff the trace covers it exactly."""
        next_decision = 0
        for _ in range(SETTLE_CAP):
            if self._wave_ended():
                return next_decision == len(decisions)
            if self._decision_available():
                if next_decision >= len(decisions) or not self._apply(
                    decisions[next_decision]
                ):
                    return False  # truncated / off-script decision
                next_decision += 1
            else:
                self.now += 1
                self._process_auto_events()
        return False  # settle cap (mirrors the TS SETTLE_CAP guard)

    # ── decision application (mirror predictDispatch/classify/rejectInbound) ──

    def _apply(self, decision: dict[str, Any]) -> bool:
        if decision["type"] == "dispatch":
            return self._apply_dispatch(decision)
        if decision["type"] == "classify":
            return self._apply_classify(decision)
        return self._apply_gate(decision)

    def _apply_dispatch(self, decision: dict[str, Any]) -> bool:
        truth = _pick_next(self.queue, self.now)
        slot = self._idle_slot()
        if truth is None or slot is None:
            return False
        self.dispatch_predictions += 1
        if decision["taskId"] == truth["id"]:
            self.dispatch_correct += 1
        self.slots[slot] = truth["id"]
        self.queue.remove(truth)
        self.running.append({"task": truth, "completesAt": self.now + WORK_BEATS})
        running = self._running_count()
        if running > self.max_concurrent_running:
            self.max_concurrent_running = running
        self._tick()
        return True

    def _apply_classify(self, decision: dict[str, Any]) -> bool:
        if not self.finished:
            return False
        head = self.finished[0]
        task = head["task"]
        if decision["taskId"] != task["id"]:
            return False
        if decision["route"] == "retry":
            self.retry_classifications += 1
            if head["correctRoute"] == "retry":
                self.retry_correct += 1
                self.queue.append(
                    {
                        **task,
                        "retries": task["retries"] + 1,
                        "scheduledFor": head["retryAt"],
                    }
                )
            else:
                # canonical pathology: poison/exhausted requeued past budget
                self.poison_requeued += 1
                self.queue.append(
                    {
                        **task,
                        "retries": task["maxRetries"] + 1,
                        "scheduledFor": head["retryAt"],
                    }
                )
        else:
            self.dlq_classifications += 1
            if head["correctRoute"] == "dlq":
                self.dlq_correct += 1
        self.finished.pop(0)
        self._tick()
        return True

    def _apply_gate(self, decision: dict[str, Any]) -> bool:
        if self.inbound is None:
            return False
        if decision["action"] != "reject":
            return False  # this producer has no admit action (fail-closed)
        self.inbound = None
        self.script_index += 1
        self._tick()
        return True

    def metrics(self) -> dict[str, Any]:
        return {
            "kind": METRIC_KIND,
            "dispatch_predictions": self.dispatch_predictions,
            "dispatch_correct": self.dispatch_correct,
            "retry_classifications": self.retry_classifications,
            "retry_correct": self.retry_correct,
            "dlq_classifications": self.dlq_classifications,
            "dlq_correct": self.dlq_correct,
            "poison_requeued": self.poison_requeued,
            "backpressure_violations": self.backpressure_violations,
            "idempotency_duplicates_enqueued": self.duplicates_enqueued,
            "queue_overflowed": self.queue_overflowed,
            "max_concurrent_running": self.max_concurrent_running,
            "worker_count": len(self.slots),
        }


# ── observation contract validation ─────────────────────────────────────────


def _valid_dispatch(decision: dict[str, Any]) -> bool:
    return closed_dict(decision, _DISPATCH_KEYS) and isinstance(decision["taskId"], str)


def _valid_classify(decision: dict[str, Any]) -> bool:
    return (
        closed_dict(decision, _CLASSIFY_KEYS)
        and isinstance(decision["taskId"], str)
        and decision["route"] in ("retry", "dlq")
    )


def _valid_gate(decision: dict[str, Any]) -> bool:
    return closed_dict(decision, _GATE_KEYS) and decision["action"] in ("reject", "admit")


_DECISION_VALIDATORS = {
    "dispatch": _valid_dispatch,
    "classify": _valid_classify,
    "gate": _valid_gate,
}


def _valid_decisions(decisions: Any) -> bool:
    if not isinstance(decisions, list) or not decisions:
        return False
    for decision in decisions:
        validator = _DECISION_VALIDATORS.get(decision["type"]) if isinstance(decision, dict) else None
        if validator is None or not validator(decision):
            return False
    return True


def _accuracy_ok(m: dict[str, Any]) -> bool:
    predictions = m["dispatch_predictions"]
    accuracy = m["dispatch_correct"] / predictions if predictions else 0.0
    return accuracy >= 0.8


def _classifications_ok(m: dict[str, Any]) -> bool:
    return (
        m["retry_correct"] == m["retry_classifications"]
        and m["dlq_correct"] == m["dlq_classifications"]
        and m["poison_requeued"] == 0
    )


def _intake_ok(m: dict[str, Any]) -> bool:
    return (
        m["backpressure_violations"] == 0
        and m["idempotency_duplicates_enqueued"] == 0
        and m["queue_overflowed"] is False
        and m["max_concurrent_running"] <= m["worker_count"]
    )


def _pass_rule(m: dict[str, Any]) -> bool:
    """Frozen pass rule (plan §11 / levels.ts evaluateWave)."""
    return _accuracy_ok(m) and _classifications_ok(m) and _intake_ok(m)


def evaluate_task_queue(
    level: str, observations: Any, producer_metrics: Any, errors: list[str]
) -> bool:
    if level not in LEVELS:
        errors.append("unsupported TASK FORGE level")
        return False
    if not isinstance(observations, dict):
        errors.append("observations must be a bounded object")
        return False
    decisions = observations.get("decisions")
    if not closed_dict(observations, {"kind", "decisions"}) or observations[
        "kind"
    ] != f"task-forge-{level}" or not _valid_decisions(decisions):
        errors.append(f"observations do not match the closed {level} scenario trace")
        return False

    replay = _Replay(LEVELS[level])
    if not replay.run(decisions):
        errors.append(f"observations do not match the closed {level} scenario trace")
        return False

    expected = replay.metrics()
    if not metrics_match(producer_metrics, expected):
        errors.append("producer metrics disagree with independently recomputed observations")
        return False
    return _pass_rule(expected)
