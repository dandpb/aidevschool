"""Create a new learner instance — make replication trivial.

Vision gap #4: "one learner per ecosystem instance + setup manual = democratização-
zero." This CLI closes it: a single command templates a fresh ``learning_state.yaml``
for a new learner, resets all progress (no inherited mastery), and regenerates the
derived substrate views.

Usage::

    python3 -m learner.new_instance --name "Jane Doe" --id jane-doe

The current learner state is backed up (timestamped) before the switch, so no
data is lost. After creation, ``python3 -m learner.substrate`` regenerates views.
"""
from __future__ import annotations

import argparse
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml


REPO_ROOT = Path(__file__).resolve().parents[1]
STATE_PATH = REPO_ROOT / "learner" / "learning_state.yaml"


def _utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _template(name: str, learner_id: str, language: str) -> dict[str, Any]:
    """A fresh learning_state.yaml v2 for a new learner — no inherited mastery."""
    return {
        "version": 2,
        "system": "agora-continuum",
        "learner": {
            "id": learner_id,
            "name": name,
            "level": "beginner",
            "goal": "aplicar IA com confiança no trabalho e na vida cotidiana",
            "active_language": language,
            "languages": [language] if language else [],
            "weekly_time_hours": 3,
            "session_cadence": "15-30 min sessions, 3-5x/week",
            "human_instructor": "none",
            "aidi": {"current": 0.0, "threshold_amber": 0.6, "threshold_red": 0.75,
                     "measurement_source": "self_reported", "history": []},
        },
        "state_machine": {"learning_states": ["presenting", "practicing", "evaluating", "mastered"],
                          "artifact_states": ["producing", "verifying", "done"]},
        "active_unit": {"id": None, "project": None, "title": None, "state": "idle",
                        "retry_count": 0, "retry_limit": 3},
        "gate": {"implementation_blocked": False},
        "empirical_gates": {"code": {"mastery_source": "executable_evidence"},
                            "learning": {"mastery_source": "executable_evidence"}},
        "units_log": [],
        "streak": {"current": 0, "longest": 0},
        "reviews": {"freeze_balance": {"current": 0, "max": 2}},
    }


def create_instance(name: str, learner_id: str, language: str = "TypeScript",
                    state_path: Path = STATE_PATH) -> dict[str, str]:
    """Back up the current state, write a fresh template, return paths."""
    backup = state_path.parent / f"learning_state.{_utc_stamp()}.yaml.bak"
    if state_path.is_file():
        shutil.copy2(state_path, backup)
    from learner.substrate.fsio import atomic_write_text

    # This file is the ecosystem's source of truth: a crash mid-write must leave
    # the previous state intact. Not save_canonical() — validate() requires an
    # active unit, which a blank-slate learner does not have yet.
    atomic_write_text(
        state_path,
        yaml.dump(
            _template(name, learner_id, language),
            default_flow_style=False,
            sort_keys=False,
            allow_unicode=True,
        ),
    )
    return {"state": str(state_path), "backup": str(backup), "learner_id": learner_id}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="new-instance", description=__doc__)
    parser.add_argument("--name", required=True, help="learner display name")
    parser.add_argument("--id", required=True, help="learner id (kebab-case, e.g. jane-doe)")
    parser.add_argument("--lang", default="TypeScript", help="active language (default TypeScript)")
    parser.add_argument("--no-sync", action="store_true", help="skip substrate sync after creation")
    args = parser.parse_args(argv)

    result = create_instance(args.name, args.id, args.lang)
    print(f"[new-instance] learner state -> {result['state']}")
    print(f"[new-instance] backup of previous -> {result['backup']}")
    print(f"[new-instance] learner: {args.name} ({args.id})")

    if not args.no_sync:
        print("[new-instance] regenerating derived views via learner.substrate.sync()...")
        from learner.substrate import sync
        sync()
        print("[new-instance] derived views regenerated")

    print(f"\n[new-instance] Done. {args.name} is ready to start learning.")
    print("Next: open the LiteracyDojo link or run next_step.py for the first lesson.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
