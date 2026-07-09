"""Checklist scheduler for the 5-phase learning cycle.

ponytail: no Hermes, no adapters — each step is path-exists + size gate.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engines.openclaw import config as cfg
from engines.openclaw.fsio import read_yaml_mapping
from engines.openclaw.runner.checklist import evaluate
from engines.openclaw.runner.pipeline_status import (
    Phase,
    PipelineStatus,
    load_status,
    save_status,
)

ROOT = Path(__file__).resolve().parent.parent.parent.parent
PIPELINE_STATUS = ROOT / "learner" / "pipeline_status.md"
LEARNING_STATE = ROOT / "learner" / "learning_state.yaml"


@dataclass
class StepResult:
    halted: bool = False
    reason: str = ""
    phase_after: Phase | None = None
    event: str = ""


class Scheduler:
    """Advance pipeline_status when checklist artifacts exist."""

    def __init__(
        self,
        root: Path | None = None,
        status_path: Path | None = None,
        state_path: Path | None = None,
        config: cfg.OpenclawConfig | None = None,
        # ignored kwargs kept so old call sites / tests that pass bus/adapters still construct
        bus: Any = None,
        adapters: Any = None,
        scheduler_state_path: Path | None = None,
    ) -> None:
        self.root = root or ROOT
        self.status_path = status_path or PIPELINE_STATUS
        self.state_path = state_path or LEARNING_STATE
        self.config = config or cfg.DEFAULT_CONFIG

    def read_status(self) -> PipelineStatus:
        return load_status(self.status_path)

    def write_status(self, status: PipelineStatus) -> None:
        save_status(status, self.status_path)

    def check_gate(self) -> tuple[bool, str]:
        if not self.state_path.exists():
            return False, ""
        state = read_yaml_mapping(self.state_path, what="learning state")
        gate = state.get("gate", {})
        if gate.get("implementation_blocked"):
            return True, "Learning gate is blocked; run /devschool-diagnose or wait for learner attempt."
        return False, ""

    def step(self) -> StepResult:
        status = self.read_status()

        if status.phase == Phase.CYCLE_COMPLETE:
            return StepResult(halted=True, reason="Cycle complete.", phase_after=Phase.CYCLE_COMPLETE)

        if status.blockers:
            return StepResult(
                halted=True,
                reason=f"Blockers present: {status.blockers}",
                phase_after=status.phase,
            )

        blocked, reason = self.check_gate()
        if blocked:
            return StepResult(halted=True, reason=reason, phase_after=status.phase)

        project = status.current_project or cfg.DEFAULT_PROJECT
        ok, detail, next_phase = evaluate(self.root, project, status.phase, self.config)
        if not ok or next_phase is None:
            return StepResult(
                halted=True,
                reason=detail,
                phase_after=status.phase,
                event=status.phase.value,
            )

        status.phase = next_phase
        status.awaiting = ""
        self.write_status(status)
        return StepResult(
            halted=False,
            reason=detail,
            phase_after=next_phase,
            event=status.phase.value,
        )

    def run(self, max_events: int = 50) -> list[StepResult]:
        results: list[StepResult] = []
        for _ in range(max_events):
            result = self.step()
            results.append(result)
            if result.halted:
                break
        return results


# re-exports for tests that imported helpers from here
def _parse_status(path: Path = PIPELINE_STATUS) -> PipelineStatus:
    return load_status(path)


def _write_status(status: PipelineStatus, path: Path = PIPELINE_STATUS) -> None:
    save_status(status, path)
