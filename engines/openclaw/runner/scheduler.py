"""Scheduler that drives the 5-phase cycle via Hermes events."""

from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engines.openclaw import config as cfg
from engines.openclaw.fsio import (
    read_json_object,
    read_yaml_mapping,
    write_json_atomic,
)
from engines.openclaw.hermes.bus import Event, HermesBus
from engines.openclaw.hermes.topics import Topic
from engines.openclaw.runner.pipeline_status import (
    Phase,
    PipelineStatus,
    load_status,
    save_status,
)


ROOT = Path(__file__).resolve().parent.parent.parent.parent
PIPELINE_STATUS = ROOT / "learner" / "pipeline_status.md"
LEARNING_STATE = ROOT / "learner" / "learning_state.yaml"
SCHEDULER_STATE = ROOT / ".mavis" / "hermes" / "scheduler_state.json"


# Producer phase → topic to emit, adapter name, verifier phase name, next status.
@dataclass(frozen=True)
class PhaseRule:
    topic: Topic
    producer: str
    verifier: str
    next_phase: Phase


PHASE_RULES: dict[Phase, PhaseRule] = {
    Phase.SPEC: PhaseRule(
        topic=Topic.UNIT_SELECTED,
        producer="curator",
        verifier="spec",
        next_phase=Phase.SPEC_DONE,
    ),
    Phase.SPEC_DONE: PhaseRule(
        topic=Topic.SPEC_READY,
        producer="dev",
        verifier="impl",
        next_phase=Phase.IMPL_DONE,
    ),
    Phase.IMPL_DONE: PhaseRule(
        topic=Topic.IMPL_READY,
        producer="reviewer",
        verifier="review",
        next_phase=Phase.REVIEW_DONE,
    ),
    Phase.REVIEW_DONE: PhaseRule(
        topic=Topic.REVIEW_READY,
        producer="benchmarker",
        verifier="benchmark",
        next_phase=Phase.BENCHMARK_DONE,
    ),
    Phase.BENCHMARK_DONE: PhaseRule(
        topic=Topic.METRICS_READY,
        producer="optimizer",
        verifier="optimize",
        next_phase=Phase.CYCLE_COMPLETE,
    ),
}


def _parse_status(path: Path = PIPELINE_STATUS) -> PipelineStatus:
    """Load pipeline status (YAML seam preferred; Markdown fallback)."""
    return load_status(path)


def _write_status(status: PipelineStatus, path: Path = PIPELINE_STATUS) -> None:
    """Persist structured YAML + patch Markdown bullets (preserve agent notes)."""
    save_status(status, path)


def _load_learning_state(path: Path = LEARNING_STATE) -> dict[str, Any]:
    if not path.exists():
        return {}
    return read_yaml_mapping(path, what="learning state")


@dataclass
class StepResult:
    halted: bool = False
    reason: str = ""
    phase_after: Phase | None = None
    event: str = ""


class Scheduler:
    """Event-driven scheduler for the 5-phase learning cycle."""

    def __init__(
        self,
        bus: HermesBus | None = None,
        adapters: dict[str, Any] | None = None,
        status_path: Path | None = None,
        state_path: Path | None = None,
        scheduler_state_path: Path | None = None,
        config: cfg.OpenclawConfig | None = None,
    ) -> None:
        self.bus = bus or HermesBus()
        self.adapters = adapters or {}
        self.status_path = status_path or PIPELINE_STATUS
        self.state_path = state_path or LEARNING_STATE
        self.scheduler_state_path = scheduler_state_path or SCHEDULER_STATE
        self.config = config or cfg.DEFAULT_CONFIG
        self.scheduler_state_path.parent.mkdir(parents=True, exist_ok=True)

    def read_status(self) -> PipelineStatus:
        return _parse_status(self.status_path)

    def write_status(self, status: PipelineStatus) -> None:
        _write_status(status, self.status_path)

    def _read_scheduler_state(self) -> dict[str, Any]:
        if not self.scheduler_state_path.exists():
            # Designed recovery: missing state file means a fresh scheduler.
            return {}
        return read_json_object(self.scheduler_state_path, what="scheduler state")

    def _write_scheduler_state(self, state: dict[str, Any]) -> None:
        write_json_atomic(self.scheduler_state_path, state)

    def check_gate(self) -> tuple[bool, str]:
        state = _load_learning_state(self.state_path)
        gate = state.get("gate", {})
        if gate.get("implementation_blocked"):
            return True, "Learning gate is blocked; run /devschool-diagnose or wait for learner attempt."
        return False, ""

    def step(self) -> StepResult:
        status = self.read_status()

        if status.phase == Phase.CYCLE_COMPLETE:
            return StepResult(
                halted=True,
                reason="Cycle complete.",
                phase_after=Phase.CYCLE_COMPLETE,
            )

        if status.blockers:
            return StepResult(
                halted=True,
                reason=f"Blockers present: {status.blockers}",
                phase_after=status.phase,
            )

        blocked, reason = self.check_gate()
        if blocked:
            return StepResult(halted=True, reason=reason, phase_after=status.phase)

        rule = PHASE_RULES.get(status.phase)
        if rule is None:
            return StepResult(
                halted=True,
                reason=f"No rule for phase: {status.phase}",
                phase_after=status.phase,
            )

        sched_state = self._read_scheduler_state()
        pending_verify_topic = sched_state.get("pending_verify_topic")

        if pending_verify_topic:
            return self._run_verifier(status, rule, Topic(pending_verify_topic))

        return self._run_producer(status, rule)

    def _next_sequence(self) -> int:
        sched_state = self._read_scheduler_state()
        seq = sched_state.get("sequence", 0) + 1
        sched_state["sequence"] = seq
        self._write_scheduler_state(sched_state)
        return seq

    def _run_producer(self, status: PipelineStatus, rule: PhaseRule) -> StepResult:
        events = self.bus.consume(topic=rule.topic, limit=1)
        if not events:
            cycle_id = status.cycle_id or f"{time.strftime('%Y-%m-%d')}-{status.current_project.replace('/', '-')}"
            unit_id = status.current_project or "unknown"
            artifact_path = self._artifact_path_for_topic(rule.topic, status)
            payload = self._payload_for_topic(rule.topic, status)
            payload["_sequence"] = self._next_sequence()
            self.bus.publish(
                topic=rule.topic,
                cycle_id=cycle_id,
                unit_id=unit_id,
                artifact_path=artifact_path,
                payload=payload,
            )
            events = self.bus.consume(topic=rule.topic, limit=1)

        if not events:
            return StepResult(
                halted=True,
                reason=f"No {rule.topic.value} event available after publish",
                phase_after=status.phase,
                event=rule.topic.value,
            )

        event = events[0]
        producer = self.adapters.get(rule.producer)
        if producer is None:
            return StepResult(
                halted=True,
                reason=f"No producer adapter registered for {rule.producer}",
                phase_after=status.phase,
                event=event.topic.value,
            )

        result, error = self._safe_dispatch(
            lambda: producer.handle(event, self.bus, status),
            role=f"Producer {rule.producer}",
            event=event,
            phase_after=status.phase,
        )
        if error is not None:
            return error

        next_topic = result.get("next_topic")
        if next_topic is None:
            return StepResult(
                halted=True,
                reason=f"Producer {rule.producer} did not emit a next_topic",
                phase_after=status.phase,
                event=event.topic.value,
            )

        sched_state = self._read_scheduler_state()
        sched_state["pending_verify_topic"] = next_topic
        self._write_scheduler_state(sched_state)

        return StepResult(
            halted=False,
            reason=f"Producer {rule.producer} emitted {next_topic}; awaiting verifier",
            phase_after=status.phase,
            event=event.topic.value,
        )

    def _run_verifier(
        self,
        status: PipelineStatus,
        rule: PhaseRule,
        topic: Topic,
    ) -> StepResult:
        verifier = self.adapters.get("verifier")
        if verifier is None:
            return StepResult(
                halted=True,
                reason="No verifier adapter registered",
                phase_after=status.phase,
                event=topic.value,
            )

        events = self.bus.consume(topic=topic, limit=1)
        if not events:
            return StepResult(
                halted=True,
                reason=f"Verifier topic {topic.value} expected but no event in inbox",
                phase_after=status.phase,
                event=topic.value,
            )

        event = events[0]
        result, error = self._safe_dispatch(
            lambda: verifier.handle(event, self.bus, status, phase=rule.verifier),
            role="Verifier",
            event=event,
            phase_after=status.phase,
        )
        if error is not None:
            return error

        if result.get("verdict") != "PASS":
            retry_count = self._increment_retry(topic.value)
            retry_limit = self.config.verifier_retry_limit
            if retry_count >= retry_limit:
                status.blockers.append(f"{topic.value} verifier failed {retry_count}x")
                self.write_status(status)
                return StepResult(
                    halted=True,
                    reason=f"Verifier FAIL reached retry limit for {topic.value}",
                    phase_after=status.phase,
                    event=topic.value,
                )
            # Re-publish producer event so the loop retries.
            producer_rule = PHASE_RULES[status.phase]
            self.bus.publish(
                topic=producer_rule.topic,
                cycle_id=status.cycle_id,
                unit_id=status.current_project,
                artifact_path=self._artifact_path_for_topic(producer_rule.topic, status),
                payload=self._payload_for_topic(producer_rule.topic, status),
            )
            sched_state = self._read_scheduler_state()
            sched_state.pop("pending_verify_topic", None)
            self._write_scheduler_state(sched_state)
            return StepResult(
                halted=False,
                reason=f"Verifier FAIL (retry {retry_count}/{retry_limit}); producer will rerun",
                phase_after=status.phase,
                event=topic.value,
            )

        # PASS: advance phase and clear pending verification.
        status.phase = rule.next_phase
        status.awaiting = ""
        self.write_status(status)
        sched_state = self._read_scheduler_state()
        sched_state.pop("pending_verify_topic", None)
        sched_state["retry_counts"] = {}
        self._write_scheduler_state(sched_state)

        return StepResult(
            halted=False,
            reason=f"Verifier PASS for {rule.verifier}; advanced to {rule.next_phase.value}",
            phase_after=rule.next_phase,
            event=topic.value,
        )

    # Dispatch boundary: an adapter bug must halt the step with a clear
    # reason, not crash the runner loop, so we deliberately catch broadly
    # here (and only here). Returns (result_dict, error_step) — exactly one
    # is non-None.
    def _safe_dispatch(
        self,
        handle: Any,
        *,
        role: str,
        event: Event,
        phase_after: Phase,
    ) -> tuple[dict[str, Any] | None, StepResult | None]:
        try:
            result = handle()
            self.bus.ack(event)
        except Exception as exc:
            return None, StepResult(
                halted=True,
                reason=f"{role} failed with {type(exc).__name__}: {exc}",
                phase_after=phase_after,
                event=event.topic.value,
            )
        if not isinstance(result, dict):
            return None, StepResult(
                halted=True,
                reason=(
                    f"{role} returned {type(result).__name__} "
                    "instead of an AdapterResult dict"
                ),
                phase_after=phase_after,
                event=event.topic.value,
            )
        return result, None

    def _increment_retry(self, topic_value: str) -> int:
        sched_state = self._read_scheduler_state()
        retry_counts = sched_state.setdefault("retry_counts", {})
        retry_counts[topic_value] = retry_counts.get(topic_value, 0) + 1
        self._write_scheduler_state(sched_state)
        return retry_counts[topic_value]

    def run(self, max_events: int = 50) -> list[StepResult]:
        results: list[StepResult] = []
        for _ in range(max_events):
            result = self.step()
            results.append(result)
            if result.halted:
                break
        return results

    def _artifact_path_for_topic(self, topic: Topic, status: PipelineStatus) -> str:
        project = status.current_project or cfg.DEFAULT_PROJECT
        return cfg.artifact_path_for_topic(topic, project)

    def _payload_for_topic(self, topic: Topic, status: PipelineStatus) -> dict[str, Any]:
        project = status.current_project or cfg.DEFAULT_PROJECT
        payloads: dict[Topic, dict[str, Any]] = {
            Topic.UNIT_SELECTED: {
                "unit_id": status.current_project,
                "project_path": project,
                "prerequisite_evidence": "catalog-verified",
            },
            Topic.SPEC_READY: {
                "spec_path": cfg.spec_path(project),
                "adr_path": cfg.adr_path(project),
            },
            Topic.IMPL_READY: {
                "implementation_path": cfg.impl_path(project, "{lang}"),
                "test_command": "run-tests",
            },
            Topic.REVIEW_READY: {
                "findings_path": cfg.code_review_path(project),
            },
            Topic.METRICS_READY: {
                "scorecard_path": cfg.benchmark_results_path(project),
            },
            Topic.MEMORY_UPDATED: {
                "profile_path": cfg.LEARNING_STATE_PATH,
                "next_action": "cycle-complete",
            },
        }
        return payloads.get(topic, {})
