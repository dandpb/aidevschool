import unittest
import yaml
from learner.substrate.adapters.mavis import DEFAULT_PROMOTION_GATE, derive_mavis_view, render_mavis_yaml


class TestDeriveMavisView(unittest.TestCase):
    def test_derive_mavis_view_happy_path(self):
        state = {
            "system": "agora-continuum",
            "learner": {
                "level": "intermediate",
                "goal": "master python",
                "active_language": "python",
                "languages": ["python", "typescript", "rust"],
                "reference_purpose": "comparative study",
                "weekly_time_hours": 10,
                "session_cadence": "daily",
                "human_instructor": "alice",
                "hitl_sla_hours": 12,
                "hitl_fallback": "escalate",
                "budget": {"hint_queries_per_day": 20},
            },
            "state_machine": {
                "learning_states": ["presenting", "practicing", "evaluating", "mastered"],
                "artifact_states": ["producing", "verifying", "done"],
            },
            "active_unit": {
                "id": "unit_01",
                "project": "core",
                "title": "Unit 01 Intro",
                "state": "presenting",
                "retry_limit": 5,
                "retry_count": 1,
                "diagnostic_file": "curriculum/unit_01/diag.py",
                "promotion_gate": ["gate_rule_1"],
            },
            "agent_ownership": {"agent_1": "Sonda"},
            "empirical_gates": {"gate_1": True},
            "next_action": {"action": "continue"},
        }

        view = derive_mavis_view(state)

        self.assertEqual(view["version"], 3)
        self.assertEqual(view["system"], "agora-continuum")
        self.assertEqual(view["derived_from"], "learner/learning_state.yaml")
        self.assertEqual(view["workspace"], ".")

        profile = view["learner_profile"]
        self.assertEqual(profile["level"], "intermediate")
        self.assertEqual(profile["goal"], "master python")
        self.assertEqual(profile["active_focus"], "python")
        self.assertEqual(profile["focus_languages"], ["python"])
        self.assertEqual(profile["reference_languages"], ["typescript", "rust"])
        self.assertEqual(profile["reference_purpose"], "comparative study")
        self.assertEqual(profile["weekly_time_hours"], 10)
        self.assertEqual(profile["cadence"], "daily")
        self.assertEqual(profile["human_instructor"], "alice")
        self.assertEqual(profile["hitl_sla_hours"], 12)
        self.assertEqual(profile["hitl_fallback"], "escalate")
        self.assertEqual(profile["budget"], {"hint_queries_per_day": 20})

        sm = view["state_machine"]
        self.assertEqual(sm["learning_states"], ["apresentando", "praticando", "avaliando", "dominado"])
        self.assertEqual(sm["artifact_states"], ["producing", "verifying", "done"])
        self.assertEqual(sm["retry_limit"], 5)
        self.assertEqual(sm["current_retry"], 1)

        au = view["active_unit"]
        self.assertEqual(au["id"], "unit_01")
        self.assertEqual(au["project"], "projects/core")
        self.assertEqual(au["title"], "Unit 01 Intro")
        self.assertEqual(au["state"], "apresentando")
        self.assertEqual(au["diagnostic_file"], "projects/unit_01/diag.py")
        self.assertEqual(au["awaiting"], "learner_attempt")
        self.assertEqual(au["promotion_gate"], ["gate_rule_1"])

        self.assertEqual(view["agent_ownership"], {"agent_1": "Sonda"})
        self.assertEqual(view["empirical_gates"], {"gate_1": True})
        self.assertEqual(view["next_action"], {"action": "continue"})

    def test_derive_mavis_view_defaults_and_fallbacks(self):
        state = {
            "learner": {
                "level": "novice",
                "active_language": "python",
            },
            "active_unit": {
                "id": "unit_02",
                "project": "basics",
                "state": "practicing",
            },
        }

        view = derive_mavis_view(state)

        self.assertEqual(view["system"], "agora-continuum")
        profile = view["learner_profile"]
        self.assertEqual(profile["goal"], "")
        self.assertEqual(profile["reference_languages"], [])
        self.assertEqual(profile["reference_purpose"], "")
        self.assertEqual(profile["weekly_time_hours"], 0)
        self.assertEqual(profile["cadence"], "")
        self.assertEqual(profile["human_instructor"], "none")
        self.assertEqual(profile["hitl_sla_hours"], 24)
        self.assertEqual(profile["hitl_fallback"], "auto_reject_or_self_escalate")
        self.assertEqual(profile["budget"], {"hint_queries_per_day": 15})

        sm = view["state_machine"]
        self.assertEqual(sm["learning_states"], ["apresentando", "praticando", "avaliando", "dominado"])
        self.assertEqual(sm["artifact_states"], ["producing", "verifying", "done"])
        self.assertEqual(sm["retry_limit"], 3)
        self.assertEqual(sm["current_retry"], 0)

        au = view["active_unit"]
        self.assertEqual(au["title"], "unit_02")
        self.assertEqual(au["state"], "praticando")
        self.assertEqual(au["diagnostic_file"], "")
        self.assertEqual(au["awaiting"], "")
        self.assertEqual(au["promotion_gate"], DEFAULT_PROMOTION_GATE)

    def test_derive_mavis_view_unknown_unit_state(self):
        state = {
            "learner": {"level": "novice", "active_language": "python"},
            "active_unit": {
                "id": "unit_custom",
                "project": "custom",
                "state": "custom_state",
            },
        }
        view = derive_mavis_view(state)
        self.assertEqual(view["active_unit"]["state"], "custom_state")
        self.assertEqual(view["active_unit"]["awaiting"], "")

    def test_render_mavis_yaml(self):
        state = {
            "learner": {"level": "novice", "active_language": "python"},
            "active_unit": {
                "id": "unit_01",
                "project": "core",
                "state": "presenting",
            },
        }
        yaml_str = render_mavis_yaml(state)
        self.assertTrue(yaml_str.startswith("# Derived from learner/learning_state.yaml. Do not edit by hand.\n"))

        content = yaml_str.replace("# Derived from learner/learning_state.yaml. Do not edit by hand.\n", "")
        parsed = yaml.safe_load(content)
        self.assertEqual(parsed["version"], 3)
        self.assertEqual(parsed["active_unit"]["id"], "unit_01")


if __name__ == "__main__":
    unittest.main()
