"""Checklist scheduler for the 5-phase learning cycle.

ponytail: no Hermes, no adapters — each step is path-exists + size gate.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from pathlib import Path, PurePosixPath

from curriculum._shared.evidence import Phase as EvidencePhase
from curriculum._shared.evidence import commit as commit_evidence
from curriculum._shared.evidence import inspect as inspect_challenge
from engines.openclaw import config as cfg
from engines.openclaw.errors import StateCorruptionError
from engines.openclaw.fsio import atomic_write_text, read_yaml_mapping
from engines.openclaw.runner.checklist import evaluate
from engines.openclaw.runner.pipeline_status import (
    Phase,
    PipelineStatus,
    load_status,
    save_status,
    yaml_path_for,
)

ROOT = Path(__file__).resolve().parent.parent.parent.parent
PIPELINE_STATUS = ROOT / "learner" / "pipeline_status.md"
LEARNING_STATE = ROOT / "learner" / "learning_state.yaml"


@dataclass(frozen=True, slots=True)
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

    def _validated_project(self, project: str) -> str:
        relative = PurePosixPath(project)
        if (
            "\\" in project
            or relative.is_absolute()
            or len(relative.parts) != 2
            or relative.parts[0] != "curriculum"
            or relative.parts[1] in {"", ".", ".."}
        ):
            raise StateCorruptionError(
                f"Invalid current_project {project!r}; expected curriculum/<project>."
            )
        curriculum_root = (self.root / "curriculum").resolve()
        project_path = (self.root / Path(*relative.parts)).resolve()
        if project_path.parent != curriculum_root:
            raise StateCorruptionError(
                f"Invalid current_project {project!r}; path escapes curriculum root."
            )
        return relative.as_posix()

    @staticmethod
    def _restore(path: Path, previous: bytes | None) -> None:
        if previous is None:
            path.unlink(missing_ok=True)
            return
        atomic_write_text(path, previous.decode("utf-8"))

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

        project = self._validated_project(status.current_project or cfg.DEFAULT_PROJECT)
        ok, detail, next_phase = evaluate(self.root, project, status.phase, self.config)
        if not ok or next_phase is None:
            return StepResult(
                halted=True,
                reason=detail,
                phase_after=status.phase,
                event=status.phase.value,
            )

        # Mirror the phase advance into the curriculum evidence contract so the
        # evidence module's reads stay in sync with the scheduler's writes.
        # Maps the scheduler's fine-grained phase vocabulary to the evidence
        # module's coarse phase vocabulary.
        _PHASE_MAP = {
            Phase.SPEC: EvidencePhase.SPEC,
            Phase.SPEC_DONE: EvidencePhase.IMPL,
            Phase.IMPL_DONE: EvidencePhase.REVIEW,
            Phase.REVIEW_DONE: EvidencePhase.BENCHMARK,
            Phase.BENCHMARK_DONE: EvidencePhase.OPTIMIZE,
            Phase.CYCLE_COMPLETE: EvidencePhase.CYCLE_COMPLETE,
        }
        bare_project = Path(project).name
        ev = inspect_challenge(bare_project, root=self.root)
        next_evidence = replace(ev, phase=_PHASE_MAP[next_phase])
        next_status = replace(status, phase=next_phase, awaiting="")
        mirror_path = self.root / "curriculum" / bare_project / "status.yaml"
        pipeline_path = yaml_path_for(self.status_path)
        mirror_before = mirror_path.read_bytes() if mirror_path.exists() else None
        pipeline_before = pipeline_path.read_bytes() if pipeline_path.exists() else None

        try:
            commit_evidence(next_evidence, root=self.root)
            self.write_status(next_status)
        except Exception:  # noqa: BROAD_EXCEPT_OK - transaction boundary must roll back
            self._restore(mirror_path, mirror_before)
            self._restore(pipeline_path, pipeline_before)
            raise

        return StepResult(
            halted=False,
            reason=detail,
            phase_after=next_phase,
            event=next_status.phase.value,
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
