from __future__ import annotations

from pathlib import Path
import re
from typing import Mapping

import yaml


REPO_ROOT = Path(__file__).resolve().parents[2]
COMMAND_BY_PHASE = {
    "spec": "spec",
    "diagnostic": "diagnose",
    "impl": "implement",
    "review": "review",
    "benchmark": "benchmark",
    "optimize": "optimize",
    "cycle-complete": "next",
}


def _as_mapping(value: object, label: str) -> Mapping[str, object]:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be a mapping")
    return value


def _read_learning_gate(path: Path) -> bool:
    value: object = yaml.safe_load(path.read_text(encoding="utf-8"))
    state = _as_mapping(value, str(path))
    gate = _as_mapping(state.get("gate", {}), "gate")
    return gate.get("implementation_blocked") is True


def _status_field(status: str, name: str) -> str:
    match = re.search(rf"^- \*\*{re.escape(name)}\*\*: `?([^`\n]+)`?$", status, re.MULTILINE)
    if match is None:
        raise ValueError(f"Missing {name} in pipeline status")
    return match.group(1).strip()


def prepare_workflow(
    pipeline_status_path: Path = REPO_ROOT / "learner" / "pipeline_status.md",
    learning_state_path: Path = REPO_ROOT / "learner" / "learning_state.yaml",
    commands_path: Path = Path(__file__).with_name(".claude") / "commands" / "devschool",
) -> str:
    status = pipeline_status_path.read_text(encoding="utf-8")
    phase = _status_field(status, "phase")
    project = _status_field(status, "current_project")
    awaiting = _status_field(status, "awaiting")
    implementation_blocked = _read_learning_gate(learning_state_path)

    command_name = "diagnose" if implementation_blocked else COMMAND_BY_PHASE.get(phase)
    if command_name is None:
        raise ValueError(f"Unsupported Evolution phase: {phase}")
    command_file = commands_path / f"{command_name}.md"
    if not command_file.is_file():
        raise FileNotFoundError(f"Evolution command contract not found: {command_file}")

    return "\n".join(
        (
            "MiniMax Evolution workflow briefing (read-only)",
            f"Pipeline source: {pipeline_status_path}",
            f"Learning gate source: {learning_state_path}",
            f"Command contract: {command_file}",
            f"Project: {project}",
            f"Phase: {phase} · awaiting: {awaiting}",
            f"Learning gate blocked: {str(implementation_blocked).lower()}",
            f"Next Claude Code command: /devschool-{command_name}",
            "Authority: this briefing prepares the workflow; it does not execute a phase or advance state.",
        )
    )


def main() -> int:
    print(prepare_workflow())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
