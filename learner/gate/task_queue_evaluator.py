"""Independent evaluator for the TASK FORGE teaching game (U4 task queue).

The verifier replays the player's bounded decision trace against the
deterministic worker-pool wave seeded by the level config — it never trusts
the producer's metrics or ``pass`` claim.

Sim model (mirror of ``engines/voxelDojo/game-04-task-queue/src/sim``): the
hop per level is the data-only arrival script plus capacity/workers/
serviceTime/backoffBase/maxRetries (``levels.ts``). ``queue.ts`` enforces the
invariants the replay must reproduce: priority-desc/FIFO/id tie-break with a
``scheduled_for`` eligibility gate (I2), transient backoff
``base * 2^retries + jitter`` with jitter drawn from mulberry32 seeded
``seed ^ 0x5eed04`` in failure order (I3), poison/exhausted cracks go to the
DLQ (I4), active duplicate idempotency keys gate the forklift (I5), and
depth >= capacity is the "full" backpressure gate (I6). The discrete-event
pump mirrors ``controller.ts``: arrivals (gate interrupt) -> oldest-start
completion (classify prompt for poison/cracked, else succeed) -> dispatch
prompt -> jump to the next event instant. Arrival ids are
``t-<script index>-<slug>``; a requeued poison keeps its arm busy (the
canonical pathology), which is why complete waves never requeue poison.

Ground truth (pinned by ``test_task_queue_evaluator.py`` and cross-checked
against the TS controller): a perfect L1 play answers 12 dispatch prompts
(12/12, max_concurrent_running 3); perfect L3 classifies 5 retry + 3 DLQ;
perfect L4 rejects both gate flavors (no overflow, no duplicate enqueued).

Observation contract (closed per level):

- ``L1..L4`` ``{"kind": "task-forge-L<n>", "decisions": [<decision>, ...]}``

where each decision is one of (closed key sets):

- ``{"type": "dispatch", "taskId": <task id the player predicted>}``
- ``{"type": "classify", "taskId": <held task id>, "route": "retry"|"dlq"}``
- ``{"type": "gate", "action": "reject"|"admit"}``

``decisions`` must cover the whole wave exactly (no missing prompt, no extra
decision): the replay consumes them in order as the pump emits prompts. The
recomputed metrics must match the producer metrics exactly, and the frozen
pass rule (plan §11, ``levels.ts`` evaluateQueueWave) decides the verdict.
"""

from __future__ import annotations

from typing import Any

from .evaluator_primitives import closed_dict, metrics_match, mulberry32

METRIC_KIND = "voxeldojo-task-queue"

# Mirrors game-04-task-queue/src/sim/levels.ts (LEVELS table). serviceTime is
# the logical hold per ingot; backoffBase feeds base * 2^retries + jitter.


def _arr(
    at: float,
    label: str,
    priority: int,
    kind: str,
    key: str,
    scheduled_for: float | None = None,
    failures_left: int | None = None,
) -> dict[str, Any]:
    arrival: dict[str, Any] = {
        "at": at,
        "label": label,
        "priority": priority,
        "kind": kind,
        "idempotencyKey": key,
    }
    if scheduled_for is not None:
        arrival["scheduledFor"] = scheduled_for
    if failures_left is not None:
        arrival["failuresLeft"] = failures_left
    return arrival


LEVELS: dict[str, dict[str, Any]] = {
    "L1": {
        "seed": 11,
        "capacity": 8,
        "worker_count": 3,
        "service_time": 2,
        "backoff_base": 1,
        "max_retries": 2,
        "arrivals": [
            _arr(0, "order #101", 1, "clear", "ik-101"),
            _arr(0.4, "order #102", 2, "clear", "ik-102"),
            _arr(0.8, "email #5", 2, "clear", "ik-105"),
            _arr(1.2, "render #42", 3, "clear", "ik-142"),
            _arr(1.6, "webhook #7", 1, "clear", "ik-107"),
            _arr(3, "digest", 2, "clear", "ik-201"),
            _arr(3.4, "thumb #200", 2, "clear", "ik-200"),
            _arr(3.8, "audit", 3, "clear", "ik-301"),
            _arr(4.2, "order #103", 1, "clear", "ik-103"),
            _arr(4.6, "fanout #9", 1, "clear", "ik-109"),
            _arr(6.5, "report", 3, "clear", "ik-302"),
            _arr(6.9, "order #104", 2, "clear", "ik-104"),
        ],
    },
    "L2": {
        "seed": 22,
        "capacity": 6,
        "worker_count": 2,
        "service_time": 2,
        "backoff_base": 1,
        "max_retries": 2,
        "arrivals": [
            _arr(0, "warmup", 1, "clear", "ik-401"),
            _arr(1.5, "hold #1", 3, "clear", "ik-402", scheduled_for=6),
            _arr(3, "quick #1", 1, "clear", "ik-403"),
            _arr(4.5, "hold #2", 3, "clear", "ik-404", scheduled_for=9),
            _arr(6, "quick #2", 2, "clear", "ik-405"),
            _arr(7.5, "hold #3", 2, "clear", "ik-406", scheduled_for=11),
            _arr(9, "quick #3", 1, "clear", "ik-407"),
            _arr(10.5, "bright", 3, "clear", "ik-408"),
            _arr(12, "quick #4", 2, "clear", "ik-409"),
            _arr(13.5, "closer", 1, "clear", "ik-410"),
        ],
    },
    "L3": {
        "seed": 33,
        "capacity": 8,
        "worker_count": 3,
        "service_time": 2,
        "backoff_base": 1,
        "max_retries": 2,
        "arrivals": [
            _arr(0, "order #201", 2, "clear", "ik-501"),
            _arr(1.5, "flake #1", 2, "cracked", "ik-502"),
            _arr(3, "webhook #8", 1, "clear", "ik-503"),
            _arr(4.5, "poison ocr", 3, "poison", "ik-504"),
            _arr(6, "digest", 2, "clear", "ik-505"),
            _arr(7.5, "brittle csv", 1, "cracked", "ik-506", failures_left=3),
            _arr(9, "flake #2", 3, "cracked", "ik-507"),
            _arr(10.5, "poison json", 2, "poison", "ik-508"),
            _arr(12, "render #43", 1, "clear", "ik-509"),
            _arr(13.5, "flake #3", 2, "cracked", "ik-510"),
            _arr(15, "audit", 3, "clear", "ik-511"),
            _arr(16.5, "order #202", 1, "clear", "ik-512"),
        ],
    },
    "L4": {
        "seed": 44,
        "capacity": 5,
        "worker_count": 3,
        "service_time": 2,
        "backoff_base": 1,
        "max_retries": 2,
        "arrivals": [
            _arr(0, "order #301", 2, "clear", "ik-601"),
            _arr(0.5, "order #302", 2, "clear", "ik-602"),
            _arr(1, "render #50", 3, "clear", "ik-603"),
            _arr(1.5, "hold #1", 1, "clear", "ik-604", scheduled_for=5.5),
            _arr(2, "hold #2", 1, "clear", "ik-605", scheduled_for=6),
            _arr(2.5, "digest", 1, "clear", "ik-606"),
            _arr(3.2, "webhook #10", 2, "clear", "ik-607"),
            _arr(3.4, "fanout #11", 1, "clear", "ik-608"),
            _arr(3.6, "flake #9", 1, "cracked", "ik-609"),
            _arr(3.7, "spike #1", 1, "clear", "ik-616"),
            _arr(3.8, "audit", 1, "clear", "ik-610"),
            _arr(3.9, "spike #2", 1, "clear", "ik-617"),
            _arr(3.95, "storm", 1, "clear", "ik-618"),
            _arr(4, "digest AGAIN", 2, "clear", "ik-606"),
            _arr(5, "poison csv", 2, "poison", "ik-611"),
            _arr(6.5, "flake #10", 3, "cracked", "ik-612"),
            _arr(8, "report #9", 2, "clear", "ik-613"),
            _arr(9.5, "brittle xml", 1, "cracked", "ik-614", failures_left=3),
            _arr(11, "closer", 2, "clear", "ik-615"),
        ],
    },
}

_DISPATCH_KEYS = {"type", "taskId"}
_CLASSIFY_KEYS = {"type", "taskId", "route"}
_GATE_KEYS = {"type", "action"}


def _slug(label: str) -> str:
    """Mirror of the TS id slug: ``label.replace(/\\W+/g, "-")`` (\\w = [A-Za-z0-9_])."""
    out: list[str] = []
    prev_dash = False
    for character in label:
        if character.isalnum() or character == "_":
            out.append(character)
            prev_dash = False
        elif not prev_dash:
            out.append("-")
            prev_dash = True
    return "".join(out)


def _make_task(arrival: dict[str, Any], task_id: str, max_retries: int) -> dict[str, Any]:
    kind = arrival["kind"]
    return {
        "id": task_id,
        "idempotencyKey": arrival["idempotencyKey"],
        "priority": arrival["priority"],
        "enqueuedAt": arrival["at"],
        "scheduledFor": arrival.get("scheduledFor", arrival["at"]),
        "kind": kind,
        "maxRetries": max_retries,
        "failuresLeft": arrival.get("failuresLeft", 1 if kind == "cracked" else 0),
        "status": "queued",
        "workerId": None,
        "startedAt": None,
        "retries": 0,
        "nextAttemptAt": None,
    }


def _queue_depth(tasks: list[dict[str, Any]]) -> int:
    return sum(1 for t in tasks if t["status"] in ("queued", "retry_wait"))


def _has_active_key(tasks: list[dict[str, Any]], key: str) -> bool:
    return any(
        t["idempotencyKey"] == key and t["status"] in ("queued", "running", "retry_wait")
        for t in tasks
    )


def _is_eligible(task: dict[str, Any], now: float) -> bool:
    if task["status"] == "queued":
        return task["scheduledFor"] <= now
    if task["status"] == "retry_wait":
        return task["nextAttemptAt"] is not None and task["nextAttemptAt"] <= now
    return False


def _beats(task: dict[str, Any], best: dict[str, Any]) -> bool:
    """I2 tie-break: priority desc, then oldest arrival, then lowest id."""
    if task["priority"] != best["priority"]:
        return task["priority"] > best["priority"]
    if task["enqueuedAt"] != best["enqueuedAt"]:
        return task["enqueuedAt"] < best["enqueuedAt"]
    return task["id"] < best["id"]


def _pick_next(tasks: list[dict[str, Any]], now: float) -> dict[str, Any] | None:
    best: dict[str, Any] | None = None
    for task in tasks:
        if not _is_eligible(task, now):
            continue
        if best is None or _beats(task, best):
            best = task
    return best


def _required_route(task: dict[str, Any]) -> str:
    if task["kind"] == "poison" or task["retries"] >= task["maxRetries"]:
        return "dlq"
    return "retry"


class _Replay:
    """Mirrors GameController: pump + decision application + metric counters."""

    def __init__(self, cfg: dict[str, Any]) -> None:
        self.cfg = cfg
        self.rng = mulberry32(cfg["seed"] ^ 0x5EED04)
        self.now = 0.0
        self.capacity = cfg["capacity"]
        self.workers = [f"arm-{i}" for i in range(cfg["worker_count"])]
        self.busy_with: dict[str, str | None] = {worker: None for worker in self.workers}
        self.tasks: list[dict[str, Any]] = []
        self.max_concurrent_running = 0
        self.queue_overflowed = False
        self.arrival_index = 0
        self.dispatch_predictions = 0
        self.dispatch_correct = 0
        self.retry_classifications = 0
        self.retry_correct = 0
        self.dlq_classifications = 0
        self.dlq_correct = 0
        self.poison_requeued = 0
        self.backpressure_violations = 0
        self.duplicates_enqueued = 0
        self.pending: dict[str, Any] | None = None

    # ── queue helpers (mirror queue.ts) ────────────────────────────────────

    def _jitter(self) -> float:
        return self.rng() * self.cfg["backoff_base"]

    def _running_count(self) -> int:
        return sum(1 for held in self.busy_with.values() if held is not None)

    def _idle_worker(self) -> str | None:
        for worker, held in self.busy_with.items():
            if held is None:
                return worker
        return None

    def _free_worker(self, task_id: str) -> None:
        for worker, held in self.busy_with.items():
            if held == task_id:
                self.busy_with[worker] = None

    def _all_terminal(self) -> bool:
        seen = 0
        for task in self.tasks:
            if task["status"] not in ("succeeded", "dead"):
                return False
            seen += 1
        return seen > 0

    def _enqueue(self, arrival: dict[str, Any]) -> None:
        task_id = f"t-{self.arrival_index}-{_slug(arrival['label'])}"
        self.tasks.append(_make_task(arrival, task_id, self.cfg["max_retries"]))

    # ── event-time collectors (mirror controller.ts nextEventTime) ─────────

    def _finish_time(self, task: dict[str, Any]) -> float | None:
        if task["status"] != "running" or task["startedAt"] is None:
            return None
        finish = task["startedAt"] + self.cfg["service_time"]
        return finish if finish > self.now else None

    def _retry_time(self, task: dict[str, Any]) -> float | None:
        if task["status"] != "retry_wait" or task["nextAttemptAt"] is None:
            return None
        return task["nextAttemptAt"] if task["nextAttemptAt"] > self.now else None

    def _scheduled_time(self, task: dict[str, Any]) -> float | None:
        if task["status"] != "queued":
            return None
        return task["scheduledFor"] if task["scheduledFor"] > self.now else None

    def _task_times(self, task: dict[str, Any]) -> list[float]:
        times = []
        for collector in (self._finish_time, self._retry_time, self._scheduled_time):
            time = collector(task)
            if time is not None:
                times.append(time)
        return times

    def _next_event_time(self) -> float | None:
        times: list[float] = []
        arrivals = self.cfg["arrivals"]
        if self.arrival_index < len(arrivals) and arrivals[self.arrival_index]["at"] > self.now:
            times.append(arrivals[self.arrival_index]["at"])
        for task in self.tasks:
            times.extend(self._task_times(task))
        return min(times) if times else None

    # ── pump steps (mirror controller.ts pump) ────────────────────────────

    def _wave_resolved(self) -> bool:
        arrivals = self.cfg["arrivals"]
        if self.arrival_index >= len(arrivals):
            return not self.tasks or self._all_terminal()
        return False

    def _promote_ready(self) -> None:
        for task in self.tasks:
            if (
                task["status"] == "retry_wait"
                and task["nextAttemptAt"] is not None
                and task["nextAttemptAt"] <= self.now
            ):
                task["status"] = "queued"

    def _admit_due_arrival(self) -> bool:
        """Arrivals step: enqueue, gate, or nothing due. True = re-loop."""
        arrivals = self.cfg["arrivals"]
        nxt = arrivals[self.arrival_index] if self.arrival_index < len(arrivals) else None
        if nxt is None or nxt["at"] > self.now:
            return False
        if _has_active_key(self.tasks, nxt["idempotencyKey"]):
            self.pending = {"kind": "gate", "reason": "duplicate", "arrival": nxt}
        elif _queue_depth(self.tasks) >= self.capacity:
            self.pending = {"kind": "gate", "reason": "full", "arrival": nxt}
        else:
            self._enqueue(nxt)
            self.arrival_index += 1
            return True
        return False

    def _first_completion(self) -> dict[str, Any] | None:
        done = sorted(
            (
                task
                for task in self.tasks
                if task["status"] == "running"
                and task["startedAt"] is not None
                and task["startedAt"] + self.cfg["service_time"] <= self.now
            ),
            key=lambda task: (task["startedAt"], task["id"]),
        )
        return done[0] if done else None

    def _completion_step(self) -> bool:
        """Completions step. True = re-loop (auto-succeeded one task)."""
        first = self._first_completion()
        if first is None:
            return False
        if first["kind"] == "poison" or first["failuresLeft"] > 0:
            self.pending = {"kind": "classify", "task": first}
            return False
        first["status"] = "succeeded"
        self._free_worker(first["id"])
        return True

    def _prompt_or_jump(self) -> bool:
        """Dispatch prompt when an arm is free, else jump. True = re-loop."""
        if self._idle_worker() is not None and _pick_next(self.tasks, self.now):
            self.pending = {"kind": "dispatch"}
            return False
        jump = self._next_event_time()
        if jump is None:
            return False  # no prompt and nowhere to jump (stalled wave)
        self.now = jump
        return True

    def _advance(self) -> bool:
        """One decision-free pump step. True = re-loop; False = waiting/stalled."""
        self._promote_ready()
        if self._admit_due_arrival():
            return True
        if self.pending is None and self._completion_step():
            return True
        if self.pending is None and self._prompt_or_jump():
            return True
        return False

    def _consume(self, decisions: list[dict[str, Any]], index: int) -> int | None:
        """Apply decisions[index]; returns the next index, or None on mismatch."""
        if index >= len(decisions) or not self._apply(decisions[index]):
            return None
        return index + 1

    def run(self, decisions: list[dict[str, Any]]) -> bool:
        """Replay the wave; True iff the trace covers it exactly."""
        next_decision = 0
        for _ in range(10_000):
            if self._wave_resolved():
                return next_decision == len(decisions)
            if not self._advance() and self.pending is None:
                return False  # stalled wave (e.g. requeued poison jam)
            if self.pending is None:
                continue
            consumed = self._consume(decisions, next_decision)
            if consumed is None:
                return False  # trace does not cover the wave (or breaks it)
            next_decision = consumed
        return False  # pump guard (mirrors the TS guard)

    # ── decision application (mirror predictDispatch/classify*/gate) ───────

    def _apply(self, decision: dict[str, Any]) -> bool:
        pending = self.pending
        if decision["type"] == "dispatch":
            return self._apply_dispatch(decision, pending)
        if decision["type"] == "classify":
            return self._apply_classify(decision, pending)
        return self._apply_gate(decision, pending)

    def _apply_dispatch(self, decision: dict[str, Any], pending: dict[str, Any] | None) -> bool:
        if pending is None or pending["kind"] != "dispatch":
            return False
        truth = _pick_next(self.tasks, self.now)
        worker = self._idle_worker()
        if truth is None or worker is None:
            return False
        self.dispatch_predictions += 1
        if decision["taskId"] == truth["id"]:
            self.dispatch_correct += 1
        truth["status"] = "running"
        truth["workerId"] = worker
        truth["startedAt"] = self.now
        self.busy_with[worker] = truth["id"]
        running = self._running_count()
        if running > self.max_concurrent_running:
            self.max_concurrent_running = running
        self.pending = None
        return True

    def _cool_task(self, task: dict[str, Any]) -> None:
        """I3: rack the ingot for base * 2^retries + jitter (draw order pinned)."""
        task["status"] = "retry_wait"
        task["nextAttemptAt"] = (
            self.now + self.cfg["backoff_base"] * 2 ** task["retries"] + self._jitter()
        )

    def _apply_retry_route(self, task: dict[str, Any]) -> None:
        self.retry_classifications += 1
        if _required_route(task) == "retry":
            self.retry_correct += 1
            task["retries"] += 1
            task["failuresLeft"] -= 1
            self._cool_task(task)
            self._free_worker(task["id"])
        elif task["kind"] == "poison":
            # canonical pathology: poison parked on the rack keeps its arm
            self.poison_requeued += 1
            self._cool_task(task)
        else:
            # exhausted crack: over the limit goes to scrap
            task["status"] = "dead"
            task["nextAttemptAt"] = None
            self._free_worker(task["id"])

    def _apply_classify(self, decision: dict[str, Any], pending: dict[str, Any] | None) -> bool:
        if pending is None or pending["kind"] != "classify":
            return False
        task = pending["task"]
        if decision["taskId"] != task["id"]:
            return False
        if decision["route"] == "retry":
            self._apply_retry_route(task)
        else:
            self.dlq_classifications += 1
            if _required_route(task) == "dlq":
                self.dlq_correct += 1
            task["status"] = "dead"
            task["nextAttemptAt"] = None
            self._free_worker(task["id"])
        self.pending = None
        return True

    def _apply_gate(self, decision: dict[str, Any], pending: dict[str, Any] | None) -> bool:
        if pending is None or pending["kind"] != "gate":
            return False
        if decision["action"] == "admit":
            if pending["reason"] == "full":
                self.backpressure_violations += 1
                self.queue_overflowed = True
            else:
                self.duplicates_enqueued += 1
            self._enqueue(pending["arrival"])
        self.arrival_index += 1
        self.pending = None
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
            "worker_count": len(self.workers),
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
    """Frozen pass rule (plan §11 / levels.ts evaluateQueueWave)."""
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
