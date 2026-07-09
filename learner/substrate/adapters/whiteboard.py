"""Adapter that derives the minimaxDojo whiteboard views."""

import datetime
from typing import Any

import yaml

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


def derive_whiteboard_profile(state: dict[str, Any]) -> dict[str, Any]:
    """Return the whiteboard profile core derived from the canonical state."""
    learner = state["learner"]
    active = state["active_unit"]
    level = learner.get("level", "")

    return {
        "id": "aluno-001",
        "learner_id": learner.get("id", ""),
        "derived_from": "../../learner/learning_state.yaml",
        "updated": datetime.date.today().isoformat(),
        "agente_owner": "mnemosyne",
        "core": {
            "aluno": {
                "id": learner.get("id", ""),
                "linguagem_foco": learner.get("active_language", ""),
                "tempo_semanal": f"{learner.get('weekly_time_hours', 0)}h",
                "nivel_autodeclado": LEVEL_MAP_PT.get(level, level),
                "dreyfus_global": "advanced_beginner",
                "bloom_global": "apply",
                "ai_dependency_index": float(learner["aidi"]["current"]),
                "socrates_quota_today": "0 / 15",
                "human_instructor": learner.get("human_instructor", "none"),
            },
            "trilha": {
                "proxima_unidade": active.get("id", "U-001"),
                "ultima_dominada": None,
            },
            "pegadinhas_top_3": [],
            "skills_ativas_top_3": [],
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
        "atualizado": datetime.date.today().isoformat(),
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
