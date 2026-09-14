"""Independent evaluator for the BREAKER GRID teaching game (U13 circuit breaker).

The verifier replays the player's bounded trace against the deterministic
breaker + bulkhead state machine seeded by the level config — it never trusts
the producer's metrics or ``pass`` claim.

Breaker model (mirror of
``engines/voxelDojo/game-13-breaker-grid/src/sim/breaker.ts``): CLOSED counts
consecutive downstream failures and trips OPEN at the threshold; OPEN
short-circuits requests until ``now - openedAt >= cooldownMs`` flips it
HALF_OPEN; HALF_OPEN admits ``halfOpenProbes`` probe(s) — success closes the
breaker, a failed probe re-opens it. A bulkhead caps concurrent in-flight
calls per district; overflow is rejected without a downstream call, and
``sweepCompletions`` frees slow-call slots only as the injected clock passes
their completion times.

Level table (mirror of ``src/sim/levels.ts``): L1/L2 seed 11/22 over
payments+search (threshold 3, cooldown 1000, cap 8); L3 seed 33 over
payments+search+shipping (threshold 5, cap 2); L4 seed 44 over
payments+search+shipping+auth (threshold 3, cooldown 2000, cap 8). The L4
cascade wave hammers the failing district with ``threshold + 2`` failures
then 3 surplus successes, feeds every other district ``3 + floor(rng()*3)``
successes drawn from mulberry32(seed) in district order, and the player
predicts the set of districts that keep serving.

Ground truth (pinned by ``test_breaker_grid_evaluator.py`` and cross-checked
against the TS sim): L1 3 failures on payments trip it OPEN; L2 a successful
half-open probe closes the breaker (a failing probe re-opens it); L3 a burst
of 5 slow calls against cap 2 rejects exactly 3; L4 killing ``shipping``
leaves payments+search+auth serving (14 served, 5 short-circuited).

Observation contract (closed per level):

- L1 ``{"kind": "breaker-grid-L1", "failingDistrict": <id>, "failures": <int>, "predictedState": <"closed"|"open"|"half_open">, "predictedTrippedId": <id|null>}``
- L2 ``{"kind": "breaker-grid-L2", "district": <id>, "probeOutcome": <"success"|"failure">, "predictedFinal": <state>}``
- L3 ``{"kind": "breaker-grid-L3", "district": <id>, "requests": <int>, "predictedRejected": <int>}``
- L4 ``{"kind": "breaker-grid-L4", "failingDistrict": <id>, "predictedStillServing": [<id>, ...]}``

Producer metrics must match the recomputed metrics exactly.
"""

from __future__ import annotations

from typing import Any

from .evaluator_primitives import closed_dict, metrics_match, mulberry32

STATES = frozenset({"closed", "open", "half_open"})
METRIC_KIND = "voxeldoj-breaker-grid"
MAX_INJECTED = 64

# Mirrors game-13-breaker-grid/src/sim/levels.ts (LEVELS table).
LEVELS: dict[str, dict[str, Any]] = {
    "L1": {
        "seed": 11,
        "districts": ("payments", "search"),
        "threshold": 3,
        "cooldown": 1000,
        "probes": 1,
        "cap": 8,
    },
    "L2": {
        "seed": 22,
        "districts": ("payments", "search"),
        "threshold": 3,
        "cooldown": 1000,
        "probes": 1,
        "cap": 8,
    },
    "L3": {
        "seed": 33,
        "districts": ("payments", "search", "shipping"),
        "threshold": 5,
        "cooldown": 1000,
        "probes": 1,
        "cap": 2,
    },
    "L4": {
        "seed": 44,
        "districts": ("payments", "search", "shipping", "auth"),
        "threshold": 3,
        "cooldown": 2000,
        "probes": 1,
        "cap": 8,
    },
}


class _Breaker:
    __slots__ = ("district_id", "state", "consecutive_failures", "failure_threshold",
                 "cooldown_ms", "half_open_probes", "opened_at", "half_open_dispatched")

    def __init__(self, district_id: str, cfg: dict[str, Any]) -> None:
        self.district_id = district_id
        self.state = "closed"
        self.consecutive_failures = 0
        self.failure_threshold = cfg["threshold"]
        self.cooldown_ms = cfg["cooldown"]
        self.half_open_probes = cfg["probes"]
        self.opened_at: int | None = None
        self.half_open_dispatched = 0

    def step(self, event: str, now: int) -> None:
        """Mirrors stepBreaker: one pure transition (mutating this mirror)."""
        if event == "tick":
            if self.state == "open" and self.opened_at is not None \
                    and now - self.opened_at >= self.cooldown_ms:
                self.state = "half_open"
                self.half_open_dispatched = 0
            return
        if event == "failure":
            if self.state == "half_open":
                self.state = "open"
                self.opened_at = now
                self.consecutive_failures += 1
                self.half_open_dispatched = 0
            elif self.state == "closed":
                self.consecutive_failures += 1
                if self.consecutive_failures >= self.failure_threshold:
                    self.state = "open"
                    self.opened_at = now
                    self.half_open_dispatched = 0
            return
        # success
        if self.state == "half_open":
            self.state = "closed"
            self.consecutive_failures = 0
            self.half_open_dispatched = 0
        elif self.state == "closed":
            self.consecutive_failures = 0


class _District:
    __slots__ = ("district_id", "breaker", "in_flight", "cap", "completes_at")

    def __init__(self, district_id: str, cfg: dict[str, Any]) -> None:
        self.district_id = district_id
        self.breaker = _Breaker(district_id, cfg)
        self.in_flight = 0
        self.cap = cfg["cap"]
        self.completes_at: list[int] = []

    def sweep(self, now: int) -> None:
        """Mirrors sweepCompletions: free slots whose completion time passed."""
        remaining = [t for t in self.completes_at if t > now]
        self.completes_at = remaining
        self.in_flight = len(remaining)

    def serve(self, downstream: str, now: int, duration_ms: int = 0) -> str:
        """Mirrors serveRequest: bulkhead, then breaker routing; returns outcome."""
        if self.in_flight >= self.cap:
            return "bulkheadRejected"
        self.in_flight += 1
        self.breaker.step("tick", now)
        if self.breaker.state == "closed":
            passed, short_circuited, is_probe = True, False, False
        elif self.breaker.state == "open":
            passed, short_circuited, is_probe = False, True, False
        elif self.breaker.half_open_dispatched < self.breaker.half_open_probes:
            self.breaker.half_open_dispatched += 1
            passed, short_circuited, is_probe = True, False, True
        else:
            passed, short_circuited, is_probe = False, True, False
        if short_circuited:
            self.in_flight = max(0, self.in_flight - 1)
            return "shortCircuited"
        self.breaker.step(downstream, now)
        if duration_ms > 0:
            self.completes_at = self.completes_at + [now + duration_ms]
            self.in_flight = len(self.completes_at)
        return "failed" if downstream == "failure" else "served"


def _districts_for(cfg: dict[str, Any]) -> dict[str, _District]:
    return {district: _District(district, cfg) for district in cfg["districts"]}


def _simulate_wave(
    cfg: dict[str, Any], events: list[tuple[str, str, int, int]]
) -> dict[str, dict[str, Any]]:
    """Mirrors simulateWave: returns per-district stats (state/served/failed/
    short_circuited/bulkheadRejected) plus totals."""
    districts = _districts_for(cfg)
    stats: dict[str, dict[str, Any]] = {
        district: {
            "state": "closed", "served": 0, "failed": 0,
            "short_circuited": 0, "bulkhead_rejected": 0,
        }
        for district in cfg["districts"]
    }
    for district_id, downstream, at, duration in events:
        district = districts.get(district_id)
        if district is None:
            continue
        district.sweep(at)
        outcome = district.serve(downstream, at, duration)
        entry = stats[district_id]
        if outcome in {"served", "failed"}:
            entry["served"] += 1
            if outcome == "failed":
                entry["failed"] += 1
        else:
            key = {"shortCircuited": "short_circuited",
                   "bulkheadRejected": "bulkhead_rejected"}[outcome]
            entry[key] += 1
        entry["state"] = district.breaker.state
    for district_id, district in districts.items():
        stats[district_id]["state"] = district.breaker.state
    return stats


def _burst(
    district_id: str, count: int, downstream: str, base: int = 0, step: int = 10,
    duration: int = 0,
) -> list[tuple[str, str, int, int]]:
    return [
        (district_id, downstream, base + index * step, duration)
        for index in range(count)
    ]


def _reject(errors: list[str], level: str) -> bool:
    errors.append(f"observations do not match the closed {level} scenario trace")
    return False


def _is_count(value: Any, low: int, high: int) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and low <= value <= high


def evaluate_breaker_grid(
    level: str, observations: Any, producer_metrics: Any, errors: list[str]
) -> bool:
    if level not in LEVELS:
        errors.append("unsupported BREAKER GRID level")
        return False
    if not isinstance(observations, dict):
        errors.append("observations must be a bounded object")
        return False

    cfg = LEVELS[level]
    districts: frozenset[str] = frozenset(cfg["districts"])

    if level == "L1":
        if not closed_dict(
            observations, {"kind", "failingDistrict", "failures", "predictedState", "predictedTrippedId"}
        ):
            return _reject(errors, level)
        failing = observations["failingDistrict"]
        failures = observations["failures"]
        predicted_state = observations["predictedState"]
        predicted_tripped = observations["predictedTrippedId"]
        if (
            observations["kind"] != "breaker-grid-L1"
            or failing not in districts
            or not _is_count(failures, 0, MAX_INJECTED)
            or predicted_state not in STATES
            or not (predicted_tripped is None or predicted_tripped in districts)
        ):
            return _reject(errors, level)
        stats = _simulate_wave(cfg, _burst(failing, failures, "failure"))
        actual_state = stats[failing]["state"]
        tripped = next(
            (d for d in cfg["districts"] if stats[d]["state"] == "open"), None
        )
        state_ok = predicted_state == actual_state
        # The TS comparison: predicted null means "no district tripped".
        tripped_ok = (
            tripped is None if predicted_tripped is None else predicted_tripped == tripped
        )
        expected: dict[str, Any] = {
            "kind": METRIC_KIND,
            "failing_district": failing,
            "failures_injected": failures,
            "predicted_state": predicted_state,
            "actual_state": actual_state,
            "tripped_district_ok": tripped_ok,
            "threshold": cfg["threshold"],
        }
        passed = state_ok and tripped_ok
    elif level == "L2":
        if not closed_dict(
            observations, {"kind", "district", "probeOutcome", "predictedFinal"}
        ):
            return _reject(errors, level)
        district = observations["district"]
        probe_outcome = observations["probeOutcome"]
        predicted_final = observations["predictedFinal"]
        if (
            observations["kind"] != "breaker-grid-L2"
            or district not in districts
            or probe_outcome not in {"success", "failure"}
            or predicted_final not in STATES
        ):
            return _reject(errors, level)
        # Trip the breaker, advance past the cooldown, run one probe.
        events = _burst(district, cfg["threshold"], "failure")
        events.append((district, probe_outcome, cfg["cooldown"] + 500, 0))
        stats = _simulate_wave(cfg, events)
        actual_final = stats[district]["state"]
        ok = predicted_final == actual_final
        expected = {
            "kind": METRIC_KIND,
            "probe_outcome": 1 if probe_outcome == "success" else 0,
            "predicted_final": predicted_final,
            "actual_final": actual_final,
            "probe_prediction_ok": ok,
        }
        passed = ok
    elif level == "L3":
        if not closed_dict(
            observations, {"kind", "district", "requests", "predictedRejected"}
        ):
            return _reject(errors, level)
        district = observations["district"]
        requests = observations["requests"]
        predicted_rejected = observations["predictedRejected"]
        if (
            observations["kind"] != "breaker-grid-L3"
            or district not in districts
            or not _is_count(requests, 1, MAX_INJECTED)
            or not _is_count(predicted_rejected, 0, MAX_INJECTED)
        ):
            return _reject(errors, level)
        # Slow successful calls (step 1ms, duration 1000ms) pile up at the cap.
        stats = _simulate_wave(
            cfg, _burst(district, requests, "success", 0, 1, 1000)
        )
        actual_rejected = stats[district]["bulkhead_rejected"]
        state_after = stats[district]["state"]
        ok = predicted_rejected == actual_rejected
        expected = {
            "kind": METRIC_KIND,
            "requests": requests,
            "cap": cfg["cap"],
            "predicted_rejected": predicted_rejected,
            "actual_rejected": actual_rejected,
            "rejection_prediction_ok": ok,
            "breaker_state_after": state_after,
        }
        passed = ok and state_after == "closed"
    else:
        if not closed_dict(observations, {"kind", "failingDistrict", "predictedStillServing"}):
            return _reject(errors, level)
        failing = observations["failingDistrict"]
        predicted = observations["predictedStillServing"]
        if (
            observations["kind"] != "breaker-grid-L4"
            or failing not in districts
            or not isinstance(predicted, list)
            or not predicted
            or not all(item in districts for item in predicted)
        ):
            return _reject(errors, level)
        # Cascade wave: threshold+2 failures, 3 surplus successes, then
        # 3 + floor(rng()*3) successes per surviving district (district order).
        rng = mulberry32(cfg["seed"])
        events: list[tuple[str, str, int, int]] = []
        clock = 0
        for _ in range(cfg["threshold"] + 2):
            events.append((failing, "failure", clock, 0))
            clock += 5
        for _ in range(3):
            events.append((failing, "success", clock, 0))
            clock += 5
        for district_id in cfg["districts"]:
            if district_id == failing:
                continue
            for _ in range(3 + int(rng() * 3)):
                events.append((district_id, "success", clock, 0))
                clock += 5
        stats = _simulate_wave(cfg, events)
        actual_serving = [
            d for d in cfg["districts"]
            if d != failing and stats[d]["state"] == "closed" and stats[d]["served"] > 0
        ]
        predicted_set = set(predicted)
        actual_set = set(actual_serving)
        ok = predicted_set == actual_set
        total_served = sum(entry["served"] for entry in stats.values())
        total_short = sum(entry["short_circuited"] for entry in stats.values())
        expected = {
            "kind": METRIC_KIND,
            "failing_district": failing,
            "predicted_still_serving": len(predicted_set),
            "actual_still_serving": len(actual_set),
            "still_serving_prediction_ok": ok,
            "total_served": total_served,
            "total_short_circuited": total_short,
            "cascade_prevented": len(actual_serving) == len(cfg["districts"]) - 1,
        }
        passed = ok

    if not metrics_match(producer_metrics, expected):
        errors.append("producer metrics disagree with independently recomputed observations")
        return False
    return passed
