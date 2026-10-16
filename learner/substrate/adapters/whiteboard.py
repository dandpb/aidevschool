"""Adapter that derives the minimaxDojo whiteboard views."""

from pathlib import Path
from typing import Any

import yaml

from learner.substrate.projection_clock import projection_today
from learner.substrate.snapshot_sources import pitfalls_from_markdown, profile_matrix

ROOT = Path(__file__).resolve().parents[3]
LEARNER_PROFILE = ROOT / "learner" / "learner_profile.md"
PITFALLS = ROOT / "learner" / "pitfalls.md"
JOURNAL = ROOT / "learner" / "journal.md"

STATE_MAP_PT = {
    "presenting": "APRESENTANDO",
    "practicing": "PRATICANDO",
    "evaluating": "AVALIANDO",
    "mastered": "DOMINADO",
}

LEVEL_MAP_PT = {
    "beginner": "iniciante",
    "intermediate": "intermediario",
    "advanced": "avancado",
}


def _mastered_unit_ids(state: dict[str, Any]) -> list[str]:
    units = state.get("units_log") or []
    return [
        str(u["unit_id"])
        for u in units
        if isinstance(u, dict) and u.get("mastered") is True and u.get("unit_id")
    ]


def _top_pitfall_labels() -> list[str]:
    pitfalls = pitfalls_from_markdown(PITFALLS, JOURNAL)
    return [f"{p['id']}: {p['description']}" for p in pitfalls[:3]]


def _normalized_slug(value: str, fallback: str) -> str:
    cleaned = value.strip().lower().replace(" ", "_")
    return cleaned or fallback


def derive_whiteboard_profile(state: dict[str, Any]) -> dict[str, Any]:
    """Return the whiteboard profile core derived from the canonical state."""
    learner = state["learner"]
    active = state["active_unit"]
    level = learner.get("level", "")
    levels = profile_matrix(LEARNER_PROFILE)
    mastered_ids = _mastered_unit_ids(state)

    return {
        "id": "aluno-001",
        "learner_id": learner.get("id", ""),
        "derived_from": "../../learner/learning_state.yaml",
        "updated": projection_today().isoformat(),
        "agente_owner": "mnemosyne",
        "core": {
            "aluno": {
                "id": learner.get("id", ""),
                "linguagem_foco": learner.get("active_language", ""),
                "tempo_semanal": f"{learner.get('weekly_time_hours', 0)}h",
                "nivel_autodeclado": LEVEL_MAP_PT.get(level, level),
                "dreyfus_global": _normalized_slug(levels.get("dreyfus", ""), "advanced_beginner"),
                "bloom_global": _normalized_slug(levels.get("bloom", ""), "apply"),
                "ai_dependency_index": float(learner["aidi"]["current"]),
                "socrates_quota_today": f"0 / {learner.get('budget', {}).get('hint_queries_per_day', 15)}",
                "human_instructor": learner.get("human_instructor", "none"),
            },
            "trilha": {
                "proxima_unidade": active.get("id", "U-001"),
                "ultima_dominada": mastered_ids[-1] if mastered_ids else None,
            },
            "pegadinhas_top_3": _top_pitfall_labels(),
            "skills_ativas_top_3": mastered_ids[-3:],
        },
    }


def render_profile_yaml(profile: dict[str, Any]) -> str:
    """Render the whiteboard profile as a single valid YAML document."""
    doc = {
        "id": profile["id"],
        "learner_id": profile["learner_id"],
        "derived_from": profile["derived_from"],
        "updated": profile["updated"],
        "agente_owner": profile["agente_owner"],
        "core": profile["core"],
    }
    out = "# Perfil Vivo do Aluno — derived view from learner/learning_state.yaml\n"
    out += "# Não edite diretamente; altere o estado canônico e rode o adapter.\n"
    out += yaml.safe_dump(doc, sort_keys=False, allow_unicode=True, default_flow_style=False)
    return out


def render_profile_md(profile: dict[str, Any]) -> str:
    """Render a Markdown whiteboard profile view for tests / regeneration."""
    front = {
        "id": profile["id"],
        "learner_id": profile["learner_id"],
        "derived_from": profile["derived_from"],
        "updated": profile["updated"],
        "agente_owner": profile["agente_owner"],
    }
    core = profile["core"]
    out = "---\n"
    out += yaml.safe_dump(front, sort_keys=False, allow_unicode=True, default_flow_style=False)
    out += "---\n\n"
    out += "# Perfil Vivo do Aluno\n\n"
    out += "> **Derived view.** A fonte da verdade é `learner/learning_state.yaml`. "
    out += "Atualizado por Mnemosyne via substrate.\n\n"
    out += "## Estado Global\n\n"
    out += f"- linguagem_foco: {core['aluno']['linguagem_foco']}\n"
    out += f"- tempo_semanal: {core['aluno']['tempo_semanal']}\n"
    out += f"- nivel_autodeclado: {core['aluno']['nivel_autodeclado']}\n"
    out += f"- unidade_ativa: {core['trilha']['proxima_unidade']}\n\n"
    out += "*Ver [`docs/05_memory_system.md`](../../docs/05_memory_system.md) para o schema completo.*\n"
    return out


def derive_whiteboard_trail(state: dict[str, Any]) -> dict[str, Any]:
    """Return the whiteboard trail metadata derived from the canonical state."""
    learner = state["learner"]
    active = state["active_unit"]
    return {
        "aluno_id": "aluno-001",
        "derived_from": "../../learner/learning_state.yaml",
        "atualizado": projection_today().isoformat(),
        "agente_owner": "cartografo",
        "focus": learner.get("focus", "robustness"),
        "active_unit": active.get("id", ""),
        "active_state": STATE_MAP_PT.get(active.get("state", ""), active.get("state", "")),
    }


def render_trail_md(trail: dict[str, Any]) -> str:
    """Render a Markdown whiteboard trail view for tests / regeneration."""
    front = {
        "aluno_id": trail["aluno_id"],
        "derived_from": trail["derived_from"],
        "atualizado": trail["atualizado"],
        "agente_owner": trail["agente_owner"],
    }
    out = "---\n"
    out += yaml.safe_dump(front, sort_keys=False, allow_unicode=True, default_flow_style=False)
    out += "---\n\n"
    out += "# Trilha Personalizada — Ágora Continuum\n\n"
    out += "> **Derived view.** A fonte da verdade é `learner/learning_state.yaml`. "
    out += "O Cartógrafo regenera este arquivo via substrate.\n\n"
    out += "## Foco atual\n\n"
    out += f"- **{trail['focus'].capitalize()}**\n"
    out += f"- **Unidade ativa:** {trail['active_unit']} ({trail['active_state']})\n\n"
    out += "## Template canônico\n\n"
    out += "Ver [`docs/03_robustness_trail.md`](../../docs/03_robustness_trail.md).\n"
    return out
