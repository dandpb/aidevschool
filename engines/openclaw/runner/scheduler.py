"""Scheduler that drives the 5-phase cycle via Hermes events."""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, field
from enum import StrEnum
from pathlib import Path
from typing import Any

import yaml

from engines.openclaw.hermes.bus import Event, HermesBus
from engines.openclaw.hermes.topics import Topic


ROOT = Path(__file__).resolve().parent.parent.parent.parent
PIPELINE_STATUS = ROOT / "learner" / "pipeline_status.md"
LEARNING_STATE = ROOT / "learner" / "learning_state.yaml"
SCHEDULER_STATE = ROOT / ".mavis" / "hermes" / "scheduler_state.json"


class Phase(StrEnum):
    SPEC = "spec"
    SPEC_DONE = "spec-done"
    IMPL_DONE = "impl-done"
    REVIEW_DONE = "review-done"
    BENCHMARK_DONE = "benchmark-done"
    CYCLE_COMPLETE = "cycle-complete"


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


@dataclass
class PipelineStatus:
    cycle_id: str = ""
    current_project: str = ""
    complexity_level: int = 1
    phase: Phase = Phase.SPEC
    awaiting: str = ""
    blockers: list[str] = field(default_factory=list)


def _parse_status(path: Path = PIPELINE_STATUS) -> PipelineStatus:
    text = path.read_text(encoding="utf-8") if path.exists() else ""
    data: dict[str, Any] = {}
    for line in text.splitlines():
        match = re.match(r"-\s+\*\*(\w+)\*\*:\s+`?(.+?)`?\s*$", line)
        if match:
            key, value = match.groups()
            data[key] = value
    return PipelineStatus(
        cycle_id=data.get("cycle_id", ""),
        current_project=data.get("current_project", ""),
        complexity_level=int(data.get("complexity_level", "1").split()[0]),
        phase=Phase(data.get("phase", "spec")),
        awaiting=data.get("awaiting", ""),
        blockers=[b.strip() for b in data.get("blockers", "[]").strip("[]").split(",") if b.strip()],
    )


def _write_status(status: PipelineStatus, path: Path = PIPELINE_STATUS) -> None:
    text = f"""# Pipeline Status — MiniMax Evolution Engine

> Estado do **pipeline de software** do ciclo atual. (A jornada de aprendizado fica em
> `learning_state.yaml`, na mesma pasta.) Caminhos relativos à raiz do ecossistema.
> Atualizado por cada agente ao fim da sua fase.

- **cycle_id**: {status.cycle_id}
- **current_project**: `{status.current_project}`
- **complexity_level**: {status.complexity_level}
- **phase**: {status.phase.value}
- **awaiting**: `{status.awaiting}`
- **agents**:
  - (atualizado pelo runner)
- **notas**:
  - Ciclo atualizado automaticamente pelo OpenClaw runner.
- **blockers**: {status.blockers}

## Transições
`spec` → `diagnostic` (learner attempt evaluated · sonda) → `impl` (3 langs green + verifier) →
`review` → `benchmark` → `optimize` → `cycle-complete`
"""
    path.write_text(text, encoding="utf-8")


def _load_learning_state(path: Path = LEARNING_STATE) -> dict[str, Any]:
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


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
    ) -> None:
        self.bus = bus or HermesBus()
        self.adapters = adapters or {}
        self.status_path = status_path or PIPELINE_STATUS
        self.state_path = state_path or LEARNING_STATE
        self.scheduler_state_path = scheduler_state_path or SCHEDULER_STATE
        self.scheduler_state_path.parent.mkdir(parents=True, exist_ok=True)

    def read_status(self) -> PipelineStatus:
        return _parse_status(self.status_path)

    def write_status(self, status: PipelineStatus) -> None:
        _write_status(status, self.status_path)

    def _read_scheduler_state(self) -> dict[str, Any]:
        if not self.scheduler_state_path.exists():
            return {}
        return json.loads(self.scheduler_state_path.read_text(encoding="utf-8"))

    def _write_scheduler_state(self, state: dict[str, Any]) -> None:
        self.scheduler_state_path.write_text(json.dumps(state, indent=2), encoding="utf-8")

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

        result = producer.handle(event, self.bus, status)
        self.bus.ack(event)

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
        result = verifier.handle(event, self.bus, status, phase=rule.verifier)
        self.bus.ack(event)

        if result.get("verdict") != "PASS":
            retry_count = self._increment_retry(topic.value)
            retry_limit = 3
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
        project = status.current_project or "curriculum/01_rate_limiter"
        mapping = {
            Topic.UNIT_SELECTED: project,
            Topic.SPEC_READY: f"{project}/docs/spec.md",
            Topic.IMPL_READY: f"{project}/go-impl",
            Topic.REVIEW_READY: f"{project}/docs/code_review.md",
            Topic.METRICS_READY: f"{project}/docs/benchmark_results.md",
            Topic.MEMORY_UPDATED: "learner/journal.md",
        }
        return mapping.get(topic, project)

    def _payload_for_topic(self, topic: Topic, status: PipelineStatus) -> dict[str, Any]:
        project = status.current_project or "curriculum/01_rate_limiter"
        payloads: dict[Topic, dict[str, Any]] = {
            Topic.UNIT_SELECTED: {
                "unit_id": status.current_project,
                "project_path": project,
                "prerequisite_evidence": "catalog-verified",
            },
            Topic.SPEC_READY: {
                "spec_path": f"{project}/docs/spec.md",
                "adr_path": f"{project}/docs/adr.md",
            },
            Topic.IMPL_READY: {
                "implementation_path": f"{project}/{{lang}}-impl",
                "test_command": "run-tests",
            },
            Topic.REVIEW_READY: {
                "findings_path": f"{project}/docs/code_review.md",
            },
            Topic.METRICS_READY: {
                "scorecard_path": f"{project}/docs/benchmark_results.md",
            },
            Topic.MEMORY_UPDATED: {
                "profile_path": "learner/learning_state.yaml",
                "next_action": "cycle-complete",
            },
        }
        return payloads.get(topic, {})
