"""Typed supervisor domain models."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Any, Mapping


class Action(StrEnum):
    RUN_PHASE = "run_phase"
    WAIT_FOR_LEARNER = "wait_for_learner"
    WAIT_FOR_EVIDENCE = "wait_for_evidence"
    BLOCKED = "blocked"
    CYCLE_COMPLETE = "cycle_complete"
    INVALID_STATE = "invalid_state"
    ALREADY_RUNNING = "already_running"
    RECONCILED = "reconciled"


class PipelinePhase(StrEnum):
    SPEC = "spec"
    SPEC_DONE = "spec-done"
    IMPL_DONE = "impl-done"
    REVIEW_DONE = "review-done"
    BENCHMARK_DONE = "benchmark-done"
    CYCLE_COMPLETE = "cycle-complete"


class LearningState(StrEnum):
    PRESENTING = "presenting"
    PRACTICING = "practicing"
    EVALUATING = "evaluating"
    MASTERED = "mastered"


@dataclass(frozen=True, slots=True)
class PipelineState:
    cycle_id: str
    project: str
    project_dir: Path
    phase: PipelinePhase
    blockers: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class LearnerState:
    unit_id: str
    project: str
    state: LearningState
    implementation_blocked: bool


@dataclass(frozen=True, slots=True)
class PhasePlan:
    name: str
    command: str
    producer_role: str
    verifier_role: str
    observed_phase: PipelinePhase
    next_phase: PipelinePhase
    retry_limit: int = 3


@dataclass(frozen=True, slots=True)
class Decision:
    action: Action
    reason: str
    project: str | None = None
    observed_phase: PipelinePhase | None = None
    plan: PhasePlan | None = None


@dataclass(frozen=True, slots=True)
class SupervisorPaths:
    repo_root: Path
    pipeline: Path
    learner: Path
    curriculum: Path
    operations: Path

    @property
    def ledger(self) -> Path:
        return self.operations / "ledger.ndjson"

    @property
    def lease(self) -> Path:
        return self.operations / "lease.json"

    @property
    def outbox(self) -> Path:
        return self.operations / "outbox" / "pending"

    @property
    def resolutions(self) -> Path:
        return self.operations / "outbox" / "resolved"

    @property
    def retired(self) -> Path:
        return self.operations / "outbox" / "retired"

    def validate(self) -> None:
        root = self.repo_root.resolve(strict=True)
        for name, path in (("pipeline", self.pipeline), ("learner", self.learner),
                           ("curriculum", self.curriculum), ("operations", self.operations)):
            candidate = path.resolve(strict=False)
            try:
                candidate.relative_to(root)
            except ValueError as exc:
                raise ValueError(f"{name} escapes repository root") from exc
        operational_paths = (
            self.operations,
            self.ledger,
            self.lease,
            self.operations / "outbox",
            self.outbox,
            self.resolutions,
            self.retired,
        )
        for path in operational_paths:
            if path.exists() and path.is_symlink():
                raise ValueError(f"operational path may not be a symlink: {path}")
            try:
                path.resolve(strict=False).relative_to(root)
            except ValueError as exc:
                raise ValueError(f"operational path escapes repository root: {path}") from exc


@dataclass(frozen=True, slots=True)
class RuntimeSnapshot:
    lease_held: bool = False
    pending_request: Mapping[str, Any] | None = None
    failed_attempts: int = 0
    operational_blocker: str | None = None


@dataclass(frozen=True, slots=True)
class Reconciliation:
    status: str
    request: Mapping[str, Any] | None = None
    reason: str = ""
