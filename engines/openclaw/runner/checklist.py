"""Path-exists checklist for the simulate runner.

ponytail: Hermes bus + per-role adapters were theater for file checks.
This module is the whole simulate gate: required paths + min sizes.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from engines.openclaw import config as cfg
from engines.openclaw.runner.pipeline_status import Phase


@dataclass(frozen=True)
class ArtifactCheck:
    """One required path (file or non-empty dir), relative to ecosystem root."""

    rel: str
    min_bytes: int = 1
    is_dir: bool = False


@dataclass(frozen=True)
class PhaseCheck:
    phase: Phase
    next_phase: Phase
    label: str
    artifacts: tuple[ArtifactCheck, ...]


def phase_plan(project: str, config: cfg.OpenclawConfig = cfg.DEFAULT_CONFIG) -> list[PhaseCheck]:
    """Ordered phase checks for one curriculum project."""
    return [
        PhaseCheck(
            phase=Phase.SPEC,
            next_phase=Phase.SPEC_DONE,
            label="spec",
            artifacts=(
                ArtifactCheck(cfg.spec_path(project), config.min_spec_size),
            ),
        ),
        PhaseCheck(
            phase=Phase.SPEC_DONE,
            next_phase=Phase.IMPL_DONE,
            label="impl",
            artifacts=tuple(
                ArtifactCheck(cfg.impl_path(project, lang), is_dir=True)
                for lang in cfg.LANGUAGES
            ),
        ),
        PhaseCheck(
            phase=Phase.IMPL_DONE,
            next_phase=Phase.REVIEW_DONE,
            label="review",
            artifacts=(
                ArtifactCheck(cfg.code_review_path(project), config.min_review_size),
            ),
        ),
        PhaseCheck(
            phase=Phase.REVIEW_DONE,
            next_phase=Phase.BENCHMARK_DONE,
            label="benchmark",
            artifacts=(
                ArtifactCheck(cfg.benchmark_results_path(project), config.min_benchmark_size),
            ),
        ),
        PhaseCheck(
            phase=Phase.BENCHMARK_DONE,
            next_phase=Phase.CYCLE_COMPLETE,
            label="optimize",
            artifacts=(
                ArtifactCheck(cfg.evolution_report_path(project), config.min_evolution_size),
            ),
        ),
    ]


def _ok_file(path: Path, min_bytes: int) -> tuple[bool, str]:
    if not path.is_file():
        return False, f"missing file: {path}"
    size = path.stat().st_size
    if size < min_bytes:
        return False, f"too small ({size} < {min_bytes}): {path}"
    return True, ""


def _ok_dir(path: Path) -> tuple[bool, str]:
    if not path.is_dir():
        return False, f"missing dir: {path}"
    if not any(path.iterdir()):
        return False, f"empty dir: {path}"
    return True, ""


def evaluate(root: Path, project: str, phase: Phase, config: cfg.OpenclawConfig = cfg.DEFAULT_CONFIG) -> tuple[bool, str, Phase | None]:
    """Return (ok, reason, next_phase_if_ok)."""
    if phase == Phase.CYCLE_COMPLETE:
        return True, "cycle complete", None

    for step in phase_plan(project, config):
        if step.phase != phase:
            continue
        for art in step.artifacts:
            path = root / art.rel
            ok, reason = _ok_dir(path) if art.is_dir else _ok_file(path, art.min_bytes)
            if not ok:
                return False, f"{step.label}: {reason}", None
        return True, f"{step.label} PASS", step.next_phase

    return False, f"no checklist for phase {phase.value}", None
