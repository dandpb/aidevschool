"""Strict canonical YAML readers for supervisor decisions."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from .models import LearnerState, LearningState, PipelinePhase, PipelineState


class InvalidStateError(ValueError):
    pass


def _mapping(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise InvalidStateError(f"missing canonical state: {path}")
    try:
        value = yaml.safe_load(path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        raise InvalidStateError(f"cannot read canonical state {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise InvalidStateError(f"canonical state must be a mapping: {path}")
    return value


def _required(data: dict[str, Any], key: str, expected: type, source: Path) -> Any:
    value = data.get(key)
    if type(value) is not expected:
        raise InvalidStateError(f"{source}: {key} must be {expected.__name__}")
    return value


def load_pipeline(path: Path, curriculum: Path) -> PipelineState:
    data = _mapping(path)
    cycle_id = _required(data, "cycle_id", str, path)
    raw_project = _required(data, "current_project", str, path)
    raw_phase = _required(data, "phase", str, path)
    blockers = _required(data, "blockers", list, path)
    if not cycle_id or not raw_project or any(type(item) is not str for item in blockers):
        raise InvalidStateError(f"{path}: empty identity or malformed blockers")
    prefix = "curriculum/"
    if not raw_project.startswith(prefix) or raw_project.count("/") != 1:
        raise InvalidStateError(f"{path}: current_project must be exactly curriculum/<slug>")
    project = raw_project[len(prefix):]
    if not project or Path(project).name != project or project in {".", ".."}:
        raise InvalidStateError(f"{path}: current_project must be one curriculum slug")
    project_dir = curriculum / project
    try:
        project_dir.resolve(strict=True).relative_to(curriculum.resolve(strict=True))
    except (OSError, ValueError) as exc:
        raise InvalidStateError(f"invalid curriculum project: {project}") from exc
    if not project_dir.is_dir() or not (project_dir / "docs").is_dir():
        raise InvalidStateError(f"project lacks required docs directory: {project}")
    try:
        phase = PipelinePhase(raw_phase)
    except ValueError as exc:
        raise InvalidStateError(f"unsupported pipeline phase: {raw_phase}") from exc
    return PipelineState(cycle_id, project, project_dir, phase, tuple(blockers))


def load_learner(path: Path) -> LearnerState:
    data = _mapping(path)
    active = _required(data, "active_unit", dict, path)
    gate = _required(data, "gate", dict, path)
    unit_id = _required(active, "id", str, path)
    project = _required(active, "project", str, path)
    raw_state = _required(active, "state", str, path)
    blocked = _required(gate, "implementation_blocked", bool, path)
    if not unit_id or not project or Path(project).name != project:
        raise InvalidStateError(f"{path}: invalid active unit identity")
    try:
        state = LearningState(raw_state)
    except ValueError as exc:
        raise InvalidStateError(f"unsupported learner state: {raw_state}") from exc
    return LearnerState(unit_id, project, state, blocked)


def load_canonical(pipeline_path: Path, learner_path: Path, curriculum: Path) -> tuple[PipelineState, LearnerState]:
    pipeline = load_pipeline(pipeline_path, curriculum)
    learner = load_learner(learner_path)
    if learner.project != pipeline.project:
        raise InvalidStateError(
            f"active unit project {learner.project} does not match {pipeline.project}"
        )
    return pipeline, learner
