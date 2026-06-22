#!/usr/bin/env python3
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class TestMiniMaxEvolutionEngineContract(unittest.TestCase):
    def setUp(self):
        self.engine = ROOT / "engines" / "miniMaxEvolutionEngine"

    def test_shared_substrates_remain_symlinks(self):
        expected_targets = {
            "curriculum": "../../curriculum",
            "learner": "../../learner",
            "docs": "../../docs",
            ".mavis": "../../.mavis",
        }
        for name, target in expected_targets.items():
            with self.subTest(name=name):
                link = self.engine / name
                self.assertTrue(link.is_symlink(), f"{name} must remain a symlink")
                self.assertEqual(link.readlink().as_posix(), target)

    def test_phase_commands_keep_producer_verifier_separation(self):
        phaserunner = self.engine / ".claude" / "commands" / "devschool" / "phaserunner.md"
        body = phaserunner.read_text(encoding="utf-8")

        self.assertIn("Verifier never shares producer context", body)
        self.assertIn("Status advances only on PASS", body)
        self.assertIn("learning_gate_check", body)
        self.assertIn("implementation_blocked", body)

    def test_cloud_recurring_schedules_require_confirmation(self):
        claude = (self.engine / "CLAUDE.md").read_text(encoding="utf-8")

        self.assertIn("peça confirmação ao usuário antes de criar", claude)
        self.assertIn("nunca crie sozinho", claude)


class TestPolyglotArenaDesignContract(unittest.TestCase):
    """The polyglot arena was demoted from `engines/polyglotEvolutionArena/` to
    `docs/design/polyglot-arena/` on 2026-06-21. The engine root no longer exists;
    the design material lives at the design path and the loop lives in
    `miniMaxEvolutionEngine/`. This test pins that the demoted archive stays at
    `proposal` until executable scaffold + test harness + comparison runner appear.
    """

    design = ROOT / "docs" / "design" / "polyglot-arena"

    def test_status_stays_proposal_until_runtime_scaffold_exists(self):
        status = (self.design / "STATUS.md").read_text(encoding="utf-8")

        self.assertIn("proposal", status)
        self.assertIn("executable scaffold", status)
        self.assertIn("test harness", status)
        self.assertIn("comparison runner", status)

    def test_current_surface_is_only_proposal_material(self):
        files = {path.name for path in self.design.iterdir() if path.is_file()}
        self.assertEqual(
            files,
            {"STATUS.md", "project_proposal.md", "bootstrap_prompt.md"},
            "polyglot-arena archive should hold only design material; no executable code",
        )


class TestPixelDojoContract(unittest.TestCase):
    """arcadeAcademy/ was merged into pixelDojo/ on 2026-06-21 (duplicate root).
    The 8-bit teaching-game engine contract now lives at pixelDojo/; the key
    property is that the game emits raw evidence only, never `mastered`.
    """

    engine = ROOT / "engines" / "pixelDojo"

    def test_arcade_academy_root_no_longer_exists(self):
        """Deletion test for the duplicate engine root."""
        self.assertFalse(
            (ROOT / "engines" / "arcadeAcademy").exists(),
            "engines/arcadeAcademy/ was merged into engines/pixelDojo/ on 2026-06-21; "
            "resurrecting it would re-introduce the duplicate-root problem.",
        )

    def test_playbook_preserves_attempt_surface_verifier_boundary(self):
        agents = (self.engine / "AGENTS.md").read_text(encoding="utf-8")
        plan = (self.engine / "PLAN.md").read_text(encoding="utf-8")

        self.assertIn("Every game targets exactly one concept", agents)
        self.assertIn("emits **raw evidence only**", agents)
        self.assertIn("The game never writes `mastered`", agents)
        self.assertIn("Game never does this", plan)
        self.assertIn("Verifier (separate context)", plan)

    def test_engine_does_not_copy_shared_curriculum_or_learner_state(self):
        self.assertFalse((self.engine / "curriculum").exists())
        self.assertFalse((self.engine / "learner").exists())


if __name__ == "__main__":
    unittest.main()
