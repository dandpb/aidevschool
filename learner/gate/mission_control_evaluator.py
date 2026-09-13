"""Independent evaluator for the MISSION CONTROL teaching game (U12 scheduler).

The verifier replays the player's bounded trace against the deterministic
cluster election and job DAG seeded by the level config — it never trusts the
producer's metrics or ``pass`` claim.

Election model (mirror of
``engines/voxelDojo/game-12-mission-control/src/sim/election.ts``): each term
draws one mulberry32 timeout per station from ``termSeed(seed, term)``
(``seed ^ imul(term+1, 0x9e3779b1)``); stations with timeout < 0.5 campaign,
non-candidates vote for the first-firing candidate, and a unique strict
majority wins the term (split votes re-roll at term+1). Killing the leader
removes it and re-elects among the survivors at term+1. The cluster and DAG
mirror ``src/sim/levels.ts`` (seed 7; CLUSTER alpha/beta/gamma/delta;
MISSION_DAG deploy → {migrate-db, warm-cache} → smoke-test → announce).

Ground truth (pinned by ``test_mission_control_evaluator.py`` and
cross-checked against the TS sim):
- first term over the full cluster: leader ``delta``, term 1
- succession after killing delta: leader ``beta``, term 2

Observation contract (closed per level):

- L1 ``{"kind": "mission-control-L1", "predictedLeader": <station>}``
- L2 ``{"kind": "mission-control-L2", "firstPredictedLeader": <station>, "killedLeader": <station>, "successorPredicted": <station>}``
- L3 ``{"kind": "mission-control-L3", "launchOrder": [<job id>, ...]}``
- L4 ``{"kind": "mission-control-L4", "firstPredictedLeader": <station>, "killedLeader": <station>, "successorPredicted": <station>, "launchOrder": [...]}``

Producer metrics must match the recomputed metrics exactly.
"""

from __future__ import annotations

from typing import Any

from .evaluator_primitives import closed_dict, metrics_match, mulberry32

CLUSTER = ("alpha", "beta", "gamma", "delta")
SEED = 7
CANDIDACY_BAR = 0.5
MAX_ROUNDS = 64
METRIC_KIND = "voxeldoj-mission-control"

MISSION_DAG: dict[str, tuple[str, ...]] = {
    "deploy": (),
    "migrate-db": ("deploy",),
    "warm-cache": ("deploy",),
    "smoke-test": ("migrate-db", "warm-cache"),
    "announce": ("smoke-test",),
}


def _term_seed(base_seed: int, term: int) -> int:
    # seed ^ imul(term + 1, 0x9e3779b1), masked to uint32 (JS >>> 0).
    return (base_seed ^ ((term + 1) * 0x9E3779B1)) & 0xFFFFFFFF


def _elect_term(stations: tuple[str, ...], seed: int, start_term: int) -> tuple[str, int]:
    """Return (leader_id, winning_term) — mirrors electTerm in election.ts."""
    if len(stations) == 1:
        return stations[0], start_term
    need = len(stations) // 2 + 1
    term = start_term
    for _ in range(MAX_ROUNDS):
        rng = mulberry32(_term_seed(seed, term))
        timeouts: dict[str, float] = {}
        candidates: list[str] = []
        for station in stations:
            timeout = rng()
            timeouts[station] = timeout
            if timeout < CANDIDACY_BAR:
                candidates.append(station)
        if not candidates:
            candidates = [min(stations, key=lambda s: timeouts[s])]
        candidate_set = set(candidates)
        pick = min(candidates, key=lambda c: timeouts[c])
        votes: dict[str, int] = {candidate: 0 for candidate in candidates}
        for station in stations:
            choice = station if station in candidate_set else pick
            votes[choice] = votes.get(choice, 0) + 1
        top = max(votes.values())
        winners = [candidate for candidate, count in votes.items() if count == top]
        if len(winners) == 1 and top >= need:
            return winners[0], term
        term += 1
    raise RuntimeError("mission-control election did not converge")


def _kill_leader(
    stations: tuple[str, ...], seed: int, term: int, killed: str
) -> tuple[str, int]:
    survivors = tuple(station for station in stations if station != killed)
    return _elect_term(survivors, seed, term + 1)


def _dag_replay(launch_order: list[str]) -> tuple[bool, dict[str, Any]]:
    """Mirror evaluateDagRun in levels.ts over the pinned MISSION_DAG."""
    completed: set[str] = set()
    violations = 0
    for job_id in launch_order:
        job = MISSION_DAG.get(job_id)
        if job is None:
            continue  # unknown ids never block nor complete (mirrors the sim)
        if any(dep not in completed for dep in job):
            violations += 1
            continue
        completed.add(job_id)
    total = len(MISSION_DAG)
    passed = violations == 0 and len(completed) == total
    metrics = {
        "jobs_completed": len(completed),
        "jobs_total": total,
        "topo_valid": violations == 0,
        "blocked_attempts": violations,
    }
    return passed, metrics


def _station(value: Any) -> bool:
    return isinstance(value, str) and value in CLUSTER


def _launch_order(value: Any) -> bool:
    return (
        isinstance(value, list)
        and bool(value)
        and all(isinstance(item, str) and item in MISSION_DAG for item in value)
    )


def _reject(errors: list[str], level: str) -> bool:
    errors.append(f"observations do not match the closed {level} scenario trace")
    return False


def evaluate_mission_control(
    level: str, observations: Any, producer_metrics: Any, errors: list[str]
) -> bool:
    if level not in {"L1", "L2", "L3", "L4"}:
        errors.append("unsupported MISSION CONTROL level")
        return False
    if not isinstance(observations, dict):
        errors.append("observations must be a bounded object")
        return False

    if level == "L1":
        if not closed_dict(observations, {"kind", "predictedLeader"}):
            return _reject(errors, level)
        predicted = observations["predictedLeader"]
        if observations["kind"] != "mission-control-L1" or not _station(predicted):
            return _reject(errors, level)
        leader, term = _elect_term(CLUSTER, SEED, 1)
        expected: dict[str, Any] = {
            "kind": METRIC_KIND,
            "leader_prediction_ok": predicted == leader,
            "predicted_leader": predicted,
            "actual_leader": leader,
            "term": term,
        }
        passed = predicted == leader
    elif level == "L2":
        if not closed_dict(
            observations, {"kind", "firstPredictedLeader", "killedLeader", "successorPredicted"}
        ):
            return _reject(errors, level)
        first_predicted = observations["firstPredictedLeader"]
        killed = observations["killedLeader"]
        successor_predicted = observations["successorPredicted"]
        if (
            observations["kind"] != "mission-control-L2"
            or not _station(first_predicted)
            or not _station(killed)
            or not _station(successor_predicted)
        ):
            return _reject(errors, level)
        first_leader, first_term = _elect_term(CLUSTER, SEED, 1)
        # Killing anyone other than the current leader is a misread of the
        # model — the producer's controller fails the wave on the spot.
        killed_ok = killed == first_leader
        successor_leader, successor_term = (
            _kill_leader(CLUSTER, SEED, first_term, killed)
            if killed_ok
            else _elect_term(
                tuple(s for s in CLUSTER if s != killed), SEED, first_term + 1
            )
        )
        first_ok = first_predicted == first_leader
        successor_ok = successor_predicted == successor_leader
        term_increased = successor_term > first_term
        expected = {
            "kind": METRIC_KIND,
            "leader_prediction_ok": first_ok,
            "successor_prediction_ok": successor_ok,
            "term_increased": term_increased,
            "first_term": first_term,
            "successor_term": successor_term,
            "successor": successor_leader,
        }
        passed = first_ok and killed_ok and successor_ok and term_increased
    elif level == "L3":
        if not closed_dict(observations, {"kind", "launchOrder"}):
            return _reject(errors, level)
        launch_order = observations["launchOrder"]
        if observations["kind"] != "mission-control-L3" or not _launch_order(launch_order):
            return _reject(errors, level)
        dag_passed, dag_metrics = _dag_replay(list(launch_order))
        expected = {"kind": METRIC_KIND, **dag_metrics}
        passed = dag_passed
    else:
        if not closed_dict(
            observations,
            {"kind", "firstPredictedLeader", "killedLeader", "successorPredicted", "launchOrder"},
        ):
            return _reject(errors, level)
        first_predicted = observations["firstPredictedLeader"]
        killed = observations["killedLeader"]
        successor_predicted = observations["successorPredicted"]
        launch_order = observations["launchOrder"]
        if (
            observations["kind"] != "mission-control-L4"
            or not _station(first_predicted)
            or not _station(killed)
            or not _station(successor_predicted)
            or not _launch_order(launch_order)
        ):
            return _reject(errors, level)
        first_leader, first_term = _elect_term(CLUSTER, SEED, 1)
        successor_leader, successor_term = (
            _kill_leader(CLUSTER, SEED, first_term, killed)
            if killed == first_leader
            else _elect_term(
                tuple(s for s in CLUSTER if s != killed), SEED, first_term + 1
            )
        )
        dag_passed, dag_metrics = _dag_replay(list(launch_order))
        first_ok = first_predicted == first_leader
        successor_ok = successor_predicted == successor_leader
        killed_ok = killed == first_leader
        term_increased = successor_term > first_term
        recovered = killed_ok and term_increased
        expected = {
            "kind": METRIC_KIND,
            **dag_metrics,
            "leader_killed": killed_ok,
            "killed_leader": killed,
            "first_term": first_term,
            "successor_term": successor_term,
            "term_increased": term_increased,
            "resumed": recovered,
        }
        passed = dag_passed and first_ok and successor_ok and recovered

    if not metrics_match(producer_metrics, expected):
        errors.append("producer metrics disagree with independently recomputed observations")
        return False
    return passed
