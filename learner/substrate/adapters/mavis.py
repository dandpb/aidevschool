"""Adapter that derives the .mavis/learning_state.yaml view."""

from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parent.parent.parent.parent

STATE_MAP_PT = {
    "presenting": "apresentando",
    "practicing": "praticando",
    "evaluating": "avaliando",
    "mastered": "dominado",
}

DEFAULT_PROMOTION_GATE = [
    "learner submits an attempt before receiving solutions",
    "Sonda classifies Dreyfus/Bloom position for tests, refactoring, and code reading",
    "Cartografo updates the first concrete robustness gap",
    "Prometor defines executable verification for the first implementation task",
]


def derive_mavis_view(state: dict[str, Any]) -> dict[str, Any]:
    """Return the Mavis view derived from the canonical learner state."""
    learner = state["learner"]
    active = state["active_unit"]
    focus_languages = [learner["active_language"]]
    reference_languages = [lang for lang in learner.get("languages", []) if lang != learner["active_language"]]

    sm = state.get("state_machine", {})
    learning_states = sm.get("learning_states", ["presenting", "practicing", "evaluating", "mastered"])

    return {
        "version": 3,
        "system": state.get("system", "agora-continuum"),
        "derived_from": "learner/learning_state.yaml",
        "workspace": str(ROOT),
        "learner_profile": {
            "level": learner["level"],
            "goal": learner.get("goal", ""),
            "active_focus": learner["active_language"],
            "focus_languages": focus_languages,
            "reference_languages": reference_languages,
            "reference_purpose": learner.get("reference_purpose", ""),
            "weekly_time_hours": learner.get("weekly_time_hours", 0),
            "cadence": learner.get("session_cadence", ""),
            "human_instructor": learner.get("human_instructor", "none"),
            "hitl_sla_hours": learner.get("hitl_sla_hours", 24),
            "hitl_fallback": learner.get("hitl_fallback", "auto_reject_or_self_escalate"),
            "budget": learner.get("budget", {"hint_queries_per_day": 15}),
        },
        "state_machine": {
            "learning_states": [STATE_MAP_PT[s] for s in learning_states],
            "artifact_states": sm.get("artifact_states", ["producing", "verifying", "done"]),
            "retry_limit": active.get("retry_limit", 3),
            "current_retry": active.get("retry_count", 0),
        },
        "active_unit": {
            "id": active["id"],
            "project": f"projects/{active['project']}",
            "title": active.get("title", active["id"]),
            "state": STATE_MAP_PT.get(active["state"], active["state"]),
            "diagnostic_file": active.get("diagnostic_file", "").replace("curriculum/", "projects/", 1),
            "awaiting": "learner_attempt" if active.get("state") == "presenting" else "",
            "promotion_gate": active.get("promotion_gate", DEFAULT_PROMOTION_GATE),
        },
        "agent_ownership": state.get("agent_ownership", {}),
        "empirical_gates": state.get("empirical_gates", {}),
        "next_action": state.get("next_action", {}),
    }


def render_mavis_yaml(state: dict[str, Any]) -> str:
    """Render the Mavis view as a YAML string."""
    view = derive_mavis_view(state)
    header = "# Derived from learner/learning_state.yaml. Do not edit by hand.\n"
    return header + yaml.safe_dump(view, sort_keys=False, allow_unicode=True, default_flow_style=False)
