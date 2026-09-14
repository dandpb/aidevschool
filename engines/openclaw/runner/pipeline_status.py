"""Machine pipeline status: YAML is the seam; Markdown is human narrative only."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

from enum import StrEnum
from shared.errors import StateCorruptionError
from engines.openclaw.fsio import atomic_write_text


class Phase(StrEnum):
    SPEC = "spec"
    SPEC_DONE = "spec-done"
    IMPL_DONE = "impl-done"
    REVIEW_DONE = "review-done"
    BENCHMARK_DONE = "benchmark-done"
    CYCLE_COMPLETE = "cycle-complete"


class Grade(StrEnum):
    """Which truth produced a phase transition (provenance contract).

    - ``simulate``: artifact presence/size checks only (openclaw checklist,
      ADR-0002 simulate-grade).
    - ``verified``: advanced only after an independent verifier returned PASS
      (MME phase runner / supervisor).
    - ``unspecified``: legacy or cold-start state with no provenance.
    """

    SIMULATE = "simulate"
    VERIFIED = "verified"
    UNSPECIFIED = "unspecified"


@dataclass
class PipelineStatus:
    cycle_id: str = ""
    current_project: str = ""
    complexity_level: int = 1
    phase: Phase = Phase.SPEC
    awaiting: str = ""
    blockers: list[str] = field(default_factory=list)
    grade: Grade = Grade.UNSPECIFIED
    advanced_by: str = ""


def yaml_path_for(md_path: Path) -> Path:
    return md_path.with_suffix(".yaml")
def _from_mapping(data: dict[str, Any], *, source: Path) -> PipelineStatus:
    try:
        complexity = data.get("complexity_level", 1)
        blockers = data.get("blockers") or []
        if isinstance(blockers, str):
            blockers = [b.strip() for b in blockers.strip("[]").split(",") if b.strip()]
        raw_grade = data.get("grade") or Grade.UNSPECIFIED.value
        return PipelineStatus(
            cycle_id=str(data.get("cycle_id", "") or ""),
            current_project=str(data.get("current_project", "") or ""),
            complexity_level=int(complexity),
            phase=Phase(str(data.get("phase", "spec") or "spec")),
            awaiting=str(data.get("awaiting", "") or ""),
            blockers=list(blockers),
            grade=Grade(str(raw_grade)),
            advanced_by=str(data.get("advanced_by", "") or ""),
        )
    except (ValueError, TypeError, IndexError) as exc:
        raise StateCorruptionError(
            f"Malformed pipeline status at {source}: {exc}. "
            "Valid phases: " + ", ".join(p.value for p in Phase)
            + "; valid grades: " + ", ".join(g.value for g in Grade)
        ) from exc


def load_status(path: Path) -> PipelineStatus:
    """Load structured YAML, or return a fresh typed status when it is absent."""
    ypath = yaml_path_for(path)
    if ypath.exists():
        try:
            data = yaml.safe_load(ypath.read_text(encoding="utf-8")) or {}
        except (OSError, yaml.YAMLError) as exc:
            raise StateCorruptionError(
                f"Cannot read pipeline status YAML at {ypath}: {exc}"
            ) from exc
        if not isinstance(data, dict):
            raise StateCorruptionError(f"pipeline status YAML at {ypath} must be a mapping")
        return _from_mapping(data, source=ypath)
    return PipelineStatus()

def dump_status(status: PipelineStatus) -> str:
    """Serialize machine status — the ONE serialization (write and digest share it).

    The MME supervisor digests a *planned* status with this same function to
    predict, byte-exactly, what :func:`save_status` will write; changing the
    field set here changes both sides of that contract together.
    """
    return yaml.safe_dump(
        {
            "cycle_id": status.cycle_id,
            "current_project": status.current_project,
            "complexity_level": status.complexity_level,
            "phase": status.phase.value,
            "awaiting": status.awaiting,
            "blockers": list(status.blockers),
            "grade": status.grade.value,
            "advanced_by": status.advanced_by,
        },
        sort_keys=False,
        allow_unicode=True,
    )


def save_status(status: PipelineStatus, path: Path) -> None:
    """Write machine status to sibling YAML only (does not clobber MD notes)."""
    atomic_write_text(
        yaml_path_for(path),
        dump_status(status),
    )
