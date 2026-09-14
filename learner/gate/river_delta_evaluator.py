"""Independent evaluator for the RIVER DELTA teaching game (U14 log aggregator).

The verifier replays the player's bounded trace against the deterministic
multi-source log stream and pipeline seeded by the level config — it never
trusts the producer's metrics or ``pass`` claim.

Stream model (mirror of ``engines/voxelDojo/game-14-river-delta/src/sim``):
each tributary (source) streams ``logId = <source>-<i>`` records whose level
and correlation id are drawn from mulberry32(seed + i*101) in draw order
(level, then the shared-id gate, then optionally the shared index); the
records merge in source order (``rng.ts`` logStream / ``levels.ts``
logsFor). On L3/L4 the trace id dyes every other record (``j % 2 == 0``) of
the FIRST TWO sources only. The shared pipeline (``levels.ts``
deltaPipeline) is normalize (fatal → error) → drop-trace (level "trace" is
dropped) → tag-env (enrich; observability only); a record that survives
every stage reaches the sink (``pipeline.ts`` runPipelineStream).
``collectTrace`` is the exact sub-sequence of stage events sharing the
correlation id in flow order; ``traceSources`` is its distinct-source set.

Level table (mirror of ``src/sim/levels.ts``): seeds 11/22/33/44; sources
api+worker+auth (L1, 4 each), api+worker (L2, 6 each, full pipeline),
api+worker+auth (L3, 5 each), api+worker+auth+cron (L4, 6 each); the L3/L4
trace id is ``req-dye``.

Ground truth (pinned by ``test_river_delta_evaluator.py`` and cross-checked
against the TS sim): L1/L2 prompt 12 logs; L2 drops exactly ``api-4`` (the
only trace-level record); the L3 dye path spans api+worker with 28 trace
events; the L4 trace collects exactly api-0/2/4 + worker-0/2/4.

Observation contract (closed per level):

- L1 ``{"kind": "river-delta-L1", "predictions": [<source id> x 12]}``
- L2 ``{"kind": "river-delta-L2", "predictions": [<bool> x 12]}``
- L3 ``{"kind": "river-delta-L3", "injectSource": <source id>, "predictedSources": [<source id>, ...]}``
- L4 ``{"kind": "river-delta-L4", "collectedLogIds": [<log id>, ...]}``

``predictions[i]`` answers the i-th prompt log in merged flow order (its
source on L1, pass/drop on L2). Producer metrics must match the recomputed
metrics exactly.
"""

from __future__ import annotations

from typing import Any

from .evaluator_primitives import closed_dict, metrics_match, mulberry32, round2

LOG_LEVELS = ("trace", "debug", "info", "warn", "error", "fatal")
METRIC_KIND = "voxeldoj-river-delta"

# Mirrors game-14-river-delta/src/sim/levels.ts (LEVELS table). L1 runs an
# empty pipeline; the other levels run deltaPipeline (normalize → drop-trace
# → tag-env) where only the drop-trace predicate changes the outcome.
LEVELS: dict[str, dict[str, Any]] = {
    "L1": {"seed": 11, "sources": ("api", "worker", "auth"), "per_source": 4, "pipeline": False},
    "L2": {"seed": 22, "sources": ("api", "worker"), "per_source": 6, "pipeline": True},
    "L3": {"seed": 33, "sources": ("api", "worker", "auth"), "per_source": 5, "pipeline": True},
    "L4": {"seed": 44, "sources": ("api", "worker", "auth", "cron"), "per_source": 6, "pipeline": True},
}
TRACE_ID = "req-dye"


def _logs_for(cfg: dict[str, Any], level: str) -> list[dict[str, Any]]:
    """Mirrors rng.ts logStream + levels.ts logsFor (dye on L3/L4)."""
    dye_sources = set(cfg["sources"][:2])
    logs: list[dict[str, Any]] = []
    for index, source in enumerate(cfg["sources"]):
        rng = mulberry32(cfg["seed"] + index * 101)
        for record in range(cfg["per_source"]):
            level_name = LOG_LEVELS[int(rng() * len(LOG_LEVELS))]
            if rng() < 0.25:
                correlation_id = f"req-shared-{int(rng() * 4)}"
            else:
                correlation_id = f"req-{source}-{record}"
            dyed = level in {"L3", "L4"} and source in dye_sources and record % 2 == 0
            logs.append(
                {
                    "logId": f"{source}-{record}",
                    "source": source,
                    "level": level_name,
                    "correlationId": TRACE_ID if dyed else correlation_id,
                }
            )
    return logs


def _reached_sink(log: dict[str, Any], with_pipeline: bool) -> bool:
    """A record reaches the sink iff it is not dropped at the filter stage."""
    if not with_pipeline:
        return True
    return log["level"] != "trace"


def _trace_for(cfg: dict[str, Any], level: str) -> tuple[list[str], int]:
    """(log ids in flow order, stage-event count) for the trace id — mirrors
    collectTrace over runPipelineStream: a dyed record emits 5 stage events
    (source + 3 stages + sink) when it reaches the sink, 3 when the filter
    drops it (source + normalize + drop)."""
    log_ids: list[str] = []
    events = 0
    for log in _logs_for(cfg, level):
        if log["correlationId"] != TRACE_ID:
            continue
        log_ids.append(log["logId"])
        events += 5 if _reached_sink(log, cfg["pipeline"]) else 3
    return log_ids, events


def _reject(errors: list[str], level: str) -> bool:
    errors.append(f"observations do not match the closed {level} scenario trace")
    return False


def evaluate_river_delta(
    level: str, observations: Any, producer_metrics: Any, errors: list[str]
) -> bool:
    if level not in LEVELS:
        errors.append("unsupported RIVER DELTA level")
        return False
    if not isinstance(observations, dict):
        errors.append("observations must be a bounded object")
        return False

    cfg = LEVELS[level]
    sources: frozenset[str] = frozenset(cfg["sources"])
    logs = _logs_for(cfg, level)

    if level in {"L1", "L2"}:
        if not closed_dict(observations, {"kind", "predictions"}):
            return _reject(errors, level)
        predictions = observations["predictions"]
        prompt_count = len(logs)
        if not isinstance(predictions, list) or len(predictions) != prompt_count:
            return _reject(errors, level)
        if level == "L1":
            if observations["kind"] != "river-delta-L1" or not all(
                isinstance(item, str) and item in sources for item in predictions
            ):
                return _reject(errors, level)
            correct = sum(
                1
                for log, predicted in zip(logs, predictions)
                if predicted == log["source"]
            )
            expected: dict[str, Any] = {
                "kind": METRIC_KIND,
                "source_predictions": prompt_count,
                "source_prediction_accuracy": round2(correct / prompt_count),
            }
        else:
            if observations["kind"] != "river-delta-L2" or not all(
                isinstance(item, bool) for item in predictions
            ):
                return _reject(errors, level)
            correct = sum(
                1
                for log, predicted in zip(logs, predictions)
                if predicted == _reached_sink(log, cfg["pipeline"])
            )
            expected = {
                "kind": METRIC_KIND,
                "filter_predictions": prompt_count,
                "filter_prediction_accuracy": round2(correct / prompt_count),
            }
        passed = (correct / prompt_count) >= 0.8
    else:
        trace_ids, trace_events = _trace_for(cfg, level)
        trace_source_set = {log_id.rsplit("-", 1)[0] for log_id in trace_ids}
        valid_log_ids = frozenset(log["logId"] for log in logs)
        if level == "L3":
            if not closed_dict(observations, {"kind", "injectSource", "predictedSources"}):
                return _reject(errors, level)
            inject_source = observations["injectSource"]
            predicted = observations["predictedSources"]
            if (
                observations["kind"] != "river-delta-L3"
                or inject_source not in sources
                or not isinstance(predicted, list)
                or not predicted
                or not all(item in sources for item in predicted)
            ):
                return _reject(errors, level)
            predicted_set = set(predicted)
            sets_equal = predicted_set == trace_source_set
            inject_valid = inject_source in trace_source_set
            expected = {
                "kind": METRIC_KIND,
                "dyed_sources_predicted": len(predicted_set),
                "dyed_sources_actual": len(trace_source_set),
                "source_set_correct": sets_equal,
                "inject_source_valid": inject_valid,
                "trace_events": trace_events,
            }
            passed = sets_equal and inject_valid and bool(trace_ids)
        else:
            if not closed_dict(observations, {"kind", "collectedLogIds"}):
                return _reject(errors, level)
            collected = observations["collectedLogIds"]
            if (
                observations["kind"] != "river-delta-L4"
                or not isinstance(collected, list)
                or not collected
                or not all(item in valid_log_ids for item in collected)
            ):
                return _reject(errors, level)
            collected_set = set(collected)
            truth_set = set(trace_ids)
            missing = len(truth_set - collected_set)
            extra = len(collected_set - truth_set)
            exact = truth_set == collected_set
            expected = {
                "kind": METRIC_KIND,
                "trace_log_ids_actual": len(truth_set),
                "trace_log_ids_collected": len(collected_set),
                "missing_log_ids": missing,
                "extra_log_ids": extra,
                "trace_exact": exact,
            }
            passed = exact

    if not metrics_match(producer_metrics, expected):
        errors.append("producer metrics disagree with independently recomputed observations")
        return False
    return passed
