"""Tests for the learner-state substrate interface."""

import tempfile
import unittest
from pathlib import Path

import yaml

from learner.substrate import (
    ROOT,
    derive_mavis_view,
    derive_whiteboard_profile,
    derive_whiteboard_trail,
    load_and_validate,
    load_canonical,
    render_mavis_yaml,
    render_profile_yaml,
    render_trail_md,
    validate,
)


class TestSubstrateInterface(unittest.TestCase):
    """Exercise the public read/write surface and invariants."""

    def test_load_canonical_returns_dict(self):
        state = load_canonical()
        self.assertIsInstance(state, dict)
        self.assertEqual(state["system"], "agora-continuum")
        self.assertIn("learner", state)
        self.assertIn("active_unit", state)

    def test_validate_passes_for_canonical_state(self):
        state = load_canonical()
        errors = validate(state)
        self.assertEqual(errors, [])

    def test_load_and_validate_raises_on_bad_state(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "bad.yaml"
            bad_state = {
                "version": 2,
                "system": "agora-continuum",
                "learner": {"id": "x", "level": "intermediate", "active_language": "Go", "languages": ["TypeScript"]},
                "active_unit": {"id": "U1", "state": "presenting", "retry_count": 5, "retry_limit": 3},
                "gate": {"implementation_blocked": True},
                "empirical_gates": {"learning": {"requires_attempt_before_solution": True}},
            }
            path.write_text(yaml.safe_dump(bad_state), encoding="utf-8")

            with self.assertRaises(ValueError) as ctx:
                load_and_validate(path)
            message = str(ctx.exception)
            self.assertIn("active_language must be in learner.languages", message)
            self.assertIn("retry_count cannot exceed retry_limit", message)

    def test_validate_catches_missing_required_fields(self):
        state = {
            "version": 2,
            "system": "agora-continuum",
            "learner": {},
            "active_unit": {},
            "gate": {},
            "empirical_gates": {"learning": {}},
        }
        errors = validate(state)
        self.assertIn("learner.id is required", errors)
        self.assertTrue(
            any("learner.level must be one of" in e for e in errors),
            f"expected level error among {errors}",
        )
        self.assertIn("active_unit.id is required", errors)
        self.assertIn("empirical_gates.learning.requires_attempt_before_solution must be true", errors)


class TestMavisAdapter(unittest.TestCase):
    """Exercise the .mavis/learning_state.yaml adapter."""

    def test_mavis_view_is_derived_and_translated(self):
        state = load_canonical()
        view = derive_mavis_view(state)

        self.assertEqual(view["derived_from"], "learner/learning_state.yaml")
        self.assertEqual(view["learner_profile"]["active_focus"], "TypeScript")
        self.assertEqual(view["state_machine"]["learning_states"], ["apresentando", "praticando", "avaliando", "dominado"])
        self.assertEqual(view["active_unit"]["state"], "apresentando")
        self.assertEqual(view["active_unit"]["awaiting"], "learner_attempt")
        self.assertIn("Sonda", view["agent_ownership"].values())

    def test_rendered_mavis_yaml_contains_header(self):
        state = load_canonical()
        text = render_mavis_yaml(state)
        self.assertTrue(text.startswith("# Derived from learner/learning_state.yaml"))
        parsed = yaml.safe_load(text.replace("# Derived from learner/learning_state.yaml. Do not edit by hand.\n", ""))
        self.assertEqual(parsed["system"], "agora-continuum")


class TestWhiteboardAdapter(unittest.TestCase):
    """Exercise the minimaxDojo whiteboard adapters."""

    def test_profile_core_derived_from_canonical(self):
        state = load_canonical()
        profile = derive_whiteboard_profile(state)

        self.assertEqual(profile["derived_from"], "../../learner/learning_state.yaml")
        self.assertEqual(profile["core"]["aluno"]["linguagem_foco"], "TypeScript")
        self.assertEqual(profile["core"]["aluno"]["tempo_semanal"], "5h")
        self.assertEqual(profile["core"]["aluno"]["nivel_autodeclado"], "intermediario")
        self.assertEqual(profile["core"]["trilha"]["proxima_unidade"], state["active_unit"]["id"])

    def test_rendered_profile_yaml_contains_derived_marker(self):
        state = load_canonical()
        text = render_profile_yaml(derive_whiteboard_profile(state))
        self.assertIn("derived_from: ../../learner/learning_state.yaml", text)
        self.assertIn("# Perfil Vivo do Aluno — derived view", text)

    def test_trail_derived_from_canonical(self):
        state = load_canonical()
        trail = derive_whiteboard_trail(state)

        self.assertEqual(trail["derived_from"], "../../learner/learning_state.yaml")
        self.assertEqual(trail["focus"], "robustness")
        self.assertEqual(trail["active_unit"], state["active_unit"]["id"])
        self.assertEqual(trail["active_state"], "APRESENTANDO")

    def test_rendered_trail_md_contains_derived_marker(self):
        state = load_canonical()
        text = render_trail_md(derive_whiteboard_trail(state))
        self.assertIn("derived_from: ../../learner/learning_state.yaml", text)
        self.assertIn("Derived view", text)


if __name__ == "__main__":
    unittest.main()
