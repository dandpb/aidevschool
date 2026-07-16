from __future__ import annotations

from pathlib import Path
from typing import Mapping

import yaml


REPO_ROOT = Path(__file__).resolve().parents[2]


def _as_mapping(value: object, label: str) -> Mapping[str, object]:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be a mapping")
    return value


def _read_yaml(path: Path) -> Mapping[str, object]:
    documents: list[object] = [
        value
        for value in yaml.safe_load_all(path.read_text(encoding="utf-8"))
        if value is not None
    ]
    if len(documents) != 1:
        raise ValueError(f"Expected a YAML mapping in {path}")
    return _as_mapping(documents[0], str(path))


def prepare_tutor_session(
    learning_state_path: Path = REPO_ROOT / "learner" / "learning_state.yaml",
    tutor_config_path: Path = Path(__file__).with_name("config") / "learner.yaml",
) -> str:
    learning_state = _read_yaml(learning_state_path)
    tutor_config = _read_yaml(tutor_config_path)
    learner = _as_mapping(learning_state.get("learner", {}), "learner")
    active_unit = _as_mapping(learning_state.get("active_unit", {}), "active_unit")
    gate = _as_mapping(learning_state.get("gate", {}), "gate")
    socrates = _as_mapping(tutor_config.get("socrates", {}), "socrates")

    unit_id = str(active_unit.get("id", "unassigned"))
    unit_title = str(active_unit.get("title", "No active unit"))
    unit_state = str(active_unit.get("state", "unknown"))
    language = str(learner.get("active_language", "not configured"))
    quota = socrates.get("quota_dia", "not configured")
    implementation_blocked = gate.get("implementation_blocked") is True
    attempt_path = active_unit.get("attempt_file")
    attempt_exists = isinstance(attempt_path, str) and (REPO_ROOT / attempt_path).is_file()

    if unit_state == "mastered":
        opening = (
            "This unit is already mastered. Ask Cartografo to select and present the next unit "
            "before requesting implementation help."
        )
    else:
        opening = (
            "Socrates / STAP checking: show what you already tried and name the exact point of "
            "confusion. No solution or concrete hint is issued at this stage."
        )

    return "\n".join(
        (
            "minimaxDojo tutor session (read-only)",
            f"Source: {learning_state_path}",
            f"Tutor config: {tutor_config_path}",
            f"Learner: {learner.get('id', 'unknown')} · language: {language}",
            f"Active unit: {unit_id} · {unit_title} · state={unit_state}",
            f"Gate: implementation_blocked={str(implementation_blocked).lower()}",
            f"Recorded attempt available: {str(attempt_exists).lower()}",
            f"Socratic daily quota: {quota}",
            f"Next tutor move: {opening}",
            "Authority: this briefing cannot mark mastery or write canonical learner state.",
        )
    )


def main() -> int:
    print(prepare_tutor_session())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
